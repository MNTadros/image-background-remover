from flask import Flask, request, send_file, render_template, jsonify
import os
import json
from werkzeug.utils import secure_filename
import subprocess
import base64

app = Flask(__name__, static_folder='static', template_folder='templates')

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({ "success": False, "message": "No image uploaded" }), 400

    image_file = request.files['image']
    filename = secure_filename(image_file.filename)
    base_name = os.path.splitext(filename)[0]  # remove extension
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    output_path = os.path.join(UPLOAD_FOLDER, f"processed_{base_name}.png")  # enforce PNG

    image_file.save(input_path)

    try:
        result = subprocess.run(
            ['python', 'vision_processor.py', input_path, output_path],
            capture_output=True,
            text=True
        )

        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)

        if result.returncode != 0:
            return jsonify({
                "success": False,
                "message": "Processing failed",
                "error": result.stderr
            }), 500

        try:
            analysis = json.loads(result.stdout)
        except json.JSONDecodeError:
            analysis = { "success": False, "message": "Invalid JSON from Python" }

        if not os.path.exists(output_path):
            print("❌ Processed file not found:", output_path)
            return jsonify({
                "success": False,
                "message": "Processed image not found"
            }), 500

        with open(output_path, 'rb') as f:
            img_data = f.read()

        # Cleanup
        os.remove(input_path)
        os.remove(output_path)

        return jsonify({
            "success": True,
            "processedImage": base64.b64encode(img_data).decode('utf-8'),
            "analysis": analysis
        })

    except Exception as e:
        print("Unhandled Exception:", e)
        return jsonify({ "success": False, "message": str(e) }), 500

if __name__ == '__main__':
    app.run(debug=True)
