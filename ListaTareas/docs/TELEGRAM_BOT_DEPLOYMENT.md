# 📋 Guía Completa de Despliegue del Bot de Telegram

## 📝 Checklist de Implementación

### ✅ Fase 1: Crear el Bot en Telegram

1. **Abrir Telegram** y buscar `@BotFather`
2. **Crear bot**:
   ```
   /newbot
   ```
3. **Seguir instrucciones**:
   - Nombre del bot: `Mi Lista de Tareas Bot`
   - Username: `tuapp_tasks_bot` (debe terminar en `_bot`)
4. **Guardar el Token** que te da (ejemplo: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Configurar comandos**:
   ```
   /setcommands
   ```
   Luego pega:
   ```
   start - Vincular cuenta con la app
   help - Ver ayuda y ejemplos
   ```

### ✅ Fase 2: Ejecutar Migración en Supabase

1. Ve a tu **Dashboard de Supabase**
2. Abre **SQL Editor**
3. Ejecuta la migración:
   ```sql
   -- Agregar columna telegram_id a profiles
   ALTER TABLE public.profiles 
   ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

   -- Índice para búsquedas rápidas
   CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);
   
   -- Comentario
   COMMENT ON COLUMN public.profiles.telegram_id IS 'ID de usuario de Telegram vinculado';
   ```

### ✅ Fase 3: Configurar Secretos en Supabase

1. Ve a **Project Settings** → **Edge Functions**
2. Añade estos secretos:

   ```bash
   TELEGRAM_BOT_TOKEN=<tu_token_de_botfather>
   GROQ_API_KEY=<tu_groq_api_key>
   ```

### ✅ Fase 4: Desplegar la Edge Function

#### Opción A: Desde Terminal Local

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# 2. Login
supabase login

# 3. Link con tu proyecto
cd C:/Users/vindi/OneDrive/Documents/Git/ProyectoPersonal1/ListaTareas
supabase link --project-ref wltrjmcznemnfdpxixma

# 4. Desplegar función
supabase functions deploy telegram-bot

# 5. Verificar que se desplegó
supabase functions list
```

#### Opción B: Desde Supabase Dashboard

1. Ve a **Edge Functions** en tu dashboard
2. Crea nueva función llamada `telegram-bot`
3. Copia el código de `supabase/functions/telegram-bot/index.ts`
4. Despliega

### ✅ Fase 5: Configurar Webhook de Telegram

Después de desplegar, obtendrás una URL como:
```
https://wltrjmcznemnfdpxixma.supabase.co/functions/v1/telegram-bot
```

**Configura el webhook** abriendo en tu navegador:
```
https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://wltrjmcznemnfdpxixma.supabase.co/functions/v1/telegram-bot
```

**Verificar que funcionó:**
```
https://api.telegram.org/bot<TU_TOKEN>/getWebhookInfo
```

Deberías ver:
```json
{
  "ok": true,
  "result": {
    "url": "https://wltrjmcznemnfdpxixma.supabase.co/functions/v1/telegram-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    ...
  }
}
```

### ✅ Fase 6: Actualizar .env Local

```bash
# En .env
VITE_TELEGRAM_BOT_USERNAME=tuapp_tasks_bot
```

### ✅ Fase 7: Probar la Integración

1. **Iniciar app local**:
   ```bash
   npm run dev
   ```

2. **Ir a Perfil** en la app web

3. **Hacer clic en "Vincular con Telegram"**

4. **Se abrirá Telegram** con tu bot

5. **Enviar** `/start`

6. **Confirmar vinculación** (deberías ver mensaje de éxito)

7. **Enviar audio de prueba**:
   - Graba: "Comprar leche mañana"
   - Deberías recibir confirmación
   - La tarea debería aparecer en tu app web

## 🐛 Troubleshooting

### El bot no responde

**Verificar webhook:**
```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Ver logs de Edge Function:**
1. Ve a Supabase Dashboard
2. Edge Functions → telegram-bot → Logs
3. Revisa errores

**Probar manualmente:**
```bash
curl -X POST https://wltrjmcznemnfdpxixma.supabase.co/functions/v1/telegram-bot \
  -H "Content-Type: application/json" \
  -d '{"message":{"text":"/start","chat":{"id":123}}}'
```

### Audio no se transcribe

**Verificar Groq API:**
- Revisa que la key esté bien configurada
- Verifica cuota en https://console.groq.com/

**Ver logs de transcripción:**
- Busca errores en Edge Function logs

### Usuario no vinculado

**Verificar en SQL Editor:**
```sql
SELECT id, email, telegram_id 
FROM profiles 
WHERE email = 'tu_email@ejemplo.com';
```

**Si telegram_id es NULL:**
- Repite proceso de vinculación
- Verifica que el deep link funcione

## 📊 Monitoreo

### Ver tareas creadas desde Telegram

```sql
SELECT 
  t.id,
  t.title,
  t.created_at,
  p.email,
  p.telegram_id
FROM todos t
JOIN profiles p ON t.user_id = p.id
WHERE p.telegram_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 20;
```

### Estadísticas de uso

```sql
SELECT 
  COUNT(*) as tareas_telegram,
  COUNT(DISTINCT user_id) as usuarios_activos
FROM todos t
JOIN profiles p ON t.user_id = p.id
WHERE p.telegram_id IS NOT NULL
  AND t.created_at >= NOW() - INTERVAL '7 days';
```

## 🚀 Mejoras Futuras

Una vez funcionando, puedes agregar:

1. **Editar tareas por voz**: "Editar tarea 123, cambiar fecha a mañana"
2. **Marcar como completadas**: "Completar tarea de comprar leche"
3. **Listar tareas**: "/list" muestra tareas pendientes
4. **Recordatorios**: Bot envía recordatorios automáticos
5. **Soporte para imágenes**: Crear tareas adjuntando fotos

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Supabase
2. Verifica la documentación de Telegram Bot API
3. Prueba con comandos simples primero (/start, /help)
4. Asegúrate que los secretos estén bien configurados

¡Listo! Tu bot de Telegram debería estar funcionando perfectamente 🎉
