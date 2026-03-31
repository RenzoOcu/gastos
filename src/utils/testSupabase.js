import { supabase } from '../lib/supabase'

// Función para probar la conexión a Supabase
export const testSupabaseConnection = async () => {
  const results = {
    envVars: {
      url: import.meta.env.VITE_SUPABASE_URL || 'NO CONFIGURADA',
      keyExists: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    },
    connection: false,
    tableExists: false,
    insertTest: false,
    error: null
  }

  try {
    // Verificar variables de entorno
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      results.error = '❌ Variables de entorno no configuradas en Vercel'
      return results
    }

    // Probar conexión básica
    const { data, error } = await supabase.from('transactions').select('id').limit(1)
    
    if (error) {
      results.error = `❌ Error de conexión: ${error.message}`
      
      // Si el error es sobre la tabla, la conexión está bien
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        results.connection = true
        results.error = '✅ Conexión OK, pero la tabla no existe'
      }
    } else {
      results.connection = true
      results.tableExists = true
    }

    // Probar inserción
    if (results.connection) {
      const testData = {
        type: 'expense',
        amount: 1,
        category: 'Test',
        description: 'Test connection',
        date: new Date().toISOString().split('T')[0]
      }

      const { data: insertData, error: insertError } = await supabase
        .from('transactions')
        .insert([testData])
        .select()

      if (insertError) {
        results.error = `❌ Error al insertar: ${insertError.message}`
      } else {
        results.insertTest = true
        
        // Eliminar el registro de prueba
        if (insertData && insertData[0]) {
          await supabase.from('transactions').delete().eq('id', insertData[0].id)
        }
      }
    }

  } catch (err) {
    results.error = `❌ Error inesperado: ${err.message}`
  }

  return results
}

// Función para mostrar diagnóstico en la UI
export const getDiagnosticMessage = (results) => {
  if (!results.envVars.url || results.envVars.url === 'NO CONFIGURADA') {
    return {
      type: 'error',
      title: 'Variables de entorno no configuradas',
      message: 'Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están configuradas en Vercel.',
      solution: 'Ve a Vercel → Settings → Environment Variables y configura las variables.'
    }
  }

  if (!results.connection) {
    return {
      type: 'error',
      title: 'No se puede conectar a Supabase',
      message: results.error,
      solution: 'Verifica que la URL y la API key sean correctas.'
    }
  }

  if (!results.tableExists) {
    return {
      type: 'warning',
      title: 'Tabla no encontrada',
      message: 'La conexión está bien, pero la tabla "transactions" no existe.',
      solution: 'Crea la tabla en Supabase SQL Editor.'
    }
  }

  if (!results.insertTest) {
    return {
      type: 'error',
      title: 'Error al insertar datos',
      message: results.error,
      solution: 'Verifica los permisos RLS en la tabla transactions.'
    }
  }

  return {
    type: 'success',
    title: 'Conexión exitosa',
    message: 'Todo está configurado correctamente.',
    solution: 'Puedes agregar transacciones normalmente.'
  }
}