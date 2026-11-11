<?php
declare(strict_types=1);

namespace TraceIC;

use PDO;
use PDOException;
use RuntimeException;

/**
 * Conexión segura a MySQL/MariaDB mediante PDO (Singleton)
 */
final class Database
{
    private static ?PDO $instance = null;
    private static array $config = [];

    public static function init(array $config): void
    {
        self::$config = $config;
    }

    public static function getConnection(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        if (empty(self::$config['db'])) {
            throw new RuntimeException('La configuración de la base de datos no ha sido inicializada.');
        }

        $db = self::$config['db'];
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $db['host'] ?? 'localhost',
            (int) ($db['port'] ?? 3306),
            $db['database'] ?? '',
            $db['charset'] ?? 'utf8mb4'
        );

        try {
            self::$instance = new PDO($dsn, $db['username'], $db['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            return self::$instance;
        } catch (PDOException $e) {
            error_log('[TraceIC Database Error] ' . $e->getMessage());
            throw new RuntimeException('Error de conexión con la base de datos MySQL.');
        }
    }
}
