# 🗺️ Generador de Mapas Mentales

## Descripción

Generador de mapas mentales integrado en el Modo Estudio que utiliza **Agno** (framework de IA) con **Gemini** para crear visualizaciones automáticas del contenido estudiado.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                   Vue Frontend                          │
│  (StudyModeView.vue + MindMapViewer.vue)              │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP Request
                 │ POST /generate-mindmap
                 ▼
┌─────────────────────────────────────────────────────────┐
│           Python Microservice (Docker)                  │
│  FastAPI + Agno + Gemini (puerto 8000)                │
└────────────────┬────────────────────────────────────────┘
                 │ 
                 │ Gemini API
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Google Gemini 1.5 Flash                    │
└─────────────────────────────────────────────────────────┘
                 │
                 │ Mermaid.js Code
                 ▼
┌─────────────────────────────────────────────────────────┐
│            Renderizado en el Frontend                   │
│              (Mermaid.js Library)                       │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Setup

### 1. Microservicio Python (Agno)

El microservicio ya está configurado en `python-service/`:

```bash
# Construir la imagen Docker
docker build -t agno-service ./python-service

# Ejecutar el contenedor
docker run -d \
  -p 8000:8000 \
  --name mi-agno-api \
  -e GOOGLE_API_KEY="TU_API_KEY_DE_GEMINI" \
  agno-service
```

**Verificar que está corriendo:**
```bash
curl http://localhost:8000/docs
```

### 2. Frontend (Vue)

La integración ya está lista. Solo asegúrate de que:

**`.env` contenga:**
```env
VITE_MINDMAP_API_URL=http://localhost:8000
```

**Instalar dependencias:**
```bash
npm install mermaid
```

## 📋 Uso

### Desde Estudio Libre

1. Ve a **Modo Estudio** → Pestaña **Estudio Libre**
2. Ingresa un tema (ej: "Fotosíntesis")
3. Haz clic en **"Comenzar estudio"**
4. Una vez generada la explicación, haz clic en **"Generar Mapa Mental"**
5. El mapa mental se mostrará en un modal interactivo

### Desde Estudio con PDF

1. Ve a **Modo Estudio** → Pestaña **Estudio con PDF**
2. Sube un PDF
3. Espera el análisis automático
4. Haz clic en **"Generar Mapa Mental"**
5. El mapa se generará con mayor detalle basado en el contenido del PDF

## 🎨 Características

### Modal Interactivo
- ✅ Visualización en pantalla completa
- ✅ Cerrar con clic fuera o botón "X"
- ✅ Transiciones suaves

### Acciones del Mapa
- **📥 Descargar PNG**: Exporta el mapa como imagen
- **📋 Copiar código**: Copia el código Mermaid al portapapeles
- **🔄 Reintentar**: Si falla la generación

### Niveles de Detalle
- **Basic**: Conceptos principales (3-5 nodos)
- **Medium**: Balance entre detalle y claridad (default)
- **Detailed**: Máximo detalle (solo para PDFs)

## 🛠️ Estructura de Archivos

```
ListaTareas/
├── src/
│   ├── services/
│   │   └── mindmap.ts              # Cliente HTTP para Agno API
│   ├── components/
│   │   └── MindMapViewer.vue       # Componente de visualización
│   ├── composables/
│   │   └── useStudyMode.ts         # Lógica de negocio (actualizado)
│   └── views/
│       └── StudyModeView.vue       # Vista principal (actualizado)
│
python-service/
├── main.py                         # FastAPI + Agno
├── requirements.txt
├── Dockerfile
└── Instrucciones.md
```

## 🔧 API Reference

### Endpoint: `POST /generate-mindmap`

**Request:**
```json
{
  "topic": "Fotosíntesis",
  "detail_level": "medium"
}
```

**Response:**
```json
{
  "mermaid_code": "mindmap\n  root((Fotosíntesis))\n    Proceso\n      Luz\n      Clorofila\n    Productos\n      Oxígeno\n      Glucosa"
}
```

## 🐛 Troubleshooting

### El servicio no responde
```bash
# Verificar que el contenedor está corriendo
docker ps | grep agno

# Ver logs
docker logs mi-agno-api

# Reiniciar contenedor
docker restart mi-agno-api
```

### Error de CORS
Asegúrate de que `allow_origins=["*"]` está configurado en `python-service/main.py` (línea 13).

### El mapa no se renderiza
1. Verifica la consola del navegador
2. El código Mermaid debe empezar con `mindmap`
3. Prueba el código en: https://mermaid.live/

## 📚 Tecnologías

- **Agno**: Framework para agentes de IA
- **Gemini 1.5 Flash**: Modelo de lenguaje de Google
- **Mermaid.js**: Librería de diagramas
- **FastAPI**: Framework web Python
- **Docker**: Contenedorización

## 🎯 Próximas Mejoras

- [ ] Modo oscuro para mapas
- [ ] Exportar a SVG
- [ ] Edición manual del mapa
- [ ] Guardar mapas en Supabase
- [ ] Compartir mapas (URL pública)
- [ ] Templates de mapas predefinidos
- [ ] Integración con otros tipos de diagramas (flowchart, sequence)

## 📝 Notas

- El servicio usa **Gemini** por defecto (gratis hasta 60 req/min)
- Los mapas no se guardan automáticamente (descárgalos si los quieres conservar)
- El nivel de detalle "detailed" puede tardar más en generar

---

Desarrollado con ❤️ para mejorar la experiencia de estudio
