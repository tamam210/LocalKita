<?php
declare(strict_types=1);

function hitung_service_url(string $path): string
{
    $base = getenv('HITUNG_BASE_URL');

    if (!is_string($base) || trim($base) === '') {
        $base = 'http://127.0.0.1:5001';
    }

    return rtrim($base, '/') . '/' . ltrim($path, '/');
}

function hitung_service_post(string $path, array $input): ?array
{
    $url = hitung_service_url($path);
    $payload = json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if (!is_string($payload)) {
        return null;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);

        if ($ch === false) {
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_TIMEOUT        => 1,
            CURLOPT_CONNECTTIMEOUT => 1,
        ]);

        $response = curl_exec($ch);
        $errno = curl_errno($ch);
        curl_close($ch);

        if ($errno !== 0 || !is_string($response)) {
            return null;
        }

        $decoded = json_decode($response, true);

        return is_array($decoded) ? $decoded : null;
    }

    $context = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content'       => $payload,
            'timeout'       => 1,
            'ignore_errors' => true,
        ],
    ]);

    $response = @file_get_contents($url, false, $context);

    if (!is_string($response)) {
        return null;
    }

    $decoded = json_decode($response, true);

    return is_array($decoded) ? $decoded : null;
}
