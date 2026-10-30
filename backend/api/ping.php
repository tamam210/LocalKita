<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_error('Metode tidak diizinkan. Gunakan GET.', 405);
}

try {
    $pdo = db();
    $result = $pdo->query('SELECT 1')->fetchColumn();

    if ((int) $result !== 1) {
        throw new RuntimeException('Query tes mengembalikan nilai yang tidak diharapkan.');
    }

    json_success(
        [
            'database' => 'connected',
            'time'     => date(DATE_ATOM),
        ],
        'pong'
    );
} catch (Throwable $e) {
    error_log('[ping] Koneksi database gagal: ' . $e->getMessage());
    json_error('Koneksi database gagal.', 500);
}