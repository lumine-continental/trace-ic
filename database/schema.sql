-- =============================================================================
-- TRACE IC — Esquema de Base de Datos MySQL / MariaDB (Producción En Cero)
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
-- 2. TABLA: careers (Carreras Oficiales del Instituto Continental)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `careers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(180) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_careers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABLA: campaigns (Campañas creadas en Configuración)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_campaigns_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABLA: subchannels (Subcanales jerárquicos por Canal)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subchannels` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `channel` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subchannel_ch_name` (`channel`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. TABLA: periods (Periodos y Periodo Activo Global)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `periods` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(10) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_periods_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. TABLA: advisors (Asesores / Prospectores)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `advisors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `phone_number` VARCHAR(25) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. TABLA: whatsapp_numbers (Catálogo de Números de WhatsApp del Instituto)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_numbers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(120) NOT NULL,
  `phone_number` VARCHAR(25) NOT NULL,
  `department` VARCHAR(100) NOT NULL DEFAULT 'Admisión',
  `default_greeting` VARCHAR(500) NOT NULL DEFAULT '',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. TABLA: links (Enlaces generados y acortados)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `links` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(180) NOT NULL,
  `short_code` VARCHAR(25) NULL DEFAULT NULL,
  `normal_url` VARCHAR(500) NOT NULL,
  `has_custom_alias` TINYINT(1) NOT NULL DEFAULT 0,
  `title` VARCHAR(180) NOT NULL,
  `channel` VARCHAR(40) NOT NULL DEFAULT 'link_ads',
  `period` VARCHAR(10) NOT NULL DEFAULT '202710',
  `campaign` VARCHAR(30) NOT NULL DEFAULT 'PRESENCIAL',
  `career` VARCHAR(160) NOT NULL DEFAULT 'Administración de Empresas',
  `subcampaign` VARCHAR(160) NOT NULL DEFAULT 'General',
  `advisor_name` VARCHAR(120) NULL DEFAULT NULL,
  `destination_type` ENUM('whatsapp', 'url') NOT NULL DEFAULT 'whatsapp',
  `destination_url` VARCHAR(1024) NULL DEFAULT NULL,
  `whatsapp_phone` VARCHAR(25) NULL DEFAULT '',
  `whatsapp_message` TEXT NULL DEFAULT NULL,
  `is_master_route` TINYINT(1) NOT NULL DEFAULT 0,
  `is_purgeable` TINYINT(1) NOT NULL DEFAULT 0,
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
-- 9. TABLA: click_events (Registro en tiempo real de cada clic para reportería)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `click_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `link_id` INT UNSIGNED NOT NULL,
  `clicked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `clicked_date` DATE NOT NULL,
  `is_bot` TINYINT(1) NOT NULL DEFAULT 0,
  `is_unique` TINYINT(1) NOT NULL DEFAULT 0,
  `visitor_hash` CHAR(64) NOT NULL,
  `channel` VARCHAR(40) NOT NULL,
  `period` VARCHAR(10) NOT NULL DEFAULT '202710',
  `campaign` VARCHAR(30) NOT NULL DEFAULT 'PRESENCIAL',
  `career` VARCHAR(160) NOT NULL DEFAULT 'Administración de Empresas',
  `subcampaign` VARCHAR(160) NOT NULL DEFAULT 'General',
  `advisor_name` VARCHAR(120) NULL DEFAULT NULL,
  `whatsapp_phone` VARCHAR(25) NULL DEFAULT NULL,
  `url_reference` VARCHAR(500) NULL DEFAULT NULL,
  `short_link` VARCHAR(255) NOT NULL,
  `is_purgeable` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_events_date_camp` (`clicked_date`, `campaign`, `is_bot`),
  KEY `idx_events_hierarchy` (`channel`, `campaign`, `subcampaign`),
  KEY `idx_events_dedup` (`link_id`, `visitor_hash`, `clicked_date`),
  CONSTRAINT `fk_events_link_v4` FOREIGN KEY (`link_id`) REFERENCES `links` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DATOS INICIALES DE PRODUCCIÓN (EN CERO — SOLO USUARIO ADMIN Y 14 CARRERAS)
-- =============================================================================

-- 1. Administrador inicial (admin@icontinental.edu.pe / TraceIC2026!)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `is_active`) VALUES
(1, 'Administrador Marketing IC', 'admin@icontinental.edu.pe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Las 14 Carreras Oficiales del Instituto Continental
INSERT INTO `careers` (`id`, `name`) VALUES
(1, 'Administración de Empresas'),
(2, 'Administración de Negocios Internacionales'),
(3, 'Administración de Negocios Bancarios y Financieros'),
(4, 'Contabilidad'),
(5, 'Ciencia de Datos e Inteligencia Artificial'),
(6, 'Desarrollo de Sistemas de Información'),
(7, 'Gestión de la Construcción'),
(8, 'Diseño Gráfico Publicitario'),
(9, 'Diseño de Modas'),
(10, 'Diseño de Interiores'),
(11, 'Marketing'),
(12, 'Gastronomía'),
(13, 'Enfermería Técnica'),
(14, 'Farmacia Técnica')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
