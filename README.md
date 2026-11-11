# TRACE IC — Plataforma de Tracking, Gestión de Enlaces y Analítica de Marketing

**Organización:** Instituto Continental  
**Dominio de Producción:** `https://trace.icontinental.edu.pe`  

---

## Arquitectura del Sistema

- **Motor de Redirección y Tracking (`backend/redirect.php`):** Ejecutado directamente en PHP 8 nativo con latencia < 20 ms. Detecta automáticamente la página de origen (`HTTP Referer` o parámetro `?_p=`), filtra bots de previsualización (WhatsApp, Meta, TikTok, SafeLinks) y ráfagas (< 3 s), fusiona parámetros UTM y construye mensajes dinámicos de WhatsApp con sello `[Ref: ...]` para **Chattigo** y **Microsoft Dynamics CRM**.
- **API REST (`backend/api/`):** Backend seguro en PHP 8 + PDO (MySQL/MariaDB) compatible con cPanel compartido sin dependencias externas.
- **Panel Administrativo y Analítico (`frontend/`):** Aplicación SPA en **React 18 + Vite + TypeScript + Tailwind CSS** bajo el lenguaje visual de **Microsoft Dynamics 365** (`#FFFFFF`, `#111827`, énfasis institucional `#E4000B`, encabezados Serif y tablas Sans-serif tabulares).

---

## Comandos Rápidos (Windows)

### 1. Ejecutar el Panel en Desarrollo Local
```powershell
cd frontend
npm.cmd run dev
```

### 2. Generar Paquete Listo para Subir a cPanel (`deploy-cpanel/`)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-cpanel.ps1
```

---

## Documentación del Proyecto

- [Registro de Arquitectura y Decisiones Técnicas](docs/ARQUITECTURA_Y_DECISIONES.md)
- [Guía Paso a Paso de Despliegue en cPanel y phpMyAdmin](docs/GUIA_DESPLIEGUE_CPANEL.md)
- [Esquema SQL para MySQL / MariaDB](database/schema.sql)
