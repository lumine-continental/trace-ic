# TRACE IC — Registro de Arquitectura y Decisiones Técnicas (ADR)

**Proyecto:** Trace IC — Plataforma de Tracking, Gestión de Enlaces y Analítica de Marketing  
**Dominio:** `https://trace.icontinental.edu.pe`  
**Organización:** Instituto Continental  

---

## 1. Decisiones Aprobadas (Fase 0 → Fase 1)

| ID | Decisión | Elección Aprobada | Justificación Técnica y de Negocio |
| :--- | :--- | :--- | :--- |
| **ADR-01** | **Estructura de URLs** | **Opción A:** Enlaces en raíz (`/{slug}`) y panel administrativo en `/app`. | Genera enlaces más cortos, limpios y confiables para SMS, WhatsApp, Chattigo y códigos QR impresos. El archivo `.htaccess` distingue automáticamente entre `/app`, `/api`, archivos estáticos y `/{slug}` (que pasa directo a `redirect.php`). |
| **ADR-02** | **Atribución hacia WhatsApp / Chattigo** | **Sello `[Ref: ...]` configurable por enlace** al final del mensaje predefinido de WhatsApp. | Permite que el asesor en Chattigo y el registro en Microsoft Dynamics CRM conozcan el origen exacto de la conversación desde el día 1 sin depender de integraciones API costosas. Soporta código fijo de campaña (`[Ref: IC-CONT]`) o código único de clic (`[Ref: IC-9A2F8]`). |
| **ADR-03** | **Modelo de Permisos Inicial** | **Rol único: Administrador**. | Simplifica el flujo operativo inicial para el equipo de marketing del Instituto Continental sin comprometer la seguridad del acceso. |
| **ADR-04** | **Stack Tecnológico para cPanel** | **Frontend React 18 + Vite + TypeScript + Tailwind CSS** y **Backend PHP 8 Nativo Modular (PDO) + MySQL/MariaDB**. | **¿Por qué esta combinación sobre Laravel en cPanel?**<br>1. **Cero fricción en cPanel compartido:** No requiere SSH ni Composer en el servidor, ni configuraciones complejas de `DocumentRoot` o permisos de `storage/`.<br>2. **Velocidad extrema en redirecciones:** `redirect.php` se ejecuta en < 20 ms sin cargar cientos de clases de un framework pesado en cada clic.<br>3. **Desarrollo local inmediato en Windows:** El equipo cuenta con `Node.js v22` y `Git` instalados localmente; Vite compila una carpeta estática lista para subir a cPanel. |
| **ADR-05** | **Separación de Métricas y Filtrado de Bots** | **4 niveles separados:** Hits Brutos, Clics Humanos, Clics Únicos y Redirecciones WhatsApp. | Evita que los bots de previsualización de WhatsApp, Meta Ads, TikTok y escáneres de correo distorsionen las estadísticas de campañas. |

---

## 2. Arquitectura de Directorios del Proyecto

```text
trace-ic/
├── docs/                          # Documentación técnica y guías de despliegue
│   └── ARQUITECTURA_Y_DECISIONES.md
├── database/                      # Scripts SQL para MySQL / MariaDB (phpMyAdmin)
│   └── schema.sql                 # Esquema completo + datos semilla iniciales
├── backend/                       # Código PHP 8 para el servidor cPanel
│   ├── .htaccess                  # Enrutamiento de URLs cortas (/slug), /api y /app
│   ├── redirect.php               # Motor de redirección ultrarrápido (< 20 ms)
│   ├── tracker-snippet.js         # Micro-script opcional para WordPress / GTM (autoatribución de página)
│   └── api/                       # API REST JSON para el panel React
│       ├── config.example.php     # Plantilla de conexión MySQL y configuración
│       ├── bootstrap.php          # Inicialización, CORS, JSON helpers y Auth
│       ├── Database.php           # Conexión PDO Singleton segura
│       └── index.php              # Controlador frontal de endpoints (/api/*)
└── frontend/                      # Aplicación SPA (React + Vite + TypeScript + Tailwind CSS)
    ├── index.html
    ├── package.json
    ├── vite.config.ts             # Configurado con base '/app/' para producción
    └── src/                       # Componentes estilo Microsoft Dynamics 365
```

---

## 3. Reglas de Enrutamiento en `https://trace.icontinental.edu.pe`

1. `GET https://trace.icontinental.edu.pe/` → Redirige automáticamente a `/app/` (Panel Administrativo).
2. `GET https://trace.icontinental.edu.pe/app/*` → Sirve la aplicación SPA construida con **React + Vite**.
3. `ANY https://trace.icontinental.edu.pe/api/*` → Enruta a `api/index.php` (API REST en PHP 8).
4. `GET https://trace.icontinental.edu.pe/{slug}` → Enruta directamente a `redirect.php?slug={slug}` (Motor de Tracking y Redirección).

**Palabras reservadas del sistema (no utilizables como `slug` de enlace):**
`app`, `admin`, `api`, `assets`, `static`, `login`, `logout`, `dashboard`, `robots.txt`, `favicon.ico`, `tracker-snippet.js`.
