<?php
declare(strict_types=1);

/**
 * TRACE IC — Motor de Redirección y Construcción Automática de Código de Atención
 * Dominio: https://trace.icontinental.edu.pe/{slug}?utm=...&campana=...&periodo=...
 */

$configFile = __DIR__ . '/api/config.php';
if (!file_exists($configFile)) {
    $configFile = __DIR__ . '/api/config.example.php';
}
$config = require $configFile;

date_default_timezone_set($config['app']['timezone'] ?? 'America/Lima');

require_once __DIR__ . '/api/Database.php';
use TraceIC\Database;

$fallbackUrl = $config['app']['default_fallback_url'] ?? 'https://icontinental.edu.pe';

$rawSlug = $_GET['slug'] ?? '';
if ($rawSlug === '') {
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $rawSlug = trim($uriPath, '/');
}
$slug = preg_replace('/[^a-zA-Z0-9\-_]/', '', $rawSlug);

if ($slug === '' || in_array(strtolower($slug), ['app', 'api', 'assets', 'index.php', 'redirect.php'], true)) {
    header('Location: /app/', true, 302);
    exit;
}

function resolveWebsiteCareerOrSection(string $path): string
{
    $cleanPath = trim($path, '/');
    if ($cleanPath === '') {
        return 'Página de Inicio';
    }

    $careers = [
        'diseno-de-modas'             => 'Diseño de Modas',
        'contabilidad'                => 'Contabilidad',
        'enfermeria-tecnica'          => 'Enfermería Técnica',
        'enfermeria'                  => 'Enfermería Técnica',
        'administracion-de-empresas'  => 'Administración de Empresas',
        'administracion-bancaria'     => 'Administración Bancaria y Financiera',
        'desarrollo-de-sistemas'      => 'Desarrollo de Sistemas de Información',
        'diseno-grafico'              => 'Diseño Gráfico Publicitario',
        'diseno-de-interiores'        => 'Diseño de Interiores',
        'gastronomia'                 => 'Gastronomía',
        'guia-oficial-de-turismo'     => 'Guía Oficial de Turismo',
        'mecatronica-automotriz'      => 'Mecatrónica Automotriz',
        'electricidad-industrial'     => 'Electricidad Industrial',
        'mantenimiento-de-maquinaria' => 'Mantenimiento de Maquinaria Pesada',
        'seguridad-minera'            => 'Seguridad e Higiene Minera',
        'farmacia-tecnica'            => 'Técnica en Farmacia',
        'laboratorio-clinico'         => 'Laboratorio Clínico y Anatomía Patológica',
        'admision'                    => 'Página de Admisión General',
        'becas'                       => 'Página de Becas y Créditos',
    ];

    $segments = array_values(array_filter(explode('/', strtolower($cleanPath))));
    $lastSlug = end($segments) ?: $cleanPath;

    return $careers[$lastSlug] ?? ucwords(str_replace(['-', '_'], ' ', $lastSlug));
}

function cleanCampaignCode(string $raw): string
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

