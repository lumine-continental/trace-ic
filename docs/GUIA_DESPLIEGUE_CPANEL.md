# TRACE IC — Guía Paso a Paso de Despliegue en cPanel y phpMyAdmin

Esta guía detalla cómo publicar **Trace IC** en el subdominio `https://trace.icontinental.edu.pe` utilizando la infraestructura de **cPanel + PHP + MySQL/MariaDB**.

---

## Paso 1: Crear el Subdominio en cPanel

1. Ingresa al panel **cPanel** del Instituto Continental.
2. Ve a la sección **Dominios** (Domains) → **Crear un nuevo dominio / subdominio**.
3. Ingresa:
   - **Dominio:** `trace.icontinental.edu.pe`
   - **Raíz del documento (Document Root):** Por ejemplo, `/home/tu_usuario/trace.icontinental.edu.pe`
4. Verifica en **SSL/TLS Status** (AutoSSL) que el certificado HTTPS para `trace.icontinental.edu.pe` esté activo.

---

## Paso 2: Crear la Base de Datos MySQL e Importar el Esquema

1. En cPanel, abre **Asistente de bases de datos MySQL** (MySQL Database Wizard).
2. Crea una base de datos (ejemplo: `icontinental_trace`).
3. Crea un usuario de base de datos con contraseña segura y asígnale **Todos los privilegios** (`ALL PRIVILEGES`).
4. Regresa a la pantalla principal de cPanel y abre **phpMyAdmin**.
5. Selecciona la base de datos recién creada en el panel izquierdo, haz clic en la pestaña **Importar** (Import) y sube el archivo:
   - `database/schema.sql`
6. Haz clic en **Continuar** (Go). Esto creará las 7 tablas optimizadas y cargará las reglas iniciales de carreras y números de WhatsApp.

---

## Paso 3: Generar el Paquete de Producción y Configurar Credenciales

En tu PC Windows, hemos preparado el script `scripts/build-cpanel.ps1` que genera automáticamente la carpeta `deploy-cpanel/` con la estructura exacta:

```text
deploy-cpanel/
├── .htaccess              # Reglas de enrutamiento Opción A (/{slug}, /app, /api)
├── redirect.php           # Motor de redirección ultrarrápido (< 20 ms)
├── tracker-snippet.js     # Micro-snippet opcional para WordPress / GTM
├── api/
│   ├── config.example.php # Renombrar a config.php en cPanel con tus datos MySQL
│   ├── bootstrap.php
│   ├── Database.php
│   └── index.php
└── app/                   # Interfaz compilada de React + Vite
    ├── index.html
    └── assets/
```

1. Sube el contenido de `deploy-cpanel/` al directorio raíz del subdominio `trace.icontinental.edu.pe` en el **Administrador de Archivos de cPanel** (asegurándote de activar "Mostrar archivos ocultos (dotfiles)" para que se suba `.htaccess`).
2. Dentro de `api/`, renombra `config.example.php` a `config.php` y coloca el nombre de la base de datos, usuario y contraseña de MySQL que creaste en el Paso 2.

---

## Paso 4: Verificación Final en Producción

1. Abre `https://trace.icontinental.edu.pe/` → te redirigirá automáticamente a `https://trace.icontinental.edu.pe/app/` (Panel Administrativo).
2. Inicia sesión con:
   - **Usuario inicial:** `admin@icontinental.edu.pe`
   - **Contraseña inicial:** `TraceIC2026!`
3. Prueba un enlace corto en vivo:
   - `https://trace.icontinental.edu.pe/wa-web?_p=/carreras/contabilidad`
   - Verás cómo redirige instantáneamente a WhatsApp con el mensaje personalizado para la carrera de Contabilidad (`[Ref: IC-WEB-CONT]`) y suma el clic en tiempo real en tu panel sin volver a hacer `build`.
