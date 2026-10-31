from flask import Flask, request, jsonify
import math

app = Flask(__name__)

@app.route("/hitung-hpp", methods=["POST"])
def hitung_hpp():
    try:
        data = request.get_json(silent=True) or {}

        unit_count = int(data.get("unit_count") or data.get("units_produced") or 0)
        material_cost = int(data.get("material_cost") or 0)
        labor_cost = int(data.get("labor_cost") or 0)
        packaging_cost = int(data.get("packaging_cost") or 0)
        overhead_cost = int(data.get("overhead_cost") or 0)
        target_margin = float(data.get("target_margin") or data.get("target_margin_percent") or 0)

        if target_margin > 1.0:
            target_margin = target_margin / 100.0

        if unit_count <= 0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Jumlah unit harus lebih dari 0"
            }), 400

        if target_margin < 0 or target_margin >= 1.0:
            return jsonify({
                "ok": False,
                "error_code": "VALIDATION_ERROR",
                "message": "Target margin harus >= 0 dan < 1.0"
            }), 400

        total_cost = material_cost + labor_cost + packaging_cost + overhead_cost
        hpp_per_unit = total_cost / unit_count if unit_count > 0 else 0

        if target_margin >= 1.0:
            suggested_price = 0
        else:
            suggested_price_float = hpp_per_unit / (1 - target_margin)
            suggested_price = int(math.ceil(suggested_price_float / 100.0) * 100)

        if suggested_price > 0 and hpp_per_unit > 0:
            gross_profit_per_unit = suggested_price - hpp_per_unit
            margin_percent = (gross_profit_per_unit / suggested_price) * 100
            markup_percent = (gross_profit_per_unit / hpp_per_unit) * 100
        else:
            gross_profit_per_unit = 0
            margin_percent = 0.0
            markup_percent = 0.0

        return jsonify({
            "ok": True,
            "engine": "python",
            "data": {
                "total_cost": total_cost,
                "unit_count": unit_count,
                "hpp_per_unit": int(round(hpp_per_unit)),
                "target_margin": target_margin,
                "suggested_price": suggested_price,
                "gross_profit_per_unit": int(gross_profit_per_unit),
                "margin_percent": round(margin_percent, 2),
                "markup_percent": round(markup_percent, 2)
            },
            "message": "HPP berhasil dihitung"
        }), 200

    except Exception as e:
        return jsonify({
            "ok": False,
            "error_code": "SERVER_ERROR",
            "message": f"Error: {str(e)}"
        }), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "status": "ok"}), 200

@app.route("/hitung-diskon", methods=["POST"])
def hitung_diskon():
    try:
        data = request.get_json(silent=True) or {}

        normal_price = int(data.get("normal_price") or data.get("harga_normal") or 0)
        discount_percent = float(data.get("discount_percent") or data.get("diskon_persen") or 0)
        quantity = int(data.get("quantity") or data.get("qty") or data.get("jumlah") or 1)
        additional_cost = int(data.get("additional_cost") or data.get("biaya_tambahan") or 0)
        hpp_per_unit = float(data.get("hpp_per_unit") or data.get("hpp_unit") or 0)
        target_margin_percent = float(data.get("target_margin_percent") or data.get("target_margin") or 0)

        if target_margin_percent > 1.0:
            target_margin_percent = target_margin_percent / 100.0

        if normal_price <= 0:
            return jsonify({"ok": False, "error_code": "VALIDATION_ERROR", "message": "Harga normal harus lebih dari 0"}), 400
        if quantity <= 0:
            return jsonify({"ok": False, "error_code": "VALIDATION_ERROR", "message": "Jumlah harus lebih dari 0"}), 400
        if discount_percent < 0 or discount_percent > 100:
            return jsonify({"ok": False, "error_code": "VALIDATION_ERROR", "message": "Persentase diskon harus antara 0 dan 100"}), 400
        if hpp_per_unit < 0:
            return jsonify({"ok": False, "error_code": "VALIDATION_ERROR", "message": "HPP per unit tidak boleh negatif"}), 400
        if target_margin_percent < 0 or target_margin_percent >= 1.0:
            return jsonify({"ok": False, "error_code": "VALIDATION_ERROR", "message": "Target margin harus >= 0 dan < 1.0"}), 400

        discount_amount_per_unit = int(round(normal_price * (discount_percent / 100)))
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
                "discount_percent": round(discount_percent, 2),
                "discount_amount_per_unit": discount_amount_per_unit,
                "final_price_per_unit": final_price_per_unit,
                "quantity": quantity,
                "additional_cost": additional_cost,
                "effective_hpp_per_unit": effective_cost_per_unit,
                "total_revenue": total_revenue,
                "profit_per_unit": profit_per_unit,
                "total_profit": total_profit,
                "margin_percent": round(margin_percent, 2),
                "target_margin_percent": round(target_margin_percent * 100, 2),
                "max_discount_percent_safe": round(max_discount_percent_safe, 2),
                "max_discount_percent_target": round(max_discount_percent_target, 2),
                "status": status,
                "warning": warning_message,
                "message": warning_message
            },
            "message": "Simulasi diskon berhasil dihitung"
        }), 200

    except Exception as e:
        return jsonify({"ok": False, "error_code": "SERVER_ERROR", "message": f"Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)