try {
    Database::init($config);
    $pdo = Database::getConnection();

    // Resolver Periodo Global Activo
    $activePeriod = '202710';
    try {
        $pRow = $pdo->query("SELECT code FROM periods WHERE is_active = 1 LIMIT 1")->fetchColumn();
        if ($pRow) {
            $activePeriod = (string) $pRow;
        }
    } catch (\Throwable $e) {
        // Tabla periods aún no migrada
    }

    // Buscar ruta base o enlace registrado
    $stmt = $pdo->prepare('SELECT * FROM links WHERE LOWER(slug) = LOWER(:slug) LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $link = $stmt->fetch();

    // Compatibilidad automática para /link-ads, /tiktok, /asesor, /CRM, /whatsapp-web
    if (!$link) {
        $lowerSlug = strtolower($slug);
        if (in_array($lowerSlug, ['link-ads', 'tiktok', 'asesor', 'crm', 'whatsapp-web'], true)) {
            $stmtFallback = $pdo->query('SELECT * FROM links ORDER BY is_master_route DESC, id ASC LIMIT 1');
            $link = $stmtFallback->fetch();
            if ($link) {
                if ($lowerSlug === 'link-ads' || $lowerSlug === 'tiktok') {
                    $link['channel'] = 'link_ads';
                    $link['slug'] = 'link-ads';
                } elseif ($lowerSlug === 'asesor') {
                    $link['channel'] = 'asesor_prospector';
                    $link['slug'] = 'asesor';
                } elseif ($lowerSlug === 'crm') {
                    $link['channel'] = 'mailing_sms_chattigo';
                    $link['slug'] = 'CRM';
                } else {
                    $link['channel'] = 'web_institucional';
                    $link['slug'] = 'whatsapp-web';
                }
            }
        }
    }

    if (!$link || ($link['status'] ?? 'active') !== 'active') {
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Location: ' . $fallbackUrl, true, 302);
        exit;
    }

    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
    if (strpos($ip, ',') !== false) {
        $ip = trim(explode(',', $ip)[0]);
    }

    $secretSalt = $config['app']['secret_key'] ?? 'trace_ic_salt';
    $visitorHash = hash('sha256', $ip . '|' . $userAgent . '|' . $link['id'] . '|' . date('Y-m-d') . '|' . $secretSalt);

    // Filtro silencioso de Bots
    $isBot = false;
    if ($method === 'HEAD' || $method === 'OPTIONS' || strlen($userAgent) < 12) {
        $isBot = true;
    } else {
        $botKeywords = [
            'WhatsApp', 'facebookexternalhit', 'Facebot', 'Meta-ExternalAgent',
            'TikTokSpider', 'Bytespider', 'TelegramBot', 'Twitterbot', 'LinkedInBot',
            'Googlebot', 'bingbot', 'BingPreview', 'SafeLinks', 'HeadlessChrome', 'curl/', 'python-requests'
        ];
        foreach ($botKeywords as $kw) {
            if (stripos($userAgent, $kw) !== false) {
                $isBot = true;
                break;
            }
        }
    }

    // Detectar URL de origen del Sitio Web Institucional
    $refererFull = isset($_SERVER['HTTP_REFERER']) ? substr(trim($_SERVER['HTTP_REFERER']), 0, 500) : null;
    $sourcePath = null;
    $urlReference = null;

    if ($refererFull) {
        $parsedRef = parse_url($refererFull);
        $host = isset($parsedRef['host']) ? strtolower(preg_replace('/^www\./', '', $parsedRef['host'])) : 'icontinental.edu.pe';
        $sourcePath = isset($parsedRef['path']) ? '/' . trim($parsedRef['path'], '/') . '/' : '/';
        if ($sourcePath === '//') {
            $sourcePath = '/';
        }
        $urlReference = 'https://' . $host . $sourcePath;
    }

    $explicitPage = trim($_GET['_p'] ?? $_GET['page'] ?? '');
    if ($explicitPage !== '') {
        $sourcePath = '/' . trim($explicitPage, '/') . '/';
        $urlReference = 'https://icontinental.edu.pe' . $sourcePath;
    }

    $paramPeriod = trim($_GET['periodo'] ?? '');
    $paramCampaign = trim($_GET['campana'] ?? $_GET['c'] ?? '');
    $paramUtm = trim($_GET['utm'] ?? $_GET['subcampana'] ?? $_GET['asesor'] ?? $_GET['s'] ?? '');

    $finalPeriod = preg_match('/^20[2-3]\d(10|20|30)$/', $paramPeriod)
        ? $paramPeriod
        : (!empty($link['period']) ? (string) $link['period'] : $activePeriod);

    $finalCampaign = $paramCampaign !== ''
        ? cleanCampaignCode($paramCampaign)
        : cleanCampaignCode((string) ($link['campaign'] ?: 'PORTALWEB'));

    $finalSubcampaign = $paramUtm !== ''
        ? $paramUtm
        : ((string) ($link['subcampaign'] ?: 'general'));

    if ($sourcePath !== null && $link['channel'] === 'web_institucional') {
        $finalSubcampaign = resolveWebsiteCareerOrSection($sourcePath);
    }

    $shortLinkDisplay = sprintf(
        'trace.icontinental.edu.pe/%s?utm=%s&campana=%s&periodo=%s',
        $link['slug'],
        rawurlencode($finalSubcampaign),
        rawurlencode($finalCampaign),
        rawurlencode($finalPeriod)
    );

    // Unicidad diaria y protección contra doble clic (< 3s)
    $isUnique = 0;
    if (!$isBot) {
        $burstStmt = $pdo->prepare("
            SELECT id, clicked_at FROM click_events
            WHERE link_id = :link_id AND visitor_hash = :vhash
            ORDER BY id DESC LIMIT 1
        ");
        $burstStmt->execute(['link_id' => $link['id'], 'vhash' => $visitorHash]);
        $lastVisit = $burstStmt->fetch();

        if (!$lastVisit) {
            $isUnique = 1;
        } elseif ((time() - strtotime($lastVisit['clicked_at'])) < 3) {
            $isBot = true;
        }
    }

    // Construir teléfono y mensaje de WhatsApp con Código de Atención automático
    $phone = preg_replace('/\D/', '', (string) ($link['whatsapp_phone'] ?: '51987654321'));
    $attentionCode = $finalCampaign . '_' . $finalPeriod;

    if ($link['channel'] === 'asesor_prospector') {
        $advisorName = $finalSubcampaign ?: 'Asesor';
        try {
            $advStmt = $pdo->prepare('SELECT name, phone_number FROM advisors WHERE LOWER(name) = LOWER(:n) LIMIT 1');
            $advStmt->execute(['n' => $advisorName]);
            $advRow = $advStmt->fetch();
            if ($advRow) {
                $advisorName = (string) $advRow['name'];
                $phone = preg_replace('/\D/', '', (string) $advRow['phone_number']);
            }
        } catch (\Throwable $e) {
            // Ignorar si no existe
        }
        $message = "Hola, {$advisorName}, quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención {$attentionCode}";
    } elseif ($link['channel'] === 'web_institucional') {
        if ($urlReference && $sourcePath && $sourcePath !== '/') {
            $message = "Hola, vengo de {$urlReference} y quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención {$attentionCode}";
        } else {
            $message = "Hola, vengo del portal web y quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención {$attentionCode}";
        }
    } else {
        $originTag = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $finalSubcampaign));
        $fullCode = $originTag !== '' ? "{$attentionCode}_{$originTag}" : $attentionCode;
        $message = "Hola, vengo de {$finalSubcampaign} y quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención {$fullCode}";
    }

    if (($link['destination_type'] ?? 'whatsapp') === 'whatsapp') {
        $finalDestinationUrl = 'https://api.whatsapp.com/send?phone=' . rawurlencode($phone) . '&text=' . rawurlencode($message);
    } else {
        $finalDestinationUrl = $link['destination_url'] ?: $fallbackUrl;
    }

    $isPurgeableEvent = (!empty($link['is_purgeable']) || !empty($_GET['test']) || preg_match('/prueba|test|demo|simulaci/i', $finalSubcampaign)) ? 1 : 0;

    try {
        $insertStmt = $pdo->prepare("
            INSERT INTO click_events (
                link_id, clicked_at, clicked_date, is_bot, is_unique, visitor_hash,
                channel, period, campaign, subcampaign, url_reference, short_link, is_purgeable
            ) VALUES (
                :link_id, NOW(), CURRENT_DATE, :is_bot, :is_unique, :visitor_hash,
                :channel, :period, :campaign, :subcampaign, :url_reference, :short_link, :is_purgeable
            )
        ");
        $insertStmt->execute([
            'link_id'       => $link['id'],
            'is_bot'        => $isBot ? 1 : 0,
            'is_unique'     => $isUnique,
            'visitor_hash'  => $visitorHash,
            'channel'       => $link['channel'],
            'period'        => $finalPeriod,
            'campaign'      => $finalCampaign,
            'subcampaign'   => $finalSubcampaign,
            'url_reference' => $urlReference,
            'short_link'    => $shortLinkDisplay,
            'is_purgeable'  => $isPurgeableEvent,
        ]);
    } catch (\Throwable $colErr) {
        $insertStmt = $pdo->prepare("
            INSERT INTO click_events (
                link_id, clicked_at, clicked_date, is_bot, is_unique, visitor_hash,
                channel, campaign, subcampaign, url_reference, short_link
            ) VALUES (
                :link_id, NOW(), CURRENT_DATE, :is_bot, :is_unique, :visitor_hash,
                :channel, :campaign, :subcampaign, :url_reference, :short_link
            )
        ");
        $insertStmt->execute([
            'link_id'       => $link['id'],
            'is_bot'        => $isBot ? 1 : 0,
            'is_unique'     => $isUnique,
            'visitor_hash'  => $visitorHash,
            'channel'       => $link['channel'],
            'campaign'      => $finalCampaign,
            'subcampaign'   => $finalSubcampaign,
            'url_reference' => $urlReference,
            'short_link'    => $shortLinkDisplay,
        ]);
    }

    $updateStmt = $pdo->prepare("
        UPDATE links SET
            total_clicks = total_clicks + :human_inc,
            unique_visitors = unique_visitors + :unique_inc,
            total_bot_hits = total_bot_hits + :bot_inc,
            last_clicked_at = CASE WHEN :is_human = 1 THEN NOW() ELSE last_clicked_at END
        WHERE id = :id
    ");
    $updateStmt->execute([
        'human_inc'  => $isBot ? 0 : 1,
        'unique_inc' => $isUnique,
        'bot_inc'    => $isBot ? 1 : 0,
        'is_human'   => $isBot ? 0 : 1,
        'id'         => $link['id'],
    ]);

    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Location: ' . $finalDestinationUrl, true, 302);
    exit;

} catch (\Throwable $e) {
    error_log('[TraceIC Redirect Error] ' . $e->getMessage());
    header('Location: ' . $fallbackUrl, true, 302);
    exit;
}
