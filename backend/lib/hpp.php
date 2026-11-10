<?php
declare(strict_types=1);

require_once __DIR__ . '/hitung_client.php';

function hpp_angka(mixed $value, string $label): float
{
    if (is_int($value) || is_float($value)) {
        return (float) $value;
    }

    if (is_string($value) && is_numeric(trim($value))) {
        return (float) trim($value);
    }

    throw new InvalidArgumentException($label . ' harus berupa angka');
}

function hitungHppPhp(array $input): array
{
    $unitCount = (int)hpp_angka(
        $input['unit_count'] ?? $input['units_produced'] ?? 0,
        'Jumlah unit'
    );
    $materialCost = (int)hpp_angka($input['material_cost'] ?? 0, 'Biaya bahan');
    $laborCost = (int)hpp_angka($input['labor_cost'] ?? 0, 'Biaya tenaga kerja');
    $packagingCost = (int)hpp_angka($input['packaging_cost'] ?? 0, 'Biaya kemasan');
    $overheadCost = (int)hpp_angka($input['overhead_cost'] ?? 0, 'Biaya overhead');
    $targetMargin = hpp_angka(
        $input['target_margin'] ?? $input['target_margin_percent'] ?? 0,
        'Target margin'
    );

    if ($targetMargin > 1.0) {
        $targetMargin = $targetMargin / 100.0;
    }

    if ($unitCount <= 0) {
        throw new InvalidArgumentException('Jumlah unit harus lebih dari 0');
    }

    if ($materialCost < 0 || $laborCost < 0 || $packagingCost < 0 || $overheadCost < 0) {
        throw new InvalidArgumentException('Biaya tidak boleh negatif');
    }

    if ($targetMargin < 0 || $targetMargin >= 1.0) {
        throw new InvalidArgumentException('Target margin harus >= 0 dan < 1.0');
    }

    $totalCost = $materialCost + $laborCost + $packagingCost + $overheadCost;
    $hppPerUnit = $totalCost / $unitCount;

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
        'engine' => 'php',
    ];
}

function hitungHpp(array $input): array
{
    $decoded = hitung_service_post('/hitung-hpp', $input);

    if (is_array($decoded) && isset($decoded['ok']) && ($decoded['ok'] === false || isset($decoded['data']))) {
        if ($decoded['ok'] && !isset($decoded['engine'])) {
            $decoded['engine'] = 'python';
        }

        return $decoded;
    }

    try {
        $result = hitungHppPhp($input);
        $result['engine'] = 'php';

        return [
            'ok' => true,
            'engine' => 'php',
            'data' => $result,
            'message' => 'HPP berhasil dihitung (fallback PHP)',
        ];
    } catch (InvalidArgumentException $e) {
        return [
            'ok' => false,
            'error_code' => 'VALIDATION_ERROR',
            'data' => null,
            'message' => $e->getMessage(),
        ];
    } catch (Throwable $e) {
        return [
            'ok' => false,
            'error_code' => 'SERVER_ERROR',
            'data' => null,
            'message' => $e->getMessage(),
        ];
    }
}
