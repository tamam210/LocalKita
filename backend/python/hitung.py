import math
import os
from decimal import Decimal, ROUND_HALF_UP

from flask import Flask, jsonify, request

app = Flask(__name__)


def pick(data, keys, default):
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def round2(value):
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def round_int(value):
    return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


@app.route("/hitung-hpp", methods=["POST"])
def hitung_hpp():
    try:
        data = request.get_json(silent=True) or {}

        unit_count = to_int(pick(data, ["unit_count", "units_produced"], 0))
        material_cost = to_int(data.get("material_cost"), 0)
        labor_cost = to_int(data.get("labor_cost"), 0)
        packaging_cost = to_int(data.get("packaging_cost"), 0)
        overhead_cost = to_int(data.get("overhead_cost"), 0)
        target_margin = to_float(pick(data, ["target_margin", "target_margin_percent"], 0))

        if target_margin > 1.0:
            target_margin = target_margin / 100.0

        if unit_count <= 0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Jumlah unit harus lebih dari 0",
            }), 400

        if min(material_cost, labor_cost, packaging_cost, overhead_cost) < 0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Biaya tidak boleh negatif",
            }), 400

        if target_margin < 0 or target_margin >= 1.0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Target margin harus >= 0 dan < 1.0",
            }), 400

        total_cost = material_cost + labor_cost + packaging_cost + overhead_cost
        hpp_per_unit = total_cost / unit_count
        suggested_price_float = hpp_per_unit / (1 - target_margin)
        suggested_price = int(math.ceil(suggested_price_float / 100.0) * 100)

        gross_profit_per_unit = suggested_price - hpp_per_unit
        margin_percent = (gross_profit_per_unit / suggested_price * 100) if suggested_price > 0 else 0
        markup_percent = (gross_profit_per_unit / hpp_per_unit * 100) if hpp_per_unit > 0 else 0

        return jsonify({
            "ok": True,
            "engine": "python",
            "data": {
                "total_cost": total_cost,
                "unit_count": unit_count,
                "hpp_per_unit": round_int(hpp_per_unit),
                "target_margin": target_margin,
                "suggested_price": suggested_price,
                "gross_profit_per_unit": int(gross_profit_per_unit),
                "margin_percent": round2(margin_percent),
                "markup_percent": round2(markup_percent),
            },
            "message": "HPP berhasil dihitung",
        }), 200

    except Exception as e:
        return jsonify({
            "ok": False,
            "error_code": "SERVER_ERROR",
            "message": f"Error: {str(e)}",
        }), 500


@app.route("/hitung-diskon", methods=["POST"])
def hitung_diskon():
    try:
        data = request.get_json(silent=True) or {}

        normal_price = to_int(pick(data, ["normal_price", "harga_normal"], 0))
        discount_percent = to_float(pick(data, ["discount_percent", "diskon_persen"], 0))
        quantity = to_int(pick(data, ["quantity", "qty", "jumlah"], 1))
        additional_cost = to_int(pick(data, ["additional_cost", "biaya_tambahan"], 0))
        hpp_per_unit = to_float(pick(data, ["hpp_per_unit", "hpp_unit"], 0))
        target_margin_percent = to_float(pick(data, ["target_margin_percent", "target_margin"], 0))

        if target_margin_percent > 1.0:
            target_margin_percent = target_margin_percent / 100.0

        if normal_price <= 0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Harga normal harus lebih dari 0",
            }), 400
        if quantity <= 0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Jumlah harus lebih dari 0",
            }), 400
        if discount_percent < 0 or discount_percent > 100:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Persentase diskon harus antara 0 dan 100",
            }), 400
        if hpp_per_unit < 0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "HPP per unit tidak boleh negatif",
            }), 400
        if additional_cost < 0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Biaya tambahan tidak boleh negatif",
            }), 400
        if target_margin_percent < 0 or target_margin_percent >= 1.0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Target margin harus >= 0 dan < 1.0",
            }), 400

        discount_amount_per_unit = round_int(normal_price * (discount_percent / 100))
        final_price_per_unit = normal_price - discount_amount_per_unit

        effective_cost_per_unit = hpp_per_unit + additional_cost
        profit_per_unit = final_price_per_unit - effective_cost_per_unit
        total_revenue = final_price_per_unit * quantity
        total_profit = profit_per_unit * quantity

        margin_percent = (profit_per_unit / final_price_per_unit * 100) if final_price_per_unit > 0 else 0

        max_discount_percent_safe = 0.0
        if normal_price > 0:
            max_discount_percent_safe = ((normal_price - effective_cost_per_unit) / normal_price) * 100
            if max_discount_percent_safe < 0:
                max_discount_percent_safe = 0.0
            if max_discount_percent_safe > 100:
                max_discount_percent_safe = 100.0

        target_price_per_unit = 0
        if target_margin_percent < 1.0:
            target_price_per_unit = effective_cost_per_unit / (1 - target_margin_percent)
        max_discount_percent_target = 0.0
        if normal_price > 0 and target_price_per_unit > 0:
            max_discount_percent_target = ((normal_price - target_price_per_unit) / normal_price) * 100
            if max_discount_percent_target < 0:
                max_discount_percent_target = 0.0
            if max_discount_percent_target > 100:
                max_discount_percent_target = 100.0

        status = "safe"
        warning_message = "Diskon aman dan memenuhi target margin."

        if profit_per_unit < 0:
            status = "loss"
            warning_message = "Perhatian! Promosi ini menghasilkan kerugian per unit."
        elif target_margin_percent > 0 and margin_percent < (target_margin_percent * 100):
            status = "below_target"
            warning_message = "Masih untung, tetapi margin di bawah target yang diinginkan."
        elif profit_per_unit == 0:
            status = "below_target"
            warning_message = "Impas (break even). Margin nol, tidak untung maupun rugi."
        elif target_margin_percent == 0 and profit_per_unit > 0:
            status = "safe"
            warning_message = "Diskon aman (tidak rugi)."

        return jsonify({
            "ok": True,
            "engine": "python",
            "data": {
                "normal_price": normal_price,
                "discount_percent": round2(discount_percent),
                "discount_amount_per_unit": discount_amount_per_unit,
                "final_price_per_unit": final_price_per_unit,
                "quantity": quantity,
                "additional_cost": additional_cost,
                "effective_hpp_per_unit": int(effective_cost_per_unit),
                "total_revenue": int(total_revenue),
                "profit_per_unit": int(profit_per_unit),
                "total_profit": int(total_profit),
                "margin_percent": round2(margin_percent),
                "target_margin_percent": round2(target_margin_percent * 100),
                "max_discount_percent_safe": round2(max_discount_percent_safe),
                "max_discount_percent_target": round2(max_discount_percent_target),
                "status": status,
                "warning": warning_message,
                "message": warning_message,
            },
            "message": "Simulasi diskon berhasil dihitung",
        }), 200

    except Exception as e:
        return jsonify({
            "ok": False,
            "error_code": "SERVER_ERROR",
            "message": f"Error: {str(e)}",
        }), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "status": "ok"}), 200


if __name__ == "__main__":
    port = to_int(os.environ.get("PORT"), 5001)
    app.run(host="0.0.0.0", port=port, debug=False)
