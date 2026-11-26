"""Baseline EfficientNet-B0 + temperature scaling untuk confidence material.

Siapkan data/materials/NAMA_KELAS/*.jpg.
Untuk evaluasi yang benar, pisahkan foto barang yang sama dari train/validation/test.
"""
import json
from pathlib import Path
import torch
from torch import nn
from torch.utils.data import DataLoader, random_split, Subset
from torchvision import datasets, models, transforms

ROOT = Path("data/materials")
Path("models").mkdir(exist_ok=True)
device = "cuda" if torch.cuda.is_available() else "cpu"
train_tf = transforms.Compose([
    transforms.Resize((224,224)), transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10), transforms.ToTensor(),
    transforms.Normalize([.485,.456,.406],[.229,.224,.225])
])
eval_tf = transforms.Compose([
    transforms.Resize((224,224)), transforms.ToTensor(),
    transforms.Normalize([.485,.456,.406],[.229,.224,.225])
])
if not ROOT.exists():
    raise SystemExit("Buat folder data/materials dan subfolder per kelas material.")
base = datasets.ImageFolder(ROOT)
if len(base.classes) < 2 or len(base) < 20:
    raise SystemExit("Minimal dua kelas dan disarankan jauh lebih banyak dari 20 gambar.")
labels = base.classes
n = len(base)
n_train, n_val = int(.7*n), int(.15*n)
n_test = n - n_train - n_val
train_idx, val_idx, _ = random_split(range(n), [n_train,n_val,n_test], generator=torch.Generator().manual_seed(42))
train_ds = datasets.ImageFolder(ROOT, transform=train_tf)
val_ds = datasets.ImageFolder(ROOT, transform=eval_tf)
train_loader = DataLoader(Subset(train_ds, train_idx.indices), batch_size=16, shuffle=True, num_workers=0)
val_loader = DataLoader(Subset(val_ds, val_idx.indices), batch_size=16, shuffle=False, num_workers=0)

model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(labels))
model.to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
loss_fn = nn.CrossEntropyLoss()
for epoch in range(8):
    model.train()
    losses = []
    for x, y in train_loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        loss = loss_fn(model(x), y)
        loss.backward()
        optimizer.step()
        losses.append(loss.item())
    print(f"Epoch {epoch+1}/8 - loss {sum(losses)/max(1,len(losses)):.4f}")

model.eval()
logits_list, target_list = [], []
with torch.no_grad():
    for x, y in val_loader:
        logits_list.append(model(x.to(device)).cpu())
        target_list.append(y)
logits, targets = torch.cat(logits_list), torch.cat(target_list)
log_t = nn.Parameter(torch.zeros(1))
opt = torch.optim.LBFGS([log_t], lr=.01, max_iter=100)
def closure():
    opt.zero_grad()
    loss = loss_fn(logits / torch.exp(log_t).clamp(.05,20), targets)
    loss.backward()
    return loss
opt.step(closure)
temperature = float(torch.exp(log_t).clamp(.05,20).detach())
torch.save({"model_state_dict": model.cpu().state_dict(), "temperature": temperature}, "models/material_classifier.pt")
Path("models/material_labels.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")
print("Model disimpan. Labels:", labels, "| temperature:", temperature)
print("Catatan: evaluasi test terpisah tetap wajib sebelum penggunaan produksi.")
