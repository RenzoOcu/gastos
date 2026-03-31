require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seedData() {
  const testTransactions = [
    {
      type: 'income',
      amount: 5000,
      category: 'Salario',
      description: 'Salario mensual',
      date: '2026-03-01'
    },
    {
      type: 'expense',
      amount: 150,
      category: 'Alimentación',
      description: 'Supermercado',
      date: '2026-03-02'
    },
    {
      type: 'expense',
      amount: 80,
      category: 'Transporte',
      description: 'Gasolina',
      date: '2026-03-05'
    },
    {
      type: 'income',
      amount: 800,
      category: 'Freelance',
      description: 'Proyecto de diseño',
      date: '2026-03-10'
    },
    {
      type: 'expense',
      amount: 200,
      category: 'Entretenimiento',
      description: 'Cine y cena',
      date: '2026-03-12'
    },
    {
      type: 'expense',
      amount: 120,
      category: 'Servicios',
      description: 'Internet',
      date: '2026-03-15'
    },
    {
      type: 'expense',
      amount: 60,
      category: 'Salud',
      description: 'Medicamentos',
      date: '2026-03-18'
    },
    {
      type: 'income',
      amount: 300,
      category: 'Ventas',
      description: 'Venta de artículos',
      date: '2026-03-20'
    },
    {
      type: 'expense',
      amount: 90,
      category: 'Educación',
      description: 'Curso online',
      date: '2026-03-22'
    },
    {
      type: 'expense',
      amount: 45,
      category: 'Transporte',
      description: 'Taxi',
      date: '2026-03-25'
    }
  ];

  console.log('Insertando datos de prueba...');
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(testTransactions)
    .select();
  
  if (error) {
    console.error('Error al insertar datos:', error);
    return;
  }
  
  console.log(`✅ Se insertaron ${data.length} transacciones de prueba`);
}

seedData().catch(console.error);