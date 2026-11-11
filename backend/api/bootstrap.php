<?php
declare(strict_types=1);

namespace TraceIC;

/**
 * TRACE IC — Inicialización de API REST, Respuestas JSON y Autenticación JWT/HMAC
 */

$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    $configFile = __DIR__ . '/config.example.php';
}
$config = require $configFile;

date_default_timezone_set($config['app']['timezone'] ?? 'America/Lima');

require_once __DIR__ . '/Database.php';
Database::init($config);

// Cabeceras CORS y JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function generateToken(array $user, string $secret): string
{
    $payload = [
        'sub'   => $user['id'],
        'email' => $user['email'],
        'name'  => $user['name'],
        'role'  => $user['role'] ?? 'admin',
        'exp'   => time() + (86400 * 7), // 7 días
    ];
    $base64Payload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signature = rtrim(strtr(base64_encode(hash_hmac('sha256', $base64Payload, $secret, true)), '+/', '-_'), '=');
    return $base64Payload . '.' . $signature;
}

function verifyToken(string $secret): array
{
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        jsonResponse(['error' => 'No autorizado. Inicie sesión nuevamente.'], 401);
    }

    $parts = explode('.', trim($matches[1]));
    if (count($parts) !== 2) {
        jsonResponse(['error' => 'Token inválido.'], 401);
    }

    [$base64Payload, $signature] = $parts;
    $expectedSig = rtrim(strtr(base64_encode(hash_hmac('sha256', $base64Payload, $secret, true)), '+/', '-_'), '=');

    if (!hash_equals($expectedSig, $signature)) {
        jsonResponse(['error' => 'Firma de sesión inválida.'], 401);
    }

    $payload = json_decode(base64_decode(strtr($base64Payload, '-_', '+/')), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
        jsonResponse(['error' => 'La sesión ha expirado.'], 401);
    }

    return $payload;
}
