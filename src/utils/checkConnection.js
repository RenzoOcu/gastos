import { supabase } from '../lib/supabase'

// Función para verificar la conexión a Supabase
export const checkSupabaseConnection = async () => {
  const results = {
    urlConfigured: false,
    keyConfigured: false,
    connectionOk: false,
    tablesExist: false,
    error: null
  }

  // Verificar si las variables de entorno están configuradas
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  results.urlConfigured = !!supabaseUrl && supabaseUrl !== 'undefined'
  results.keyConfigured = !!supabaseKey && supabaseKey !== 'undefined'

  if (!results.urlConfigured || !results.keyConfigured) {
    results.error = 'Variables de entorno no configuradas correctamente'
    return results
  }

  try {
    // Intentar una consulta simple
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .limit(1)

    if (error) {
      results.error = error.message
      // Si el error es sobre la tabla no existente, la conexión está bien
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        results.connectionOk = true
        results.tablesExist = false
      }
    } else {
      results.connectionOk = true
      results.tablesExist = true
    }
  } catch (err) {
    results.error = err.message
  }

  return results
}

// Función para mostrar diagnóstico en consola
export const logDiagnostics = async () => {
  console.log('🔍 Diagnosticando conexión a Supabase...')
  
  const results = await checkSupabaseConnection()
  
  console.log('📋 Resultados:')
  console.log(`   URL configurada: ${results.urlConfigured ? '✅' : '❌'}`)
  console.log(`   Key configurada: ${results.keyConfigured ? '✅' : '❌'}`)
  console.log(`   Conexión OK: ${results.connectionOk ? '✅' : '❌'}`)
  console.log(`   Tablas existen: ${results.tablesExist ? '✅' : '❌'}`)
  
  if (results.error) {
    console.log(`   Error: ${results.error}`)
  }
  
  if (!results.urlConfigured || !results.keyConfigured) {
    console.log('\n⚠️  CONFIGURA LAS VARIABLES DE ENTORNO EN VERCEL:')
    console.log('   1. Ve a Vercel → Settings → Environment Variables')
    console.log('   2. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
    console.log('   3. Redespliega la aplicación')
  }
  
  return results
}