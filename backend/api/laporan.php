<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/laporan.php';

handle_preflight();

$user = require_auth();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_error('Metode tidak diizinkan. Gunakan GET.', 405);
}

try {
    if (!in_array($user['role'], ['seller', 'admin'], true)) {
        json_error(
            'Hanya penjual atau admin yang dapat melihat laporan.',
            403,
            null,
            'FORBIDDEN'
        );
    }

    $storeId = validate_uuid($_GET['store_id'] ?? null, 'store_id');
    $year = validate_int($_GET['year'] ?? null, 'year', 1900, 2100);
    $month = validate_int($_GET['month'] ?? null, 'month', 1, 12);
    $refresh = isset($_GET['refresh'])
        ? validate_boolean($_GET['refresh'], 'refresh')
        : true;

    require_store_access(db(), $storeId);
    $data = laporanBulanan(db(), $storeId, $year, $month, $refresh);

    json_success($data, 'Laporan berhasil diambil.');
} catch (LaporanException $exception) {
    json_error(
        $exception->getMessage(),
        $exception->httpStatus,
        null,
        $exception->errorCode
    );
} catch (Throwable $exception) {
    error_log('[laporan] ' . $exception->getMessage() . ' in ' . $exception->getFile() . ':' . $exception->getLine());
    json_error('Terjadi kesalahan server.', 500, null, 'SERVER_ERROR');
}
