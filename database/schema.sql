-- =============================================================================
-- TRACE IC — Esquema de Base de Datos MySQL / MariaDB (Versión Aprobada)
-- Dominio: https://trace.icontinental.edu.pe
-- Organización: Instituto Continental
-- Compatible con MySQL 5.7+ / 8.0+ y MariaDB 10.3+ (cPanel / phpMyAdmin)
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '-05:00';
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. TABLA: users (Administradores de la plataforma)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. TABLA: whatsapp_numbers (Catálogo de Números de WhatsApp del Instituto)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_numbers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(120) NOT NULL,
  `phone_number` VARCHAR(25) NOT NULL,
  `department` VARCHAR(100) NOT NULL DEFAULT 'Admisión',
  `default_greeting` VARCHAR(500) NOT NULL DEFAULT 'Hola Instituto Continental, deseo recibir información.',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABLA: links (Enlaces registrados y rutas maestras /CRM, /whatsapp-web, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `links` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(180) NOT NULL COMMENT 'Alias corto o ruta parametrizada',
  `normal_url` VARCHAR(500) NOT NULL COMMENT 'URL normal completa con ?campana= y ?subcampana=',
  `has_custom_alias` TINYINT(1) NOT NULL DEFAULT 1,
  `title` VARCHAR(180) NOT NULL,
  `channel` ENUM(
    'web_institucional',
    'tiktok_ads',
    'mailing_sms_chattigo',
    'landing_page'
  ) NOT NULL DEFAULT 'mailing_sms_chattigo',
  `campaign` VARCHAR(30) NOT NULL DEFAULT '202710' COMMENT 'Periodo origen: 202710 a 202930',
  `subcampaign` VARCHAR(160) NOT NULL DEFAULT 'General' COMMENT 'Subcampaña, Conjunto de anuncios o Carrera',
  `destination_type` ENUM('whatsapp', 'url') NOT NULL DEFAULT 'whatsapp',
  `destination_url` VARCHAR(1024) NULL DEFAULT NULL,
  `whatsapp_phone` VARCHAR(25) NULL DEFAULT '51987654321',
  `whatsapp_message` TEXT NULL DEFAULT NULL,
  `is_master_route` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('active', 'paused') NOT NULL DEFAULT 'active',
  `total_clicks` INT UNSIGNED NOT NULL DEFAULT 0,
  `unique_visitors` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_bot_hits` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_clicked_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATE NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_links_slug` (`slug`),
  KEY `idx_links_channel_camp` (`channel`, `campaign`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABLA: click_events (Registro en tiempo real de cada clic para reportería)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `click_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `link_id` INT UNSIGNED NOT NULL,
  `clicked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `clicked_date` DATE NOT NULL,
  `is_bot` TINYINT(1) NOT NULL DEFAULT 0,
  `is_unique` TINYINT(1) NOT NULL DEFAULT 0,
  `visitor_hash` CHAR(64) NOT NULL,
  `channel` ENUM(
    'web_institucional',
    'tiktok_ads',
    'mailing_sms_chattigo',
    'landing_page'
  ) NOT NULL,
  `campaign` VARCHAR(30) NOT NULL DEFAULT '202710',
  `subcampaign` VARCHAR(160) NOT NULL DEFAULT 'General',
  `url_reference` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Ej: https://icontinental.edu.pe/carrera/diseno-de-modas/',
  `short_link` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_events_date_camp` (`clicked_date`, `campaign`, `is_bot`),
  KEY `idx_events_hierarchy` (`channel`, `campaign`, `subcampaign`),
  KEY `idx_events_dedup` (`link_id`, `visitor_hash`, `clicked_date`),
  CONSTRAINT `fk_events_link_v4` FOREIGN KEY (`link_id`) REFERENCES `links` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DATOS INICIALES BASE (Instituto Continental)
-- =============================================================================

-- 1. Administrador inicial (admin@icontinental.edu.pe / TraceIC2026!)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `is_active`) VALUES
(1, 'Administrador Marketing IC', 'admin@icontinental.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Números de WhatsApp iniciales
INSERT INTO `whatsapp_numbers` (`id`, `label`, `phone_number`, `department`, `default_greeting`, `is_active`) VALUES
(1, 'WhatsApp Admisión Pregrado (Chattigo)', '51987654321', 'Admisión Pregrado', 'Hola Instituto Continental, deseo recibir información sobre admisión.', 1),
(2, 'WhatsApp Educación Continua', '51987654322', 'Educación Continua', 'Hola Instituto Continental, quisiera información sobre programas y cursos.', 1),
(3, 'WhatsApp Atención Becas y Convenios', '51987654323', 'Becas', 'Hola Instituto Continental, deseo información sobre becas.', 1)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`);

-- 3. Rutas maestras (/whatsapp-web, /CRM, /tiktok, /landing) para que todo enlace normal funcione de inmediato
INSERT INTO `links` (
  `id`, `slug`, `normal_url`, `has_custom_alias`, `title`, `channel`,
  `campaign`, `subcampaign`, `destination_type`, `destination_url`,
  `whatsapp_phone`, `whatsapp_message`, `is_master_route`, `status`, `created_at`
) VALUES
(
  1, 'whatsapp-web', 'https://trace.icontinental.edu.pe/whatsapp-web?campana=202710', 1,
  'Botón WhatsApp Global — Sitio Web Institucional', 'web_institucional',
  '202710', 'Autodetectado por Carrera (/carrera/...)', 'whatsapp', NULL,
  '51987654321', 'Hola Instituto Continental, estoy visitando su sitio web y deseo información.', 1, 'active', '2026-10-15'
),
(
  2, 'CRM', 'https://trace.icontinental.edu.pe/CRM?campana=202710&subcampana=envio-general', 1,
  'Enlace Maestro Mailing / SMS / Chattigo (/CRM)', 'mailing_sms_chattigo',
  '202710', 'Personalizable por campaña y subcampaña', 'whatsapp', NULL,
  '51987654321', 'Hola Instituto Continental, recibí su comunicación y deseo más información.', 1, 'active', '2026-10-18'
),
(
  3, 'tiktok', 'https://trace.icontinental.edu.pe/tiktok?campana=202710&subcampana=general', 1,
  'Ruta Maestra TikTok Ads (/tiktok)', 'tiktok_ads',
  '202710', 'Personalizable por campaña y conjunto', 'whatsapp', NULL,
  '51987654321', 'Hola Instituto Continental, vi su video en TikTok y deseo información.', 1, 'active', '2026-10-18'
),
(
  4, 'landing', 'https://trace.icontinental.edu.pe/landing?campana=202710&subcampana=general', 1,
  'Ruta Maestra Landing Pages (/landing)', 'landing_page',
  '202710', 'Personalizable por campaña y botón', 'whatsapp', NULL,
  '51987654321', 'Hola Instituto Continental, vengo de la página de registro y deseo información.', 1, 'active', '2026-10-18'
)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

SET FOREIGN_KEY_CHECKS = 1;
