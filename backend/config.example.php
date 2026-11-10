<?php
declare(strict_types=1);

return [
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'lokalkita',
        'user'    => 'lokalkita',
        'pass'    => 'lokalkita',
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'env'   => 'local',
        'debug' => true,
    ],
    // Opsional: konfigurasi SMTP jika fitur email digunakan.
    'mail' => [
        'host'       => getenv('SMTP_HOST') ?: 'smtp.gmail.com',
        'port'       => (int) (getenv('SMTP_PORT') ?: 587),
        'username'   => getenv('SMTP_USER') ?: '',
        'password'   => getenv('SMTP_PASS') ?: '',
        'from_name'  => getenv('MAIL_FROM_NAME') ?: 'LokalKita',
        'from'       => getenv('MAIL_FROM') ?: 'noreply@lokalkita.test',
        'encryption' => getenv('SMTP_ENCRYPTION') ?: 'tls',
    ],
];
