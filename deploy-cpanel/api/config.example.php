<?php
/**
 * TRACE IC — Archivo de Configuración del Servidor (cPanel)
 * 
 * INSTRUCCIONES PARA PRODUCCIÓN EN CPANEL:
 * 1. Copia este archivo con el nombre `config.php` dentro de `/api/config.php`.
 * 2. Coloca los datos reales de la base de datos MySQL creada en tu cPanel.
 */

return [
    'app' => [
        'name' => 'Trace IC — Instituto Continental',
        'base_url' => 'https://trace.icontinental.edu.pe',
        'default_fallback_url' => 'https://icontinental.edu.pe',
        'timezone' => 'America/Lima',
        // Clave secreta para firmar tokens de sesión y hashes anónimos
        'secret_key' => 'CAMBIAR_ESTA_CLAVE_SECRETA_EN_CPANEL_IC_2026_998877',
    ],
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'icontinental_trace',
        'username' => 'icontinental_user',
        'password' => 'CAMBIAR_PASSWORD_MYSQL',
        'charset' => 'utf8mb4',
    ],
];
