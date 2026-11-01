<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/auth.php';

handle_preflight();

if (!in_array(getenv('APP_ENV') ?: '', ['local', 'test'], true)) {
    json_error('Not found.', 404, null, 'NOT_FOUND');
}

$user = require_auth();

json_success($user, 'OK');
