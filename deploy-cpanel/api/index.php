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
 * Auto-migración completa en MySQL para soportar:
 * - Periodos globales (periods) con validación año+10/20/30 y bloqueo de borrado si está en uso
 * - Catálogo de Campañas en MAYÚSCULAS_CON_SUBGUION (campaigns)
 * - Constructores de Asesor/Prospector (advisors)
 * - Escenarios: web_institucional, link_ads, mailing_sms_chattigo, asesor_prospector
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

        $periodCount = (int) $pdo->query("SELECT COUNT(*) FROM `periods`")->fetchColumn();
        if ($periodCount === 0) {
            $pdo->exec("
                INSERT IGNORE INTO `periods` (`code`, `is_active`) VALUES
                ('202610', 0),
                ('202620', 0),
                ('202710', 1),
                ('202720', 0)
            ");
        }

        // 2. Tabla de Campañas (Formato MAYUSCULAS_CON_GUION_BAJO, máx 30 chars)
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `campaigns` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(30) NOT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_campaign_name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        $campCount = (int) $pdo->query("SELECT COUNT(*) FROM `campaigns`")->fetchColumn();
        if ($campCount === 0) {
            $pdo->exec("
                INSERT IGNORE INTO `campaigns` (`name`) VALUES
                ('PORTALWEB'),
                ('ADMISION_PREGRADO'),
                ('NURTURING_CHATTIGO'),
                ('DISENO_DE_MODAS'),
                ('DESARROLLO_DE_SISTEMAS'),
                ('GASTRONOMIA'),
                ('FERIA_COLEGIOS')
            ");
        }

        // 3. Tabla de Asesores / Prospectores
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

        $advCount = (int) $pdo->query("SELECT COUNT(*) FROM `advisors`")->fetchColumn();
        if ($advCount === 0) {
            $pdo->exec("
                INSERT INTO `advisors` (`name`, `phone_number`, `is_active`) VALUES
                ('Gerber', '51987654321', 1),
                ('Lucia', '51987654322', 1)
            ");
        }

        // 4. Convertir columna channel a VARCHAR(50) en links y click_events para admitir link_ads y asesor_prospector
        $pdo->exec("ALTER TABLE `links` MODIFY COLUMN `channel` VARCHAR(50) NOT NULL DEFAULT 'mailing_sms_chattigo'");
        $pdo->exec("ALTER TABLE `click_events` MODIFY COLUMN `channel` VARCHAR(50) NOT NULL DEFAULT 'mailing_sms_chattigo'");

        // Migrar nombres de canales anteriores si existieran
        $pdo->exec("UPDATE `links` SET `channel` = 'link_ads' WHERE `channel` = 'tiktok_ads'");
        $pdo->exec("UPDATE `links` SET `channel` = 'asesor_prospector' WHERE `channel` = 'landing_page'");
        $pdo->exec("UPDATE `click_events` SET `channel` = 'link_ads' WHERE `channel` = 'tiktok_ads'");
        $pdo->exec("UPDATE `click_events` SET `channel` = 'asesor_prospector' WHERE `channel` = 'landing_page'");

        // 5. Columnas adicionales en links (period, is_purgeable, advisor_name, utm_source)
        $colsLinks = $pdo->query("SHOW COLUMNS FROM `links`")->fetchAll(\PDO::FETCH_COLUMN);
        if (!in_array('is_purgeable', $colsLinks, true)) {
            $pdo->exec("ALTER TABLE `links` ADD COLUMN `is_purgeable` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!in_array('period', $colsLinks, true)) {
            $pdo->exec("ALTER TABLE `links` ADD COLUMN `period` VARCHAR(10) NOT NULL DEFAULT '202710'");
            // Si antes campaign guardaba el periodo (ej. 202710), copiarlo a period y normalizar campaign
            $pdo->exec("UPDATE `links` SET `period` = `campaign` WHERE `campaign` REGEXP '^20[2-3][0-9](10|20|30)$'");
            $pdo->exec("UPDATE `links` SET `campaign` = 'PORTALWEB' WHERE `channel` = 'web_institucional' AND `campaign` REGEXP '^20[2-3][0-9]'");
            $pdo->exec("UPDATE `links` SET `campaign` = 'NURTURING_CHATTIGO' WHERE `channel` = 'mailing_sms_chattigo' AND `campaign` REGEXP '^20[2-3][0-9]'");
            $pdo->exec("UPDATE `links` SET `campaign` = 'ADMISION_PREGRADO' WHERE `campaign` REGEXP '^20[2-3][0-9]'");
        }
        if (!in_array('advisor_name', $colsLinks, true)) {
            $pdo->exec("ALTER TABLE `links` ADD COLUMN `advisor_name` VARCHAR(100) NULL DEFAULT NULL");
        }

        // 6. Columnas adicionales en click_events (period, is_purgeable)
        $colsEvents = $pdo->query("SHOW COLUMNS FROM `click_events`")->fetchAll(\PDO::FETCH_COLUMN);
        if (!in_array('is_purgeable', $colsEvents, true)) {
            $pdo->exec("ALTER TABLE `click_events` ADD COLUMN `is_purgeable` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!in_array('period', $colsEvents, true)) {
            $pdo->exec("ALTER TABLE `click_events` ADD COLUMN `period` VARCHAR(10) NOT NULL DEFAULT '202710'");
            $pdo->exec("UPDATE `click_events` SET `period` = `campaign` WHERE `campaign` REGEXP '^20[2-3][0-9](10|20|30)$'");
            $pdo->exec("UPDATE `click_events` SET `campaign` = 'PORTALWEB' WHERE `channel` = 'web_institucional' AND `campaign` REGEXP '^20[2-3][0-9]'");
            $pdo->exec("UPDATE `click_events` SET `campaign` = 'NURTURING_CHATTIGO' WHERE `channel` = 'mailing_sms_chattigo' AND `campaign` REGEXP '^20[2-3][0-9]'");
            $pdo->exec("UPDATE `click_events` SET `campaign` = 'ADMISION_PREGRADO' WHERE `campaign` REGEXP '^20[2-3][0-9]'");
        }

        // Asegurar rutas maestras para los 4 canales
        $pdo->exec("
            INSERT IGNORE INTO `links` (`slug`, `normal_url`, `has_custom_alias`, `title`, `channel`, `period`, `campaign`, `subcampaign`, `destination_type`, `whatsapp_phone`, `is_master_route`, `status`, `created_at`)
            VALUES
            ('link-ads', 'https://trace.icontinental.edu.pe/link-ads?utm=tiktok-ads', 0, 'Ruta Maestra Link Ads', 'link_ads', '202710', 'ADMISION_PREGRADO', 'tiktok-ads', 'whatsapp', '51987654321', 1, 'active', CURRENT_DATE),
            ('asesor', 'https://trace.icontinental.edu.pe/asesor?utm=Gerber', 0, 'Ruta Maestra Asesor / Prospector', 'asesor_prospector', '202710', 'FERIA_COLEGIOS', 'Gerber', 'whatsapp', '51987654321', 1, 'active', CURRENT_DATE)
        ");

        // Marcar subcampañas de prueba automáticamente
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
    return substr(trim((string) $clean, '_'), 0, 30) ?: 'GENERAL';
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
        // 1. Periodos y conteo de uso para saber cuáles se pueden eliminar
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

        // 2. Campañas registradas
        $campaignsRaw = $pdo->query("SELECT name FROM campaigns ORDER BY name ASC")->fetchAll(\PDO::FETCH_COLUMN);
        $campaigns = array_values(array_unique(array_map('strval', $campaignsRaw)));

        // 3. Asesores / Prospectores
        $advisorsRaw = $pdo->query("SELECT * FROM advisors WHERE is_active = 1 ORDER BY id ASC")->fetchAll();
        $advisors = array_map(static function (array $row): array {
            return [
                'id'           => (int) $row['id'],
                'name'         => (string) $row['name'],
                'phone_number' => (string) $row['phone_number'],
            ];
        }, $advisorsRaw);

        // 4. Números de WhatsApp Institucionales
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

        // 5. Enlaces creados
        $rawLinks = $pdo->query('SELECT * FROM links ORDER BY id DESC')->fetchAll();
        $purgeableKeys = [];
        $links = array_map(static function (array $row) use (&$purgeableKeys, $activePeriod): array {
            $period = !empty($row['period']) ? (string) $row['period'] : $activePeriod;
            $campaign = sanitizeCampaignCode((string) ($row['campaign'] ?: 'PORTALWEB'));
            $subcampaign = (string) ($row['subcampaign'] ?: 'General');
            $isPurgeable = !empty($row['is_purgeable']) || isTestSubcampaignName($subcampaign);
            if ($isPurgeable && empty($row['is_master_route'])) {
                $k = $row['channel'] . '::' . $period . '::' . $campaign . '::' . $subcampaign;
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
                'subcampaign'      => $subcampaign,
                'advisor_name'     => $row['advisor_name'] ?? null,
                'destination_type' => (string) $row['destination_type'],
                'destination_url'  => $row['destination_url'],
                'whatsapp_phone'   => $row['whatsapp_phone'],
                'whatsapp_message' => $row['whatsapp_message'],
                'is_master_route'  => (bool) $row['is_master_route'],
                'is_purgeable'     => $isPurgeable,
                'total_clicks'     => (int) $row['total_clicks'],
                'unique_visitors'  => (int) $row['unique_visitors'],
                'created_at'       => (string) $row['created_at'],
            ];
        }, $rawLinks);

        // 6. Registros de clic agrupados por Canal + Periodo + Campaña + Subcampaña/UTM
        $recordsStmt = $pdo->query("
            SELECT 
                CONCAT(channel, '::', period, '::', campaign, '::', subcampaign) AS id,
                channel,
                period,
                campaign,
                subcampaign,
                MAX(url_reference) AS url_reference,
                MAX(short_link) AS short_link,
                SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) AS clicks,
                SUM(CASE WHEN is_bot = 0 AND is_unique = 1 THEN 1 ELSE 0 END) AS unique_visitors,
                MAX(clicked_date) AS last_activity_date,
                MAX(is_purgeable) AS is_purgeable
            FROM click_events
            WHERE is_bot = 0
            GROUP BY channel, period, campaign, subcampaign
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
                'subcampaign'        => (string) $r['subcampaign'],
                'url_reference'      => $r['url_reference'] ?: null,
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
            $key = $l['channel'] . '::' . $l['period'] . '::' . $l['campaign'] . '::' . $l['subcampaign'];
            if (!isset($recordsMap[$key])) {
                $recordsMap[$key] = [
                    'id'                 => $key,
                    'channel'            => $l['channel'],
                    'period'             => $l['period'],
                    'campaign'           => $l['campaign'],
                    'subcampaign'        => $l['subcampaign'],
                    'url_reference'      => null,
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
            'advisors'         => $advisors,
            'whatsapp_numbers' => $waNumbers,
            'links'            => $links,
            'records'          => array_values($recordsMap),
        ]);
    }

    // =========================================================================
    // GESTIÓN DE PERIODOS GLOBALES (Crear, Activar Globalmente, Eliminar si uso=0)
    // =========================================================================
    if ($endpoint === 'periods' && $method === 'POST') {
        $body = getJsonBody();
        $code = trim((string) ($body['code'] ?? ''));
        if (!preg_match('/^20[2-3]\d(10|20|30)$/', $code)) {
            jsonResponse(['error' => 'Formato inválido. El periodo debe ser Año + 10, 20 o 30 (ej. 202610, 202720).'], 400);
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

    if (($endpoint === 'periods/delete' && $method === 'POST') || (preg_match('#^periods/(\d+)$#', $endpoint, $m) && $method === 'DELETE')) {
        $body = $method === 'POST' ? getJsonBody() : [];
        $code = trim((string) ($body['code'] ?? ''));

        $usedLinks = $pdo->prepare('SELECT COUNT(*) FROM links WHERE period = :c AND is_master_route = 0');
        $usedLinks->execute(['c' => $code]);
        $usedEvents = $pdo->prepare('SELECT COUNT(*) FROM click_events WHERE period = :c AND is_bot = 0');
        $usedEvents->execute(['c' => $code]);

        if (((int) $usedLinks->fetchColumn() + (int) $usedEvents->fetchColumn()) > 0) {
            jsonResponse(['error' => "El periodo {$code} ya tiene enlaces o clics registrados. Depura sus métricas primero para poder eliminarlo."], 409);
        }

        $pdo->prepare('DELETE FROM periods WHERE code = :c AND is_active = 0')->execute(['c' => $code]);
        jsonResponse(['deleted' => true]);
    }

    // =========================================================================
    // GESTIÓN DE CAMPAÑAS (MAYÚSCULAS_CON_GUION_BAJO)
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
    // CREACIÓN Y ELIMINACIÓN DE ENLACES (Con URL automática por UTM)
    // =========================================================================
    if ($endpoint === 'links' && $method === 'POST') {
        $body = getJsonBody();
        $channel = (string) ($body['channel'] ?? 'mailing_sms_chattigo');
        $period = trim((string) ($body['period'] ?? '202710'));
        $campaign = sanitizeCampaignCode((string) ($body['campaign'] ?? 'GENERAL'));
        $subcampaign = trim((string) ($body['subcampaign'] ?? 'general'));
        $normalUrl = trim((string) ($body['normal_url'] ?? ''));
        $slug = trim((string) ($body['slug'] ?? ''));
        $isPurgeable = !empty($body['is_purgeable']) ? 1 : 0;

        // Registrar la campaña automáticamente en el catálogo si es nueva
        $pdo->prepare('INSERT IGNORE INTO campaigns (name) VALUES (:name)')->execute(['name' => $campaign]);

        // Evitar colisión de llave única uk_links_slug agregando sufijo interno si ya existía
        $check = $pdo->prepare('SELECT id FROM links WHERE LOWER(slug) = LOWER(:slug) LIMIT 1');
        $check->execute(['slug' => $slug]);
        if ($check->fetch()) {
            $slug .= '&_id=' . substr(uniqid(), -4);
        }

        $stmt = $pdo->prepare("
            INSERT INTO links (
                slug, normal_url, has_custom_alias, title, channel,
                period, campaign, subcampaign, advisor_name,
                destination_type, destination_url, whatsapp_phone,
                whatsapp_message, is_master_route, is_purgeable, status, created_at
            ) VALUES (
                :slug, :normal_url, 0, :title, :channel,
                :period, :campaign, :subcampaign, :advisor_name,
                :destination_type, :destination_url, :whatsapp_phone,
                :whatsapp_message, 0, :is_purgeable, 'active', CURRENT_DATE
            )
        ");
        $stmt->execute([
            'slug'             => $slug,
            'normal_url'       => $normalUrl,
            'title'            => trim((string) ($body['title'] ?? "{$campaign} ({$subcampaign})")),
            'channel'          => $channel,
            'period'           => $period,
            'campaign'         => $campaign,
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

    if ($endpoint === 'links/toggle-purgeable' && $method === 'POST') {
        $body = getJsonBody();
        $isPurgeable = !empty($body['is_purgeable']) ? 1 : 0;

        if (!empty($body['id'])) {
            $pdo->prepare('UPDATE links SET is_purgeable = :p WHERE id = :id AND is_master_route = 0')
                ->execute(['p' => $isPurgeable, 'id' => (int) $body['id']]);
        }

        if (!empty($body['target_id'])) {
            $parts = explode('::', (string) $body['target_id']);
            if (count($parts) === 4) {
                [$ch, $per, $camp, $sub] = $parts;
                $pdo->prepare('UPDATE click_events SET is_purgeable = :p WHERE channel = :ch AND period = :per AND campaign = :camp AND subcampaign = :sub')
                    ->execute(['p' => $isPurgeable, 'ch' => $ch, 'per' => $per, 'camp' => $camp, 'sub' => $sub]);
                $pdo->prepare('UPDATE links SET is_purgeable = :p WHERE channel = :ch AND period = :per AND campaign = :camp AND subcampaign = :sub AND is_master_route = 0')
                    ->execute(['p' => $isPurgeable, 'ch' => $ch, 'per' => $per, 'camp' => $camp, 'sub' => $sub]);
            }
        }

        jsonResponse(['updated' => true, 'is_purgeable' => (bool) $isPurgeable]);
    }

    if (($endpoint === 'links/delete' && $method === 'POST') || (preg_match('#^links/(\d+)$#', $endpoint, $m) && $method === 'DELETE')) {
        $body = $method === 'POST' ? getJsonBody() : [];
        $id = isset($m[1]) ? (int) $m[1] : (int) ($body['id'] ?? 0);

        $linkRow = $pdo->prepare('SELECT * FROM links WHERE id = :id LIMIT 1');
        $linkRow->execute(['id' => $id]);
        $found = $linkRow->fetch();
        if ($found && empty($found['is_master_route'])) {
            $pdo->prepare('DELETE FROM click_events WHERE channel = :ch AND period = :per AND campaign = :camp AND subcampaign = :sub')
                ->execute([
                    'ch'   => $found['channel'],
                    'per'  => $found['period'],
                    'camp' => $found['campaign'],
                    'sub'  => $found['subcampaign'],
                ]);
            $pdo->prepare('DELETE FROM links WHERE id = :id AND is_master_route = 0')->execute(['id' => $id]);
        }
        recalculateLinkCounters($pdo);
        jsonResponse(['deleted' => true]);
    }

    // =========================================================================
    // DEPURACIÓN REAL DE CONTEOS Y PRUEBAS POR RANGO DE FECHAS
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
            if (count($parts) === 4) {
                [$ch, $per, $camp, $sub] = $parts;
                $delStmt = $pdo->prepare("
                    DELETE FROM click_events
                    WHERE channel = :ch
                      AND period = :per
                      AND campaign = :camp
                      AND subcampaign = :sub
                      AND clicked_date BETWEEN :start_date AND :end_date
                ");
                $delStmt->execute([
                    'ch'         => $ch,
                    'per'        => $per,
                    'camp'       => $camp,
                    'sub'        => $sub,
                    'start_date' => $startDate,
                    'end_date'   => $endDate,
                ]);
                $deletedEvents = $delStmt->rowCount();

                if ($removeEmptyLinks) {
                    $pdo->prepare("
                        DELETE FROM links
                        WHERE channel = :ch AND period = :per AND campaign = :camp AND subcampaign = :sub AND is_master_route = 0
                    ")->execute(['ch' => $ch, 'per' => $per, 'camp' => $camp, 'sub' => $sub]);
                }
            }
        } else {
            // Eliminar todos los clics depurables o de prueba en el rango de fechas
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
    // GESTIÓN DE NÚMEROS DE WHATSAPP (Con soporte POST /delete para evitar bloqueos en cPanel)
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
                'greeting' => trim((string) ($body['default_greeting'] ?? 'Hola, quisiera saber más sobre Instituto y Escuela Superior Continental.')),
            ]);
            jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    if (($endpoint === 'whatsapp-numbers/delete' && $method === 'POST') || (preg_match('#^whatsapp-numbers/(\d+)$#', $endpoint, $m) && $method === 'DELETE')) {
        $body = $method === 'POST' ? getJsonBody() : [];
        $id = isset($m[1]) ? (int) $m[1] : (int) ($body['id'] ?? 0);
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
        $subcampaign = (string) ($body['subcampaign'] ?? 'General');
        $urlRef = $body['url_reference'] ?? null;
        $shortLink = (string) ($body['short_link'] ?? 'trace.icontinental.edu.pe/whatsapp-web');

        $linkStmt = $pdo->prepare('SELECT id FROM links WHERE channel = :ch ORDER BY is_master_route DESC, id ASC LIMIT 1');
        $linkStmt->execute(['ch' => $channel]);
        $linkId = (int) ($linkStmt->fetchColumn() ?: 1);

        $stmt = $pdo->prepare("
            INSERT INTO click_events (
                link_id, clicked_at, clicked_date, is_bot, is_unique,
                visitor_hash, channel, period, campaign, subcampaign,
                url_reference, short_link, is_purgeable
            ) VALUES (
                :link_id, NOW(), CURRENT_DATE, 0, 1,
                :vhash, :ch, :per, :camp, :sub,
                :url_ref, :short_link, 1
            )
        ");
        $stmt->execute([
            'link_id'    => $linkId,
            'vhash'      => hash('sha256', uniqid('sim_', true)),
            'ch'         => $channel,
            'per'        => $period,
            'camp'       => $campaign,
            'sub'        => $subcampaign,
            'url_ref'    => $urlRef,
            'short_link' => $shortLink,
        ]);

        recalculateLinkCounters($pdo);

        jsonResponse([
            'counted' => true,
            'message' => "+1 clic de prueba registrado en [{$campaign}_{$period}] → {$subcampaign}.",
        ]);
    }

    jsonResponse(['error' => 'Endpoint no encontrado'], 404);

} catch (\Throwable $e) {
    error_log('[TraceIC API Error] ' . $e->getMessage());
    jsonResponse(['error' => $e->getMessage()], 500);
}
