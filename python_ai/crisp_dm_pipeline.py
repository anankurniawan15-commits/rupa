"""
Pipeline Training & Evaluasi RUPA AI berbasis 6 Fase CRISP-DM:
  1. Business Understanding  -> Definisi tujuan bisnis, ambang confidence (60%), target Macro-F1 & ECE.
  2. Data Understanding      -> Audit kelas, gambar rusak/corrupt, rasio ketidakseimbangan, deteksi duplikat (MD5).
  3. Data Preparation        -> Deduplikasi bebas leakage, Stratified Group Split (70/15/15), class weights, augmentasi.
  4. Modeling                -> EfficientNet-B0 (weighted CrossEntropy + best validation checkpoint + early stopping) + Temperature Scaling.
  5. Evaluation              -> Uji penuh di Test Set (Accuracy, Macro-F1, Confusion Matrix, ECE sebelum/sesudah kalibrasi, Selective Accuracy @60%).
  6. Deployment              -> Ekspor artefak model terkalibrasi + metadata & laporan CRISP-DM ke models/.

Jalankan dari root proyek:
  python -m python_ai.crisp_dm_pipeline
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

from python_ai.config import settings

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".jfif"}


def _md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ==========================================================
# FASE 1: BUSINESS UNDERSTANDING
# ==========================================================

def phase_1_business_understanding() -> dict[str, Any]:
    return {
        "phase": "1_business_understanding",
        "version": settings.crisp_dm_version,
        "objectives": [
            "Mengklasifikasikan foto barang bekas ke 8 kategori material RUPA + status verifikasi manual.",
            "Menghindari skor keyakinan palsu dari LLM dengan memakai probabilitas terkalibrasi (Temperature Scaling).",
            "Mewajibkan pemeriksaan manual jika confidence < 60% atau terjadi perbedaan prediksi Vision LLM vs Classifier.",
            "Memastikan AI Listing tidak mengeluarkan klaim lingkungan absolut tanpa bukti.",
        ],
        "success_criteria": {
            "min_macro_f1": settings.min_macro_f1_target,
            "max_ece": settings.max_ece_target,
            "confidence_threshold": settings.confidence_threshold,
            "min_price_comparables": settings.min_price_comparables,
        },
    }


# ==========================================================
# FASE 2: DATA UNDERSTANDING
# ==========================================================

def phase_2_data_understanding(root: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not root.exists():
        raise SystemExit(
            f"Folder dataset '{root}' belum ditemukan. Siapkan subfolder per kelas material (Tekstil, Plastik, Kertas, Kaca, Logam, Kayu, Karet, Lainnya - Campuran)."
        )

    valid_records: list[dict[str, Any]] = []
    corrupt_files: list[str] = []
    hash_to_classes: dict[str, set[str]] = defaultdict(set)
    class_counts: Counter[str] = Counter()

    for class_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        label = class_dir.name
        for file_path in sorted(class_dir.rglob("*")):
            if not file_path.is_file() or file_path.suffix.lower() not in VALID_EXTENSIONS:
                continue
            try:
                with Image.open(file_path) as img:
                    img.verify()
                file_hash = _md5(file_path)
                hash_to_classes[file_hash].add(label)
                valid_records.append({
                    "path": str(file_path),
                    "label": label,
                    "hash": file_hash,
                })
                class_counts[label] += 1
            except (UnidentifiedImageError, OSError, ValueError):
                corrupt_files.append(str(file_path))

    duplicate_hashes = sum(1 for h, classes in hash_to_classes.items() if sum(1 for r in valid_records if r["hash"] == h) > 1)
    cross_class_duplicates = sum(1 for classes in hash_to_classes.values() if len(classes) > 1)
    counts = list(class_counts.values())
    imbalance_ratio = round(max(counts) / max(1, min(counts)), 2) if counts else 0.0

    report = {
        "phase": "2_data_understanding",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_root": str(root),
        "total_valid_images": len(valid_records),
        "total_corrupt_images": len(corrupt_files),
        "corrupt_samples": corrupt_files[:20],
        "num_classes": len(class_counts),
        "class_distribution": dict(class_counts),
        "imbalance_ratio": imbalance_ratio,
        "duplicate_content_groups": duplicate_hashes,
        "cross_class_leakage_risks": cross_class_duplicates,
    }
    settings.model_dir.mkdir(parents=True, exist_ok=True)
    settings.data_report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return valid_records, report


# ==========================================================
# FASE 3: DATA PREPARATION (ANTI-LEAKAGE STRATIFIED SPLIT)
# ==========================================================

class ImagePathDataset(Dataset):
    def __init__(self, records: list[dict[str, Any]], label_to_idx: dict[str, int], transform: transforms.Compose):
        self.records = records
        self.label_to_idx = label_to_idx
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int):
        rec = self.records[idx]
        with Image.open(rec["path"]) as img:
            tensor = self.transform(img.convert("RGB"))
        return tensor, self.label_to_idx[rec["label"]]


TRAIN_TRANSFORM = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(12),
    transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

EVAL_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def phase_3_data_preparation(records: list[dict[str, Any]], seed: int = 42):
    # Deduplikasi hash identik agar tidak ada kebocoran antar split
    seen_hashes: set[str] = set()
    clean_records: list[dict[str, Any]] = []
    for rec in records:
        if rec["hash"] in seen_hashes:
            continue
        seen_hashes.add(rec["hash"])
        clean_records.append(rec)

    labels = sorted({r["label"] for r in clean_records})
    if len(labels) < 2 or len(clean_records) < 30:
        raise SystemExit("Minimal dibutuhkan 2 kelas dan minimal 30 gambar unik yang valid untuk menjalankan CRISP-DM.")

    label_to_idx = {lbl: i for i, lbl in enumerate(labels)}
    y = np.array([label_to_idx[r["label"]] for r in clean_records])
    groups = np.array([r["hash"] for r in clean_records])
    indices = np.arange(len(clean_records))

    # StratifiedGroupKFold 5-fold: ~80% train_val, ~20% test, lalu split train_val menjadi ~70/15/15
    sgkf_outer = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=seed)
    train_val_idx, test_idx = next(sgkf_outer.split(indices, y, groups))

    sgkf_inner = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=seed + 1)
    rel_train_idx, rel_val_idx = next(sgkf_inner.split(train_val_idx, y[train_val_idx], groups[train_val_idx]))
    train_idx = train_val_idx[rel_train_idx]
    val_idx = train_val_idx[rel_val_idx]

    train_records = [clean_records[i] for i in train_idx]
    val_records = [clean_records[i] for i in val_idx]
    test_records = [clean_records[i] for i in test_idx]

    train_counts = Counter(r["label"] for r in train_records)
    total_train = max(1, len(train_records))
    class_weights = torch.tensor(
        [total_train / (len(labels) * max(1, train_counts[lbl])) for lbl in labels],
        dtype=torch.float32,
    )

    train_loader = DataLoader(ImagePathDataset(train_records, label_to_idx, TRAIN_TRANSFORM), batch_size=16, shuffle=True, num_workers=0)
    val_loader = DataLoader(ImagePathDataset(val_records, label_to_idx, EVAL_TRANSFORM), batch_size=16, shuffle=False, num_workers=0)
    test_loader = DataLoader(ImagePathDataset(test_records, label_to_idx, EVAL_TRANSFORM), batch_size=16, shuffle=False, num_workers=0)

    prep_summary = {
        "phase": "3_data_preparation",
        "deduplicated_total": len(clean_records),
        "removed_duplicates": len(records) - len(clean_records),
        "splits": {
            "train": len(train_records),
            "validation": len(val_records),
            "test": len(test_records),
        },
        "labels": labels,
        "class_weights": [round(float(w), 4) for w in class_weights.tolist()],
    }
    return train_loader, val_loader, test_loader, labels, class_weights, prep_summary


# ==========================================================
# FASE 4: MODELING + TEMPERATURE SCALING
# ==========================================================

def _collect_logits(model: nn.Module, loader: DataLoader, device: str):
    model.eval()
    logits_list, target_list = [], []
    with torch.inference_mode():
        for x, y in loader:
            logits_list.append(model(x.to(device)).cpu())
            target_list.append(y)
    return torch.cat(logits_list), torch.cat(target_list)


def build_backbone(name: str, num_classes: int, pretrained: bool = True) -> tuple[nn.Module, str]:
    key = (name or "efficientnet_v2_s").strip().lower()
    if key == "efficientnet_b0":
        m = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT if pretrained else None)
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, num_classes)
        return m, "efficientnet_b0"
    if key == "convnext_tiny":
        m = models.convnext_tiny(weights=models.ConvNeXt_Tiny_Weights.DEFAULT if pretrained else None)
        m.classifier[2] = nn.Linear(m.classifier[2].in_features, num_classes)
        return m, "convnext_tiny"
    if key == "resnet50":
        m = models.resnet50(weights=models.ResNet50_Weights.DEFAULT if pretrained else None)
        m.fc = nn.Linear(m.fc.in_features, num_classes)
        return m, "resnet50"
    if key == "mobilenet_v3_large":
        m = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.DEFAULT if pretrained else None)
        m.classifier[3] = nn.Linear(m.classifier[3].in_features, num_classes)
        return m, "mobilenet_v3_large"
    # Default: EfficientNetV2-S (Tan & Le, ICML 2021) — akurasi tertinggi untuk klasifikasi material/limbah
    m = models.efficientnet_v2_s(weights=models.EfficientNet_V2_S_Weights.DEFAULT if pretrained else None)
    m.classifier[1] = nn.Linear(m.classifier[1].in_features, num_classes)
    return m, "efficientnet_v2_s"


def phase_4_modeling(
    train_loader: DataLoader,
    val_loader: DataLoader,
    labels: list[str],
    class_weights: torch.Tensor,
    epochs: int = 12,
    patience: int = 4,
    backbone: str | None = None,
):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, backbone_name = build_backbone(backbone or settings.vision_backbone, len(labels), pretrained=True)
    model.to(device)

    loss_fn = nn.CrossEntropyLoss(weight=class_weights.to(device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=1.5e-4, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_f1 = -1.0
    best_state = None
    no_improve = 0
    history: list[dict[str, float]] = []

    for epoch in range(1, epochs + 1):
        model.train()
        train_losses: list[float] = []
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            loss = loss_fn(model(x), y)
            loss.backward()
            optimizer.step()
            train_losses.append(float(loss.item()))
        scheduler.step()

        val_logits, val_targets = _collect_logits(model, val_loader, device)
        val_preds = torch.argmax(val_logits, dim=1).numpy()
        val_f1 = float(f1_score(val_targets.numpy(), val_preds, average="macro", zero_division=0))
        avg_train_loss = sum(train_losses) / max(1, len(train_losses))
        history.append({"epoch": epoch, "train_loss": round(avg_train_loss, 4), "val_macro_f1": round(val_f1, 4)})
        print(f"[Modeling] Epoch {epoch}/{epochs} | train_loss={avg_train_loss:.4f} | val_macro_f1={val_f1:.4f}")

        if val_f1 > best_f1:
            best_f1 = val_f1
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"[Modeling] Early stopping pada epoch {epoch} (best val_macro_f1={best_f1:.4f}).")
                break

    if best_state is not None:
        model.load_state_dict(best_state)

    # Kalibrasi Temperature Scaling pada validation logits
    val_logits, val_targets = _collect_logits(model, val_loader, device)
    nll_fn = nn.CrossEntropyLoss()
    log_t = nn.Parameter(torch.zeros(1))
    opt = torch.optim.LBFGS([log_t], lr=0.01, max_iter=100)

    def closure():
        opt.zero_grad()
        t = torch.exp(log_t).clamp(0.05, 20.0)
        loss = nll_fn(val_logits / t, val_targets)
        loss.backward()
        return loss

    opt.step(closure)
    temperature = float(torch.exp(log_t).clamp(0.05, 20.0).detach())

    return model, temperature, {
        "backbone": backbone_name,
        "best_val_macro_f1": round(best_f1, 4),
        "temperature": round(temperature, 4),
        "history": history,
    }


# ==========================================================
# FASE 5: EVALUATION (HELD-OUT TEST SET + CALIBRATION + GATE)
# ==========================================================

def _compute_ece(probs: np.ndarray, targets: np.ndarray, n_bins: int = 10) -> float:
    confidences = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    accuracies = (predictions == targets).astype(float)
    bin_bounds = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (confidences > bin_bounds[i]) & (confidences <= bin_bounds[i + 1])
        if mask.any():
            ece += (mask.sum() / len(targets)) * abs(accuracies[mask].mean() - confidences[mask].mean())
    return float(ece)


def phase_5_evaluation(
    model: nn.Module,
    temperature: float,
    test_loader: DataLoader,
    labels: list[str],
    threshold_pct: float = 60.0,
) -> dict[str, Any]:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    logits, targets = _collect_logits(model, test_loader, device)
    y_true = targets.numpy()

    raw_probs = torch.softmax(logits, dim=1).numpy()
    cal_probs = torch.softmax(logits / temperature, dim=1).numpy()

    y_pred = cal_probs.argmax(axis=1)
    max_conf_pct = cal_probs.max(axis=1) * 100.0

    accuracy = float((y_pred == y_true).mean())
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    ece_before = _compute_ece(raw_probs, y_true)
    ece_after = _compute_ece(cal_probs, y_true)

    accepted = max_conf_pct >= threshold_pct
    coverage = float(accepted.mean())
    selective_acc = float((y_pred[accepted] == y_true[accepted]).mean()) if accepted.any() else 0.0

    report_dict = classification_report(
        y_true,
        y_pred,
        labels=list(range(len(labels))),
        target_names=labels,
        output_dict=True,
        zero_division=0,
    )
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(labels)))).tolist()

    passed = (
        macro_f1 >= settings.min_macro_f1_target
        and ece_after <= settings.max_ece_target
    )

    return {
        "phase": "5_evaluation",
        "test_samples": int(len(y_true)),
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "ece_before_calibration": round(ece_before, 4),
        "ece_after_calibration": round(ece_after, 4),
        "threshold_pct": threshold_pct,
        "auto_accept_coverage": round(coverage, 4),
        "selective_accuracy_above_threshold": round(selective_acc, 4),
        "confusion_matrix": cm,
        "per_class_report": report_dict,
        "passed_business_criteria": passed,
    }


# ==========================================================
# FASE 6: DEPLOYMENT ARTIFACTS
# ==========================================================

def phase_6_deployment(
    model: nn.Module,
    temperature: float,
    labels: list[str],
    business_spec: dict[str, Any],
    data_report: dict[str, Any],
    prep_summary: dict[str, Any],
    modeling_summary: dict[str, Any],
    eval_report: dict[str, Any],
):
    settings.model_dir.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_state_dict": model.cpu().state_dict(),
            "temperature": temperature,
            "backbone": modeling_summary.get("backbone", settings.vision_backbone),
            "crisp_dm_version": settings.crisp_dm_version,
        },
        settings.model_path,
    )
    settings.labels_path.write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")

    metadata = {
        "phase": "6_deployment",
        "crisp_dm_version": settings.crisp_dm_version,
        "backbone": modeling_summary.get("backbone", settings.vision_backbone),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "labels": labels,
        "temperature": round(temperature, 4),
        "confidence_threshold": settings.confidence_threshold,
        "passed_business_criteria": eval_report["passed_business_criteria"],
        "metrics": {
            "accuracy": eval_report["accuracy"],
            "macro_f1": eval_report["macro_f1"],
            "ece_after_calibration": eval_report["ece_after_calibration"],
            "selective_accuracy_above_threshold": eval_report["selective_accuracy_above_threshold"],
        },
    }
    settings.metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    full_report = {
        "methodology": "CRISP-DM",
        "business_understanding": business_spec,
        "data_understanding": data_report,
        "data_preparation": prep_summary,
        "modeling": modeling_summary,
        "evaluation": eval_report,
        "deployment": metadata,
    }
    settings.eval_report_path.write_text(json.dumps(full_report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n=== CRISP-DM SELESAI ===")
    print(f"Model: {settings.model_path}")
    print(f"Evaluasi Test Set -> Macro-F1: {eval_report['macro_f1']} | ECE: {eval_report['ece_after_calibration']} | Lolos Kriteria Bisnis: {eval_report['passed_business_criteria']}")


def run_crisp_dm(epochs: int = 12):
    print("[1/6] Business Understanding...")
    business_spec = phase_1_business_understanding()

    print("[2/6] Data Understanding...")
    records, data_report = phase_2_data_understanding(settings.materials_dir)

    print("[3/6] Data Preparation...")
    train_loader, val_loader, test_loader, labels, class_weights, prep_summary = phase_3_data_preparation(records)

    print("[4/6] Modeling & Temperature Scaling...")
    model, temperature, modeling_summary = phase_4_modeling(train_loader, val_loader, labels, class_weights, epochs=epochs)

    print("[5/6] Evaluation on Held-Out Test Set...")
    eval_report = phase_5_evaluation(model, temperature, test_loader, labels, threshold_pct=settings.confidence_threshold)

    print("[6/6] Deployment Artifacts...")
    phase_6_deployment(model, temperature, labels, business_spec, data_report, prep_summary, modeling_summary, eval_report)


if __name__ == "__main__":
    run_crisp_dm()
