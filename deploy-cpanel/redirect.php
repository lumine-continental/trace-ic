<?php
declare(strict_types=1);

/**
 * TRACE IC — Motor de Redirección y Conteo en Tiempo Real (< 20 ms)
 * Dominio: https://trace.icontinental.edu.pe/{slug}
 *
 * Soporta:
 * - Enlace normal de Mailing/SMS/Chattigo: /CRM?campana=202710&subcampana=...
 * - Enlace normal de Sitio Web: /whatsapp-web (autodetección de /carrera/diseno-de-modas/)
 * - Enlace normal de TikTok Ads: /tiktok?campana=202710&subcampana=...
 * - Enlace normal de Landing: /landing?campana=202710&subcampana=...
 * - Cualquier alias corto personalizado creado en el Generador de Enlaces.
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

try {
    Database::init($config);
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare('SELECT * FROM links WHERE LOWER(slug) = LOWER(:slug) LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $link = $stmt->fetch();

    if (!$link || $link['status'] !== 'active') {
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

    // Filtro silencioso de Bots (vistas previas de WhatsApp/Redes/Correo)
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

    // Detectar URL de origen cuando proviene del Sitio Web Institucional
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

    $paramCampaign = trim($_GET['campana'] ?? $_GET['c'] ?? '');
    $paramSubcampaign = trim($_GET['subcampana'] ?? $_GET['s'] ?? '');

    $finalCampaign = $paramCampaign !== '' ? $paramCampaign : ($link['campaign'] ?: '202710');
    $finalSubcampaign = $paramSubcampaign !== '' ? $paramSubcampaign : ($link['subcampaign'] ?: 'General');

    if ($sourcePath !== null && $link['channel'] === 'web_institucional') {
        $finalSubcampaign = resolveWebsiteCareerOrSection($sourcePath);
    }

    // Verificar si existe una fila específica para esta combinación (ej. cuando se usa /CRM?campana=202710&subcampana=...)
    $shortLinkDisplay = 'trace.icontinental.edu.pe/' . $link['slug'];
    if ($paramCampaign !== '' || $paramSubcampaign !== '') {
        $shortLinkDisplay = sprintf(
            'trace.icontinental.edu.pe/%s?campana=%s&subcampana=%s',
            $link['slug'],
            rawurlencode($finalCampaign),
            rawurlencode($finalSubcampaign)
        );
    }

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

    if ($link['destination_type'] === 'whatsapp') {
        $phone = preg_replace('/\D/', '', $link['whatsapp_phone'] ?: '51987654321');
        $message = $link['whatsapp_message'] ?: 'Hola Instituto Continental, deseo recibir información.';
        $finalDestinationUrl = 'https://api.whatsapp.com/send?phone=' . rawurlencode($phone) . '&text=' . rawurlencode($message);
    } else {
        $finalDestinationUrl = $link['destination_url'] ?: $fallbackUrl;
    }

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
