import { useState, useEffect, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts'
import * as XLSX from 'xlsx'
import { useSound } from './hooks/useSound'
import VoiceChat from './components/VoiceChat'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryById } from './data/categories'
import './App.css'

const COLORS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01', '#46bdc6']

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
          category_id: newTransaction.category,
          category_icon: categoryInfo.icon,
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
            <div className="chart-container">
              <h3>Tendencia de Gastos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.expenseTrend}>
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
                  <Line 
                    type="monotone" 
                    dataKey="gastos" 
                    stroke="var(--accent-copper)" 
                    strokeWidth={3}
                    dot={{ fill: 'var(--accent-gold)', strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-container">
              <h3>Distribución de Gastos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.categoryData.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="var(--accent-gold)"
                    dataKey="value"
                  >
                    {stats.categoryData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`S/. ${value.toFixed(2)}`, 'Monto']}
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontFamily: 'Courier Prime, monospace'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Sección Transacciones */}
      {activeSection === 'transactions' && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Historial</h2>
            <button onMouseEnter={() => playSound('hover')} onClick={() => { playSound('click'); setShowForm(true) }} className="btn-primary">
              + Agregar
            </button>
          </div>
          
          {stats.filteredTransactions.length === 0 ? (
            <div className="no-data">
              No hay transacciones en este período
            </div>
          ) : (
            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Monto</th>
                    <th>Tipo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{format(parseISO(transaction.date), 'dd/MM/yyyy')}</td>
                      <td>{transaction.description}</td>
                      <td>
                        <span className="category-badge">
                          {transaction.category_icon && <span className="category-icon">{transaction.category_icon}</span>}
                          {transaction.category}
                        </span>
                      </td>
                      <td className={transaction.type === 'income' ? 'income' : 'expense'}>
                        {transaction.type === 'income' ? '+' : '-'}S/. {Math.abs(transaction.amount).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${transaction.type}`}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-delete"
                          onMouseEnter={() => playSound('hover')}
                          onClick={async () => {
                            playSound('click')
                            if (confirm('¿Eliminar esta transacción?')) {
                              playSound('delete')
                              await supabase.from('transactions').delete().eq('id', transaction.id)
                              setTransactions(transactions.filter(t => t.id !== transaction.id))
                            }
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Sección Análisis */}
      {activeSection === 'analytics' && (
        <section className="section">
          <h2 className="section-title">Análisis Detallado</h2>
          
          <div className="charts" style={{ gridTemplateColumns: '1fr' }}>
            <div className="chart-container">
              <h3>Ingresos vs Gastos (Últimos 6 meses)</h3>
              <ResponsiveContainer width="100%" height={300}>
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
                  <Bar dataKey="ingresos" fill="var(--success)" name="Ingresos" />
                  <Bar dataKey="gastos" fill="var(--danger)" name="Gastos" />
                  <Bar dataKey="ahorro" fill="var(--accent-gold)" name="Ahorro" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {stats.categoryData.map((category, index) => (
              <div key={category.name} className="stat-card">
                <h3>{category.name}</h3>
                <p className="expense">S/. {category.value.toFixed(2)}</p>
                <div className="limit-info">
                  {((category.value / stats.totalExpense) * 100).toFixed(1)}% del total
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${(category.value / stats.totalExpense) * 100}%`,
                      background: COLORS[index % COLORS.length]
                    }}
                  ></div>
                </div>
              </div>
            ))}
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

      {/* Chat de Voz */}
      <VoiceChat stats={stats} />
    </div>
  )
}

export default App