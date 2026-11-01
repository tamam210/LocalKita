<?php
declare(strict_types=1);

require_once __DIR__ . '/response.php';

function read_json_body(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);

    if (!is_array($data)) {
        json_error('Body JSON tidak valid.', 400, null, 'VALIDATION_ERROR');
    }

    return $data;
}

function validation_error(string $field, string $message): never
{
    json_error(
        'Input tidak valid.',
        400,
        [$field => $message],
        'VALIDATION_ERROR'
    );
}

function require_fields(array $data, array $fields): void
{
    $errors = [];

    foreach ($fields as $field) {
        if (!array_key_exists($field, $data)) {
            $errors[$field] = 'Field wajib diisi.';
            continue;
        }

        $value = $data[$field];

        if ($value === null || (is_string($value) && trim($value) === '')) {
            $errors[$field] = 'Field wajib diisi.';
        }
    }

    if ($errors !== []) {
        json_error('Input tidak valid.', 400, $errors, 'VALIDATION_ERROR');
    }
}

function validate_string(
    mixed $value,
    string $field,
    ?int $minLength = null,
    ?int $maxLength = null,
    bool $trim = true
): string {
    if (!is_string($value)) {
        validation_error($field, 'Harus berupa teks.');
    }

    if ($trim) {
        $value = trim($value);
    }

    $length = strlen($value);

    if ($minLength !== null && $length < $minLength) {
        validation_error($field, 'Minimal ' . $minLength . ' karakter.');
    }

    if ($maxLength !== null && $length > $maxLength) {
        validation_error($field, 'Maksimal ' . $maxLength . ' karakter.');
    }

    return $value;
}

function validate_uuid(mixed $value, string $field): string
{
    if (!is_string($value)) {
        validation_error($field, 'Harus berupa UUID.');
    }

    $value = strtolower(trim($value));

    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $value)) {
        validation_error($field, 'Format UUID tidak valid.');
    }

    return $value;
}

function validate_int(
    mixed $value,
    string $field,
    ?int $min = null,
    ?int $max = null
): int {
    if (is_int($value)) {
        $int = $value;
    } elseif (is_string($value) && preg_match('/^-?\d+$/', trim($value))) {
        $int = (int) trim($value);
    } elseif (is_float($value) && floor($value) === $value) {
        $int = (int) $value;
    } else {
        validation_error($field, 'Harus berupa bilangan bulat.');
    }

    if ($min !== null && $int < $min) {
        validation_error($field, 'Minimal ' . $min . '.');
    }

    if ($max !== null && $int > $max) {
        validation_error($field, 'Maksimal ' . $max . '.');
    }

    return $int;
}

function validate_number(
    mixed $value,
    string $field,
    ?float $min = null,
    ?float $max = null
): float {
    if (is_int($value) || is_float($value)) {
        $number = (float) $value;
    } elseif (is_string($value) && is_numeric(trim($value))) {
        $number = (float) trim($value);
    } else {
        validation_error($field, 'Harus berupa angka.');
    }

    if (!is_finite($number)) {
        validation_error($field, 'Harus berupa angka yang valid.');
    }

    if ($min !== null && $number < $min) {
        validation_error($field, 'Minimal ' . $min . '.');
    }

    if ($max !== null && $number > $max) {
        validation_error($field, 'Maksimal ' . $max . '.');
    }

    return $number;
}

function validate_boolean(mixed $value, string $field): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if ($value === 1 || $value === 0) {
        return $value === 1;
    }

    if (is_string($value)) {
        $normalized = strtolower(trim($value));

        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }

        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }
    }

    validation_error($field, 'Harus berupa boolean.');
}

function validate_enum(mixed $value, string $field, array $allowed): string
{
    if (!is_string($value)) {
        validation_error($field, 'Nilai tidak valid.');
    }

    $value = trim($value);

    if (!in_array($value, $allowed, true)) {
        validation_error($field, 'Nilai harus salah satu dari: ' . implode(', ', $allowed) . '.');
    }

    return $value;
}
