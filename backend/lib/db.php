<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $configFile = __DIR__ . '/../config.php';
    $config = is_file($configFile) ? require $configFile : [];
    $fileDb = $config['db'] ?? [];

    $env = static function (string $key, mixed $default): mixed {
        $value = getenv($key);

        return $value === false ? $default : $value;
    };

    $db = [
        'host'    => (string) $env('DB_HOST', $fileDb['host'] ?? ''),
        'port'    => (int) $env('DB_PORT', $fileDb['port'] ?? 3306),
        'name'    => (string) $env('DB_NAME', $fileDb['name'] ?? ''),
        'user'    => (string) $env('DB_USER', $fileDb['user'] ?? ''),
        'pass'    => (string) $env('DB_PASS', $fileDb['pass'] ?? ''),
        'charset' => (string) $env('DB_CHARSET', $fileDb['charset'] ?? 'utf8mb4'),
    ];

    if ($db['host'] === '' || $db['name'] === '' || $db['user'] === '') {
        throw new RuntimeException(
            'Konfigurasi database tidak ditemukan. Jalankan: cp backend/config.example.php backend/config.php'
        );
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'],
        $db['port'],
        $db['name'],
        $db['charset']
    );

    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ]);

    return $pdo;
}