# -*- coding: utf-8 -*-
"""
Created on Wed Jul 2 10:38:36 2025
@author: msada
"""

import os
import io
import torch
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import matplotlib.pyplot as plt
import base64

from torchvision import transforms

# ========== Model Imports ==========
from resnet50_run import ForgeryResNet, convert_to_ela_image, eval_transform
from mvssnetrun import get_mvss
from deepfake_densenet import load_deepfake_model, classify_deepfake

# ========== Configurations ==========
RESNET_PATH = "./best_combined_resnet_model.pth"
MVSSNET_PATH_HIGH = "./defactomvssnet.pt"
MVSSNET_PATH_LOW = "./casiamvssnet.pt"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ========== Flask App Setup ==========
app = Flask(__name__)
CORS(app, origins=["*"])

# ========== Model Loaders ==========
resnet_model = None
deepfake_model = None
mvss_model_casia = None
mvss_model_defacto = None

def load_resnet():
    model = ForgeryResNet().to(DEVICE)
    model.load_state_dict(torch.load(RESNET_PATH, map_location=DEVICE))
    model.eval()
    return model

def load_mvssnet(model_path):
    model = get_mvss(
        backbone='resnet50',
        pretrained_base=True,
        nclass=1,
        sobel=True,
        constrain=True,
        n_input=3
    )
    state_dict = torch.load(model_path, map_location=DEVICE)
    model.load_state_dict(state_dict, strict=True)
    model = model.to(DEVICE)
    model.eval()
    return model

# ========== Prediction Pipelines ==========
def classify_image(pil_image: Image.Image):
    buffer = io.BytesIO()
    pil_image.save(buffer, format='PNG')
    buffer.seek(0)
    ela_image = convert_to_ela_image(buffer)
    input_tensor = eval_transform(ela_image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        prob = resnet_model(input_tensor).item()
        label = "Forged" if prob > 0.5 else "Authentic"
    return label, prob

def segment_with_mvssnet(image: Image.Image, model):
    transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor()
    ])
    input_tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        _, mask = model(input_tensor)

    mask = mask.squeeze().cpu().numpy()
    binary_mask = (mask > 0.5).astype(np.uint8)
    return mask, binary_mask

def array_to_base64(arr):
    fig, ax = plt.subplots()
    ax.imshow(arr, cmap='gray', vmin=0, vmax=1)
    ax.axis('off')
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode()
    plt.close(fig)
    return img_str

# ========== Routes ==========
@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_file = request.files["image"]
    image = Image.open(image_file.stream).convert("RGB")

    # DeepFake Check
    df_label, df_confidence = classify_deepfake(image, deepfake_model)

    result = {
        "deepfake": {
            "label": df_label,
            "confidence": round(df_confidence, 4)
        }
    }

    if df_label == "Fake":
        result["message"] = "DeepFake model flagged image as Fake. Skipping traditional forgery detection."
        return jsonify(result)

    # Traditional ELA + ResNet Check
    label, confidence = classify_image(image)
    result["resnet"] = {
        "label": label,
        "confidence": round(confidence, 4)
    }

    if label == "Forged":
        # Run segmentation with MVSSNet
        mask_casia, binary_mask_casia = segment_with_mvssnet(image, mvss_model_casia)
        mask_defacto, binary_mask_defacto = segment_with_mvssnet(image, mvss_model_defacto)

        result["segmentation"] = {
            "casia": {
                "predicted_mask": array_to_base64(mask_casia),
                "binary_mask": array_to_base64(binary_mask_casia)
            },
            "defacto": {
                "predicted_mask": array_to_base64(mask_defacto),
                "binary_mask": array_to_base64(binary_mask_defacto)
            }
        }

    return jsonify(result)

# ========== App Entrypoint ==========
if __name__ == "__main__":
    print("Loading models...")
    resnet_model = load_resnet()
    deepfake_model = load_deepfake_model()
    mvss_model_casia = load_mvssnet(MVSSNET_PATH_LOW)
    mvss_model_defacto = load_mvssnet(MVSSNET_PATH_HIGH)
    print("Models loaded. Starting Flask server...")
    app.run(host="0.0.0.0", port=5000, debug=True)
