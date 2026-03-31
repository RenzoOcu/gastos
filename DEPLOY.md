# Instrucciones de Despliegue en Vercel

## 1. Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto "gastos"
3. Ve a **Settings** → **Environment Variables**
4. Agrega estas dos variables:

| Nombre | Valor |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://dzwponszrflptckeygyd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6d3BvbnN6cmZscHRja2V5Z3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODkyNzMsImV4cCI6MjA5MDQ2NTI3M30.U4UogxwiTdlG64At9Y-LbUpWGC-BKNeJ37vsg8PJlpM` |

5. Asegúrate de seleccionar **"Production"**, **"Preview"** y **"Development"** para cada variable.

## 2. Redesplegar

Después de configurar las variables, ve a **Deployments** y haz clic en **"Redeploy"** en el último despliegue.

## 3. Si persiste el problema

1. Ve a **Settings** → **Build & Development Settings**
2. Verifica que el **Framework Preset** sea "Vite"
3. Verifica que el **Build Command** sea: `npm run build`
4. Verifica que el **Output Directory** sea: `dist`

## 4. Solución de Problemas Comunes

### Error de CORS en Supabase
Si ves errores de CORS en la consola, ve a tu proyecto en Supabase:
1. Ve a **Settings** → **API**
2. En **CORS origins**, agrega: `https://gastos-beta-lovat.vercel.app`

### Error de autenticación
Verifica que la anon key sea correcta y que no haya caracteres extra.

### Página en blanco
Abre la consola del navegador (F12) y revisa los errores.

## 5. Verificar el despliegue

1. Abre https://gastos-beta-lovat.vercel.app
2. Abre la consola del navegador (F12)
3. Ve a la pestaña **Console**
4. No deberías ver errores de "SUPABASE_URL is not defined"