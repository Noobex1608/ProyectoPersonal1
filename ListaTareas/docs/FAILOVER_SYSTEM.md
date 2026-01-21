# 🔄 Sistema de Respaldo Automático (Failover)

## Descripción

Sistema inteligente de respaldo que garantiza disponibilidad continua del Modo Estudio, cambiando automáticamente entre servicios de IA según disponibilidad.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│         Usuario solicita contenido       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    1️⃣ Intentar con GROQ (Primario)      │
│    • Más rápido (500 tokens/seg)        │
│    • Modelo: llama-3.3-70b-versatile    │
│    • API gratuita                        │
└──────────────┬──────────────────────────┘
               │
               ├─── ✅ Éxito → Retornar
               │
               └─── ❌ Error 429 / Fallo
                      │
                      ▼
┌─────────────────────────────────────────┐
│  2️⃣ Cambiar a OLLAMA (Respaldo)         │
│    • IA Local (Docker)                   │
│    • Sin límites                         │
│    • Modelo: llama3.2:3b                 │
│    • 100% gratis                         │
└──────────────┬──────────────────────────┘
               │
               └─── ✅ Retornar resultado
```

## 🎯 Funciones con Respaldo

### 1. **Estudio Libre** (`studyFreeTopic`)
- **Primario**: Groq API
- **Respaldo**: Ollama local
- **Ventaja**: Explicaciones más rápidas con Groq

### 2. **Generación de Mapas Mentales** (`generateMindMap`)
- **Primario**: Groq API
- **Respaldo**: Python Service → Ollama
- **Ventaja**: Genera diagramas complejos más rápido

## 🚀 Configuración

### Variables de Entorno

Asegúrate de tener en `.env`:

```env
# Groq API (Primario)
VITE_GROQ_API_KEY=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

# Ollama (Respaldo)
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2:3b

# Python Service (para mapas mentales)
VITE_MINDMAP_API_URL=http://localhost:8000
```

### Servicios Necesarios

1. **Ollama (Docker)** - Siempre debe estar corriendo como respaldo:
```bash
docker-compose up -d
```

2. **Python Service** - Para mapas mentales (respaldo):
```bash
docker ps | grep agno
```

## 📊 Comparación de Servicios

| Característica | Groq API | Ollama Local |
|---------------|----------|--------------|
| Velocidad | ⚡⚡⚡ Muy rápido | ⚡⚡ Rápido |
| Límites | 30 req/min (gratis) | ♾️ Ilimitado |
| Latencia | ~200-500ms | ~1-3s |
| Costo | Gratis (con límites) | Gratis (sin límites) |
| Internet | Requiere | No requiere |
| Privacidad | En la nube | 100% local |
| Modelo | llama-3.3-70b | llama3.2:3b |

## 🔍 Detección de Errores

El sistema detecta automáticamente:

### Error 429 (Groq)
```javascript
if (response.status === 429) {
  // Cambio automático a Ollama
  console.warn('⚠️ Límite de Groq alcanzado, cambiando a Ollama...')
}
```

### Otros errores
- Problemas de red
- Timeouts
- Errores de API
- Respuestas inválidas

En todos los casos, cambia automáticamente a Ollama.

## 📝 Logs en Consola

El sistema muestra logs claros del flujo:

```
🚀 Intentando generar con Groq...
✅ Generado con Groq exitosamente

// O en caso de fallo:

🚀 Intentando generar con Groq...
⚠️ Límite de Groq alcanzado, cambiando a Ollama...
✅ Generado con Ollama (respaldo)
```

## 🛠️ Archivos Modificados

### Frontend
- [`src/services/groq.ts`](../src/services/groq.ts) - Cliente Groq API
- [`src/composables/useStudyMode.ts`](../src/composables/useStudyMode.ts) - Lógica de respaldo
- [`.env`](../.env) - Variables de entorno

### Backend (sin cambios necesarios)
- Python Service sigue usando Ollama

## 🎨 Ventajas del Sistema

✅ **Alta disponibilidad** - Si un servicio falla, el otro toma el control
✅ **Sin interrupciones** - El usuario no nota el cambio
✅ **Optimización de costos** - Usa el servicio gratuito más rápido primero
✅ **Privacidad** - Respaldo local cuando sea necesario
✅ **Escalabilidad** - Fácil agregar más servicios de respaldo

## 🐛 Troubleshooting

### Groq siempre falla
```bash
# Verificar API key
echo $VITE_GROQ_API_KEY

# Probar endpoint directamente
curl -H "Authorization: Bearer gsk_..." \
     https://api.groq.com/openai/v1/models
```

### Ollama no funciona como respaldo
```bash
# Verificar que está corriendo
docker ps | grep ollama

# Revisar logs
docker logs lista-tareas-ollama

# Reiniciar
docker restart lista-tareas-ollama
```

### Ambos servicios fallan
1. Verifica tu conexión a internet (para Groq)
2. Verifica que Docker esté corriendo (para Ollama)
3. Revisa los logs en la consola del navegador
4. Reinicia los servicios

## 📈 Métricas y Monitoreo

El sistema registra en consola:
- ✅ Éxitos con cada servicio
- ⚠️ Cambios de servicio
- ❌ Errores críticos

Para monitoreo avanzado, puedes agregar:
- Contador de requests por servicio
- Tiempo de respuesta promedio
- Tasa de fallos

## 🔮 Próximas Mejoras

- [ ] Agregar más servicios de respaldo (Claude, OpenAI)
- [ ] Sistema de priorización dinámico
- [ ] Caché de respuestas frecuentes
- [ ] Métricas de uso en dashboard
- [ ] Alertas cuando un servicio está caído

---

**Sistema de respaldo implementado el 17 de enero de 2026** ✨
