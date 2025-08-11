# Restaurant Protocol Management System

Sistema de gestión y auditoría de protocolos operativos diarios para restaurantes.

## Características

- **Autenticación segura** con Supabase Auth
- **Sistema de roles** (Supervisor/Garzón)
- **Gestión de turnos** por calendario
- **Checklists colaborativos** con trazabilidad completa
- **Reporte de incidencias** en tiempo real
- **Interfaz responsive** y moderna

## Tecnologías

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Iconos**: Lucide React
- **Build**: Vite

## Configuración

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta las migraciones SQL desde `supabase/migrations/`
3. Copia las credenciales de tu proyecto

### 2. Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 3. Instalación

```bash
npm install
npm run dev
```

## Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── LoginForm.tsx   # Formulario de login
│   ├── Dashboard.tsx   # Panel principal
│   ├── ShiftPanel.tsx  # Panel de turno
│   ├── ShiftDetails.tsx # Detalles del turno
│   ├── PersonnelManagement.tsx # Gestión de personal
│   ├── AssignTeamModal.tsx # Modal de asignación
│   └── IncidentModal.tsx # Modal de incidencias
├── lib/
│   └── supabase.ts     # Cliente de Supabase
└── App.tsx             # Componente principal
```

## Roles y Permisos

### Supervisor
- Ver todos los turnos y áreas
- Gestionar personal (crear/eliminar usuarios)
- Asignar equipos a turnos
- Acceso completo a tareas e incidencias

### Garzón
- Ver solo turnos asignados del área "Salón"
- Completar tareas asignadas
- Reportar incidencias
- Actuar como cualquier miembro del equipo asignado

## Flujo de Trabajo

1. **Login**: Usuario inicia sesión con email/contraseña
2. **Dashboard**: Ve turnos del día actual
3. **Asignación**: Supervisor asigna equipo a turnos
4. **Ejecución**: Garzones completan tareas del checklist
5. **Incidencias**: Reportan problemas en tareas específicas
6. **Auditoría**: Sistema registra quién, cuándo y qué se completó

## Base de Datos

### Tablas Principales

- `user_profiles`: Perfiles de usuario con roles
- `shifts`: Turnos diarios (apertura/cierre)
- `tasks`: Tareas individuales del checklist
- `incidents`: Incidencias reportadas

### Seguridad

- Row Level Security (RLS) habilitado
- Políticas basadas en roles
- Autenticación JWT con Supabase

## Desarrollo

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview

# Lint
npm run lint
```

## Despliegue

El proyecto está configurado para desplegarse fácilmente en:
- Netlify
- Vercel
- Cualquier hosting de archivos estáticos

Asegúrate de configurar las variables de entorno en tu plataforma de despliegue.

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## Licencia

MIT License - ver archivo LICENSE para detalles.