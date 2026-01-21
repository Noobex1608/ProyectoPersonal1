# Bot de Telegram para Lista de Tareas

Este bot permite crear tareas mediante mensajes de voz en Telegram.

## 🚀 Configuración

### 1. Crear el Bot de Telegram

1. Abre Telegram y busca `@BotFather`
2. Envía `/newbot`
3. Sigue las instrucciones y guarda el **Token** que te da
4. Configura los comandos del bot:
   ```
   /setcommands
   start - Vincular cuenta con la app
   help - Ver ayuda
   ```

### 2. Configurar Variables de Entorno en Supabase

```bash
# En tu proyecto de Supabase (Settings > Edge Functions > Secrets)
TELEGRAM_BOT_TOKEN=tu_token_aqui
GROQ_API_KEY=tu_groq_api_key
```

### 3. Desplegar la Edge Function

```bash
# Asegúrate de tener Supabase CLI instalado
npm install -g supabase

# Login en Supabase
supabase login

# Link con tu proyecto
supabase link --project-ref tu-project-ref

# Desplegar la función
supabase functions deploy telegram-bot
```

### 4. Configurar el Webhook de Telegram

Una vez desplegada la función, obtendrás una URL como:
```
https://tu-project.supabase.co/functions/v1/telegram-bot
```

Configura el webhook ejecutando en tu navegador o Postman:
```
https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://tu-project.supabase.co/functions/v1/telegram-bot
```

### 5. Agregar columna `telegram_id` a la tabla `users`

Ejecuta esta migración en Supabase SQL Editor:

```sql
-- Agregar columna telegram_id a users
ALTER TABLE users 
ADD COLUMN telegram_id BIGINT UNIQUE;

-- Índice para búsquedas rápidas
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

### 6. Crear función para vincular cuenta

Los usuarios deben vincular su cuenta de Telegram con la app web.

Opción 1: **Deep Link desde la App Web**
```typescript
// En tu app Vue
const telegramBotUsername = 'tu_bot_username'

function linkTelegramAccount() {
  const userId = authStore.user?.id
  const deepLink = `https://t.me/${telegramBotUsername}?start=${userId}`
  window.open(deepLink, '_blank')
}
```

Opción 2: **Código de vinculación en el bot**

El usuario envía `/start` en Telegram y el bot genera un código que luego ingresa en la app web.

## 📱 Uso

1. **Vincular cuenta**: Usa el deep link desde la app o envía `/start` en Telegram
2. **Enviar audio**: Graba un mensaje de voz describiendo la tarea
   - Ejemplo: "Recordar comprar leche mañana, prioridad alta"
3. **Recibir confirmación**: El bot confirmará que la tarea fue creada
4. **Ver en la app**: La tarea aparecerá automáticamente en tu app web

## 🎯 Ejemplos de Audios

- ✅ "Comprar leche y pan mañana"
- ✅ "Llamar al doctor el viernes a las 3 de la tarde, es urgente"
- ✅ "Estudiar para el examen de matemáticas, tengo que terminar el capítulo 5"
- ✅ "Reunión con el equipo hoy a las 5, revisar el proyecto de marketing"

## 🔧 Tecnologías Usadas

- **Deno**: Runtime para Edge Functions
- **Groq Whisper**: Speech-to-Text (transcripción)
- **Groq LLaMA 3.3**: Extracción de información estructurada
- **Supabase**: Base de datos y hosting
- **Telegram Bot API**: Recepción de mensajes

## 🐛 Troubleshooting

### El bot no responde
- Verifica que el webhook esté configurado: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Revisa los logs en Supabase: `Functions > telegram-bot > Logs`

### Error de autenticación
- Verifica que el usuario esté vinculado: revisa la columna `telegram_id` en la tabla `users`

### Audio no se transcribe
- Verifica que Groq API Key esté configurada
- Revisa los logs para ver el error específico

## 🔐 Seguridad

- El bot solo procesa mensajes de usuarios vinculados
- Los tokens están en variables de entorno seguras
- La Edge Function usa Service Role Key para operaciones privilegiadas

## 📊 Flujo de Datos

```
Usuario graba audio
    ↓
Bot de Telegram recibe el mensaje
    ↓
Webhook llama a Edge Function
    ↓
Descarga el audio de Telegram
    ↓
Groq Whisper transcribe a texto
    ↓
Groq LLM extrae datos estructurados
    ↓
Verifica vinculación de usuario
    ↓
Crea tarea en Supabase
    ↓
Confirma al usuario en Telegram
```

## 🚀 Próximas Mejoras

- [ ] Editar tareas existentes por voz
- [ ] Marcar tareas como completadas
- [ ] Listar tareas del día
- [ ] Recordatorios automáticos
- [ ] Soporte para imágenes (crear tareas con fotos)
