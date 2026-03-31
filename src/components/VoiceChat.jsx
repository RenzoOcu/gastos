import { useState, useEffect, useRef } from 'react'
import './VoiceChat.css'

// Respuestas del asistente virtual
const ASSISTANT_RESPONSES = {
  greeting: [
    "¡Hola! Soy tu asistente financiero. ¿En qué puedo ayudarte hoy?",
    "¡Bienvenido! Estoy aquí para ayudarte con tus finanzas personales.",
    "¡Hola! Pregúntame lo que quieras sobre tus ingresos, gastos o presupuesto."
  ],
  balance: [
    "Para ver tu balance, revisa la sección de Dashboard donde encontrarás tus ingresos totales, gastos totales y el balance final.",
    "Tu balance es la diferencia entre tus ingresos y gastos. Si es positivo, estás ahorrando. Si es negativo, estás gastando más de lo que ingresas.",
    "Puedes ver tu balance en la tarjeta azul del Dashboard. Te muestra si estás por encima o por debajo de tu presupuesto."
  ],
  expenses: [
    "Para registrar un gasto, haz clic en 'Nueva Transacción', selecciona 'Gasto', ingresa el monto, categoría y descripción.",
    "Los gastos se muestran en rojo en tu tabla de transacciones. Puedes filtrar por mes y categoría.",
    "Te recomiendo registrar todos tus gastos, incluso los pequeños, para tener un control completo de tu dinero."
  ],
  income: [
    "Para registrar un ingreso, haz clic en 'Nueva Transacción', selecciona 'Ingreso', ingresa el monto y la descripción.",
    "Los ingresos se muestran en verde. Incluye tu salario, ingresos extra, vendas, etc.",
    "Llevar un registro de todos tus ingresos te ayuda a entender mejor tu capacidad de ahorro."
  ],
  limit: [
    "Tu límite mensual se calcula automáticamente basado en el 70% de tu ingreso promedio de los últimos 3 meses.",
    "Si superas el 80% de tu límite, recibirás una advertencia. Si lo superas al 100%, estarás gastando demasiado.",
    "Puedes ver tu límite en la sección 'Límites' o en el recuadro azul del Dashboard."
  ],
  tips: [
    "Aquí tienes un consejo: El 50/30/20 es una regla simple: 50% necesidades, 30% deseos, 20% ahorro.",
    "Consejo financiero: Antes de comprar algo no esencial, espera 24 horas. Muchas veces el deseo desaparece.",
    "Tip: Revisa tus suscripciones mensuales. Cancelar las que no usas puede ahorrarte dinero."
  ],
  categories: [
    "Las categorías de gastos incluyen: Alimentación, Transporte, Entretenimiento, Servicios, Salud, Educación, Hogar y Otros.",
    "Las categorías de ingresos incluyen: Salario, Freelance, Ventas, Inversiones, Regalos y Otros.",
    "Usar categorías te ayuda a ver dónde va tu dinero y encontrar áreas donde puedes ahorrar."
  ],
  export: [
    "Para exportar a Excel, haz clic en el botón 'Excel' en la parte superior. Se descargará un archivo con todas tus transacciones y estadísticas.",
    "La exportación incluye dos hojas: una con todas las transacciones y otra con el resumen de ingresos, gastos y balance.",
    "Puedes exportar los datos filtrados por mes y categoría usando los filtros antes de exportar."
  ],
  help: [
    "Puedes preguntarme sobre: balance, gastos, ingresos, límites, categorías, consejos, exportar datos, o cómo usar el sistema.",
    "Estoy aquí para ayudarte con tus finanzas. Pregúntame lo que necesites saber.",
    "¿Tienes dudas sobre cómo registrar transacciones, ver reportes o calcular tu presupuesto? Pregúntame."
  ],
  default: [
    "No estoy seguro de entender tu pregunta. Puedes preguntarme sobre balance, gastos, ingresos, límites o categorías.",
    "Disculpa, no comprendí bien. ¿Puedes preguntarme sobre tus finanzas, cómo registrar transacciones o ver reportes?",
    "No entiendo esa consulta. Prueba preguntando '¿cómo registro un gasto?' o '¿cuál es mi balance?'"
  ]
}

// Palabras clave para identificar intenciones
const KEYWORDS = {
  greeting: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'saludos'],
  balance: ['balance', 'saldo', 'total', 'cuánto tengo', 'resultado', 'diferencia'],
  expenses: ['gasto', 'gastos', 'egreso', 'egresos', 'pagar', 'pago', 'pagos'],
  income: ['ingreso', 'ingresos', 'ganancia', 'ganancias', 'salario', 'sueldo', 'cobro'],
  limit: ['límite', 'limite', 'presupuesto', 'tope', 'máximo', 'maximo'],
  tips: ['consejo', 'consejos', 'tips', 'tip', 'ayuda', 'sugerencia', 'recomendación'],
  categories: ['categoría', 'categorías', 'categoria', 'categorias', 'tipo', 'tipos'],
  export: ['exportar', 'excel', 'descargar', 'archivo', 'reporte', 'informe'],
  help: ['ayuda', 'help', 'cómo', 'como', 'qué puedo', 'que puedo', 'opciones']
}

