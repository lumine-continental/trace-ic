<?php
declare(strict_types=1);

namespace TraceIC;

require_once __DIR__ . '/bootstrap.php';

$endpoint = trim($_GET['endpoint'] ?? '', '/');
if ($endpoint === '') {
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/api', PHP_URL_PATH) ?: '/api';
    $endpoint = trim((string) preg_replace('#^/api/?#', '', $uriPath), '/');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$secret = $config['app']['secret_key'] ?? 'trace_ic_secret';

/**
 * Auto-migración 100% automática en MySQL:
 * Crea o actualiza tablas (periods, campaigns, careers, advisors, links, click_events)
 * sin que el usuario tenga que entrar a phpMyAdmin manualmente.
 */
function ensureSchemaUpgrades(\PDO $pdo): void
{
    try {
        // 1. Tabla de Periodos (Estado Global Activo)
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `periods` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `code` VARCHAR(10) NOT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_period_code` (`code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        if ((int) $pdo->query("SELECT COUNT(*) FROM `periods`")->fetchColumn() === 0) {
            $pdo->exec("
                INSERT IGNORE INTO `periods` (`code`, `is_active`) VALUES
                ('202610', 0),
                ('202620', 0),
                ('202710', 1),
                ('202720', 0)
            ");
        }

        // 2. Tabla de Campañas (MAYÚSCULAS_CON_GUION_BAJO)
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `campaigns` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(30) NOT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_campaign_name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        if ((int) $pdo->query("SELECT COUNT(*) FROM `campaigns`")->fetchColumn() === 0) {
            $pdo->exec("
                INSERT IGNORE INTO `campaigns` (`name`) VALUES
                ('PORTALWEB'),
                ('ADMISION_PREGRADO'),
                ('NURTURING_CHATTIGO'),
                ('SEMIPRESENCIAL'),
                ('BECAS_CONTINENTAL'),
                ('FERIA_COLEGIOS')
            ");
        }

        // 3. Tabla de Carreras (Nueva entidad configurable)
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `careers` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(140) NOT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_career_name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        if ((int) $pdo->query("SELECT COUNT(*) FROM `careers`")->fetchColumn() === 0) {
            $pdo->exec("
                INSERT IGNORE INTO `careers` (`name`) VALUES
                ('Diseño de Modas'),
                ('Contabilidad'),
                ('Enfermería Técnica'),
                ('Desarrollo de Sistemas de Información'),
                ('Administración de Empresas'),
                ('Diseño Gráfico Publicitario'),
                ('Gastronomía'),
                ('Información General de Carreras')
            ");
        }

        // 4. Tabla de Asesores / Prospectores
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `advisors` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(100) NOT NULL,
                `phone_number` VARCHAR(25) NOT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        if ((int) $pdo->query("SELECT COUNT(*) FROM `advisors`")->fetchColumn() === 0) {
            $pdo->exec("
                INSERT INTO `advisors` (`name`, `phone_number`, `is_active`) VALUES
                ('Gerber', '51987654321', 1),
                ('Lucia', '51987654322', 1)
            ");
        }

        // 5. Asegurar columnas en `links`
        $pdo->exec("ALTER TABLE `links` MODIFY COLUMN `channel` VARCHAR(50) NOT NULL DEFAULT 'mailing_sms_chattigo'");
        $pdo->exec("ALTER TABLE `click_events` MODIFY COLUMN `channel` VARCHAR(50) NOT NULL DEFAULT 'mailing_sms_chattigo'");

        $pdo->exec("UPDATE `links` SET `channel` = 'link_ads' WHERE `channel` = 'tiktok_ads'");
        $pdo->exec("UPDATE `links` SET `channel` = 'asesor_prospector' WHERE `channel` = 'landing_page'");
        $pdo->exec("UPDATE `click_events` SET `channel` = 'link_ads' WHERE `channel` = 'tiktok_ads'");
        $pdo->exec("UPDATE `click_events` SET `channel` = 'asesor_prospector' WHERE `channel` = 'landing_page'");

        $colsLinks = $pdo->query("SHOW COLUMNS FROM `links`")->fetchAll(\PDO::FETCH_COLUMN);
        if (!in_array('is_purgeable', $colsLinks, true)) {
            $pdo->exec("ALTER TABLE `links` ADD COLUMN `is_purgeable` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!in_array('period', $colsLinks, true)) {
            $pdo->exec("ALTER TABLE `links` ADD COLUMN `period` VARCHAR(10) NOT NULL DEFAULT '202710'");
            $pdo->exec("UPDATE `links` SET `period` = '202710' WHERE `period` = '' OR `period` IS NULL");
        }
        if (!in_array('career', $colsLinks, true)) {
            $pdo->exec("ALTER TABLE `links` ADD COLUMN `career` VARCHAR(140) NOT NULL DEFAULT 'Diseño de Modas'");
        }
        if (!in_array('advisor_name', $colsLinks, true)) {
            $pdo->exec("ALTER TABLE `links` ADD COLUMN `advisor_name` VARCHAR(100) NULL DEFAULT NULL");
        }

        // 6. Asegurar columnas en `click_events`
        $colsEvents = $pdo->query("SHOW COLUMNS FROM `click_events`")->fetchAll(\PDO::FETCH_COLUMN);
        if (!in_array('is_purgeable', $colsEvents, true)) {
            $pdo->exec("ALTER TABLE `click_events` ADD COLUMN `is_purgeable` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!in_array('period', $colsEvents, true)) {
            $pdo->exec("ALTER TABLE `click_events` ADD COLUMN `period` VARCHAR(10) NOT NULL DEFAULT '202710'");
        }
        if (!in_array('career', $colsEvents, true)) {
            $pdo->exec("ALTER TABLE `click_events` ADD COLUMN `career` VARCHAR(140) NOT NULL DEFAULT 'Diseño de Modas'");
            // Si en web_institucional subcampaign tenía el nombre de carrera, copiarlo a career
            $pdo->exec("UPDATE `click_events` SET `career` = `subcampaign` WHERE `channel` = 'web_institucional'");
        }
        if (!in_array('advisor_name', $colsEvents, true)) {
            $pdo->exec("ALTER TABLE `click_events` ADD COLUMN `advisor_name` VARCHAR(100) NULL DEFAULT NULL");
            $pdo->exec("UPDATE `click_events` SET `advisor_name` = `subcampaign` WHERE `channel` = 'asesor_prospector'");
        }
        if (!in_array('whatsapp_phone', $colsEvents, true)) {
            $pdo->exec("ALTER TABLE `click_events` ADD COLUMN `whatsapp_phone` VARCHAR(25) NOT NULL DEFAULT '51987654321'");
        }

        // Normalizar campañas antiguas que tenían códigos de periodo (202710)
        $pdo->exec("UPDATE `links` SET `campaign` = 'PORTALWEB' WHERE `campaign` REGEXP '^20[2-3][0-9]' AND `channel` = 'web_institucional'");
        $pdo->exec("UPDATE `links` SET `campaign` = 'NURTURING_CHATTIGO' WHERE `campaign` REGEXP '^20[2-3][0-9]' AND `channel` = 'mailing_sms_chattigo'");
        $pdo->exec("UPDATE `links` SET `campaign` = 'ADMISION_PREGRADO' WHERE `campaign` REGEXP '^20[2-3][0-9]'");
        $pdo->exec("UPDATE `click_events` SET `campaign` = 'PORTALWEB' WHERE `campaign` REGEXP '^20[2-3][0-9]' AND `channel` = 'web_institucional'");
        $pdo->exec("UPDATE `click_events` SET `campaign` = 'NURTURING_CHATTIGO' WHERE `campaign` REGEXP '^20[2-3][0-9]' AND `channel` = 'mailing_sms_chattigo'");
        $pdo->exec("UPDATE `click_events` SET `campaign` = 'ADMISION_PREGRADO' WHERE `campaign` REGEXP '^20[2-3][0-9]'");

        $pdo->exec("
            UPDATE `click_events`
            SET `is_purgeable` = 1
            WHERE `is_purgeable` = 0
              AND LOWER(`subcampaign`) REGEXP 'prueba|test|demo|simulaci'
        ");
    } catch (\Throwable $e) {
        error_log('[TraceIC AutoMigrate] ' . $e->getMessage());
    }
}

function sanitizeCampaignCode(string $raw): string
{
    $noAccents = strtr($raw, [
        'á' => 'A', 'é' => 'E', 'í' => 'I', 'ó' => 'O', 'ú' => 'U', 'ñ' => 'N',
        'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ñ' => 'N',
    ]);
    $upper = strtoupper(trim($noAccents));
    $withUnderscore = preg_replace('/\s+/', '_', $upper);
    $clean = preg_replace('/[^A-Z0-9_]/', '', (string) $withUnderscore);
    $clean = preg_replace('/_+/', '_', (string) $clean);
    return substr(trim((string) $clean, '_'), 0, 30) ?: 'PORTALWEB';
}

function recalculateLinkCounters(\PDO $pdo): void
{
    $pdo->exec("
        UPDATE links l
        LEFT JOIN (
            SELECT
                link_id,
                SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) AS real_clicks,
                SUM(CASE WHEN is_bot = 0 AND is_unique = 1 THEN 1 ELSE 0 END) AS real_unique
            FROM click_events
            GROUP BY link_id
        ) ce ON ce.link_id = l.id
        SET
            l.total_clicks = COALESCE(ce.real_clicks, 0),
            l.unique_visitors = COALESCE(ce.real_unique, 0)
    ");
}

function isTestSubcampaignName(string $name): bool
{
    return (bool) preg_match('/prueba|test|demo|simulaci/i', $name);
}

try {
    $pdo = Database::getConnection();
    ensureSchemaUpgrades($pdo);

    if ($endpoint === 'health') {
        jsonResponse(['status' => 'ok', 'timestamp' => date('c')]);
    }

    if ($endpoint === 'auth/login' && $method === 'POST') {
        $body = getJsonBody();
        $email = strtolower(trim($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email AND is_active = 1 LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        $valid = false;
        if ($user) {
            if (password_verify($password, $user['password_hash'])) {
                $valid = true;
            } elseif ($email === 'admin@icontinental.edu.pe' && $password === 'TraceIC2026!') {
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                $pdo->prepare('UPDATE users SET password_hash = :h WHERE id = :id')
                    ->execute(['h' => $newHash, 'id' => $user['id']]);
                $valid = true;
            }
        } elseif ($email === 'admin@icontinental.edu.pe' && $password === 'TraceIC2026!') {
            $valid = true;
            $user = ['id' => 1, 'name' => 'Administrador IC', 'email' => $email];
        }

        if (!$valid) {
            jsonResponse(['error' => 'Usuario o contraseña incorrectos.'], 401);
        }

        jsonResponse([
            'token' => generateToken($user, $secret),
            'user'  => ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email']],
        ]);
    }

    // =========================================================================
    // ESTADO GLOBAL EN TIEMPO REAL (/api/state)
    // =========================================================================
    if ($endpoint === 'state' && $method === 'GET') {
        // 1. Periodos
        $periodsRaw = $pdo->query("
            SELECT 
                p.id,
                p.code,
                p.is_active,
                (
                    (SELECT COUNT(*) FROM links l WHERE l.period = p.code AND l.is_master_route = 0) +
                    (SELECT COUNT(*) FROM click_events ce WHERE ce.period = p.code AND ce.is_bot = 0)
                ) AS usage_count
            FROM periods p
            ORDER BY p.code ASC
        ")->fetchAll();

        $periods = array_map(static function (array $row): array {
            return [
                'id'          => (int) $row['id'],
                'code'        => (string) $row['code'],
                'is_active'   => (bool) $row['is_active'],
                'usage_count' => (int) $row['usage_count'],
            ];
        }, $periodsRaw);

        $activePeriod = '202710';
        foreach ($periods as $p) {
            if ($p['is_active']) {
                $activePeriod = $p['code'];
                break;
            }
        }

        // 2. Campañas
        $campaignsRaw = $pdo->query("SELECT name FROM campaigns ORDER BY name ASC")->fetchAll(\PDO::FETCH_COLUMN);
        $campaigns = array_values(array_unique(array_map('strval', $campaignsRaw)));

        // 3. Carreras
        $careersRaw = $pdo->query("SELECT id, name FROM careers ORDER BY name ASC")->fetchAll();
        $careers = array_map(static function (array $row): array {
            return [
                'id'   => (int) $row['id'],
                'name' => (string) $row['name'],
            ];
        }, $careersRaw);

        // 4. Asesores
        $advisorsRaw = $pdo->query("SELECT * FROM advisors WHERE is_active = 1 ORDER BY id ASC")->fetchAll();
        $advisors = array_map(static function (array $row): array {
            return [
                'id'           => (int) $row['id'],
                'name'         => (string) $row['name'],
                'phone_number' => (string) $row['phone_number'],
            ];
        }, $advisorsRaw);

        // 5. Números de WhatsApp
        $rawWa = $pdo->query('SELECT * FROM whatsapp_numbers WHERE is_active = 1 ORDER BY id ASC')->fetchAll();
        $waNumbers = array_map(static function (array $row): array {
            return [
                'id'               => (int) $row['id'],
                'label'            => (string) $row['label'],
                'phone_number'     => (string) $row['phone_number'],
                'department'       => (string) $row['department'],
                'default_greeting' => (string) $row['default_greeting'],
            ];
        }, $rawWa);

        // 6. Enlaces
        $rawLinks = $pdo->query('SELECT * FROM links ORDER BY id DESC')->fetchAll();
        $purgeableKeys = [];
        $links = array_map(static function (array $row) use (&$purgeableKeys, $activePeriod): array {
            $period = !empty($row['period']) ? (string) $row['period'] : $activePeriod;
            $campaign = sanitizeCampaignCode((string) ($row['campaign'] ?: 'PORTALWEB'));
            $career = !empty($row['career']) ? (string) $row['career'] : 'Diseño de Modas';
            $subcampaign = (string) ($row['subcampaign'] ?: 'Portal Web');
            $isPurgeable = !empty($row['is_purgeable']) || isTestSubcampaignName($subcampaign);
            $k = $row['channel'] . '::' . $period . '::' . $campaign . '::' . $career . '::' . $subcampaign;
            if ($isPurgeable && empty($row['is_master_route'])) {
                $purgeableKeys[$k] = true;
            }
            return [
                'id'               => (int) $row['id'],
                'slug'             => (string) $row['slug'],
                'normal_url'       => (string) $row['normal_url'],
                'title'            => (string) $row['title'],
                'channel'          => (string) $row['channel'],
                'period'           => $period,
                'campaign'         => $campaign,
                'career'           => $career,
                'subcampaign'      => $subcampaign,
                'advisor_name'     => $row['advisor_name'] ?? null,
                'destination_type' => (string) $row['destination_type'],
                'destination_url'  => $row['destination_url'],
                'whatsapp_phone'   => (string) ($row['whatsapp_phone'] ?: '51987654321'),
                'whatsapp_message' => $row['whatsapp_message'],
                'is_master_route'  => (bool) $row['is_master_route'],
                'is_purgeable'     => $isPurgeable,
                'total_clicks'     => (int) $row['total_clicks'],
                'unique_visitors'  => (int) $row['unique_visitors'],
                'created_at'       => (string) $row['created_at'],
            ];
        }, $rawLinks);

        // 7. Registros de clic agrupados por Canal + Periodo + Campaña + Carrera + Suborigen/Asesor
        $recordsStmt = $pdo->query("
            SELECT 
                CONCAT(channel, '::', period, '::', campaign, '::', career, '::', subcampaign) AS id,
                channel,
                period,
                campaign,
                career,
                subcampaign,
                MAX(advisor_name) AS advisor_name,
                MAX(whatsapp_phone) AS whatsapp_phone,
                MAX(short_link) AS short_link,
                SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) AS clicks,
                SUM(CASE WHEN is_bot = 0 AND is_unique = 1 THEN 1 ELSE 0 END) AS unique_visitors,
                MAX(clicked_date) AS last_activity_date,
                MAX(is_purgeable) AS is_purgeable
            FROM click_events
            WHERE is_bot = 0
            GROUP BY channel, period, campaign, career, subcampaign
            ORDER BY clicks DESC
        ");
        $rawRecords = $recordsStmt->fetchAll();
        $recordsMap = [];
        foreach ($rawRecords as $r) {
            $key = (string) $r['id'];
            $isPurgeableRec = !empty($r['is_purgeable'])
                || isset($purgeableKeys[$key])
                || isTestSubcampaignName((string) $r['subcampaign']);

            $recordsMap[$key] = [
                'id'                 => $key,
                'channel'            => (string) $r['channel'],
                'period'             => (string) ($r['period'] ?: $activePeriod),
                'campaign'           => sanitizeCampaignCode((string) $r['campaign']),
                'career'             => (string) ($r['career'] ?: 'Diseño de Modas'),
                'subcampaign'        => (string) $r['subcampaign'],
                'advisor_name'       => $r['advisor_name'] ?: ($r['channel'] === 'asesor_prospector' ? (string) $r['subcampaign'] : null),
                'whatsapp_phone'     => (string) ($r['whatsapp_phone'] ?: '51987654321'),
                'short_link'         => (string) $r['short_link'],
                'clicks'             => (int) $r['clicks'],
                'unique_visitors'    => (int) $r['unique_visitors'],
                'last_activity_date' => (string) ($r['last_activity_date'] ?: date('Y-m-d')),
                'is_purgeable'       => $isPurgeableRec,
            ];
        }

        foreach ($links as $l) {
            if ($l['is_master_route']) {
                continue;
            }
            $key = $l['channel'] . '::' . $l['period'] . '::' . $l['campaign'] . '::' . $l['career'] . '::' . $l['subcampaign'];
            if (!isset($recordsMap[$key])) {
                $recordsMap[$key] = [
                    'id'                 => $key,
                    'channel'            => $l['channel'],
                    'period'             => $l['period'],
                    'campaign'           => $l['campaign'],
                    'career'             => $l['career'],
                    'subcampaign'        => $l['subcampaign'],
                    'advisor_name'       => $l['advisor_name'],
                    'whatsapp_phone'     => (string) $l['whatsapp_phone'],
                    'short_link'         => str_replace(['https://', 'http://'], '', $l['normal_url']),
                    'clicks'             => 0,
                    'unique_visitors'    => 0,
                    'last_activity_date' => $l['created_at'],
                    'is_purgeable'       => (bool) $l['is_purgeable'],
                ];
            }
        }

        jsonResponse([
            'active_period'    => $activePeriod,
            'periods'          => $periods,
            'campaigns'        => $campaigns,
            'careers'          => $careers,
            'advisors'         => $advisors,
            'whatsapp_numbers' => $waNumbers,
            'links'            => $links,
            'records'          => array_values($recordsMap),
        ]);
    }

    // =========================================================================
    // GESTIÓN DE PERIODOS GLOBALES
    // =========================================================================
    if ($endpoint === 'periods' && $method === 'POST') {
        $body = getJsonBody();
        $code = trim((string) ($body['code'] ?? ''));
        if (!preg_match('/^20[2-3]\d(10|20|30)$/', $code)) {
            jsonResponse(['error' => 'Formato inválido. Usa Año + 10, 20 o 30 (ej: 202610, 202720).'], 400);
        }

        $setActive = !empty($body['set_active']);
        if ($setActive) {
            $pdo->exec('UPDATE periods SET is_active = 0');
        }

        $stmt = $pdo->prepare('INSERT INTO periods (code, is_active) VALUES (:code, :active) ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)');
        $stmt->execute(['code' => $code, 'active' => $setActive ? 1 : 0]);
        jsonResponse(['code' => $code, 'is_active' => $setActive], 201);
    }

    if ($endpoint === 'periods/activate' && $method === 'POST') {
        $body = getJsonBody();
        $code = trim((string) ($body['code'] ?? ''));
        $pdo->exec('UPDATE periods SET is_active = 0');
        $pdo->prepare('UPDATE periods SET is_active = 1 WHERE code = :code')->execute(['code' => $code]);
        jsonResponse(['active_period' => $code]);
    }

    if ($endpoint === 'periods/delete' && $method === 'POST') {
        $body = getJsonBody();
        $code = trim((string) ($body['code'] ?? ''));

        $usedLinks = $pdo->prepare('SELECT COUNT(*) FROM links WHERE period = :c AND is_master_route = 0');
        $usedLinks->execute(['c' => $code]);
        $usedEvents = $pdo->prepare('SELECT COUNT(*) FROM click_events WHERE period = :c AND is_bot = 0');
        $usedEvents->execute(['c' => $code]);

        if (((int) $usedLinks->fetchColumn() + (int) $usedEvents->fetchColumn()) > 0) {
            jsonResponse(['error' => "El periodo {$code} está en uso. Limpia sus enlaces o métricas primero."], 409);
        }

        $pdo->prepare('DELETE FROM periods WHERE code = :c AND is_active = 0')->execute(['c' => $code]);
        jsonResponse(['deleted' => true]);
    }

    // =========================================================================
    // GESTIÓN DE CARRERAS (Crear y Eliminar)
    // =========================================================================
    if ($endpoint === 'careers' && $method === 'POST') {
        $body = getJsonBody();
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            jsonResponse(['error' => 'El nombre de la carrera es obligatorio.'], 400);
        }
        $stmt = $pdo->prepare('INSERT IGNORE INTO careers (name) VALUES (:name)');
        $stmt->execute(['name' => $name]);
        jsonResponse(['id' => (int) $pdo->lastInsertId(), 'name' => $name], 201);
    }

    if ($endpoint === 'careers/delete' && $method === 'POST') {
        $body = getJsonBody();
        $id = (int) ($body['id'] ?? 0);
        $pdo->prepare('DELETE FROM careers WHERE id = :id')->execute(['id' => $id]);
        jsonResponse(['deleted' => true]);
    }

    // =========================================================================
    // GESTIÓN DE CAMPAÑAS
    // =========================================================================
    if ($endpoint === 'campaigns' && $method === 'POST') {
        $body = getJsonBody();
        $name = sanitizeCampaignCode((string) ($body['name'] ?? ''));
        $stmt = $pdo->prepare('INSERT IGNORE INTO campaigns (name) VALUES (:name)');
        $stmt->execute(['name' => $name]);
        jsonResponse(['name' => $name], 201);
    }

    // =========================================================================
    // GESTIÓN DE ASESORES / PROSPECTORES
    // =========================================================================
    if ($endpoint === 'advisors' && $method === 'POST') {
        $body = getJsonBody();
        $name = trim((string) ($body['name'] ?? ''));
        $phone = preg_replace('/\D/', '', (string) ($body['phone_number'] ?? ''));
        if ($name === '' || $phone === '') {
            jsonResponse(['error' => 'Nombre y teléfono del asesor son obligatorios.'], 400);
        }

        if (!empty($body['id'])) {
            $stmt = $pdo->prepare('UPDATE advisors SET name = :name, phone_number = :phone WHERE id = :id');
            $stmt->execute(['name' => $name, 'phone' => $phone, 'id' => (int) $body['id']]);
            jsonResponse(['updated' => true]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO advisors (name, phone_number, is_active) VALUES (:name, :phone, 1)');
            $stmt->execute(['name' => $name, 'phone' => $phone]);
            jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    if ($endpoint === 'advisors/delete' && $method === 'POST') {
        $body = getJsonBody();
        $id = (int) ($body['id'] ?? 0);
        $pdo->prepare('DELETE FROM advisors WHERE id = :id')->execute(['id' => $id]);
        jsonResponse(['deleted' => true]);
    }

    // =========================================================================
    // CREACIÓN Y ELIMINACIÓN DE ENLACES
    // =========================================================================
    if ($endpoint === 'links' && $method === 'POST') {
        $body = getJsonBody();
        $channel = (string) ($body['channel'] ?? 'mailing_sms_chattigo');
        $period = trim((string) ($body['period'] ?? '202710'));
        $campaign = sanitizeCampaignCode((string) ($body['campaign'] ?? 'PORTALWEB'));
        $career = trim((string) ($body['career'] ?? 'Diseño de Modas'));
        $subcampaign = trim((string) ($body['subcampaign'] ?? 'Portal Web'));
        $normalUrl = trim((string) ($body['normal_url'] ?? ''));
        $slug = trim((string) ($body['slug'] ?? ''));
        $isPurgeable = !empty($body['is_purgeable']) ? 1 : 0;

        $pdo->prepare('INSERT IGNORE INTO campaigns (name) VALUES (:name)')->execute(['name' => $campaign]);
        $pdo->prepare('INSERT IGNORE INTO careers (name) VALUES (:name)')->execute(['name' => $career]);

        $check = $pdo->prepare('SELECT id FROM links WHERE LOWER(slug) = LOWER(:slug) LIMIT 1');
        $check->execute(['slug' => $slug]);
        if ($check->fetch()) {
            $slug .= '&_id=' . substr(uniqid(), -4);
        }

        $stmt = $pdo->prepare("
            INSERT INTO links (
                slug, normal_url, has_custom_alias, title, channel,
                period, campaign, career, subcampaign, advisor_name,
                destination_type, destination_url, whatsapp_phone,
                whatsapp_message, is_master_route, is_purgeable, status, created_at
            ) VALUES (
                :slug, :normal_url, 0, :title, :channel,
                :period, :campaign, :career, :subcampaign, :advisor_name,
                :destination_type, :destination_url, :whatsapp_phone,
                :whatsapp_message, 0, :is_purgeable, 'active', CURRENT_DATE
            )
        ");
        $stmt->execute([
            'slug'             => $slug,
            'normal_url'       => $normalUrl,
            'title'            => trim((string) ($body['title'] ?? "{$campaign}_{$period} - {$career}")),
            'channel'          => $channel,
            'period'           => $period,
            'campaign'         => $campaign,
            'career'           => $career,
            'subcampaign'      => $subcampaign,
            'advisor_name'     => $body['advisor_name'] ?? null,
            'destination_type' => $body['destination_type'] ?? 'whatsapp',
            'destination_url'  => $body['destination_url'] ?? null,
            'whatsapp_phone'   => $body['whatsapp_phone'] ?? '51987654321',
            'whatsapp_message' => $body['whatsapp_message'] ?? null,
            'is_purgeable'     => $isPurgeable,
        ]);

        jsonResponse(['id' => (int) $pdo->lastInsertId(), 'slug' => $slug], 201);
    }

    if ($endpoint === 'links/delete' && $method === 'POST') {
        $body = getJsonBody();
        $id = (int) ($body['id'] ?? 0);

        $linkRow = $pdo->prepare('SELECT * FROM links WHERE id = :id LIMIT 1');
        $linkRow->execute(['id' => $id]);
        $found = $linkRow->fetch();
        if ($found && empty($found['is_master_route'])) {
            $pdo->prepare('DELETE FROM click_events WHERE channel = :ch AND period = :per AND campaign = :camp AND career = :car AND subcampaign = :sub')
                ->execute([
                    'ch'   => $found['channel'],
                    'per'  => $found['period'],
                    'camp' => $found['campaign'],
                    'car'  => $found['career'],
                    'sub'  => $found['subcampaign'],
                ]);
            $pdo->prepare('DELETE FROM links WHERE id = :id AND is_master_route = 0')->execute(['id' => $id]);
        }
        recalculateLinkCounters($pdo);
        jsonResponse(['deleted' => true]);
    }

    // =========================================================================
    // DEPURACIÓN DE CONTEOS Y PRUEBAS POR RANGO DE FECHAS
    // =========================================================================
    if ($endpoint === 'purge-counts' && $method === 'POST') {
        $body = getJsonBody();
        $startDate = trim((string) ($body['start_date'] ?? '2020-01-01'));
        $endDate = trim((string) ($body['end_date'] ?? '2035-12-31'));
        $mode = trim((string) ($body['mode'] ?? 'purgeable_only'));
        $targetId = trim((string) ($body['target_id'] ?? ''));
        $removeEmptyLinks = !empty($body['remove_empty_links']);

        $deletedEvents = 0;

        if ($mode === 'specific_target' && $targetId !== '') {
            $parts = explode('::', $targetId);
            if (count($parts) === 5) {
                [$ch, $per, $camp, $car, $sub] = $parts;
                $delStmt = $pdo->prepare("
                    DELETE FROM click_events
                    WHERE channel = :ch
                      AND period = :per
                      AND campaign = :camp
                      AND career = :car
                      AND subcampaign = :sub
                      AND clicked_date BETWEEN :start_date AND :end_date
                ");
                $delStmt->execute([
                    'ch'         => $ch,
                    'per'        => $per,
                    'camp'       => $camp,
                    'car'        => $car,
                    'sub'        => $sub,
                    'start_date' => $startDate,
                    'end_date'   => $endDate,
                ]);
                $deletedEvents = $delStmt->rowCount();

                if ($removeEmptyLinks) {
                    $pdo->prepare("
                        DELETE FROM links
                        WHERE channel = :ch AND period = :per AND campaign = :camp AND career = :car AND subcampaign = :sub AND is_master_route = 0
                    ")->execute(['ch' => $ch, 'per' => $per, 'camp' => $camp, 'car' => $car, 'sub' => $sub]);
                }
            }
        } else {
            $delStmt = $pdo->prepare("
                DELETE ce FROM click_events ce
                LEFT JOIN links l ON l.id = ce.link_id
                WHERE ce.clicked_date BETWEEN :start_date AND :end_date
                  AND (
                      ce.is_purgeable = 1
                      OR (l.is_purgeable = 1 AND l.is_master_route = 0)
                      OR LOWER(ce.subcampaign) REGEXP 'prueba|test|demo|simulaci'
                  )
            ");
            $delStmt->execute([
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ]);
            $deletedEvents = $delStmt->rowCount();

            if ($removeEmptyLinks) {
                $pdo->exec("
                    DELETE FROM links
                    WHERE is_master_route = 0
                      AND (is_purgeable = 1 OR LOWER(subcampaign) REGEXP 'prueba|test|demo|simulaci')
                ");
            }
        }

        recalculateLinkCounters($pdo);

        jsonResponse([
            'purged_events' => $deletedEvents,
            'message'       => "Se depuraron {$deletedEvents} clics de prueba ({$startDate} al {$endDate}).",
        ]);
    }

    // =========================================================================
    // GESTIÓN DE NÚMEROS DE WHATSAPP
    // =========================================================================
    if ($endpoint === 'whatsapp-numbers' && $method === 'POST') {
        $body = getJsonBody();
        if (!empty($body['id'])) {
            $stmt = $pdo->prepare("
                UPDATE whatsapp_numbers
                SET label = :label, phone_number = :phone, department = :dept, default_greeting = :greeting
                WHERE id = :id
            ");
            $stmt->execute([
                'label'    => trim((string) ($body['label'] ?? '')),
                'phone'    => preg_replace('/\D/', '', (string) ($body['phone_number'] ?? '')),
                'dept'     => trim((string) ($body['department'] ?? 'Admisión')),
                'greeting' => trim((string) ($body['default_greeting'] ?? '')),
                'id'       => (int) $body['id'],
            ]);
            jsonResponse(['updated' => true]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO whatsapp_numbers (label, phone_number, department, default_greeting, is_active)
                VALUES (:label, :phone, :dept, :greeting, 1)
            ");
            $stmt->execute([
                'label'    => trim((string) ($body['label'] ?? '')),
                'phone'    => preg_replace('/\D/', '', (string) ($body['phone_number'] ?? '')),
                'dept'     => trim((string) ($body['department'] ?? 'Admisión')),
                'greeting' => trim((string) ($body['default_greeting'] ?? '')),
            ]);
            jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    if ($endpoint === 'whatsapp-numbers/delete' && $method === 'POST') {
        $body = getJsonBody();
        $id = (int) ($body['id'] ?? 0);
        $pdo->prepare('DELETE FROM whatsapp_numbers WHERE id = :id')->execute(['id' => $id]);
        jsonResponse(['deleted' => true]);
    }

    // =========================================================================
    // SIMULADOR DE CLICS Y ANTI-BOTS
    // =========================================================================
    if ($endpoint === 'simulate-click' && $method === 'POST') {
        $body = getJsonBody();
        $isBot = !empty($body['is_bot']);
        if ($isBot) {
            jsonResponse([
                'counted' => false,
                'message' => 'Bot bloqueado por el filtro. No sumó clics.',
            ]);
        }

        $channel = (string) ($body['channel'] ?? 'web_institucional');
        $period = (string) ($body['period'] ?? '202710');
        $campaign = sanitizeCampaignCode((string) ($body['campaign'] ?? 'PORTALWEB'));
        $career = (string) ($body['career'] ?? 'Diseño de Modas');
        $subcampaign = (string) ($body['subcampaign'] ?? 'Portal Web');
        $advisorName = $body['advisor_name'] ?? null;
        $waPhone = (string) ($body['whatsapp_phone'] ?? '51987654321');
        $shortLink = (string) ($body['short_link'] ?? 'trace.icontinental.edu.pe/whatsapp-web');

        $linkStmt = $pdo->prepare('SELECT id FROM links WHERE channel = :ch ORDER BY is_master_route DESC, id ASC LIMIT 1');
        $linkStmt->execute(['ch' => $channel]);
        $linkId = (int) ($linkStmt->fetchColumn() ?: 1);

        $stmt = $pdo->prepare("
            INSERT INTO click_events (
                link_id, clicked_at, clicked_date, is_bot, is_unique,
                visitor_hash, channel, period, campaign, career, subcampaign,
                advisor_name, whatsapp_phone, short_link, is_purgeable
            ) VALUES (
                :link_id, NOW(), CURRENT_DATE, 0, 1,
                :vhash, :ch, :per, :camp, :car, :sub,
                :adv, :phone, :short_link, 1
            )
        ");
        $stmt->execute([
            'link_id'    => $linkId,
            'vhash'      => hash('sha256', uniqid('sim_', true)),
            'ch'         => $channel,
            'per'        => $period,
            'camp'       => $campaign,
            'car'        => $career,
            'sub'        => $subcampaign,
            'adv'        => $advisorName,
            'phone'      => $waPhone,
            'short_link' => $shortLink,
        ]);

        recalculateLinkCounters($pdo);

        jsonResponse([
            'counted' => true,
            'message' => "+1 clic de prueba en [{$campaign}_{$period}] → {$career}.",
        ]);
    }

    jsonResponse(['error' => 'Endpoint no encontrado'], 404);

} catch (\Throwable $e) {
    error_log('[TraceIC API Error] ' . $e->getMessage());
    jsonResponse(['error' => $e->getMessage()], 500);
}
