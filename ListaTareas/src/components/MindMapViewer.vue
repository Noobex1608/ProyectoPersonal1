<template>
  <div class="mindmap-viewer">
    <div class="mindmap-header">
      <div class="header-left">
        <MapIcon class="mindmap-icon" />
        <h3>Mapa Mental</h3>
      </div>
      <button @click="$emit('close')" class="close-btn">
        <XMarkIcon class="icon-sm" />
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner-large"></div>
      <p>Generando mapa mental con IA...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <ExclamationCircleIcon class="error-icon-large" />
      <h4>Error al generar mapa mental</h4>
      <p>{{ error }}</p>
      <button @click="$emit('retry')" class="retry-btn">
        <ArrowPathIcon class="icon-sm" />
        Reintentar
      </button>
    </div>

    <div v-else-if="mermaidCode || imageUrl" class="mindmap-content">
      <!-- Mostrar imagen si está disponible -->
      <div v-if="imageUrl" class="image-container">
        <img :src="imageUrl" alt="Mapa Mental" class="mindmap-image" />
        <div class="image-badge">✨ Generado con Gemini Imagen</div>
      </div>
      
      <!-- Mostrar código Mermaid si no hay imagen -->
      <div v-else-if="mermaidCode" class="mermaid-wrapper">
        <div class="zoom-hint">
          🔍 Usa la rueda del mouse para hacer zoom • Arrastra para mover
        </div>
        <div ref="mermaidContainer" class="mermaid-container">
          <pre class="mermaid">{{ mermaidCode }}</pre>
          <div class="service-badge" :class="serviceBadgeClass">
            {{ serviceBadgeText }}
          </div>
        </div>
      </div>
      
      <div class="mindmap-actions">
        <button @click="downloadMindMap" class="action-btn primary">
          <ArrowDownTrayIcon class="icon-sm" />
          Descargar PNG
        </button>
        <button v-if="mermaidCode" @click="copyToClipboard" class="action-btn secondary">
          <ClipboardDocumentIcon class="icon-sm" />
          Copiar código
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { 
  MapIcon, 
  XMarkIcon, 
  ExclamationCircleIcon, 
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon
} from '@heroicons/vue/24/outline'
import mermaid from 'mermaid'
import panzoom from 'panzoom'

interface Props {
  mermaidCode?: string
  imageUrl?: string
  loading?: boolean
  error?: string | null
  service?: 'groq' | 'ollama' | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'retry'): void
}>()

const mermaidContainer = ref<HTMLElement | null>(null)
const renderError = ref<string | null>(null)
let panzoomInstance: any = null

const serviceBadgeText = computed(() => {
  if (props.service === 'groq') return '⚡ Generado con Groq'
  if (props.service === 'ollama') return '🤖 Generado con Ollama Local'
  return '🗺️ Mapa Mental'
})

const serviceBadgeClass = computed(() => {
  if (props.service === 'groq') return 'badge-groq'
  if (props.service === 'ollama') return 'badge-ollama'
  return ''
})

// Inicializar Mermaid
onMounted(() => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
    themeVariables: {
      // Colores principales (nodos root y principales)
      primaryColor: '#fed7aa',           // Orange-200 (fondo claro)
      primaryTextColor: '#9a3412',       // Orange-800 (texto)
      primaryBorderColor: '#f97316',     // Orange-500 (borde)
      
      // Colores secundarios (categorías)
      secondaryColor: '#fef3c7',         // Amber-100
      secondaryTextColor: '#92400e',     // Amber-800
      secondaryBorderColor: '#f59e0b',   // Amber-500
      
      // Colores terciarios (conceptos)
      tertiaryColor: '#fef9c3',          // Yellow-100
      tertiaryTextColor: '#854d0e',      // Yellow-800
      tertiaryBorderColor: '#eab308',    // Yellow-500
      
      // Líneas y conexiones
      lineColor: '#fb923c',              // Orange-400
      
      // Nodos adicionales
      nodeBorder: '#f97316',
      mainBkg: '#fff7ed',                // Orange-50
      
      // Tipografía
      fontSize: '16px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  })
  if (props.mermaidCode) {
    renderMermaid()
  }
})

// Re-renderizar cuando cambie el código
watch(() => props.mermaidCode, () => {
  if (props.mermaidCode) {
    renderMermaid()
  }
})

