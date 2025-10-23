# Plataforma de Mantenimiento Locativo BIM

Una plataforma web completa para la gestión eficiente de mantenimiento locativo basada en la metodología BIM (Building Information Modeling) para la Universidad de Cundinamarca.

## 📋 Descripción

Esta aplicación permite gestionar de manera integral los incidentes, mantenimientos preventivos y predictivos, inventario de componentes, y reportes de la infraestructura universitaria. Utiliza la metodología BIM para optimizar la gestión de instalaciones y mejorar la toma de decisiones.

## ✨ Características Principales

### 👥 Gestión de Usuarios y Roles
- **Administrador**: Gestión completa de usuarios, informes y métricas globales
- **Administrativo**: Gestión de tareas, mantenimientos, inventario y panel BIM
- **Operario**: Gestión de tareas asignadas e inventario

### 🚨 Reporte de Incidentes
- Reporte de incidentes por usuarios autenticados o invitados
- Clasificación por tipo (eléctrico, hidráulico, sanitario, mantenimiento, otro)
- Niveles de gravedad (baja, media, alta, crítica)
- Seguimiento de estados (pendiente, asignado, en proceso, resuelto, rechazado)
- Sistema de asignación automática a operarios
- Historial completo de cambios

### 🔧 Gestión de Mantenimientos
- Mantenimientos preventivos programados
- Mantenimientos predictivos basados en datos
- Programación automática según frecuencia
- Asignación a componentes específicos
- Seguimiento de ejecución y comentarios

### 📦 Gestión de Inventario
- Catálogo de items y componentes
- Control de stock y ubicaciones
- Solicitudes de adquisición
- Asociación de items a componentes

### 🏢 Panel BIM
- Visualización de componentes por ubicación
- Información detallada de cada componente
- Estado operativo y fechas de mantenimiento
- Integración con sistema de ubicaciones

### 📊 Métricas y Reportes
- Dashboard con indicadores clave
- Gráficos de rendimiento
- Reportes PDF generados automáticamente
- Análisis predictivo de fallos

### 🔔 Notificaciones en Tiempo Real
- Notificaciones vía Socket.IO
- Alertas de incidentes nuevos
- Recordatorios de mantenimientos
- Actualizaciones de estado

### 🌤️ Integración con Clima
- Consulta de condiciones climáticas
- Impacto en programaciones de mantenimiento

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** con **Express.js**
- **PostgreSQL** como base de datos
- **Socket.IO** para notificaciones en tiempo real
- **JWT** para autenticación
- **bcrypt** para encriptación de contraseñas
- **Multer** para manejo de archivos
- **PDFKit** para generación de PDFs
- **Nodemailer** para envío de correos

### Frontend
- **React** con hooks y componentes funcionales
- **React Router** para navegación
- **Bootstrap** y **React Bootstrap** para UI
- **Axios** para llamadas HTTP
- **Socket.IO Client** para conexiones en tiempo real
- **React Big Calendar** para visualización de calendarios
- **Recharts** para gráficos y métricas
- **React Toastify** para notificaciones

### Base de Datos
- **PostgreSQL** con triggers y funciones automáticas
- Esquema complejo con más de 15 tablas
- Relaciones normalizadas
- Funciones PL/pgSQL para lógica de negocio

## 🚀 Instalación

### Prerrequisitos
- Node.js (versión 16 o superior)
- PostgreSQL (versión 12 o superior)
- npm o yarn

### Configuración de la Base de Datos
1. Crear una base de datos PostgreSQL
2. Ejecutar el script `Base de Datos Postgres.sql` para crear las tablas, funciones y datos iniciales

### Backend
```bash
cd backend
npm install
# Configurar variables de entorno en .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Variables de Entorno (.env)
```env
PORT=5000
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db
JWT_SECRET=tu_jwt_secret
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_email
```

## 📖 Uso

### Acceso a la Aplicación
1. Acceder a `http://localhost:3000`
2. Registrarse o iniciar sesión
3. Según el rol, acceder a las funcionalidades disponibles

### Funcionalidades por Rol

#### Administrador
- Gestión de usuarios
- Visualización de informes globales
- Configuración del sistema

#### Supervisor
- Asignación de tareas
- Gestión de mantenimientos
- Control de inventario
- Panel BIM
- Métricas y reportes

#### Operario
- Visualización de tareas asignadas
- Gestión de inventario asignado
- Solicitudes de adquisición

## 🔌 API REST

### Autenticación
- `POST /auth/login` - Inicio de sesión
- `POST /auth/register` - Registro de usuario
- `POST /auth/reset-password` - Restablecer contraseña

### Incidentes
- `GET /incidentes` - Listar incidentes
- `POST /incidentes` - Crear incidente
- `PUT /incidentes/:id` - Actualizar incidente
- `GET /incidentes/:id` - Detalles de incidente

### Mantenimientos
- `GET /mantenimientos` - Listar mantenimientos
- `POST /mantenimientos` - Crear mantenimiento
- `PUT /mantenimientos/:id` - Actualizar mantenimiento

### Inventario
- `GET /inventario` - Listar items
- `POST /inventario` - Agregar item
- `PUT /inventario/:id` - Actualizar stock

### Componentes
- `GET /componentes` - Listar componentes
- `POST /componentes` - Crear componente
- `PUT /componentes/:id` - Actualizar componente

### Notificaciones
- `GET /notificaciones` - Listar notificaciones
- `PUT /notificaciones/:id/leida` - Marcar como leída

## 🗄️ Esquema de Base de Datos

### Tablas Principales
- **usuarios**: Información de usuarios y roles
- **incidente**: Reportes de incidentes
- **componentes**: Componentes de infraestructura
- **mantenimientos**: Programaciones de mantenimiento
- **inventario**: Control de stock
- **ubicaciones**: Ubicaciones físicas
- **asignaciones**: Asignación de tareas
- **notificaciones**: Sistema de notificaciones

### Funciones y Triggers
- Sincronización automática de responsables
- Actualización automática de estados
- Generación automática de nombres de ubicación
- Historial de cambios en incidentes

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para nueva funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.

## 👥 Equipo de Desarrollo

Desarrollado para la Universidad de Cundinamarca como parte del proyecto de modernización de la gestión de mantenimiento locativo.

## 📞 Soporte

Para soporte técnico o consultas, contactar al equipo de desarrollo de la Universidad de Cundinamarca.