const VoiceChat = ({ stats, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'es-ES'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        handleUserMessage(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Error de reconocimiento:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    // Mensaje de bienvenida
    setMessages([{
      type: 'assistant',
      text: ASSISTANT_RESPONSES.greeting[0],
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }])
  }, [])

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detectar intención del usuario
  const detectIntent = (text) => {
    const lowerText = text.toLowerCase()
    
    for (const [intent, keywords] of Object.entries(KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return intent
        }
      }
    }
    return 'default'
  }

  // Generar respuesta basada en intención y contexto
  const generateResponse = (intent) => {
    const responses = ASSISTANT_RESPONSES[intent]
    let response = responses[Math.floor(Math.random() * responses.length)]

    // Personalizar respuesta con datos reales si están disponibles
    if (stats) {
      if (intent === 'balance') {
        response = `Tu balance actual es S/. ${stats.balance?.toFixed(2) || '0.00'}. ${
          stats.balance >= 0 
            ? '¡Estás por encima del presupuesto, buen trabajo!' 
            : 'Estás por debajo del presupuesto, revisa tus gastos.'
        }`
      } else if (intent === 'expenses') {
        response = `Este mes has gastado S/. ${stats.totalExpense?.toFixed(2) || '0.00'}. ${
          stats.limitPercentage > 80 
            ? '¡Cuidado! Has usado más del 80% de tu límite.' 
            : 'Vas bien con tus gastos.'
        }`
      } else if (intent === 'income') {
        response = `Este mes has ingresado S/. ${stats.totalIncome?.toFixed(2) || '0.00'}. ¡Sigue así!`
      } else if (intent === 'limit') {
        response = `Tu límite mensual es S/. ${stats.suggestedLimit?.toFixed(2) || '0.00'}. Has usado el ${stats.limitPercentage?.toFixed(1) || '0'}% de tu límite.`
      }
    }

    return response
  }

  // Manejar mensaje del usuario
  const handleUserMessage = (text) => {
    const userMessage = {
      type: 'user',
      text: text,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMessage])

    // Detectar intención y generar respuesta
    setTimeout(() => {
      const intent = detectIntent(text)
      const response = generateResponse(intent)
      
      const assistantMessage = {
        type: 'assistant',
        text: response,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Hablar la respuesta
      speakText(response)
    }, 500)
  }

  // Síntesis de voz
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES'
      utterance.rate = 1
      utterance.pitch = 1
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      window.speechSynthesis.speak(utterance)
    }
  }

  // Iniciar reconocimiento de voz
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  // Detener reconocimiento de voz
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Detener síntesis de voz
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  // Manejar envío de texto
  const handleTextSubmit = (e) => {
    e.preventDefault()
    if (inputText.trim()) {
      handleUserMessage(inputText)
      setInputText('')
    }
  }

  // Preguntas rápidas
  const quickQuestions = [
    "¿Cuál es mi balance?",
    "¿Cuánto he gastado?",
    "¿Cuál es mi límite?",
    "Dame un consejo"
  ]

  return (
    <div className={`voice-chat ${isOpen ? 'open' : ''}`}>
      {/* Botón flotante */}
      <button 
        className="voice-chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Asistente de voz"
      >
        {isOpen ? '✕' : '🎤'}
      </button>

      {/* Panel del chat */}
      {isOpen && (
        <div className="voice-chat-panel">
          <div className="voice-chat-header">
            <h3>🤖 Asistente Financiero</h3>
            <div className="voice-status">
              {isListening && <span className="listening">🔴 Escuchando...</span>}
              {isSpeaking && <span className="speaking">🔊 Hablando...</span>}
            </div>
          </div>

          <div className="voice-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                <div className="message-content">
                  <p>{msg.text}</p>
                  <span className="message-time">{msg.time}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas rápidas */}
          <div className="quick-questions">
            {quickQuestions.map((q, i) => (
              <button 
                key={i} 
                className="quick-question-btn"
                onClick={() => handleUserMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Controles de voz */}
          <div className="voice-controls">
            <button 
              className={`voice-btn ${isListening ? 'active' : ''}`}
              onClick={isListening ? stopListening : startListening}
              disabled={isSpeaking}
            >
              {isListening ? '⏹️ Detener' : '🎤 Hablar'}
            </button>
            
            {isSpeaking && (
              <button className="voice-btn stop" onClick={stopSpeaking}>
                ⏹️ Detener voz
              </button>
            )}
          </div>

          {/* Input de texto */}
          <form onSubmit={handleTextSubmit} className="voice-chat-input">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe tu pregunta..."
              disabled={isListening}
            />
            <button type="submit" disabled={!inputText.trim() || isListening}>
              ➤
            </button>
          </form>

          <p className="voice-chat-hint">
            💡 Haz clic en "Hablar" o escribe tu pregunta
          </p>
        </div>
      )}
    </div>
  )
}

export default VoiceChat