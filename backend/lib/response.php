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

function json_error_code_for_status(int $status): string
{
    return match ($status) {
        400     => 'VALIDATION_ERROR',
        401     => 'UNAUTHORIZED',
        403     => 'FORBIDDEN',
        404     => 'NOT_FOUND',
        405     => 'METHOD_NOT_ALLOWED',
        409     => 'CONFLICT',
        default => 'SERVER_ERROR',
    };
}

function json_error(
    string $message,
    int $status = 400,
    mixed $errors = null,
    ?string $errorCode = null
): void {
    $payload = [
        'ok'         => false,
        'data'       => null,
        'message'    => $message,
        'error_code' => $errorCode ?? json_error_code_for_status($status),
    ];

    if ($errors !== null) {
        $payload['errors'] = $errors;
    }

    json_response($payload, $status);
}