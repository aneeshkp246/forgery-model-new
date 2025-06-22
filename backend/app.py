from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
import tensorflow as tf
import io

app = Flask(__name__)
CORS(app, origins=['*'])

# Load your trained model here
model = tf.keras.models.load_model('final_model.h5')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part in request"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        image = Image.open(io.BytesIO(file.read())).convert("RGB")
        image = image.resize((256, 256))  # Match your model's expected input size
        image = np.array(image).astype("float32") / 255.0
        image = np.expand_dims(image, axis=0)

        # Predict
        prediction = model.predict(image)[0]
        predicted_class = int(np.argmax(prediction))
        confidence = float(np.max(prediction))  # Convert np.float32 to native float

        label_map = {0: 'Real', 1: 'Fake'}
        predicted_label = label_map.get(predicted_class, "Unknown")

        return jsonify({
            "label": predicted_label,
            "confidence": confidence
        })

    except Exception as e:
        print("Error during prediction:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
