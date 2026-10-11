import io
import base64
import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
import qrcode

def generate_code128_base64(value: str) -> str:
    """Generates a Code128 barcode image with human-readable text as a base64 encoded PNG data URI."""
    try:
        clean_val = str(value).strip().upper()
        if not clean_val:
            clean_val = "INVENIQ-000"

        # 1. Render barcode bars without internal text
        raw_fp = io.BytesIO()
        code128_class = barcode.get_barcode_class('code128')
        c128 = code128_class(clean_val, writer=ImageWriter())
        c128.write(raw_fp, options={
            'module_width': 0.3,
            'module_height': 15.0,
            'quiet_zone': 4.0,
            'write_text': False
        })

        raw_fp.seek(0)
        barcode_img = Image.open(raw_fp)

        # 2. Add text caption below the barcode
        extra_h = 24
        combined_img = Image.new('RGB', (barcode_img.width, barcode_img.height + extra_h), 'white')
        combined_img.paste(barcode_img, (0, 0))

        draw = ImageDraw.Draw(combined_img)
        font = ImageFont.load_default()

        # Center text
        bbox = draw.textbbox((0, 0), clean_val, font=font)
        text_w = bbox[2] - bbox[0]
        x_pos = max(10, (barcode_img.width - text_w) // 2)
        y_pos = barcode_img.height + 4
        draw.text((x_pos, y_pos), clean_val, fill='black', font=font)

        # 3. Export to Base64 PNG
        out_fp = io.BytesIO()
        combined_img.save(out_fp, format='PNG')
        encoded = base64.b64encode(out_fp.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{encoded}"
    except Exception as e:
        return ""

def generate_qrcode_base64(value: str) -> str:
    """Generates a 2D QR code as a base64 encoded PNG data URI."""
    try:
        clean_val = str(value).strip()
        if not clean_val:
            clean_val = "INVENIQ"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=6,
            border=2,
        )
        qr.add_data(clean_val)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        fp = io.BytesIO()
        img.save(fp, format="PNG")
        encoded = base64.b64encode(fp.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{encoded}"
    except Exception:
        return ""

def generate_barcode_bundle(sku: str, name: str) -> dict:
    """Returns the bundled BarcodeResponse matching frontend requirements."""
    return {
        "sku": sku,
        "name": name,
        "barcodeBase64": generate_code128_base64(sku),
        "qrCodeBase64": generate_qrcode_base64(sku)
    }
