# 🐋 Guía de Instalación: Ollama con Docker

## 🎯 ¿Por qué Ollama?

**Antes (Gemini API):**
- ❌ Límites de cuota (10,000 requests/día)
- ❌ Depende de internet
- ❌ Límites de tokens
- ❌ Costo potencial

**Ahora (Ollama Local):**
- ✅ Sin límites de uso
- ✅ 100% gratis
- ✅ Funciona offline
- ✅ Privacidad total
- ✅ Más rápido (no hay latencia de red)

---

## 📋 Prerequisitos

1. **Docker Desktop instalado**
   - Windows: https://www.docker.com/products/docker-desktop
   - Asegúrate de que Docker esté corriendo

2. **Al menos 4GB de RAM libres**
   - Ollama necesita ~2-3GB para modelos pequeños

3. **(Opcional) GPU NVIDIA**
   - Si tienes GPU, Ollama será 10x más rápido
   - Requiere drivers CUDA instalados

---

## 🚀 Instalación Paso a Paso

### Paso 1: Levantar Ollama con Docker

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# Ir a la carpeta del proyecto
cd ListaTareas

# Levantar Ollama con Docker Compose
docker-compose up -d
```

**Salida esperada:**
```
Creating network "listatareas_default" with the default driver
Creating volume "listatareas_ollama_data" with local driver
Creating lista-tareas-ollama ... done
```

**Verificar que está corriendo:**
```bash
docker ps
```

Deberías ver algo como:
```
CONTAINER ID   IMAGE                  STATUS          PORTS
abc123def456   ollama/ollama:latest   Up 10 seconds   0.0.0.0:11434->11434/tcp
```

---

### Paso 2: Descargar Modelo Llama 3.2

Ollama necesita descargar el modelo de IA. Ejecuta:

```bash
# Entrar al contenedor de Ollama
docker exec -it lista-tareas-ollama ollama pull llama3.2:3b
```

**Este comando:**
- Descarga Llama 3.2 (3 billones de parámetros)
- Tamaño: ~2GB
- Tiempo: 5-10 minutos (depende de tu internet)

**Salida esperada:**
```
pulling manifest
pulling 6a0746a1ec1a... 100% ▕████████████████▏ 1.9 GB
pulling 4fa551d4f938... 100% ▕████████████████▏   12 KB
pulling 8ab4849b038c... 100% ▕████████████████▏  254 B
pulling 577073ffcc6c... 100% ▕████████████████▏  110 B
pulling ad1518640c43... 100% ▕████████████████▏  483 B
verifying sha256 digest
writing manifest
success
```

---

### Paso 3: Descargar Modelo de Embeddings

Para la búsqueda vectorial (RAG), necesitas otro modelo:

```bash
docker exec -it lista-tareas-ollama ollama pull nomic-embed-text
```

**Este comando:**
- Descarga Nomic Embed Text (modelo de embeddings)
- Tamaño: ~274MB
- Tiempo: 1-2 minutos

---

### Paso 4: Verificar Modelos Instalados

```bash
docker exec -it lista-tareas-ollama ollama list
```

**Salida esperada:**
```
NAME                    ID              SIZE    MODIFIED
llama3.2:3b             6a0746a1ec1a    1.9 GB  5 minutes ago
nomic-embed-text:latest ab96af3dcac3    274 MB  2 minutes ago
```

---

### Paso 5: Probar Ollama

```bash
# Probar Llama 3.2
docker exec -it lista-tareas-ollama ollama run llama3.2:3b "Explica qué es la fotosíntesis en 2 líneas"
```

**Salida esperada:**
```
La fotosíntesis es el proceso por el cual las plantas convierten 
luz solar, agua y dióxido de carbono en glucosa y oxígeno. Es 
fundamental para la vida en la Tierra.
```

Si vez esta respuesta, **¡Ollama está funcionando! 🎉**

---

## 🔧 Configuración de la Aplicación

### Actualizar `.env`

Ya está configurado en tu archivo `.env`:

```env
# Ollama (IA Local para Modo Estudio)
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2:3b
```

### Reiniciar la Aplicación

```bash
# Detener el servidor de desarrollo (Ctrl+C)
# Volver a iniciar
npm run dev
```

---

## 🧪 Probar el Sistema

1. **Ir al Modo Estudio** en tu aplicación
2. **Estudiar un tema libre:**
   - Escribe: "Fotosíntesis"
   - Presiona "Comenzar estudio"
   - Deberías ver una explicación generada por Ollama

3. **Subir un PDF:**
   - Sube un PDF de prueba
   - Espera el análisis
   - Haz preguntas sobre el contenido

---

## 📊 Modelos Recomendados

### Para Computadoras Potentes (16GB+ RAM, GPU):

```bash
# Llama 3.2 Medium (mejor calidad)
docker exec -it lista-tareas-ollama ollama pull llama3.2:7b
```

Luego actualiza `.env`:
```env
VITE_OLLAMA_MODEL=llama3.2:7b
```

### Para Computadoras Limitadas (8GB RAM, Sin GPU):

```bash
# Phi-3 Mini (más rápido, menor calidad)
docker exec -it lista-tareas-ollama ollama pull phi3:mini
```

Luego actualiza `.env`:
```env
VITE_OLLAMA_MODEL=phi3:mini
```

---

## 🛠️ Comandos Útiles

### Ver logs de Ollama
```bash
docker logs lista-tareas-ollama -f
```

### Detener Ollama
```bash
docker-compose down
```

### Reiniciar Ollama
```bash
docker-compose restart
```

### Eliminar todo (incluyendo modelos descargados)
```bash
docker-compose down -v
```

### Entrar al contenedor
```bash
docker exec -it lista-tareas-ollama /bin/bash
```

---

## 🔥 Optimización con GPU (NVIDIA)

Si tienes una GPU NVIDIA, descomenta estas líneas en `docker-compose.yml`:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

Luego reinicia:
```bash
docker-compose down
docker-compose up -d
```

**Beneficio:** 10-20x más rápido que CPU

---

## ❓ Solución de Problemas

### "Cannot connect to Ollama"

1. Verifica que Docker esté corriendo:
   ```bash
   docker ps
   ```

2. Verifica que el puerto 11434 esté abierto:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. Reinicia Ollama:
   ```bash
   docker-compose restart
   ```

### "Model not found"

```bash
# Descargar el modelo nuevamente
docker exec -it lista-tareas-ollama ollama pull llama3.2:3b
```

### "Out of memory"

1. Usa un modelo más pequeño:
   ```bash
   docker exec -it lista-tareas-ollama ollama pull phi3:mini
   ```

2. Actualiza `.env`:
   ```env
   VITE_OLLAMA_MODEL=phi3:mini
   ```

### Ollama muy lento

1. Verifica que tengas suficiente RAM libre
2. Cierra otras aplicaciones pesadas
3. Considera usar GPU si la tienes
4. Usa un modelo más pequeño

---

## 📈 Comparación de Modelos

| Modelo | Tamaño | RAM | Velocidad | Calidad | Recomendado para |
|--------|--------|-----|-----------|---------|------------------|
| phi3:mini | 2GB | 4GB | ⚡⚡⚡ | ⭐⭐ | PCs limitadas |
| llama3.2:3b | 2GB | 8GB | ⚡⚡ | ⭐⭐⭐ | Uso general |
| llama3.2:7b | 4GB | 16GB | ⚡ | ⭐⭐⭐⭐ | PCs potentes |
| mixtral:8x7b | 26GB | 32GB | 🐌 | ⭐⭐⭐⭐⭐ | Servidores |

---

## 🎓 Ventajas del Sistema

✅ **Sin costos de API** - Todo local
✅ **Sin límites de uso** - Analiza PDFs ilimitados
✅ **Privacidad total** - Tus datos nunca salen de tu PC
✅ **Funciona offline** - No necesita internet (después de descargar modelos)
✅ **Rápido** - Sin latencia de red
✅ **Escalable** - Puedes usar modelos más potentes según tu hardware

---

## 🔗 Referencias

- [Ollama Documentation](https://ollama.ai/docs)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Llama Models](https://ollama.ai/library/llama3.2)
- [Nomic Embed Text](https://ollama.ai/library/nomic-embed-text)

---

## ✅ Checklist de Instalación

- [ ] Docker Desktop instalado y corriendo
- [ ] `docker-compose up -d` ejecutado exitosamente
- [ ] Modelo `llama3.2:3b` descargado
- [ ] Modelo `nomic-embed-text` descargado
- [ ] `.env` configurado correctamente
- [ ] Aplicación reiniciada
- [ ] Prueba de estudio libre funcionando
- [ ] Prueba de PDF funcionando

**¡Si completaste todos los pasos, estás listo! 🚀**