async function renderMermaid() {
  if (!props.mermaidCode || !mermaidContainer.value) return
  
  await nextTick()
  renderError.value = null
  
  try {
    const container = mermaidContainer.value
    if (!container) return

    // Limpiar contenido previo
    container.innerHTML = ''
    
    // Generar ID único para el diagrama
    const id = `mermaid-${Date.now()}`
    
    // Renderizar usando mermaid.render
    const { svg } = await mermaid.render(id, props.mermaidCode)
    
    // Insertar el SVG generado
    container.innerHTML = svg
    
    // Agregar zoom y pan interactivo al SVG
    await nextTick()
    const svgElement = container.querySelector('svg')
    if (svgElement) {
      // Limpiar instancia previa si existe
      if (panzoomInstance) {
        panzoomInstance.dispose()
      }
      
      // Crear nueva instancia de panzoom
      panzoomInstance = panzoom(svgElement, {
        maxZoom: 3,
        minZoom: 0.5,
        smoothScroll: false,
        bounds: true,
        boundsPadding: 0.1
      })
      
      console.log('✅ Zoom y pan habilitados en el mapa mental')
    }
    
  } catch (error: any) {
    console.error('Error renderizando mermaid:', error)
    renderError.value = error?.message || 'Error al renderizar el diagrama'
    
    // Mostrar el código como fallback
    if (mermaidContainer.value) {
      mermaidContainer.value.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #ef4444;">
          <p style="font-weight: 600; margin-bottom: 1rem;">Error al renderizar el mapa mental</p>
          <pre style="text-align: left; background: #fee2e2; padding: 1rem; border-radius: 0.5rem; overflow: auto; font-size: 0.875rem;">${props.mermaidCode}</pre>
          <p style="margin-top: 1rem; font-size: 0.875rem; color: #7f1d1d;">El servicio devolvió código con sintaxis incorrecta</p>
        </div>
      `
    }
  }
}

async function downloadMindMap() {
  try {
    // Si hay imagen, descargarla directamente
    if (props.imageUrl) {
      const link = document.createElement('a')
      link.download = `mapa-mental-${Date.now()}.png`
      link.href = props.imageUrl
      link.click()
      return
    }
    
    // Si hay código Mermaid, convertir SVG a PNG
    const svg = mermaidContainer.value?.querySelector('svg')
    if (!svg) return

    // Clonar el SVG para no modificar el original
    const svgClone = svg.cloneNode(true) as SVGElement
    
    // Obtener dimensiones del SVG
    const bbox = svg.getBBox()
    const width = bbox.width || 800
    const height = bbox.height || 600
    
    // Configurar el SVG clonado
    svgClone.setAttribute('width', width.toString())
    svgClone.setAttribute('height', height.toString())
    svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${width} ${height}`)
    
    // Serializar el SVG
    const svgData = new XMLSerializer().serializeToString(svgClone)
    
    // Crear data URL directamente (evita problemas CORS)
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)))
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`
    
    // Crear canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height
    
    // Fondo blanco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    const img = new Image()
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convertir a blob y descargar
      canvas.toBlob((blob) => {
        if (!blob) return
        const link = document.createElement('a')
        link.download = `mapa-mental-${Date.now()}.png`
        link.href = URL.createObjectURL(blob)
        link.click()
        setTimeout(() => URL.revokeObjectURL(link.href), 100)
      }, 'image/png', 1.0)
    }
    
    img.onerror = (error) => {
      console.error('Error cargando imagen:', error)
      alert('Error al generar la imagen. Intenta copiar el código en su lugar.')
    }

    img.src = dataUrl
  } catch (error) {
    console.error('Error descargando mapa:', error)
    alert('Error al descargar el mapa mental')
  }
}

async function copyToClipboard() {
  if (!props.mermaidCode) return
  
  try {
    await navigator.clipboard.writeText(props.mermaidCode)
    // TODO: Mostrar toast de éxito
    alert('Código copiado al portapapeles')
  } catch (error) {
    console.error('Error copiando al portapapeles:', error)
  }
}
</script>

<style scoped>
.mindmap-viewer {
  background: white;
  border-radius: 1rem;
  border: 2px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.mindmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mindmap-icon {
  width: 2rem;
  height: 2rem;
}

.mindmap-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.icon-sm {
  width: 1.25rem;
  height: 1.25rem;
}

/* Estados de carga y error */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner-large {
  width: 3rem;
  height: 3rem;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #6b7280;
  font-weight: 500;
}

.error-icon-large {
  width: 4rem;
  height: 4rem;
  color: #ef4444;
  margin-bottom: 1rem;
}

.error-state h4 {
  color: #991b1b;
  margin: 0 0 0.5rem 0;
}

.error-state p {
  color: #7f1d1d;
  margin-bottom: 1.5rem;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #dc2626;
  transform: translateY(-2px);
}

/* Contenido del mapa */
.mindmap-content {
  padding: 2rem;
}

/* Wrapper para el mapa con hint */
.mermaid-wrapper {
  position: relative;
}

.zoom-hint {
  text-align: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  color: #9a3412;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Contenedor de imagen */
.image-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #f9fafb;
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 1.5rem;
}

.mindmap-image {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-badge,
.service-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  color: white;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideInRight 0.3s ease-out;
}

.image-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.service-badge.badge-groq {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.service-badge.badge-ollama {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Contenedor de Mermaid */
.mermaid-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 1.5rem;
  overflow: auto;
  animation: fadeInScale 0.5s ease-out;
  border: 2px solid #fed7aa;
}

.mermaid-container :deep(svg) {
  max-width: 100%;
  height: auto;
  filter: drop-shadow(0 4px 6px rgba(249, 115, 22, 0.1));
}

/* Hover effect en nodos */
.mermaid-container :deep(.node) {
  transition: all 0.2s ease;
  cursor: pointer;
}

.mermaid-container :deep(.node:hover) {
  filter: brightness(1.05);
  transform: scale(1.02);
}

.mermaid-container :deep(.nodeLabel) {
  font-weight: 500;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Acciones */
.mindmap-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #667eea;
  color: white;
}

.action-btn.primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.action-btn.secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.action-btn.secondary:hover {
  background: #f3f4f6;
}

@media (max-width: 768px) {
  .mindmap-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }

  .mermaid-container {
    padding: 1rem;
    min-height: 300px;
  }
}
</style>
