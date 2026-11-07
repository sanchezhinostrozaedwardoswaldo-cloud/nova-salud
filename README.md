# 💊 Nova Salud

### Sistema web de gestión farmacéutica

**Nova Salud** es una aplicación web desarrollada para facilitar la administración de inventarios, compras, ventas y operaciones de una farmacia. Permite organizar la información de medicamentos, controlar las existencias por lotes, registrar movimientos y consultar reportes mediante una interfaz moderna y adaptable.

El sistema cuenta con autenticación JWT, control de acceso por roles y una arquitectura que separa el frontend, el backend y la base de datos.

## 🌐 Aplicación publicada

**Sitio web:** https://nova-salud-ws6j.onrender.com

**API:** https://nova-salud-api-82jw.onrender.com

> El sistema está desplegado como proyecto académico. El backend utiliza un servicio gratuito de Render, por lo que puede tardar en responder después de un periodo de inactividad.

## 🚀 Funcionalidades principales

- **Autenticación y usuarios:** inicio de sesión seguro, administración de usuarios y permisos diferenciados para administrador y vendedor.
- **Categorías y productos:** registro, consulta y administración de medicamentos y sus categorías.
- **Inventario:** control de existencias por lotes, fechas de vencimiento y alertas de stock.
- **Proveedores y compras:** gestión de proveedores, registro de compras y actualización automática de existencias.
- **Clientes y ventas:** registro de clientes, operaciones de venta y descuento automático de existencias mediante el criterio FEFO (primero en vencer, primero en salir).
- **Operaciones de inventario:** ajustes controlados, anulación de compras y ventas, y consulta del historial de movimientos.
- **Reportes:** estadísticas de compras, ventas e inventario, gráficos y exportación de información en CSV.
- **Interfaz:** diseño adaptable a diferentes pantallas, navegación lateral y temas claro y oscuro.

## 🛠️ Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Frontend | React, JavaScript, HTML y CSS |
| Backend | Node.js y Express |
| ORM | Sequelize |
| Base de datos | PostgreSQL |
| Alojamiento de base de datos | Supabase |
| Contenedores | Docker y Docker Compose |
| Despliegue | Render |
| Autenticación | JSON Web Tokens (JWT) |
| Control de versiones | Git y GitHub |

## 🏗️ Arquitectura

Nova Salud utiliza una arquitectura cliente-servidor:

1. **Frontend React:** presenta la interfaz y realiza solicitudes HTTP a la API.
2. **Backend Express:** procesa las solicitudes, valida la autenticación, aplica las reglas de negocio y controla las operaciones.
3. **Sequelize:** administra el acceso a PostgreSQL mediante modelos y consultas.
4. **Supabase:** aloja la base de datos PostgreSQL.
5. **Render:** publica el frontend como sitio estático y el backend como servicio Docker.

## 📁 Estructura del proyecto

```text
nova-salud/
├── backend/
│   ├── certificates/
│   ├── config/
│   ├── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   │   └── server.js
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.js
│   │   └── App.css
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 💻 Instalación y ejecución local

### Requisitos

- Git
- Docker y Docker Compose
- Acceso a una base de datos PostgreSQL compatible

### 1. Clonar el repositorio

```bash
git clone https://github.com/sanchezhinostrozaedwardoswaldo-cloud/nova-salud.git
cd nova-salud
```

El repositorio es privado actualmente, por lo que se necesitan permisos para clonarlo.

### 2. Configurar el backend

Crear el archivo `backend/.env` con las variables necesarias:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USUARIO:CONTRASENA@HOST:PUERTO/BASE_DE_DATOS
JWT_SECRET=REEMPLAZAR_CON_UNA_CLAVE_SEGURA
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:3000
```

La conexión debe corresponder a una instancia PostgreSQL válida. El proyecto también requiere el certificado de Supabase en `backend/certificates/supabase-ca.crt` para verificar la conexión SSL.

**Importante:** no compartir credenciales reales ni subir el archivo `.env` a GitHub.

### 3. Construir e iniciar los contenedores

Desde la raíz del proyecto:

```bash
docker compose up -d --build
```

### 4. Preparar la base de datos

Para una base de datos nueva, ejecutar las migraciones de Sequelize:

```bash
docker compose exec backend npx sequelize-cli db:migrate
```

No es necesario repetirlas si ya se aplicaron.

### 5. Acceder a la aplicación

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000
- **Comprobación de API:** http://localhost:4000/healthz

Para utilizar el sistema es necesario disponer de un usuario autorizado.

### Comandos útiles

Consultar los registros:

```bash
docker compose logs -f
```

Reiniciar los servicios:

```bash
docker compose restart
```

Detener los contenedores:

```bash
docker compose down
```

## 🔐 Seguridad

El sistema implementa autenticación mediante JWT, contraseñas cifradas mediante hash, autorización por roles, validaciones de datos y protección de rutas.

También utiliza Helmet, CORS, limitación de solicitudes y conexión SSL verificada con PostgreSQL.

Las credenciales y claves privadas deben mantenerse en variables de entorno. Antes de utilizar el sistema con datos reales, se recomienda realizar una revisión de seguridad y actualizar las dependencias que lo requieran.

## 📊 Control de inventario

Nova Salud administra medicamentos mediante lotes con existencias y fechas de vencimiento.

En las ventas se utiliza el criterio **FEFO (First Expired, First Out)** para priorizar los lotes con vencimiento más próximo. Además, las operaciones de compra, venta, ajuste y anulación generan movimientos que permiten consultar el historial del inventario.

## 🎓 Contexto académico

Nova Salud fue desarrollado como proyecto académico de la carrera de **Ingeniería de Software con Inteligencia Artificial de SENATI**, aplicando conocimientos de desarrollo web, bases de datos, programación backend, seguridad y despliegue de aplicaciones.

## 📌 Estado del proyecto

**Desarrollo funcional y despliegue inicial completados.**

El sistema cuenta con sus módulos principales implementados y ha sido probado mediante su interfaz pública. Se mantienen tareas de mantenimiento y revisión de seguridad antes de cualquier utilización en un entorno comercial real.

---

**Nova Salud — Gestión farmacéutica moderna y organizada.**