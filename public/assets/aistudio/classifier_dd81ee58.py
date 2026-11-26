import json
import torch
from PIL import Image
from torchvision import models, transforms
from rupa_ai.config import settings

transform = transforms.Compose([
    transforms.Resize(256), transforms.CenterCrop(224), transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def classify(image):
    if not settings.model_path.exists() or not settings.labels_path.exists():
        raise FileNotFoundError("Classifier belum dilatih.")
    checkpoint = torch.load(settings.model_path, map_location="cpu", weights_only=False)
    labels = json.loads(settings.labels_path.read_text(encoding="utf-8"))
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(labels))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    temperature = max(float(checkpoint.get("temperature", 1.0)), 1e-6)
    with torch.inference_mode():
        logits = model(transform(image.convert("RGB")).unsqueeze(0)) / temperature
        probs = torch.softmax(logits, dim=1)[0]
    score, index = torch.max(probs, dim=0)
    return {"label": labels[int(index)], "confidence": float(score) * 100}
