import torch
import torch.nn as nn
from torchvision import transforms
from torchvision.models import resnet50, ResNet50_Weights
from PIL import Image, ImageEnhance, ImageChops
import matplotlib.pyplot as plt
import io

# ========== Configuration ==========
MODEL_PATH = r"./best_combined_resnet_model.pth"
# IMAGE_PATH = r"D:\copymove_img\img1\0_000000001311.tif"   
IMG_SIZE = 256
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("🖥️ Using device:", DEVICE)

# ========== Step 1: Define Model ==========
class ForgeryResNet(nn.Module):
    def __init__(self):
        super(ForgeryResNet, self).__init__()
        self.base_model = resnet50(weights=ResNet50_Weights.DEFAULT)

        # Freeze all layers
        for param in self.base_model.parameters():
            param.requires_grad = False

        # Unfreeze layer4
        for param in self.base_model.layer4.parameters():
            param.requires_grad = True

        # Replace FC
        self.base_model.fc = nn.Sequential(
            nn.Linear(self.base_model.fc.in_features, 256),
            nn.ReLU(),
            nn.Dropout(0.25),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.base_model(x)

# ========== Step 2: Load Trained Weights ==========
model = ForgeryResNet().to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()

# ========== Step 3: ELA Preprocessing ==========
def convert_to_ela_image(image_path, quality=90):
    original_image = Image.open(image_path).convert('RGB')
    buffer = io.BytesIO()
    original_image.save(buffer, 'JPEG', quality=quality)
    buffer.seek(0)
    compressed_image = Image.open(buffer)
    ela_image = ImageChops.difference(original_image, compressed_image)
    extrema = ela_image.getextrema()
    max_diff = max([ex[1] for ex in extrema])
    scale = 255.0 / max_diff if max_diff != 0 else 1
    ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)
    ela_image = ela_image.resize((IMG_SIZE, IMG_SIZE))
    return ela_image

# ========== Step 4: Transform ==========
eval_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# ========== Step 5: Predict and Show ==========
def predict_and_display(image_path):
    ela_image = convert_to_ela_image(image_path)
    input_tensor = eval_transform(ela_image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        output = model(input_tensor).item()
        label = "Forged" if output > 0.5 else "Authentic"
        confidence = output

    # 🔍 Display using matplotlib
    plt.figure(figsize=(5, 5))
    plt.imshow(ela_image)
    plt.axis('off')
    plt.title(f"{label} (Confidence: {confidence:.4f})", fontsize=14, color='green' if label == "Authentic" else 'red')
    plt.show()

# ========== Run ==========
# predict_and_display(IMAGE_PATH)