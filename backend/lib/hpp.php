<?php
declare(strict_types=1);

function hitungHppPhp(array $input): array
{
    $unitCount = (int)($input['unit_count'] ?? $input['units_produced'] ?? 0);
    $materialCost = (int)($input['material_cost'] ?? 0);
    $laborCost = (int)($input['labor_cost'] ?? 0);
    $packagingCost = (int)($input['packaging_cost'] ?? 0);
    $overheadCost = (int)($input['overhead_cost'] ?? 0);
    $targetMargin = (float)($input['target_margin'] ?? $input['target_margin_percent'] ?? 0);

    if ($targetMargin > 1.0) {
        $targetMargin = $targetMargin / 100.0;
    }

    if ($unitCount <= 0) {
        throw new InvalidArgumentException("Jumlah unit harus lebih dari 0");
    }

    if ($targetMargin < 0 || $targetMargin >= 1.0) {
        throw new InvalidArgumentException("Target margin harus >= 0 dan < 1.0");
    }

    $totalCost = $materialCost + $laborCost + $packagingCost + $overheadCost;
    $hppPerUnit = $unitCount > 0 ? ($totalCost / $unitCount) : 0;

    $suggestedPriceFloat = $hppPerUnit / (1 - $targetMargin);
    $suggestedPrice = (int)(ceil($suggestedPriceFloat / 100) * 100);

    $grossProfitPerUnit = $suggestedPrice - $hppPerUnit;
    $marginPercent = $suggestedPrice > 0 ? ($grossProfitPerUnit / $suggestedPrice * 100) : 0;
    $markupPercent = $hppPerUnit > 0 ? ($grossProfitPerUnit / $hppPerUnit * 100) : 0;

    return [
        'total_cost' => $totalCost,
        'unit_count' => $unitCount,
        'hpp_per_unit' => (int)round($hppPerUnit),
        'target_margin' => $targetMargin,
        'suggested_price' => $suggestedPrice,
        'gross_profit_per_unit' => (int)$grossProfitPerUnit,
        'margin_percent' => round($marginPercent, 2),
        'markup_percent' => round($markupPercent, 2),
        'engine' => 'php'
    ];
}

function hitungHpp(array $input): array
{
    $url = 'http://127.0.0.1:5001/hitung-hpp';
    $payload = json_encode($input);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErrno = curl_errno($ch);
    curl_close($ch);

    if ($curlErrno !== 0 || $response === false || $httpCode !== 200) {
        try {
            $result = hitungHppPhp($input);
            $result['engine'] = 'php';
            return ['ok' => true, 'engine' => 'php', 'data' => $result, 'message' => 'HPP berhasil dihitung (fallback PHP)'];
        } catch (Throwable $e) {
            return ['ok' => false, 'error_code' => 'VALIDATION_ERROR', 'data' => null, 'message' => $e->getMessage()];
        }
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded) || !isset($decoded['ok'])) {
        try {
            $result = hitungHppPhp($input);
            $result['engine'] = 'php';
            return ['ok' => true, 'engine' => 'php', 'data' => $result, 'message' => 'HPP berhasil dihitung (fallback PHP)'];
        } catch (Throwable $e) {
            return ['ok' => false, 'error_code' => 'SERVER_ERROR', 'data' => null, 'message' => $e->getMessage()];
        }
    }

    if ($decoded['ok'] && !isset($decoded['engine'])) {
        $decoded['engine'] = 'python';
    }

    return $decoded;
}