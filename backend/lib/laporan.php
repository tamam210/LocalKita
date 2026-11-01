<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

final class LaporanException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $httpStatus = 400
    ) {
        parent::__construct($message);
    }
}

function laporan_transaction(PDO $pdo, callable $callback): mixed
{
    $owned = !$pdo->inTransaction();

    if ($owned) {
        $pdo->beginTransaction();
    }

    try {
        $result = $callback();

        if ($owned) {
            $pdo->commit();
        }

        return $result;
    } catch (Throwable $exception) {
        if ($owned && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }
}

function laporan_bulan_label(int $month): string
{
    $labels = [
        1  => 'Januari',
        2  => 'Februari',
        3  => 'Maret',
        4  => 'April',
        5  => 'Mei',
        6  => 'Juni',
        7  => 'Juli',
        8  => 'Agustus',
        9  => 'September',
        10 => 'Oktober',
        11 => 'November',
        12 => 'Desember',
    ];

    return $labels[$month] ?? '';
}

function laporan_periode(int $year, int $month): array
{
    if ($year < 1900 || $year > 2100) {
        throw new LaporanException('VALIDATION_ERROR', 'Tahun tidak valid.', 400);
    }

    if ($month < 1 || $month > 12) {
        throw new LaporanException('VALIDATION_ERROR', 'Bulan harus antara 1 sampai 12.', 400);
    }

    $timezone = new DateTimeZone('Asia/Jakarta');
    $start = new DateTimeImmutable(
        sprintf('%04d-%02d-01 00:00:00', $year, $month),
        $timezone
    );
    $end = $start->modify('+1 month');

    return [
        'year'       => $year,
        'month'      => $month,
        'label'      => laporan_bulan_label($month) . ' ' . $year,
        'start'      => $start->format('Y-m-d H:i:s'),
        'end'        => $end->format('Y-m-d H:i:s'),
        'start_date' => $start->format('Y-m-d'),
        'end_date'   => $end->format('Y-m-d'),
    ];
}

function laporan_ringkasan(
    PDO $pdo,
    string $storeId,
    string $start,
    string $end
): array {
    $stmt = $pdo->prepare(
        'SELECT
            COALESCE(SUM(x.gross_revenue), 0) AS gross_revenue,
            COALESCE(SUM(x.discounts), 0) AS discounts,
            COALESCE(SUM(x.hpp), 0) AS hpp
         FROM (
            SELECT
                o.order_id,
                o.discount_total AS discounts,
                COALESCE(SUM(oi.line_total), 0) AS gross_revenue,
                COALESCE(SUM(oi.quantity * oi.hpp_unit_snapshot), 0) AS hpp
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            WHERE o.store_id = ?
              AND o.status = \'completed\'
              AND o.completed_at >= ?
              AND o.completed_at < ?
            GROUP BY o.order_id, o.discount_total
         ) AS x'
    );
    $stmt->execute([$storeId, $start, $end]);
    $row = $stmt->fetch();

    $grossRevenue = (int) round((float) ($row['gross_revenue'] ?? 0));
    $discounts = (int) round((float) ($row['discounts'] ?? 0));
    $hpp = (int) round((float) ($row['hpp'] ?? 0));

    return [
        'gross_revenue' => $grossRevenue,
        'discounts'     => $discounts,
        'net_revenue'   => $grossRevenue - $discounts,
        'hpp'           => $hpp,
    ];
}

function laporan_produk_terlaris(
    PDO $pdo,
    string $storeId,
    string $start,
    string $end,
    int $limit = 5
): array {
    if ($limit < 1) {
        $limit = 5;
    }

    if ($limit > 50) {
        $limit = 50;
    }

    $stmt = $pdo->prepare(
        'SELECT
            oi.product_name_snapshot AS product_name,
            SUM(oi.quantity) AS qty_sold,
            SUM(oi.line_total) AS revenue,
            SUM(oi.line_total - (oi.quantity * oi.hpp_unit_snapshot)) AS profit
         FROM order_items oi
         INNER JOIN orders o ON o.order_id = oi.order_id
         WHERE o.store_id = ?
           AND o.status = \'completed\'
           AND o.completed_at >= ?
           AND o.completed_at < ?
         GROUP BY oi.product_name_snapshot
         ORDER BY qty_sold DESC, revenue DESC
         LIMIT ?'
    );
    $stmt->bindValue(1, $storeId);
    $stmt->bindValue(2, $start);
    $stmt->bindValue(3, $end);
    $stmt->bindValue(4, $limit, PDO::PARAM_INT);
    $stmt->execute();

    $items = [];

    foreach ($stmt->fetchAll() as $row) {
        $items[] = [
            'product_name' => $row['product_name'],
            'qty_sold'     => (int) $row['qty_sold'],
            'revenue'      => (int) round((float) $row['revenue']),
            'profit'       => (int) round((float) $row['profit']),
        ];
    }

    return $items;
}

function laporan_pengeluaran(
    PDO $pdo,
    string $storeId,
    string $startDate,
    string $endDate
): array {
    $stmt = $pdo->prepare(
        'SELECT expense_id, category, description, amount, expense_date
         FROM operational_expenses
         WHERE store_id = ?
           AND expense_date >= ?
           AND expense_date < ?
         ORDER BY expense_date ASC, created_at ASC'
    );
    $stmt->execute([$storeId, $startDate, $endDate]);

    $items = [];

    foreach ($stmt->fetchAll() as $row) {
        $items[] = [
            'expense_id'   => $row['expense_id'],
            'category'     => $row['category'],
            'description'  => $row['description'],
            'amount'       => (int) $row['amount'],
            'expense_date' => $row['expense_date'],
        ];
    }

    return $items;
}

function laporan_biaya_promo(
    PDO $pdo,
    string $storeId,
    string $start,
    string $end
): int {
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(pl.reserved_amount), 0) AS total
         FROM point_liabilities pl
         INNER JOIN point_transactions pt ON pt.point_tx_id = pl.point_tx_id
         WHERE pl.store_id = ?
           AND pt.type = 'earn'
           AND pt.created_at >= ?
           AND pt.created_at < ?"
    );
    $stmt->execute([$storeId, $start, $end]);

    return (int) round((float) $stmt->fetchColumn());
}

