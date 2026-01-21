# Usamos una imagen base ligera de Python
FROM python:3.11-slim

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero los requerimientos para aprovechar la caché de Docker
COPY requirements.txt .

# Instalamos las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código fuente
COPY main.py .

# Exponemos el puerto 8000
EXPOSE 8000

# Comando para iniciar el servidor
# OJO: --host 0.0.0.0 es obligatorio en Docker para que sea accesible desde fuera
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]