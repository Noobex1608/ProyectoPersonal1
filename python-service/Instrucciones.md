# Microservicio Python - Generador de Mapas Mentales

## Descripción
Microservicio FastAPI que genera mapas mentales usando **Ollama** (IA local).

## ¿Cómo ejecutarlo?

### Opción 1: Con Docker (Recomendado)

```bash
# Construir la imagen
docker build -t agno-service .

# Ejecutar el contenedor
docker run -d \
  -p 8000:8000 \
  --name mi-agno-api \
  -e OLLAMA_URL="http://host.docker.internal:11434" \
  -e OLLAMA_MODEL="llama3.2:3b" \
  agno-service
```

### Opción 2: Sin Docker

```bash
# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
export OLLAMA_URL="http://localhost:11434"
export OLLAMA_MODEL="llama3.2:3b"

# Ejecutar
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Verificar que funciona

```bash
# Health check
curl http://localhost:8000/health

# Generar mapa mental
curl -X POST http://localhost:8000/generate-mindmap \
  -H "Content-Type: application/json" \
  -d '{"topic": "Fotosíntesis", "detail_level": "medium"}'
```

## Variables de Entorno

- `OLLAMA_URL`: URL de Ollama (default: `http://host.docker.internal:11434`)
- `OLLAMA_MODEL`: Modelo a usar (default: `llama3.2:3b`)

## Nota

**IMPORTANTE**: Asegúrate de que Ollama esté corriendo antes de levantar este servicio.

```bash
# Verificar Ollama
curl http://localhost:11434/api/tags
```