function laporan_simpan(
    PDO $pdo,
    string $storeId,
    int $year,
    int $month,
    array $summary,
    array $detail
): void {
    $stmt = $pdo->prepare(
        'INSERT INTO monthly_reports
            (store_id, period_year, period_month, gross_revenue, discounts,
             net_revenue, hpp, gross_profit, operating_expenses, promo_costs,
             net_profit, net_margin, detail_json, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
            gross_revenue = VALUES(gross_revenue),
            discounts = VALUES(discounts),
            net_revenue = VALUES(net_revenue),
            hpp = VALUES(hpp),
            gross_profit = VALUES(gross_profit),
            operating_expenses = VALUES(operating_expenses),
            promo_costs = VALUES(promo_costs),
            net_profit = VALUES(net_profit),
            net_margin = VALUES(net_margin),
            detail_json = VALUES(detail_json),
            generated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([
        $storeId,
        $year,
        $month,
        $summary['gross_revenue'],
        $summary['discounts'],
        $summary['net_revenue'],
        $summary['hpp'],
        $summary['gross_profit'],
        $summary['operating_expenses'],
        $summary['promo_costs'],
        $summary['net_profit'],
        sprintf('%.2f', (float) $summary['net_margin']),
        json_encode(
            $detail,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        ),
    ]);
}

function laporan_ambil(
    PDO $pdo,
    string $storeId,
    int $year,
    int $month
): ?array {
    $stmt = $pdo->prepare(
        'SELECT report_id, store_id, period_year, period_month, gross_revenue,
                discounts, net_revenue, hpp, gross_profit, operating_expenses,
                promo_costs, net_profit, net_margin, detail_json, generated_at
         FROM monthly_reports
         WHERE store_id = ? AND period_year = ? AND period_month = ?
         LIMIT 1'
    );
    $stmt->execute([$storeId, $year, $month]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function laporan_iso(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    $timezone = new DateTimeZone('Asia/Jakarta');
    $date = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value, $timezone);

    if (!$date) {
        return $value;
    }

    return $date->format(DateTimeInterface::ATOM);
}

function laporan_format_row(array $row): array
{
    $detail = [];

    if (is_string($row['detail_json'] ?? null) && $row['detail_json'] !== '') {
        $decoded = json_decode($row['detail_json'], true);

        if (is_array($decoded)) {
            $detail = $decoded;
        }
    }

    $topProducts = [];

    foreach (($detail['top_products'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        $topProducts[] = [
            'product_name' => (string) ($item['product_name'] ?? $item['name'] ?? ''),
            'qty_sold'     => (int) ($item['qty_sold'] ?? 0),
            'revenue'      => (int) ($item['revenue'] ?? 0),
            'profit'       => (int) ($item['profit'] ?? 0),
        ];
    }

    $expenses = [];

    foreach (($detail['expenses'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        $expenses[] = [
            'expense_id'   => (string) ($item['expense_id'] ?? ''),
            'category'     => (string) ($item['category'] ?? ''),
            'description'  => $item['description'] ?? null,
            'amount'       => (int) ($item['amount'] ?? 0),
            'expense_date' => (string) ($item['expense_date'] ?? ''),
        ];
    }

    $year = (int) $row['period_year'];
    $month = (int) $row['period_month'];

    return [
        'store_id' => $row['store_id'],
        'period'   => [
            'year'  => $year,
            'month' => $month,
            'label' => laporan_bulan_label($month) . ' ' . $year,
        ],
        'summary' => [
            'gross_revenue'      => (int) $row['gross_revenue'],
            'discounts'          => (int) $row['discounts'],
            'net_revenue'        => (int) $row['net_revenue'],
            'hpp'                => (int) $row['hpp'],
            'gross_profit'       => (int) $row['gross_profit'],
            'operating_expenses' => (int) $row['operating_expenses'],
            'promo_costs'        => (int) $row['promo_costs'],
            'net_profit'         => (int) $row['net_profit'],
            'net_margin'         => (float) $row['net_margin'],
        ],
        'top_products' => $topProducts,
        'expenses'     => $expenses,
        'generated_at' => laporan_iso($row['generated_at']),
    ];
}

function laporanBulanan(
    PDO $pdo,
    string $storeId,
    int $year,
    int $month,
    bool $refresh = true,
    int $topLimit = 5
): array {
    $periode = laporan_periode($year, $month);

    if (!$refresh) {
        $row = laporan_ambil($pdo, $storeId, $year, $month);

        if ($row !== null) {
            return laporan_format_row($row);
        }
    }

    return laporan_transaction(
        $pdo,
        static function () use (
            $pdo,
            $storeId,
            $year,
            $month,
            $periode,
            $topLimit
        ): array {
            $ringkasan = laporan_ringkasan(
                $pdo,
                $storeId,
                $periode['start'],
                $periode['end']
            );
            $expenses = laporan_pengeluaran(
                $pdo,
                $storeId,
                $periode['start_date'],
                $periode['end_date']
            );
            $operatingExpenses = 0;

            foreach ($expenses as $expense) {
                $operatingExpenses += $expense['amount'];
            }

            $promoCosts = laporan_biaya_promo(
                $pdo,
                $storeId,
                $periode['start'],
                $periode['end']
            );
            $topProducts = laporan_produk_terlaris(
                $pdo,
                $storeId,
                $periode['start'],
                $periode['end'],
                $topLimit
            );

            $grossProfit = $ringkasan['net_revenue'] - $ringkasan['hpp'];
            $netProfit = $grossProfit - $operatingExpenses - $promoCosts;
            $netMargin = $ringkasan['net_revenue'] > 0
                ? round($netProfit / $ringkasan['net_revenue'] * 100, 2)
                : 0.0;

            $summary = [
                'gross_revenue'      => $ringkasan['gross_revenue'],
                'discounts'          => $ringkasan['discounts'],
                'net_revenue'        => $ringkasan['net_revenue'],
                'hpp'                => $ringkasan['hpp'],
                'gross_profit'       => $grossProfit,
                'operating_expenses' => $operatingExpenses,
                'promo_costs'        => $promoCosts,
                'net_profit'         => $netProfit,
                'net_margin'         => $netMargin,
            ];

            laporan_simpan(
                $pdo,
                $storeId,
                $year,
                $month,
                $summary,
                [
                    'top_products' => $topProducts,
                    'expenses'     => $expenses,
                ]
            );

            $row = laporan_ambil($pdo, $storeId, $year, $month);

            if ($row === null) {
                throw new LaporanException(
                    'SERVER_ERROR',
                    'Laporan gagal disimpan.',
                    500
                );
            }

            return laporan_format_row($row);
        }
    );
}
