import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ================== Define Model Class ==================
class DeepFakeModel(nn.Module):
    def __init__(self, base_model):
        super(DeepFakeModel, self).__init__()
        self.features = base_model
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc1 = nn.Linear(1024, 512)
        self.bn1 = nn.BatchNorm1d(512)
        self.dropout = nn.Dropout(0.3)
        self.output = nn.Linear(512, 1)

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x)
        x = torch.flatten(x, 1)
        x = torch.relu(self.fc1(x))
        x = self.bn1(x)
        x = self.dropout(x)
        x = torch.sigmoid(self.output(x))
        return x

# ================== LOAD MODEL ==================
def load_deepfake_model(model_path="./modelfinal.weights.pth"):
    base_model = models.densenet121(pretrained=False).features
    model = DeepFakeModel(base_model).to(DEVICE)
    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model.eval()
    return model

# ================== INFERENCE ==================
def classify_deepfake(pil_image: Image.Image, model):
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
    ])
    tensor = transform(pil_image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        prob = model(tensor).item()
        label = "Real" if prob > 0.5 else "Fake"
    return label, prob
