# 📝 Lista de Tareas - Aplicación Web# Vue 3 + TypeScript + Vite



Una aplicación moderna de gestión de tareas construida con Vue 3, TypeScript, Pinia y Supabase.This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.



## ✨ CaracterísticasLearn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).


- 🔐 **Autenticación**: Login y registro de usuarios con Supabase Auth
- ✅ **Gestión de Tareas**: Crear, editar, eliminar y completar tareas
- 📁 **Categorías**: Organiza tus tareas con categorías personalizadas
- 🏷️ **Etiquetas**: Agrega etiquetas para una mejor organización
- 📊 **Dashboard**: Vista general de tus tareas pendientes, completadas y vencidas
- ⏰ **Fechas límite**: Establece fechas de vencimiento para tus tareas
- 🎯 **Prioridades**: Clasifica tareas por prioridad (baja, media, alta, urgente)
- 📝 **Subtareas**: Divide tareas grandes en subtareas más pequeñas
- 🔔 **Notificaciones**: Sistema de notificaciones (configuración en perfil)
- 📱 **Responsive**: Diseño adaptable a todos los dispositivos
- 🎨 **UI Moderna**: Interfaz limpia y fácil de usar

## 🛠️ Tecnologías

- **Frontend**: Vue 3, TypeScript, Pinia, Vue Router, Vite
- **Backend**: Supabase (PostgreSQL)
- **Utilidades**: date-fns

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 3. Ejecutar la aplicación

```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── views/              # Vistas/Páginas
├── stores/             # Stores de Pinia
├── composables/        # Composables reutilizables
├── interfaces/         # Tipos TypeScript
├── lib/                # Configuración
├── router/             # Vue Router
└── style.css           # Estilos globales
```

## 🗄️ Base de Datos

La aplicación requiere las siguientes tablas en Supabase:
- profiles, categories, todos, subtasks, tags, todo_tags, notifications
- ai_conversations, ai_messages, ai_actions (para futuras features)

## 📝 Scripts

- `npm run dev` - Modo desarrollo
- `npm run build` - Compilar para producción
- `npm run preview` - Vista previa de producción
