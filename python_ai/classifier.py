"""Inference classifier Computer Vision CRISP-DM (EfficientNetV2-S, EfficientNet-B0, ConvNeXt-Tiny, ResNet-50, MobileNetV3)."""
import json
from functools import lru_cache
import torch
from PIL import Image
from torchvision import models, transforms
from python_ai.config import settings

EVAL_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# Pemetaan kelas ImageNet-1k pretrained ke 8 kategori material RUPA (fallback jika model CRISP-DM lokal belum dilatih)
IMAGENET_TO_MATERIAL = {
    "Tekstil": ["jean", "jersey", "cardigan", "sweatshirt", "trench coat", "abaya", "kimono", "apron", "velvet", "wool", "sock", "backpack", "mailbag", "pillow", "quilt", "handkerchief", "dishcloth", "bath towel"],
    "Plastik": ["water bottle", "pop bottle", "pill bottle", "plastic bag", "bucket", "nipple", "soap dispenser", "lotion", "hair spray", "syringe", "tub"],
    "Kertas": ["carton", "envelope", "book jacket", "comic book", "menu", "binder", "toilet tissue", "paper towel", "origami", "packet"],
    "Kaca": ["beer glass", "beer bottle", "wine bottle", "goblet", "beaker", "hourglass", "perfume", "pitcher", "spotlight", "vase", "mixing bowl", "sunglass"],
    "Logam": ["ashcan", "can opener", "frying pan", "wok", "caldron", "teapot", "coffeepot", "ladle", "spatula", "strainer", "screw", "nail", "hammer", "wrench", "padlock", "safety pin", "barrel"],
    "Kayu": ["folding chair", "rocking chair", "dining table", "desk", "park bench", "bookcase", "wardrobe", "wooden spoon", "crate", "clog", "barrel", "chest"],
    "Karet": ["car wheel", "tire", "rubber eraser", "sandal", "running shoe", "plunger", "hose", "balloon"],
}


def _create_model(backbone: str, num_classes: int):
    key = (backbone or "efficientnet_v2_s").strip().lower()
    if key == "efficientnet_b0":
        m = models.efficientnet_b0(weights=None)
        m.classifier[1] = torch.nn.Linear(m.classifier[1].in_features, num_classes)
        return m, "efficientnet_b0"
    if key == "convnext_tiny":
        m = models.convnext_tiny(weights=None)
        m.classifier[2] = torch.nn.Linear(m.classifier[2].in_features, num_classes)
        return m, "convnext_tiny"
    if key == "resnet50":
        m = models.resnet50(weights=None)
        m.fc = torch.nn.Linear(m.fc.in_features, num_classes)
        return m, "resnet50"
    if key == "mobilenet_v3_large":
        m = models.mobilenet_v3_large(weights=None)
        m.classifier[3] = torch.nn.Linear(m.classifier[3].in_features, num_classes)
        return m, "mobilenet_v3_large"
    m = models.efficientnet_v2_s(weights=None)
    m.classifier[1] = torch.nn.Linear(m.classifier[1].in_features, num_classes)
    return m, "efficientnet_v2_s"


@lru_cache(maxsize=1)
def load_classifier():
    if not settings.model_path.exists() or not settings.labels_path.exists():
        raise FileNotFoundError("Classifier CRISP-DM lokal belum dilatih (models/material_classifier.pt tidak ditemukan).")

    labels = json.loads(settings.labels_path.read_text(encoding="utf-8"))
    try:
        checkpoint = torch.load(settings.model_path, map_location="cpu", weights_only=True)
    except TypeError:
        checkpoint = torch.load(settings.model_path, map_location="cpu")

    state_dict = checkpoint.get("model_state_dict") or checkpoint.get("state_dict") or checkpoint
    state_dict = {k.replace("module.", "", 1): v for k, v in state_dict.items()}

    metadata = {}
    if settings.metadata_path.exists():
        metadata = json.loads(settings.metadata_path.read_text(encoding="utf-8"))

    backbone = checkpoint.get("backbone") or metadata.get("backbone") or "efficientnet_b0"
    model, backbone_name = _create_model(backbone, len(labels))
    model.load_state_dict(state_dict)
    model.eval()

    temperature = max(float(checkpoint.get("temperature", 1.0)), 1e-6)
    return model, labels, temperature, metadata, backbone_name


@lru_cache(maxsize=1)
def _load_pretrained_backbone():
    weights = models.EfficientNet_V2_S_Weights.DEFAULT
    model = models.efficientnet_v2_s(weights=weights)
    model.eval()
    categories = weights.meta["categories"]
    preprocess = weights.transforms()
    return model, categories, preprocess, "efficientnet_v2_s_imagenet"


def _map_imagenet_label(name: str) -> str:
    lower = name.lower()
    for material, keywords in IMAGENET_TO_MATERIAL.items():
        if any(kw in lower for kw in keywords):
            return material
    return "Lainnya / Campuran"


def classify_pretrained(image: Image.Image) -> dict:
    model, categories, preprocess, backbone_name = _load_pretrained_backbone()
    tensor = preprocess(image.convert("RGB")).unsqueeze(0)
    with torch.inference_mode():
        probs = torch.softmax(model(tensor), dim=1)[0]
    top_vals, top_idx = torch.topk(probs, k=5)

    material_scores: dict[str, float] = {}
    detected_objects: list[str] = []
    for val, idx in zip(top_vals.tolist(), top_idx.tolist()):
        obj_name = categories[int(idx)]
        detected_objects.append(obj_name)
        mat = _map_imagenet_label(obj_name)
        material_scores[mat] = material_scores.get(mat, 0.0) + float(val)

    best_mat, best_score = max(material_scores.items(), key=lambda x: x[1])
    return {
        "label": best_mat,
        "confidence": round(min(max(best_score * 100.0, 45.0), 90.0), 2),
        "detected_objects": detected_objects[:3],
        "backbone": backbone_name,
        "calibrated": False,
        "crisp_dm_version": settings.crisp_dm_version,
        "passed_evaluation_gate": False,
    }


def classify(image: Image.Image) -> dict:
    try:
        model, labels, temperature, metadata, backbone_name = load_classifier()
        tensor = EVAL_TRANSFORM(image.convert("RGB")).unsqueeze(0)
        with torch.inference_mode():
            logits = model(tensor) / temperature
            probs = torch.softmax(logits, dim=1)[0]
        score, index = torch.max(probs, dim=0)
        top2_vals, top2_idx = torch.topk(probs, k=min(2, len(labels)))
        return {
            "label": labels[int(index)],
            "confidence": round(float(score) * 100.0, 2),
            "top_predictions": [
                {"label": labels[int(i)], "confidence": round(float(v) * 100.0, 2)}
                for v, i in zip(top2_vals.tolist(), top2_idx.tolist())
            ],
            "temperature": temperature,
            "backbone": backbone_name,
            "calibrated": True,
            "crisp_dm_version": metadata.get("crisp_dm_version", settings.crisp_dm_version),
            "passed_evaluation_gate": metadata.get("passed_business_criteria"),
        }
    except FileNotFoundError:
        return classify_pretrained(image)
