from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import pdfplumber
import io
from typing import Optional

app = FastAPI()

# --- Configuración de CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MapRequest(BaseModel):
    topic: str
    detail_level: str = "medium"

# URL de Ollama (puede estar en otro contenedor o en host)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# URL de Ollama (puede estar en otro contenedor o en host)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

def generate_with_ollama(prompt: str, system_prompt: str) -> str:
    """
    Genera texto usando Ollama
    """
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 500
                }
            },
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")
    except requests.exceptions.RequestException as e:
        print(f"Error conectando con Ollama: {e}")
        raise HTTPException(
            status_code=503, 
            detail=f"No se pudo conectar con Ollama: {str(e)}"
        )

@app.post("/generate-mindmap")
async def generate_mindmap(request: MapRequest):
    try:
        # Instrucciones según nivel de detalle
        detail_instructions = {
            "basic": "Crea un mapa simple con solo los 3-5 conceptos MÁS importantes.",
            "medium": "Crea un mapa balanceado con 7-10 conceptos principales y algunos detalles.",
            "detailed": "Crea un mapa completo con hasta 20 nodos, incluyendo conceptos y detalles."
        }
        
        detail_instruction = detail_instructions.get(
            request.detail_level, 
            detail_instructions["medium"]
        )
        
        system_prompt = """Eres un experto en crear mapas mentales VISUALES usando Mermaid.js.

REGLAS ESTRICTAS:
1. Devuelve SOLO código Mermaid puro, sin markdown, sin explicaciones.
2. SIEMPRE comienza con 'mindmap' en la primera línea.
3. DEBE haber EXACTAMENTE UN nodo raíz llamado 'root((Tema))' con doble paréntesis.
4. TODOS los demás nodos DEBEN estar dentro del árbol del root como hijos.
5. Estructura OBLIGATORIA:
   mindmap
     root((🎯 Tema Principal))
       📚 SubTema1
         Detalle1
       🔍 SubTema2
         Detalle2
6. Usa indentación de 2 espacios por nivel.
7. OBLIGATORIO: Agrega emojis relevantes al inicio de CADA nodo (excepto detalles).
8. USA FORMAS VISUALES para nodos importantes:
   - (( )) para nodos principales
   - [ ] para categorías
   - ( ) para conceptos clave
9. Nombres cortos (máximo 4 palabras por nodo).
10. Máximo 3 niveles de profundidad.

EJEMPLO DE FORMAS Y EMOJIS:
mindmap
  root((🎯 Tema))
    📚 [Categoría 1]
      (Concepto importante)
        Detalle
    🔍 [Categoría 2]
      (Otro concepto)

IMPORTANTE: TODO debe estar bajo UN ÚNICO root, NO crees múltiples raíces."""

        prompt = f"""Crea un mapa mental VISUAL sobre: '{request.topic}'.
{detail_instruction}

EMOJIS SUGERIDOS POR CATEGORÍA:
- Educación: 📚 📖 🎓 ✏️ 🧠 📝 🔖
- Ciencia: 🔬 🧪 🌡️ ⚗️ 🧬 🔭 ⚛️
- Tecnología: 💻 🖥️ 📱 ⚙️ 🔧 🤖 💡
- Naturaleza: 🌱 🌿 🌳 🌍 ⛰️ 🌊 ☀️
- Procesos: ⚡ 🔄 ➡️ 🎯 ⭐ 💫 ✨
- Personas: 👨‍🎓 👩‍🔬 👥 🧑‍💼
- Salud: ❤️ 🏥 💊 🩺 🧘

EJEMPLO CORRECTO (CON EMOJIS Y FORMAS):
mindmap
  root((🌱 Fotosíntesis))
    🔬 [Proceso]
      ☀️ (Luz solar)
        Energía lumínica
      🌿 (Clorofila)
        Pigmento verde
    ✨ [Productos]
      💨 Oxígeno O2
      🍬 Glucosa C6H12O6

REGLAS FINALES:
- USA emojis relevantes del tema
- Aplica formas (( )), [ ], ( ) según importancia
- TODO bajo UN root
- NO markdown, SOLO código Mermaid

Genera ahora:"""
        
        # Generar con Ollama
        response = generate_with_ollama(prompt, system_prompt)
        
        # Limpieza agresiva
        clean_code = response.strip()
        
        # Remover bloques de código markdown si existen
        clean_code = clean_code.replace("```mermaid", "").replace("```", "").strip()
        
        # Remover cualquier texto antes de "mindmap"
        if "mindmap" in clean_code:
            start_index = clean_code.find("mindmap")
            clean_code = clean_code[start_index:]
        
        # Asegurar que comienza con mindmap
        if not clean_code.startswith("mindmap"):
            clean_code = "mindmap\n" + clean_code
        
        # VALIDACIÓN: Detectar y corregir múltiples raíces
        lines = clean_code.split('\n')
        fixed_lines = []
        root_found = False
        
        for line in lines:
            if line.strip().startswith('mindmap'):
                fixed_lines.append(line)
            elif 'root((' in line:
                fixed_lines.append(line)
                root_found = True
            else:
                # Verificar si la línea es un nodo de nivel raíz (sin indentación o 0-1 espacios)
                stripped = line.lstrip()
                indent = len(line) - len(stripped)
                
                # Si tiene menos de 4 espacios de indentación y hay un root, debe ser hijo del root
                if root_found and indent < 4 and stripped and not stripped.startswith('#'):
                    # Agregar indentación para que sea hijo del root
                    fixed_lines.append('    ' + stripped)
                else:
                    fixed_lines.append(line)
        
        clean_code = '\n'.join(fixed_lines)
        
        print(f"Generated mindmap:\n{clean_code}")
        
        return {"mermaid_code": clean_code}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Endpoint para verificar que el servicio está funcionando"""
    try:
        # Verificar conexión con Ollama
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        response.raise_for_status()
        return {
            "status": "healthy",
            "ollama_connected": True,
            "ollama_url": OLLAMA_URL,
            "model": OLLAMA_MODEL
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "ollama_connected": False,
            "error": str(e)
        }

@app.post("/extract-pdf-text")
async def extract_pdf_text(file: UploadFile = File(...)):
    """
    Extrae texto de un PDF usando pdfplumber (mucho más robusto que PDF.js)
    """
    try:
        # Leer el contenido del archivo
        contents = await file.read()
        
        # Usar pdfplumber para extraer texto
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            full_text = ""
            
            for page_num, page in enumerate(pdf.pages, start=1):
                # Extraer texto de la página
                page_text = page.extract_text()
                
                if page_text:
                    full_text += page_text + "\n\n"
            
            if not full_text.strip():
                raise HTTPException(
                    status_code=400, 
                    detail="No se pudo extraer texto del PDF. Podría ser un PDF escaneado sin OCR."
                )
            
            return {
                "success": True,
                "text": full_text.strip(),
                "num_pages": len(pdf.pages),
                "char_count": len(full_text)
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar el PDF: {str(e)}"
        )