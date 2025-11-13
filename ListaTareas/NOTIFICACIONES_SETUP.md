# 📧 Guía de Configuración: Sistema de Notificaciones por Email

Esta guía te llevará paso a paso para configurar el sistema de notificaciones por correo electrónico para tareas urgentes.

## 📋 Requisitos Previos

- ✅ Proyecto desplegado en Vercel
- ✅ Base de datos en Supabase
- ✅ Cuenta de Resend (gratuita)

---

## 🚀 Paso 1: Configurar Resend

### 1.1 Crear cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Haz clic en **"Sign Up"**
3. Registrate con tu email o GitHub
4. Verifica tu email

### 1.2 Obtener API Key

1. Una vez dentro, ve a **"API Keys"** en el menú lateral
2. Haz clic en **"Create API Key"**
3. Dale un nombre (ej: "TaskManager Notifications")
4. Selecciona permisos: **"Sending access"**
5. Copia la API Key generada (empieza con `re_`)

⚠️ **IMPORTANTE**: Guarda esta key de inmediato, no podrás verla de nuevo.

### 1.3 (Opcional) Verificar tu dominio

Por defecto, Resend te permite enviar desde `onboarding@resend.dev`, pero para producción:

1. Ve a **"Domains"** en Resend
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `tuapp.com`)
4. Añade los registros DNS que te proporciona Resend
5. Espera a que se verifique (puede tomar unos minutos)

**Nota**: Con la cuenta gratuita puedes usar `notificaciones@resend.dev` para pruebas.

---

## 🗄️ Paso 2: Configurar Supabase

### 2.1 Instalar Supabase CLI

Si aún no tienes el CLI instalado:

```bash
# Con npm
npm install -g supabase

# O con scoop (Windows)
scoop install supabase
```

### 2.2 Vincular tu proyecto

```bash
# En la raíz de tu proyecto
cd ListaTareas
supabase login
supabase link --project-ref wltrjmcznemnfdpxixma
```

Te pedirá tu **Database Password** de Supabase (la que configuraste al crear el proyecto).

### 2.3 Desplegar la Edge Function

```bash
# Desplegar la función
supabase functions deploy check-urgent-tasks
```

### 2.4 Configurar variables de entorno en Supabase

1. Ve a tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **wltrjmcznemnfdpxixma**
3. Ve a **"Settings"** → **"Edge Functions"** → **"Secrets"**
4. Añade las siguientes variables:

```
RESEND_API_KEY=re_tu_api_key_de_resend_aqui
```

**Importante**: Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente.

### 2.5 Configurar el Cron Job

1. En Supabase, ve a **"Database"** → **"SQL Editor"**
2. Crea un nuevo query
3. Ve a **"Settings"** → **"API"** y copia tu **"service_role"** key
4. Reemplaza `TU_SERVICE_ROLE_KEY_AQUI` en el código SQL siguiente
5. Pega el siguiente código SQL:

```sql
-- Habilitar la extensión pg_cron (solo primera vez)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear el cron job para ejecutar cada hora
-- ⚠️ IMPORTANTE: Reemplaza TU_SERVICE_ROLE_KEY_AQUI con tu service_role key real
SELECT cron.schedule(
  'check-urgent-tasks-hourly',  -- Nombre del job
  '0 * * * *',                   -- Ejecutar cada hora (minuto 0)
  $$
    SELECT
      net.http_post(
        url := 'https://wltrjmcznemnfdpxixma.supabase.co/functions/v1/check-urgent-tasks',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdHJqbWN6bmVtbmZkcHhpeG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg4NzE5OSwiZXhwIjoyMDc4NDYzMTk5fQ.n83-UB5UHEQoj1RlNsHs9YyNWd0UfZ67ifgms8DQHCw'
        ),
        body := '{}'::jsonb
      ) as request_id;
  $$
);

-- Verificar que el cron job se creó correctamente
SELECT * FROM cron.job;
```

6. Ejecuta el query haciendo clic en **"Run"**

**Nota**: He incluido directamente tu service_role key en el SQL del cron job. Esto es seguro porque:
- Solo se ejecuta en tu base de datos de Supabase
- No se expone en el frontend
- El cron job se ejecuta en el contexto de tu base de datos

