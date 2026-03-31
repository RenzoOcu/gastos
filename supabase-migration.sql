-- Ejecuta este SQL en el SQL Editor de Supabase
-- Ve a: https://dzwponszrflptckeygyd.supabase.co → SQL Editor → New Query

-- Agregar columnas faltantes a la tabla transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id TEXT,
ADD COLUMN IF NOT EXISTS category_icon TEXT;

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';