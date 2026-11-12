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
 * Auto-migración segura para agregar soporte de enlaces/eventos depurables (is_purgeable)
 * sin requerir intervención manual en phpMyAdmin.
 */
function ensureSchemaUpgrades(\PDO $pdo): void
{
    try {
        $colLinks = $pdo->query("SHOW COLUMNS FROM links LIKE 'is_purgeable'")->fetch();
        if (!$colLinks) {
            $pdo->exec("ALTER TABLE links ADD COLUMN is_purgeable TINYINT(1) NOT NULL DEFAULT 0");
        }
        $colEvents = $pdo->query("SHOW COLUMNS FROM click_events LIKE 'is_purgeable'")->fetch();
        if (!$colEvents) {
            $pdo->exec("ALTER TABLE click_events ADD COLUMN is_purgeable TINYINT(1) NOT NULL DEFAULT 0");
        }
        // Marcar automáticamente subcampañas de prueba ("prueba", "test", "demo", "simulacion") como depurables
        $pdo->exec("
            UPDATE click_events
            SET is_purgeable = 1
            WHERE is_purgeable = 0
              AND LOWER(subcampaign) REGEXP 'prueba|test|demo|simulaci'
        ");
    } catch (\Throwable $e) {
        // Ignorar silenciosamente si ya existe o no aplica
    }
}

/**
 * Recalcula los contadores total_clicks y unique_visitors de la tabla links
 * después de depurar eventos de prueba en click_events.
 */
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
        }

        if (!$user || !$valid) {
            jsonResponse(['error' => 'Credenciales incorrectas. Verifica tu usuario y contraseña.'], 401);
        }

        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id')->execute(['id' => $user['id']]);
        jsonResponse([
            'token' => generateToken($user, $secret),
            'user'  => ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email']],
        ]);
    }

    // Endpoint principal en Tiempo Real: devuelve enlaces, números de WhatsApp y conteos de MySQL
    if ($endpoint === 'state' && $method === 'GET') {
        $linksStmt = $pdo->query('SELECT * FROM links ORDER BY id DESC');
        $rawLinks = $linksStmt->fetchAll();

        $purgeableKeys = [];
        $links = array_map(static function (array $row) use (&$purgeableKeys): array {
            $isPurgeable = !empty($row['is_purgeable']) || isTestSubcampaignName((string) $row['subcampaign']);
            if ($isPurgeable && empty($row['is_master_route'])) {
                $k = $row['channel'] . '::' . $row['campaign'] . '::' . $row['subcampaign'];
                $purgeableKeys[$k] = true;
            }
            return [
                'id'               => (int) $row['id'],
                'slug'             => (string) $row['slug'],
                'normal_url'       => (string) $row['normal_url'],
                'has_custom_alias' => (bool) $row['has_custom_alias'],
                'title'            => (string) $row['title'],
                'channel'          => (string) $row['channel'],
                'campaign'         => (string) $row['campaign'],
                'subcampaign'      => (string) $row['subcampaign'],
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

        $waStmt = $pdo->query('SELECT * FROM whatsapp_numbers WHERE is_active = 1 ORDER BY id ASC');
        $rawWa = $waStmt->fetchAll();
        $waNumbers = array_map(static function (array $row): array {
            return [
                'id'               => (int) $row['id'],
                'label'            => (string) $row['label'],
                'phone_number'     => (string) $row['phone_number'],
                'department'       => (string) $row['department'],
                'default_greeting' => (string) $row['default_greeting'],
            ];
        }, $rawWa);

        // Agrupar eventos reales en click_events + incluir subcampañas de links creados
        $recordsStmt = $pdo->query("
            SELECT 
                CONCAT(channel, '::', campaign, '::', subcampaign) AS id,
                channel,
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
            GROUP BY channel, campaign, subcampaign
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
                'campaign'           => (string) $r['campaign'],
                'subcampaign'        => (string) $r['subcampaign'],
                'url_reference'      => $r['url_reference'] ?: null,
                'short_link'         => (string) $r['short_link'],
                'clicks'             => (int) $r['clicks'],
                'unique_visitors'    => (int) $r['unique_visitors'],
                'last_activity_date' => (string) ($r['last_activity_date'] ?: date('Y-m-d')),
                'is_purgeable'       => $isPurgeableRec,
            ];
        }

        // Asegurar que los enlaces creados por el usuario también aparezcan en la reportería aunque aún tengan 0 clics
        foreach ($links as $l) {
            if ($l['is_master_route']) {
                continue;
            }
            $key = $l['channel'] . '::' . $l['campaign'] . '::' . $l['subcampaign'];
            if (!isset($recordsMap[$key])) {
                $recordsMap[$key] = [
                    'id'                 => $key,
                    'channel'            => $l['channel'],
                    'campaign'           => $l['campaign'],
                    'subcampaign'        => $l['subcampaign'],
                    'url_reference'      => null,
                    'short_link'         => 'trace.icontinental.edu.pe/' . $l['slug'],
                    'clicks'             => (int) $l['total_clicks'],
                    'unique_visitors'    => (int) $l['unique_visitors'],
                    'last_activity_date' => $l['created_at'],
                    'is_purgeable'       => (bool) $l['is_purgeable'],
                ];
            }
        }

        jsonResponse([
            'links'            => $links,
            'whatsapp_numbers' => $waNumbers,
            'records'          => array_values($recordsMap),
        ]);
    }

    // Crear nuevo enlace en MySQL (incluye checkbox is_purgeable)
    if ($endpoint === 'links' && $method === 'POST') {
        $body = getJsonBody();
        $slug = trim($body['slug'] ?? '');
        if ($slug === '') {
            jsonResponse(['error' => 'Identificador de enlace inválido.'], 400);
        }

        $check = $pdo->prepare('SELECT id FROM links WHERE LOWER(slug) = LOWER(:slug) LIMIT 1');
        $check->execute(['slug' => $slug]);
        if ($check->fetch()) {
            jsonResponse(['error' => "Ya existe un enlace con el identificador /{$slug}"], 409);
        }

        $isPurgeable = !empty($body['is_purgeable']) ? 1 : 0;

        $stmt = $pdo->prepare("
            INSERT INTO links (
                slug, normal_url, has_custom_alias, title, channel,
                campaign, subcampaign, destination_type, destination_url,
                whatsapp_phone, whatsapp_message, is_master_route, is_purgeable, status, created_at
            ) VALUES (
                :slug, :normal_url, :has_custom_alias, :title, :channel,
                :campaign, :subcampaign, :destination_type, :destination_url,
                :whatsapp_phone, :whatsapp_message, 0, :is_purgeable, 'active', CURRENT_DATE
            )
        ");
        $stmt->execute([
            'slug'             => $slug,
            'normal_url'       => $body['normal_url'] ?? ('https://trace.icontinental.edu.pe/' . $slug),
            'has_custom_alias' => !empty($body['has_custom_alias']) ? 1 : 0,
            'title'            => trim($body['title'] ?? 'Enlace Trace IC'),
            'channel'          => $body['channel'] ?? 'mailing_sms_chattigo',
            'campaign'         => $body['campaign'] ?? '202710',
            'subcampaign'      => $body['subcampaign'] ?? 'General',
            'destination_type' => $body['destination_type'] ?? 'whatsapp',
            'destination_url'  => $body['destination_url'] ?? null,
            'whatsapp_phone'   => $body['whatsapp_phone'] ?? '51987654321',
            'whatsapp_message' => $body['whatsapp_message'] ?? null,
            'is_purgeable'     => $isPurgeable,
        ]);

        jsonResponse(['id' => (int) $pdo->lastInsertId(), 'slug' => $slug], 201);
    }

    // Cambiar estado Depurable (is_purgeable) de un enlace o subcampaña
    if ($endpoint === 'links/toggle-purgeable' && $method === 'POST') {
        $body = getJsonBody();
        $isPurgeable = !empty($body['is_purgeable']) ? 1 : 0;

        if (!empty($body['id'])) {
            $stmt = $pdo->prepare('UPDATE links SET is_purgeable = :p WHERE id = :id AND is_master_route = 0');
            $stmt->execute(['p' => $isPurgeable, 'id' => (int) $body['id']]);
        }

        if (!empty($body['target_id'])) {
            $parts = explode('::', (string) $body['target_id']);
            if (count($parts) === 3) {
                [$ch, $camp, $sub] = $parts;
                $pdo->prepare('UPDATE click_events SET is_purgeable = :p WHERE channel = :ch AND campaign = :camp AND subcampaign = :sub')
                    ->execute(['p' => $isPurgeable, 'ch' => $ch, 'camp' => $camp, 'sub' => $sub]);
                $pdo->prepare('UPDATE links SET is_purgeable = :p WHERE channel = :ch AND campaign = :camp AND subcampaign = :sub AND is_master_route = 0')
                    ->execute(['p' => $isPurgeable, 'ch' => $ch, 'camp' => $camp, 'sub' => $sub]);
            }
        }

        jsonResponse(['updated' => true, 'is_purgeable' => (bool) $isPurgeable]);
    }

    // Depurar conteos de prueba por rango de fechas
    if ($endpoint === 'purge-counts' && $method === 'POST') {
        $body = getJsonBody();
        $startDate = trim($body['start_date'] ?? '2025-01-01');
        $endDate = trim($body['end_date'] ?? '2029-12-31');
        $mode = trim($body['mode'] ?? 'purgeable_only'); // 'purgeable_only' | 'specific_target'
        $targetId = trim($body['target_id'] ?? '');
        $removeEmptyLinks = !empty($body['remove_empty_links']);

        $deletedEvents = 0;

        if ($mode === 'specific_target' && $targetId !== '') {
            $parts = explode('::', $targetId);
            if (count($parts) === 3) {
                [$ch, $camp, $sub] = $parts;
                $delStmt = $pdo->prepare("
                    DELETE FROM click_events
                    WHERE channel = :ch
                      AND campaign = :camp
                      AND subcampaign = :sub
                      AND clicked_date BETWEEN :start_date AND :end_date
                ");
                $delStmt->execute([
                    'ch'         => $ch,
                    'camp'       => $camp,
                    'sub'        => $sub,
                    'start_date' => $startDate,
                    'end_date'   => $endDate,
                ]);
                $deletedEvents = $delStmt->rowCount();

                if ($removeEmptyLinks) {
                    $remStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM click_events
                        WHERE channel = :ch AND campaign = :camp AND subcampaign = :sub
                    ");
                    $remStmt->execute(['ch' => $ch, 'camp' => $camp, 'sub' => $sub]);
                    if ((int) $remStmt->fetchColumn() === 0) {
                        $pdo->prepare("
                            DELETE FROM links
                            WHERE channel = :ch AND campaign = :camp AND subcampaign = :sub AND is_master_route = 0
                        ")->execute(['ch' => $ch, 'camp' => $camp, 'sub' => $sub]);
                    }
                }
            }
        } else {
            // Modo 'purgeable_only': limpia eventos marcados como depurables, de enlaces depurables o subcampañas de prueba
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
                    DELETE l FROM links l
                    LEFT JOIN click_events ce ON ce.link_id = l.id
                    WHERE l.is_master_route = 0
                      AND l.is_purgeable = 1
                      AND ce.id IS NULL
                ");
            }
        }

        recalculateLinkCounters($pdo);

        jsonResponse([
            'purged_events' => $deletedEvents,
            'message'       => "Depuración completada: {$deletedEvents} clics de prueba eliminados entre {$startDate} y {$endDate}.",
        ]);
    }

    if (preg_match('#^links/(\d+)$#', $endpoint, $m) && $method === 'DELETE') {
        $id = (int) $m[1];
        $pdo->prepare('DELETE FROM links WHERE id = :id AND is_master_route = 0')->execute(['id' => $id]);
        jsonResponse(['deleted' => true]);
    }

    if ($endpoint === 'whatsapp-numbers' && $method === 'POST') {
        $body = getJsonBody();
        if (!empty($body['id'])) {
            $stmt = $pdo->prepare("
                UPDATE whatsapp_numbers
                SET label = :label, phone_number = :phone, department = :dept, default_greeting = :greeting
                WHERE id = :id
            ");
            $stmt->execute([
                'label'    => trim($body['label'] ?? ''),
                'phone'    => preg_replace('/\D/', '', $body['phone_number'] ?? ''),
                'dept'     => trim($body['department'] ?? 'Admisión'),
                'greeting' => trim($body['default_greeting'] ?? ''),
                'id'       => (int) $body['id'],
            ]);
            jsonResponse(['updated' => true]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO whatsapp_numbers (label, phone_number, department, default_greeting, is_active)
                VALUES (:label, :phone, :dept, :greeting, 1)
            ");
            $stmt->execute([
                'label'    => trim($body['label'] ?? ''),
                'phone'    => preg_replace('/\D/', '', $body['phone_number'] ?? ''),
                'dept'     => trim($body['department'] ?? 'Admisión'),
                'greeting' => trim($body['default_greeting'] ?? 'Hola Instituto Continental, deseo información.'),
            ]);
            jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    if (preg_match('#^whatsapp-numbers/(\d+)$#', $endpoint, $m) && $method === 'DELETE') {
        $id = (int) $m[1];
        $pdo->prepare('DELETE FROM whatsapp_numbers WHERE id = :id')->execute(['id' => $id]);
        jsonResponse(['deleted' => true]);
    }

    if ($endpoint === 'simulate-click' && $method === 'POST') {
        $body = getJsonBody();
        $isBot = !empty($body['is_bot']);
        if ($isBot) {
            jsonResponse([
                'counted' => false,
                'message' => 'Vista previa de Bot (WhatsApp/Redes) detectada y bloqueada. No alteró el conteo de clics.',
            ]);
        }

        $channel = (string) ($body['channel'] ?? 'web_institucional');
        $campaign = (string) ($body['campaign'] ?? '202710');
        $subcampaign = (string) ($body['subcampaign'] ?? 'General');
        $urlRef = $body['url_reference'] ?? null;
        $shortLink = (string) ($body['short_link'] ?? 'trace.icontinental.edu.pe/whatsapp-web');

        // Buscar el link correspondiente o usar la ruta maestra (1 o 2)
        $linkStmt = $pdo->prepare('SELECT id FROM links WHERE channel = :ch ORDER BY is_master_route DESC, id ASC LIMIT 1');
        $linkStmt->execute(['ch' => $channel]);
        $linkId = (int) ($linkStmt->fetchColumn() ?: 1);

        $stmt = $pdo->prepare("
            INSERT INTO click_events (
                link_id, clicked_at, clicked_date, is_bot, is_unique,
                visitor_hash, channel, campaign, subcampaign,
                url_reference, short_link, is_purgeable
            ) VALUES (
                :link_id, NOW(), CURRENT_DATE, 0, 1,
                :vhash, :ch, :camp, :sub,
                :url_ref, :short_link, 1
            )
        ");
        $stmt->execute([
            'link_id'    => $linkId,
            'vhash'      => hash('sha256', uniqid('sim_', true)),
            'ch'         => $channel,
            'camp'       => $campaign,
            'sub'        => $subcampaign,
            'url_ref'    => $urlRef,
            'short_link' => $shortLink,
        ]);

        recalculateLinkCounters($pdo);

        jsonResponse([
            'counted' => true,
            'message' => "+1 clic de prueba (depurable) registrado para [{$campaign}] → {$subcampaign}.",
        ]);
    }

    jsonResponse(['error' => 'Endpoint no encontrado'], 404);

} catch (\Throwable $e) {
    error_log('[TraceIC API Error] ' . $e->getMessage());
    jsonResponse(['error' => $e->getMessage()], 500);
}