---

## 🧪 Paso 3: Probar el Sistema

### 3.1 Probar la función manualmente

```bash
# Invocar la función directamente
supabase functions invoke check-urgent-tasks --method POST
```

### 3.2 Crear una tarea de prueba

1. Ve a tu aplicación
2. Crea una tarea con:
   - **Prioridad**: Urgente
   - **Fecha de vencimiento**: Dentro de las próximas 24 horas
   - **Estado**: Pendiente o En progreso
3. Asegúrate de que tu perfil tenga `notification_enabled = true`

### 3.3 Verificar que el usuario tenga notificaciones habilitadas

```sql
-- En Supabase SQL Editor
UPDATE profiles
SET notification_enabled = true
WHERE email = 'tu_email@ejemplo.com';
```

### 3.4 Ejecutar el cron job manualmente (para prueba inmediata)

```sql
-- Ejecutar el job inmediatamente (para pruebas)
-- ⚠️ IMPORTANTE: Usa tu service_role key real
SELECT cron.schedule(
  'test-check-urgent-tasks',
  '* * * * *',  -- Cada minuto (solo para pruebas)
  $$
    SELECT
      net.http_post(
        url := 'https://wltrjmcznemnfdpxixma.supabase.co/functions/v1/check-urgent-tasks',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdHJqbWN6bmVtbmZkcHhpeG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg4NzE5OSwiZXhwIjoyMDc4NDYzMTk5fQ.n83-UB5UHEQoj1RlNsHs9YyNWd0UfZ67ifgms8DQHCw'
        ),
        body := '{}'::jsonb
      ) as request_id;
  $$
);

-- IMPORTANTE: Después de probar, elimina este job de prueba
SELECT cron.unschedule('test-check-urgent-tasks');
```

### 3.5 Revisar logs

Para ver si la función se ejecutó:

```bash
# Ver logs de la función
supabase functions logs check-urgent-tasks
```

O en el dashboard:
1. Ve a **"Edge Functions"**
2. Selecciona **"check-urgent-tasks"**
3. Ve a la pestaña **"Logs"**

---

## 📊 Paso 4: Verificar Resultados

### 4.1 Verificar en la tabla notifications

```sql
-- Ver todas las notificaciones enviadas
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

### 4.2 Verificar que las tareas se marcaron como notificadas

```sql
-- Ver tareas con reminder_sent = true
SELECT id, title, due_date, reminder_sent
FROM todos
WHERE reminder_sent = true
ORDER BY due_date DESC;
```

### 4.3 Verificar en Resend

1. Ve a [https://resend.com/emails](https://resend.com/emails)
2. Verás la lista de emails enviados
3. Puedes ver el estado (enviado, entregado, abierto, etc.)

---

## 🎯 Configuración del Cron Job

### Frecuencias comunes:

```sql
-- Cada hora (recomendado)
'0 * * * *'

-- Cada 30 minutos
'*/30 * * * *'

-- Cada 6 horas
'0 */6 * * *'

-- Solo en horario laboral (9 AM - 6 PM)
'0 9-18 * * *'

-- Solo de lunes a viernes a las 9 AM
'0 9 * * 1-5'
```

Para cambiar la frecuencia:

```sql
-- Eliminar el job existente
SELECT cron.unschedule('check-urgent-tasks-hourly');

-- Crear con nueva frecuencia
SELECT cron.schedule(
  'check-urgent-tasks-hourly',
  '0 */6 * * *',  -- Nueva frecuencia
  $$ ... $$
);
```

---

## 🔧 Personalización

### Cambiar el remitente del email

Edita `supabase/functions/check-urgent-tasks/index.ts`:

```typescript
// Línea ~130
from: 'Tu Nombre <notificaciones@tudominio.com>',
```

### Cambiar el umbral de tiempo (actualmente 24 horas)

```typescript
// Línea ~43
const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
// Cambiar a 12 horas:
const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000)
```

### Añadir más condiciones

```typescript
// Agregar filtro por categoría específica
.eq('category_id', 'id_de_categoria')

