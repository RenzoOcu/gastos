require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  console.log('Inspeccionando base de datos...\n');

  // Lista de tablas comunes a probar
  const tables = ['transactions', 'gastos', 'ingresos', 'expense', 'income', 'movimientos', 'registros', 'finanzas'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Tabla '${table}': no existe o sin acceso`);
      } else {
        console.log(`✅ Tabla '${table}': existe (${count} registros)`);
        // Obtener estructura de columnas
        const { data: sampleData, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!sampleError && sampleData && sampleData.length > 0) {
          console.log(`   Columnas: ${Object.keys(sampleData[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ Tabla '${table}': error de conexión`);
    }
  }
}

inspectDatabase().catch(console.error);