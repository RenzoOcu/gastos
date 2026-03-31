// Categorías predefinidas para ingresos y gastos
export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Alimentación', icon: '🍔', color: '#ea4335' },
  { id: 'transport', name: 'Transporte', icon: '🚗', color: '#fbbc04' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎬', color: '#9c27b0' },
  { id: 'services', name: 'Servicios', icon: '💡', color: '#00bcd4' },
  { id: 'health', name: 'Salud', icon: '💊', color: '#4caf50' },
  { id: 'education', name: 'Educación', icon: '📚', color: '#2196f3' },
  { id: 'home', name: 'Hogar', icon: '🏠', color: '#795548' },
  { id: 'clothing', name: 'Vestimenta', icon: '👕', color: '#607d8b' },
  { id: 'technology', name: 'Tecnología', icon: '💻', color: '#673ab7' },
  { id: 'personal', name: 'Cuidado Personal', icon: '🛁', color: '#e91e63' },
  { id: 'gifts', name: 'Regalos', icon: '🎁', color: '#ff5722' },
  { id: 'travel', name: 'Viajes', icon: '✈️', color: '#03a9f4' },
  { id: 'sports', name: 'Deportes', icon: '⚽', color: '#8bc34a' },
  { id: 'pets', name: 'Mascotas', icon: '🐕', color: '#ff9800' },
  { id: 'others', name: 'Otros', icon: '📦', color: '#9e9e9e' }
]

export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salario', icon: '💼', color: '#4caf50' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#2196f3' },
  { id: 'sales', name: 'Ventas', icon: '🛒', color: '#9c27b0' },
  { id: 'investment', name: 'Inversiones', icon: '📈', color: '#00bcd4' },
  { id: 'rental', name: 'Alquiler', icon: '🏠', color: '#795548' },
  { id: 'bonus', name: 'Bonos', icon: '💰', color: '#ffc107' },
  { id: 'gifts', name: 'Regalos Recibidos', icon: '🎁', color: '#e91e63' },
  { id: 'refund', name: 'Reembolsos', icon: '↩️', color: '#607d8b' },
  { id: 'dividends', name: 'Dividendos', icon: '📊', color: '#3f51b5' },
  { id: 'other_income', name: 'Otros Ingresos', icon: '💵', color: '#8bc34a' }
]

// Función para obtener categoría por ID
export const getCategoryById = (id, type = 'expense') => {
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  return categories.find(cat => cat.id === id) || categories[categories.length - 1]
}

// Función para obtener todas las categorías
export const getAllCategories = () => ({
  expense: EXPENSE_CATEGORIES,
  income: INCOME_CATEGORIES
})