// O múltiples prioridades
.in('priority', ['urgent', 'high'])
```

---

## 🐛 Resolución de Problemas

### ❌ No se reciben emails

**Posibles causas**:

1. **Email no verificado en Resend**
   - Solución: Verifica tu dominio o usa el email de prueba

2. **notification_enabled = false**
   ```sql
   UPDATE profiles SET notification_enabled = true WHERE id = 'user_id';
   ```

3. **Tarea ya tiene reminder_sent = true**
   ```sql
   UPDATE todos SET reminder_sent = false WHERE id = 'todo_id';
   ```

4. **Fecha de vencimiento incorrecta**
   - Verifica que `due_date` esté en formato ISO y dentro de las próximas 24 horas

5. **Variables de entorno no configuradas**
   - Revisa en Supabase: Settings → Edge Functions → Secrets

### ❌ Cron job no se ejecuta

```sql
-- Verificar que el job existe
SELECT * FROM cron.job WHERE jobname = 'check-urgent-tasks-hourly';

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-urgent-tasks-hourly')
ORDER BY start_time DESC
LIMIT 10;

-- Ver si hay errores
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

### ❌ Error de permisos

Si ves errores de RLS (Row Level Security), verifica que:

1. La Edge Function esté usando `SUPABASE_SERVICE_ROLE_KEY` (ya está configurada automáticamente)
2. El cron job tenga el service_role key correcto en el header de Authorization

Para verificar que el cron job está configurado correctamente:

```sql
-- Ver el contenido del cron job
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'check-urgent-tasks-hourly';
```

---

## 📈 Monitoreo y Métricas

### Ver estadísticas de notificaciones

```sql
-- Notificaciones enviadas hoy
SELECT COUNT(*) as total_today
FROM notifications
WHERE DATE(sent_at) = CURRENT_DATE
AND sent = true;

-- Notificaciones por tipo
SELECT type, COUNT(*) as count
FROM notifications
WHERE sent = true
GROUP BY type;

-- Tasa de apertura (si Resend webhook está configurado)
SELECT 
  COUNT(*) FILTER (WHERE sent = true) as sent,
  COUNT(*) FILTER (WHERE email_body LIKE '%opened%') as opened
FROM notifications
WHERE DATE(sent_at) = CURRENT_DATE;
```

### Ver tareas notificadas vs no notificadas

```sql
SELECT 
  priority,
  COUNT(*) FILTER (WHERE reminder_sent = true) as notified,
  COUNT(*) FILTER (WHERE reminder_sent = false) as not_notified
FROM todos
WHERE due_date > NOW()
AND status IN ('pending', 'in_progress')
GROUP BY priority;
```

---

## 💰 Límites del Plan Gratuito

### Resend (Plan Gratuito)
- ✅ 3,000 emails/mes
- ✅ 100 emails/día
- ✅ API completa
- ⚠️ Solo desde dominios verificados o `resend.dev`

### Supabase (Plan Gratuito)
- ✅ 500,000 Edge Function invocations/mes
- ✅ Cron jobs ilimitados
- ✅ 500 MB de base de datos
- ✅ 5 GB de ancho de banda

**Estimación de uso real**:
- 100 usuarios activos
- 20% con tareas urgentes/día
- = ~600 emails/mes
- = Muy dentro del límite gratuito ✅

---

## 🎉 ¡Listo!

Tu sistema de notificaciones está configurado. Los usuarios recibirán emails automáticamente cuando:
- Tengan tareas con prioridad **"urgent"**
- La tarea vence en menos de **24 horas**
- El estado sea **"pending"** o **"in_progress"**
- Tengan **notification_enabled = true** en su perfil

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `supabase functions logs check-urgent-tasks`
2. Verifica las variables de entorno en Supabase
3. Comprueba el estado del cron job con las queries SQL
4. Revisa el dashboard de Resend para ver el estado de los emails

---

## 🔄 Próximos Pasos (Opcional)

1. **Notificación de resumen diario**: Enviar un resumen de todas las tareas pendientes
2. **Notificaciones de tareas vencidas**: Alertar sobre tareas que ya pasaron su fecha límite
3. **Webhooks de Resend**: Rastrear aperturas y clics de emails
4. **Preferencias de notificación**: Permitir al usuario elegir frecuencia y tipos de notificación
5. **Plantillas de email más elaboradas**: Usar Resend con React Email
