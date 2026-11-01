<?php
declare(strict_types=1);

function cors_allowed_origins(): array
{
    return [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ];
}

function cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin !== '' && in_array($origin, cors_allowed_origins(), true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    header('Vary: Origin');
}

function handle_preflight(): void
{
    cors_headers();

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
