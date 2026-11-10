<?php
declare(strict_types=1);

require_once __DIR__ . '/hitung_client.php';

function diskon_angka(mixed $value, string $label): float
{
    if (is_int($value) || is_float($value)) {
        return (float) $value;
    }

    if (is_string($value) && is_numeric(trim($value))) {
        return (float) trim($value);
    }

    throw new InvalidArgumentException($label . ' harus berupa angka');
}

function hitungDiskonPhp(array $input): array
{
    $normalPrice = (int)diskon_angka(
        $input['normal_price'] ?? $input['harga_normal'] ?? 0,
        'Harga normal'
    );
    $discountPercent = diskon_angka(
        $input['discount_percent'] ?? $input['diskon_persen'] ?? 0,
        'Persentase diskon'
    );
    $quantity = (int)diskon_angka(
        $input['quantity'] ?? $input['qty'] ?? $input['jumlah'] ?? 1,
        'Jumlah'
    );
    $additionalCost = (int)diskon_angka(
        $input['additional_cost'] ?? $input['biaya_tambahan'] ?? 0,
        'Biaya tambahan'
    );
    $hppPerUnit = diskon_angka(
        $input['hpp_per_unit'] ?? $input['hpp_unit'] ?? 0,
        'HPP per unit'
    );
    $targetMarginPercent = diskon_angka(
        $input['target_margin_percent'] ?? $input['target_margin'] ?? 0,
        'Target margin'
    );

    if ($targetMarginPercent > 1.0) {
        $targetMarginPercent = $targetMarginPercent / 100.0;
    }

    if ($normalPrice <= 0) {
        throw new InvalidArgumentException('Harga normal harus lebih dari 0');
    }
    if ($quantity <= 0) {
        throw new InvalidArgumentException('Jumlah harus lebih dari 0');
    }
    if ($discountPercent < 0 || $discountPercent > 100) {
        throw new InvalidArgumentException('Persentase diskon harus antara 0 dan 100');
    }
    if ($hppPerUnit < 0) {
        throw new InvalidArgumentException('HPP per unit tidak boleh negatif');
    }
    if ($additionalCost < 0) {
        throw new InvalidArgumentException('Biaya tambahan tidak boleh negatif');
    }
    if ($targetMarginPercent < 0 || $targetMarginPercent >= 1.0) {
        throw new InvalidArgumentException('Target margin harus >= 0 dan < 1.0');
    }

    $discountAmountPerUnit = (int)round($normalPrice * ($discountPercent / 100));
    $finalPricePerUnit = $normalPrice - $discountAmountPerUnit;

    $effectiveCostPerUnit = $hppPerUnit + $additionalCost;
    $profitPerUnit = $finalPricePerUnit - $effectiveCostPerUnit;
    $totalRevenue = $finalPricePerUnit * $quantity;
    $totalProfit = $profitPerUnit * $quantity;

    $marginPercent = $finalPricePerUnit > 0 ? (($profitPerUnit / $finalPricePerUnit) * 100) : 0;

    $maxDiscountPercentSafe = 0.0;
    if ($normalPrice > 0) {
        $maxDiscountPercentSafe = (($normalPrice - $effectiveCostPerUnit) / $normalPrice) * 100;
        if ($maxDiscountPercentSafe < 0) {
            $maxDiscountPercentSafe = 0.0;
        }
        if ($maxDiscountPercentSafe > 100) {
            $maxDiscountPercentSafe = 100.0;
        }
    }

    $targetPricePerUnit = 0;
    if ($targetMarginPercent < 1.0) {
        $targetPricePerUnit = $effectiveCostPerUnit / (1 - $targetMarginPercent);
    }
    $maxDiscountPercentTarget = 0.0;
    if ($normalPrice > 0 && $targetPricePerUnit > 0) {
        $maxDiscountPercentTarget = (($normalPrice - $targetPricePerUnit) / $normalPrice) * 100;
        if ($maxDiscountPercentTarget < 0) {
            $maxDiscountPercentTarget = 0.0;
        }
        if ($maxDiscountPercentTarget > 100) {
            $maxDiscountPercentTarget = 100.0;
        }
    }

    $status = 'safe';
    $warningMessage = 'Diskon aman dan memenuhi target margin.';

    if ($profitPerUnit < 0) {
        $status = 'loss';
        $warningMessage = 'Perhatian! Promosi ini menghasilkan kerugian per unit.';
    } elseif ($targetMarginPercent > 0 && $marginPercent < ($targetMarginPercent * 100)) {
        $status = 'below_target';
        $warningMessage = 'Masih untung, tetapi margin di bawah target yang diinginkan.';
    } elseif ($profitPerUnit == 0) {
        $status = 'below_target';
        $warningMessage = 'Impas (break even). Margin nol, tidak untung maupun rugi.';
    } elseif ($targetMarginPercent == 0 && $profitPerUnit > 0) {
        $status = 'safe';
        $warningMessage = 'Diskon aman (tidak rugi).';
    }

    return [
        'normal_price' => $normalPrice,
        'discount_percent' => round($discountPercent, 2),
        'discount_amount_per_unit' => $discountAmountPerUnit,
        'final_price_per_unit' => $finalPricePerUnit,
        'quantity' => $quantity,
        'additional_cost' => $additionalCost,
        'effective_hpp_per_unit' => (int)$effectiveCostPerUnit,
        'total_revenue' => $totalRevenue,
        'profit_per_unit' => (int)$profitPerUnit,
        'total_profit' => (int)$totalProfit,
        'margin_percent' => round($marginPercent, 2),
        'target_margin_percent' => round($targetMarginPercent * 100, 2),
        'max_discount_percent_safe' => round($maxDiscountPercentSafe, 2),
        'max_discount_percent_target' => round($maxDiscountPercentTarget, 2),
        'status' => $status,
        'warning' => $warningMessage,
        'message' => $warningMessage,
        'engine' => 'php',
    ];
}

function hitungDiskon(array $input): array
{
    $decoded = hitung_service_post('/hitung-diskon', $input);

    if (is_array($decoded) && isset($decoded['ok']) && ($decoded['ok'] === false || isset($decoded['data']))) {
        if ($decoded['ok'] && !isset($decoded['engine'])) {
            $decoded['engine'] = 'python';
        }

        return $decoded;
    }

    try {
        $result = hitungDiskonPhp($input);
        $result['engine'] = 'php';

        return [
            'ok' => true,
            'engine' => 'php',
            'data' => $result,
            'message' => 'Simulasi diskon berhasil dihitung (fallback PHP)',
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
