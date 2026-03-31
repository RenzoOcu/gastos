import { useState, useEffect, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts'
import * as XLSX from 'xlsx'
import { useSound } from './hooks/useSound'
import VoiceChat from './components/VoiceChat'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryById, getCategoryIconByName } from './data/categories'
import { logDiagnostics } from './utils/checkConnection'
import { testSupabaseConnection, getDiagnosticMessage } from './utils/testSupabase'
import './App.css'

const COLORS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01', '#46bdc6']

// Tooltip personalizado para gráficos
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip-container">
        <p className="tooltip-month">{label}</p>
        <div className="tooltip-row">
          <span className="tooltip-dot income"></span>
          <span>Ingresos:</span>
          <span className="tooltip-amount income">S/. {data.ingresos?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-dot expense"></span>
          <span>Gastos:</span>
          <span className="tooltip-amount expense">S/. {data.gastos?.toFixed(2) || '0.00'}</span>
        </div>
        {data.ahorro !== undefined && (
          <div className="tooltip-row total">
            <span>Ahorro:</span>
            <span className={`tooltip-amount ${data.ahorro >= 0 ? 'income' : 'expense'}`}>
              S/. {data.ahorro?.toFixed(2) || '0.00'}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Consejos financieros diarios
const DAILY_TIPS = [
  {
    tip: "El 50/30/20 es una regla simple: 50% necesidades, 30% deseos, 20% ahorro. ¿Lo estás siguiendo?",
    category: "Presupuesto"
  },
  {
    tip: "Anota cada gasto durante una semana. Te sorprenderá lo que gastas en pequeñas cosas que suman mucho.",
    category: "Conciencia"
  },
  {
    tip: "Antes de comprar algo que no sea esencial, espera 24 horas. Muchas veces el deseo de comprar desaparece.",
    category: "Ahorro"
  },
  {
    tip: "Revisa tus suscripciones mensuales. ¿Realmente usas todas? Cancelar una que no usas puede ahorrarte dinero.",
    category: "Optimización"
  },
  {
    tip: "Crea un fondo de emergencia que cubra 3-6 meses de gastos. Es tu red de seguridad financiera.",
    category: "Seguridad"
  },
  {
    tip: "Paga primero contigo mismo: antes de pagar facturas, aparta un porcentaje para ahorro. ¡Hazlo automático!",
    category: "Ahorro"
  },
  {
    tip: "Compara precios antes de comprar. A veces, la misma calidad se encuentra a mejor precio en otro lugar.",
    category: "Optimización"
  },
  {
    tip: "Los gastos hormiga (café, snacks, apps) pueden consumir hasta el 30% de tu ingreso sin que te des cuenta.",
    category: "Conciencia"
  },
  {
    tip: "Establece metas financieras SMART: Específicas, Medibles, Alcanzables, Relevantes y con Tiempo definido.",
    category: "Planificación"
  },
  {
    tip: "Revisa tu presupuesto cada mes y ajusta según sea necesario. La flexibilidad es clave.",
    category: "Presupuesto"
  },
  {
    tip: "Invierte en tu educación financiera. Leer un libro o artículo sobre finanzas cada mes vale la pena.",
    category: "Educación"
  },
  {
    tip: "Diferencia entre 'quiero' y 'necesito'. Esto simple cambio puede transformar tus finanzas.",
    category: "Conciencia"
  }
]

function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState(null)
  const [isTesting, setIsTesting] = useState(false)
  const { playSound } = useSound()
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  })
  const [filter, setFilter] = useState({
    month: format(new Date(), 'yyyy-MM'),
    category: 'all'
  })
  const [activeSection, setActiveSection] = useState('dashboard')
  const [dailyTip, setDailyTip] = useState(DAILY_TIPS[0])
  const [monthlyLimit, setMonthlyLimit] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Inicializar tema oscuro
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  // Cambiar tema
  const toggleTheme = () => {
    playSound('click')
    const newTheme = isDarkMode ? 'light' : 'dark'
    setIsDarkMode(!isDarkMode)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // Obtener consejo diario
  useEffect(() => {
    const today = new Date()
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const tipIndex = dayOfYear % DAILY_TIPS.length
    setDailyTip(DAILY_TIPS[tipIndex])
    
    // Ejecutar diagnóstico de conexión en desarrollo
    if (import.meta.env.DEV) {
      logDiagnostics()
    }
  }, [])

  // Obtener transacciones
  const fetchTransactions = async () => {
    playSound('click')
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
      
      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      setError(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Calcular estadísticas y límite mensual
  const stats = useMemo(() => {
    // Calcular ingreso promedio de los últimos 3 meses para determinar límite
    const today = new Date()
    let totalIncomeLast3Months = 0
    let countMonths = 0
    
    for (let i = 0; i < 3; i++) {
      const date = subMonths(today, i)
      const monthKey = format(date, 'yyyy-MM')
      const monthIncome = transactions
        .filter(t => t.date.startsWith(monthKey) && t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      if (monthIncome > 0) {
        totalIncomeLast3Months += monthIncome
        countMonths++
      }
    }
    
    const averageIncome = countMonths > 0 ? totalIncomeLast3Months / countMonths : 0
    // Límite sugerido: 70% del ingreso promedio (regla 50/30/20 modificada)
    const suggestedLimit = averageIncome * 0.7
    setMonthlyLimit(suggestedLimit)

    const filtered = transactions.filter(t => {
      const transactionDate = parseISO(t.date)
      const [year, month] = filter.month.split('-')
      const start = startOfMonth(new Date(year, month - 1))
      const end = endOfMonth(new Date(year, month - 1))
      
      return isWithinInterval(transactionDate, { start, end }) &&
        (filter.category === 'all' || t.category === filter.category)
    })

    const totalIncome = filtered
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    
    const totalExpense = filtered
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    
    const balance = totalIncome - totalExpense
    const limitPercentage = suggestedLimit > 0 ? (totalExpense / suggestedLimit) * 100 : 0

    // Gastos por categoría
    const expensesByCategory = filtered
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount)
        return acc
      }, {})

    const categoryData = Object.entries(expensesByCategory).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }))

    // Ingresos vs Gastos por mes (últimos 6 meses)
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i)
      const monthKey = format(date, 'yyyy-MM')
      const monthName = format(date, 'MMM', { locale: es })
      
      const monthIncome = transactions
        .filter(t => t.date.startsWith(monthKey) && t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      const monthExpense = transactions
        .filter(t => t.date.startsWith(monthKey) && t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      monthlyData.push({
        month: monthName,
        ingresos: monthIncome,
        gastos: monthExpense,
        ahorro: monthIncome - monthExpense
      })
    }

    // Tendencia de gastos
    const expenseTrend = monthlyData.map(item => ({
      month: item.month,
      gastos: item.gastos
    }))

    return {
      totalIncome,
      totalExpense,
      balance,
      categoryData,
      monthlyData,
      expenseTrend,
      filteredTransactions: filtered,
      suggestedLimit,
      limitPercentage,
      averageIncome
    }
  }, [transactions, filter])

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    playSound('click')
    try {
      // Obtener información completa de la categoría
      const categoryInfo = getCategoryById(newTransaction.category, newTransaction.type)
      
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: newTransaction.type,
          amount: parseFloat(newTransaction.amount),
          category: categoryInfo.name,
          description: newTransaction.description,
          date: newTransaction.date
        }])
        .select()
      
      if (error) throw error
      
      playSound('success')
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 500)
      
      setTransactions([data[0], ...transactions])
      setNewTransaction({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
      })
      setShowForm(false)
    } catch (err) {
      playSound('error')
      console.error('Error al agregar transacción:', err)
      alert('Error al agregar transacción: ' + err.message)
    }
  }

  // Probar conexión a Supabase
  const runDiagnostic = async () => {
    playSound('click')
    setIsTesting(true)
    try {
      const results = await testSupabaseConnection()
      setDiagnosticResult(results)
      setShowDiagnostic(true)
    } catch (err) {
      console.error('Error en diagnóstico:', err)
    } finally {
      setIsTesting(false)
    }
  }

  // Exportar a Excel
  const exportToExcel = () => {
    playSound('success')
    const dataToExport = stats.filteredTransactions.map(t => ({
      Fecha: t.date,
      Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
      Categoría: t.category,
      Descripción: t.description,
      Monto: t.amount
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones')
    
    const statsData = [
      { Concepto: 'Total Ingresos', Valor: stats.totalIncome },
      { Concepto: 'Total Gastos', Valor: stats.totalExpense },
      { Concepto: 'Balance', Valor: stats.balance },
      { Concepto: 'Límite Mensual Sugerido', Valor: stats.suggestedLimit },
      { Concepto: 'Porcentaje Usado', Valor: `${stats.limitPercentage.toFixed(1)}%` }
    ]
    const wsStats = XLSX.utils.json_to_sheet(statsData)
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas')
    
    XLSX.writeFile(wb, `finanzas_${filter.month}.xlsx`)
  }

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category))
    return ['all', ...Array.from(cats)]
  }, [transactions])

  if (loading) return <div className="loading">Cargando datos...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="app">
      {/* Header Elegante Retro */}
      <header className="header">
        <h1>Mis Finanzas</h1>
        <div className="header-actions">
          <button className="theme-toggle" onMouseEnter={() => playSound('hover')} onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Claro' : 'Oscuro'}
          </button>
          <button onMouseEnter={() => playSound('hover')} onClick={() => { playSound('click'); setShowForm(true) }} className="btn-primary">
            + Nueva
          </button>
          <button onMouseEnter={() => playSound('hover')} onClick={exportToExcel} className="btn-secondary">
            Excel
          </button>
          <button onMouseEnter={() => playSound('hover')} onClick={fetchTransactions} className="btn-refresh">
            Actualizar
          </button>
          <button 
            onMouseEnter={() => playSound('hover')} 
            onClick={runDiagnostic} 
            className="btn-diagnostic"
            disabled={isTesting}
          >
            {isTesting ? '⏳' : '🔧'} {isTesting ? 'Probando...' : 'Diagnosticar'}
          </button>
        </div>
      </header>

      {/* Consejo Diario Elegante */}
      <div className="daily-tip">
        <div className="tip-content">
          "{dailyTip.tip}"
        </div>
        <span className="tip-category">{dailyTip.category}</span>
      </div>

      {/* Navegación Elegante */}
      <nav className="section-nav">
        <button 
          className={`nav-btn ${activeSection === 'dashboard' ? 'active' : ''}`}
          onMouseEnter={() => playSound('hover')}
          onClick={() => { playSound('click'); setActiveSection('dashboard') }}
        >
          Dashboard
        </button>
        <button 
          className={`nav-btn ${activeSection === 'transactions' ? 'active' : ''}`}
          onMouseEnter={() => playSound('hover')}
          onClick={() => { playSound('click'); setActiveSection('transactions') }}
        >
          Transacciones
        </button>
        <button 
          className={`nav-btn ${activeSection === 'analytics' ? 'active' : ''}`}
          onMouseEnter={() => playSound('hover')}
          onClick={() => { playSound('click'); setActiveSection('analytics') }}
        >
          Análisis
        </button>
        <button 
          className={`nav-btn ${activeSection === 'limits' ? 'active' : ''}`}
          onMouseEnter={() => playSound('hover')}
          onClick={() => { playSound('click'); setActiveSection('limits') }}
        >
          Límites
        </button>
      </nav>

      {/* Sección Dashboard */}
      {activeSection === 'dashboard' && (
        <section className="section">
          <h2 className="section-title">Resumen Financiero</h2>
          
          {/* Filtros */}
          <div className="filters">
            <div className="filter-group">
              <label>Período</label>
              <input 
                type="month" 
                value={filter.month}
                onChange={(e) => setFilter({...filter, month: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label>Categoría</label>
              <select 
                value={filter.category}
                onChange={(e) => setFilter({...filter, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Todas' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Límite Mensual */}
          <div className="monthly-limit">
            <h4>Límite Mensual de Gastos</h4>
            <div className="limit-info">
              <span>Límite sugerido: S/. {stats.suggestedLimit.toFixed(2)}</span>
              <span>Gastado: S/. {stats.totalExpense.toFixed(2)} ({stats.limitPercentage.toFixed(1)}%)</span>
            </div>
            <div className="limit-progress">
              <div 
                className={`limit-progress-fill ${stats.limitPercentage > 100 ? 'danger' : stats.limitPercentage > 80 ? 'warning' : ''}`}
                style={{ width: `${Math.min(stats.limitPercentage, 100)}%` }}
              ></div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Basado en tu ingreso promedio de los últimos 3 meses: S/. {stats.averageIncome.toFixed(2)}
            </p>
          </div>

          {/* Estadísticas */}
          <div className="stats">
            <div className="stat-card">
              <h3>Ingresos</h3>
              <p className="income">S/. {stats.totalIncome.toFixed(2)}</p>
              <div className="limit-info">Meta mensual: 100%</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="stat-card">
              <h3>Gastos</h3>
              <p className="expense">S/. {stats.totalExpense.toFixed(2)}</p>
              <div className="limit-info">
                Límite: S/. {stats.suggestedLimit.toFixed(2)} ({stats.limitPercentage.toFixed(1)}%)
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${stats.limitPercentage > 100 ? 'danger' : stats.limitPercentage > 80 ? 'warning' : ''}`}
                  style={{ width: `${Math.min(stats.limitPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="stat-card">
              <h3>Balance</h3>
              <p className={`balance ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
                S/. {stats.balance.toFixed(2)}
              </p>
              <div className="limit-info">
                {stats.balance >= 0 ? '✓ Por encima del presupuesto' : '⚠ Por debajo del presupuesto'}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="charts">
            <div className="chart-container trend-chart">
              <div className="chart-header">
                <div className="chart-title-section">
                  <h3>📈 Tendencia de Gastos</h3>
                  <span className="chart-subtitle">Últimos 6 meses</span>
                </div>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-dot expense"></span>
                    Gastos
                  </span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ea4335" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ea4335" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34a853" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#34a853" stopOpacity={0.05}/>
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#5f6368" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#5f6368" 
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `S/.${value}`}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="gastos" 
                      stroke="#ea4335" 
                      strokeWidth={3}
                      fill="url(#expenseGradient)"
                      dot={{ 
                        fill: '#ea4335', 
                        stroke: '#fff', 
                        strokeWidth: 3,
                        r: 6 
                      }}
                      activeDot={{ 
                        r: 10, 
                        fill: '#ea4335',
                        stroke: '#fff',
                        strokeWidth: 4,
                        filter: 'url(#glow)'
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-stats">
                <div className="chart-stat">
                  <span className="stat-label">Promedio mensual</span>
                  <span className="stat-value expense">
                    S/. {(stats.monthlyData.reduce((sum, m) => sum + m.gastos, 0) / stats.monthlyData.length).toFixed(2)}
                  </span>
                </div>
                <div className="chart-stat">
                  <span className="stat-label">Mes más alto</span>
                  <span className="stat-value">
                    S/. {Math.max(...stats.monthlyData.map(m => m.gastos)).toFixed(2)}
                  </span>
                </div>
                <div className="chart-stat">
                  <span className="stat-label">Mes más bajo</span>
                  <span className="stat-value">
                    S/. {Math.min(...stats.monthlyData.map(m => m.gastos)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="chart-container pie-chart">
              <div className="chart-header">
                <div className="chart-title-section">
                  <h3>🥧 Distribución de Gastos</h3>
                  <span className="chart-subtitle">Por categoría</span>
                </div>
              </div>
              <div className="chart-wrapper pie-wrapper">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.categoryData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.categoryData.slice(0, 6).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ payload }) => {
                        if (payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="custom-tooltip">
                              <p className="tooltip-label">{data.name}</p>
                              <p className="tooltip-value">S/. {data.value.toFixed(2)}</p>
                              <p className="tooltip-percent">
                                {((data.value / stats.totalExpense) * 100).toFixed(1)}% del total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-center">
                  <span className="pie-total-label">Total</span>
                  <span className="pie-total-value">S/. {stats.totalExpense.toFixed(2)}</span>
                </div>
              </div>
              <div className="pie-legend">
                {stats.categoryData.slice(0, 6).map((entry, index) => (
                  <div key={entry.name} className="pie-legend-item">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></span>
                    <span className="legend-name">{entry.name}</span>
                    <span className="legend-percent">
                      {((entry.value / stats.totalExpense) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sección Transacciones */}
      {activeSection === 'transactions' && (
        <section className="section transactions-section">
          <div className="transactions-header">
            <div className="transactions-title">
              <h2>📋 Historial de Transacciones</h2>
              <span className="transactions-count">{stats.filteredTransactions.length} transacciones</span>
            </div>
            <button 
              onMouseEnter={() => playSound('hover')} 
              onClick={() => { playSound('click'); setShowForm(true) }} 
              className="btn-primary btn-add"
            >
              <span className="btn-icon">+</span>
              <span className="btn-text">Nueva Transacción</span>
            </button>
          </div>

          {/* Resumen rápido */}
          <div className="transactions-summary">
            <div className="summary-item">
              <span className="summary-label">Ingresos</span>
              <span className="summary-value income">S/. {stats.totalIncome.toFixed(2)}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">Gastos</span>
              <span className="summary-value expense">S/. {stats.totalExpense.toFixed(2)}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">Balance</span>
              <span className={`summary-value ${stats.balance >= 0 ? 'income' : 'expense'}`}>
                S/. {stats.balance.toFixed(2)}
              </span>
            </div>
          </div>
          
          {stats.filteredTransactions.length === 0 ? (
            <div className="no-data-modern">
              <div className="no-data-icon">📭</div>
              <h3>No hay transacciones</h3>
              <p>Agrega tu primera transacción para comenzar a controlar tus finanzas</p>
              <button 
                onClick={() => { playSound('click'); setShowForm(true) }} 
                className="btn-primary"
              >
                + Agregar Transacción
              </button>
            </div>
          ) : (
            <>
              {/* Vista de tarjetas para móvil */}
              <div className="transactions-cards">
                {stats.filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className={`transaction-card ${transaction.type}`}>
                    <div className="card-header">
                      <span className="card-date">{format(parseISO(transaction.date), 'dd MMM yyyy')}</span>
                      <span className={`card-type ${transaction.type}`}>
                        {transaction.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="card-category">
                        <span className="card-icon">{getCategoryIconByName(transaction.category, transaction.type)}</span>
                        <span>{transaction.category}</span>
                      </div>
                      <div className="card-description">{transaction.description}</div>
                    </div>
                    <div className="card-footer">
                      <span className={`card-amount ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}S/. {Math.abs(transaction.amount).toFixed(2)}
                      </span>
                      <button 
                        className="card-delete"
                        onClick={async () => {
                          playSound('click')
                          if (confirm('¿Eliminar esta transacción?')) {
                            playSound('delete')
                            await supabase.from('transactions').delete().eq('id', transaction.id)
                            setTransactions(transactions.filter(t => t.id !== transaction.id))
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista de tabla para escritorio */}
              <div className="table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th className="th-date">Fecha</th>
                      <th className="th-description">Descripción</th>
                      <th className="th-category">Categoría</th>
                      <th className="th-amount">Monto</th>
                      <th className="th-type">Tipo</th>
                      <th className="th-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className={`transaction-row ${transaction.type}`}>
                        <td className="td-date">
                          <div className="date-cell">
                            <span className="date-day">{format(parseISO(transaction.date), 'dd')}</span>
                            <span className="date-month">{format(parseISO(transaction.date), 'MMM')}</span>
                          </div>
                        </td>
                        <td className="td-description">
                          <span className="description-text">{transaction.description}</span>
                        </td>
                        <td className="td-category">
                          <span className="category-pill">
                            <span className="pill-icon">{getCategoryIconByName(transaction.category, transaction.type)}</span>
                            <span className="pill-text">{transaction.category}</span>
                          </span>
                        </td>
                        <td className={`td-amount ${transaction.type}`}>
                          <span className="amount-value">
                            {transaction.type === 'income' ? '+' : '-'}S/. {Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="td-type">
                          <span className={`type-badge ${transaction.type}`}>
                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                          </span>
                        </td>
                        <td className="td-actions">
                          <button 
                            className="action-btn delete-btn"
                            onMouseEnter={() => playSound('hover')}
                            onClick={async () => {
                              playSound('click')
                              if (confirm('¿Eliminar esta transacción?')) {
                                playSound('delete')
                                await supabase.from('transactions').delete().eq('id', transaction.id)
                                setTransactions(transactions.filter(t => t.id !== transaction.id))
                              }
                            }}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* Sección Análisis */}
      {activeSection === 'analytics' && (
        <section className="section analytics-section">
          <h2 className="section-title">📊 Análisis Detallado</h2>
          
          {/* Resumen ejecutivo */}
          <div className="analytics-summary">
            <div className="summary-card income-card">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <span className="summary-label">Total Ingresos</span>
                <span className="summary-value income">S/. {stats.totalIncome.toFixed(2)}</span>
              </div>
            </div>
            <div className="summary-card expense-card">
              <div className="summary-icon">📉</div>
              <div className="summary-content">
                <span className="summary-label">Total Gastos</span>
                <span className="summary-value expense">S/. {stats.totalExpense.toFixed(2)}</span>
              </div>
            </div>
            <div className="summary-card balance-card">
              <div className="summary-icon">💰</div>
              <div className="summary-content">
                <span className="summary-label">Balance</span>
                <span className={`summary-value ${stats.balance >= 0 ? 'income' : 'expense'}`}>
                  S/. {stats.balance.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="summary-card savings-card">
              <div className="summary-icon">🎯</div>
              <div className="summary-content">
                <span className="summary-label">Tasa de Ahorro</span>
                <span className="summary-value">
                  {stats.totalIncome > 0 ? ((stats.balance / stats.totalIncome) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico principal */}
          <div className="analytics-chart-main">
            <div className="chart-header">
              <h3>📈 Tendencia de Ingresos vs Gastos</h3>
              <span className="chart-period">Últimos 6 meses</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34a853" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#34a853" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea4335" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ea4335" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="month" stroke="#5f6368" fontSize={12} />
                <YAxis stroke="#5f6368" fontSize={12} tickFormatter={(value) => `S/.${value}`} />
                <Tooltip 
                  contentStyle={{
                    background: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    padding: '12px'
                  }}
                  formatter={(value) => [`S/. ${value.toFixed(2)}`, '']}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="ingresos" fill="url(#incomeGradient)" name="Ingresos" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gastos" fill="url(#expenseGradient)" name="Gastos" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grid de gráficos secundarios */}
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>🥧 Distribución de Gastos</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.categoryData.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.categoryData.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`S/. ${value.toFixed(2)}`, 'Monto']}
                    contentStyle={{
                      background: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="analytics-card">
              <h3>📊 Top Categorías de Gasto</h3>
              <div className="category-ranking">
                {stats.categoryData.slice(0, 5).map((category, index) => (
                  <div key={category.name} className="rank-item">
                    <div className="rank-position">
                      <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                    </div>
                    <div className="rank-info">
                      <span className="rank-name">{category.name}</span>
                      <div className="rank-bar-container">
                        <div 
                          className="rank-bar"
                          style={{ 
                            width: `${(category.value / stats.categoryData[0]?.value) * 100}%`,
                            background: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="rank-value">
                      <span className="rank-amount">S/. {category.value.toFixed(2)}</span>
                      <span className="rank-percent">
                        {((category.value / stats.totalExpense) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de categorías mejorada */}
          <div className="analytics-categories">
            <h3>📁 Todas las Categorías</h3>
            <div className="categories-grid">
              {stats.categoryData.map((category, index) => (
                <div key={category.name} className="category-card">
                  <div className="category-header" style={{ borderColor: COLORS[index % COLORS.length] }}>
                    <span className="category-icon-large">{getCategoryIconByName(category.name, 'expense')}</span>
                    <span className="category-name-large">{category.name}</span>
                  </div>
                  <div className="category-body">
                    <div className="category-amount">S/. {category.value.toFixed(2)}</div>
                    <div className="category-percent">
                      <div className="percent-bar">
                        <div 
                          className="percent-fill"
                          style={{ 
                            width: `${(category.value / stats.totalExpense) * 100}%`,
                            background: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                      <span>{((category.value / stats.totalExpense) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sección Límites */}
      {activeSection === 'limits' && (
        <section className="section">
          <h2 className="section-title">Límites y Metas</h2>
          
          <div className="monthly-limit" style={{ background: 'var(--bg-tertiary)' }}>
            <h4>Recomendación de Límite</h4>
            <p style={{ marginBottom: '15px' }}>
              Basado en tu ingreso promedio de los últimos 3 meses (<strong>S/. {stats.averageIncome.toFixed(2)}</strong>),
              te recomendamos un límite mensual de gastos de <strong>S/. {stats.suggestedLimit.toFixed(2)}</strong>.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Esto representa el 70% de tus ingresos, siguiendo la regla 50/30/20 modificada:
              50% necesidades, 20% ahorro e inversiones, y 30% para gastos discretionales.
            </p>
          </div>

          <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="stat-card">
              <h3>Gastos del Mes Actual</h3>
              <p className="expense">S/. {stats.totalExpense.toFixed(2)}</p>
              <div className="limit-info">
                Límite: S/. {stats.suggestedLimit.toFixed(2)}
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${stats.limitPercentage > 100 ? 'danger' : stats.limitPercentage > 80 ? 'warning' : ''}`}
                  style={{ width: `${Math.min(stats.limitPercentage, 100)}%` }}
                ></div>
              </div>
              <div style={{ 
                marginTop: '15px', 
                padding: '12px', 
                background: stats.limitPercentage > 100 ? 'rgba(169, 68, 66, 0.1)' : stats.limitPercentage > 80 ? 'rgba(212, 160, 23, 0.1)' : 'rgba(90, 143, 90, 0.1)',
                borderRadius: '4px',
                textAlign: 'center',
                border: `1px solid ${stats.limitPercentage > 100 ? 'var(--danger)' : stats.limitPercentage > 80 ? 'var(--warning)' : 'var(--success)'}`
              }}>
                {stats.limitPercentage > 100 ? (
                  <span style={{ color: 'var(--danger)' }}>⚠ Has excedido tu límite en S/. {(stats.totalExpense - stats.suggestedLimit).toFixed(2)}</span>
                ) : stats.limitPercentage > 80 ? (
                  <span style={{ color: 'var(--warning)' }}>⚡ Cuidado, te acercas a tu límite</span>
                ) : (
                  <span style={{ color: 'var(--success)' }}>✓ Vas por buen camino</span>
                )}
              </div>
            </div>
            
            <div className="stat-card">
              <h3>Ahorro Potencial</h3>
              <p className="income">S/. {(stats.suggestedLimit - stats.totalExpense).toFixed(2)}</p>
              <div className="limit-info">
                {stats.suggestedLimit - stats.totalExpense > 0 ? 
                  'Puedes ahorrar este mes' : 
                  'Necesitas reducir gastos'}
              </div>
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '4px',
                fontSize: '0.9rem',
                border: '1px solid var(--border-color)'
              }}>
                <strong>Consejos para ahorrar:</strong>
                <ul style={{ marginTop: '10px', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                  <li style={{ marginBottom: '5px' }}>Revisa suscripciones innecesarias</li>
                  <li style={{ marginBottom: '5px' }}>Cocina en casa más seguido</li>
                  <li style={{ marginBottom: '5px' }}>Usa transporte público cuando sea posible</li>
                  <li style={{ marginBottom: '5px' }}>Espera 24h antes de compras no esenciales</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ marginTop: '30px' }}>
            <h3>Tendencia de Gastos vs Límite</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip 
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontFamily: 'Courier Prime, monospace'
                  }}
                />
                <Legend />
                <Bar dataKey="gastos" fill="var(--danger)" name="Gastos" />
                <Bar 
                  dataKey={() => stats.suggestedLimit} 
                  fill="var(--accent-gold)" 
                  name="Límite Sugerido" 
                  opacity={0.3}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Modal para nueva transacción */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Nueva Transacción</h2>
              <button className="modal-close" onMouseEnter={() => playSound('hover')} onClick={() => { playSound('click'); setShowForm(false) }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tipo</label>
                <select 
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  required
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Monto</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Categoría</label>
                <select 
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {newTransaction.type === 'expense' 
                    ? EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))
                    : INCOME_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))
                  }
                </select>
              </div>
              
              <div className="form-group">
                <label>Descripción</label>
                <input 
                  type="text"
                  placeholder="Descripción"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Fecha</label>
                <input 
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onMouseEnter={() => playSound('hover')} onClick={() => { playSound('click'); setShowForm(false) }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" onMouseEnter={() => playSound('hover')}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Diagnóstico */}
      {showDiagnostic && diagnosticResult && (
        <div className="modal-overlay" onClick={() => setShowDiagnostic(false)}>
          <div className="modal diagnostic-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔧 Diagnóstico de Conexión</h2>
              <button className="modal-close" onClick={() => setShowDiagnostic(false)}>×</button>
            </div>
            
            <div className={`diagnostic-result ${getDiagnosticMessage(diagnosticResult).type}`}>
              <div className="diagnostic-icon">
                {getDiagnosticMessage(diagnosticResult).type === 'success' && '✅'}
                {getDiagnosticMessage(diagnosticResult).type === 'warning' && '⚠️'}
                {getDiagnosticMessage(diagnosticResult).type === 'error' && '❌'}
              </div>
              <h3>{getDiagnosticMessage(diagnosticResult).title}</h3>
              <p>{getDiagnosticMessage(diagnosticResult).message}</p>
              <div className="diagnostic-solution">
                <strong>Solución:</strong> {getDiagnosticMessage(diagnosticResult).solution}
              </div>
            </div>

            <div className="diagnostic-details">
              <h4>Detalles técnicos:</h4>
              <div className="detail-item">
                <span className="detail-label">URL configurada:</span>
                <span className={`detail-value ${diagnosticResult.envVars.url !== 'NO CONFIGURADA' ? 'ok' : 'error'}`}>
                  {diagnosticResult.envVars.url !== 'NO CONFIGURADA' ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">API Key configurada:</span>
                <span className={`detail-value ${diagnosticResult.envVars.keyExists ? 'ok' : 'error'}`}>
                  {diagnosticResult.envVars.keyExists ? '✅ Sí' : '❌ No'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Conexión:</span>
                <span className={`detail-value ${diagnosticResult.connection ? 'ok' : 'error'}`}>
                  {diagnosticResult.connection ? '✅ OK' : '❌ Fallida'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tabla existe:</span>
                <span className={`detail-value ${diagnosticResult.tableExists ? 'ok' : 'error'}`}>
                  {diagnosticResult.tableExists ? '✅ Sí' : '❌ No'}
                </span>
              </div>
            </div>

            <div className="diagnostic-actions">
              <button onClick={() => { setShowDiagnostic(false); runDiagnostic() }} className="btn-primary">
                🔄 Probar de nuevo
              </button>
              <button onClick={() => setShowDiagnostic(false)} className="btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat de Voz */}
      <VoiceChat stats={stats} />
    </div>
  )
}

export default App