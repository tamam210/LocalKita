<?php
declare(strict_types=1);

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

function json_success(mixed $data = null, string $message = 'OK', int $status = 200): void
{
    json_response([
        'ok'      => true,
        'data'    => $data,
        'message' => $message,
    ], $status);
}

function json_error(string $message, int $status = 400, mixed $errors = null): void
{
    $payload = [
        'ok'      => false,
        'data'    => null,
        'message' => $message,
    ];

    if ($errors !== null) {
        $payload['errors'] = $errors;
    }

    json_response($payload, $status);
}