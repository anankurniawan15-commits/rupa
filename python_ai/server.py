"""FastAPI Server untuk menjembatani model AI Python CRISP-DM ke Web Next.js RUPA."""
from __future__ import annotations

import base64
import json
from typing import Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from python_ai.config import settings
from python_ai.listing import generate_listing
from python_ai.sortir import analyze_item

app = FastAPI(title="RUPA AI CRISP-DM Service", version=settings.crisp_dm_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SortirBody(BaseModel):
    imageDataUrl: Optional[str] = None
    description: Optional[str] = None


class ListingBody(BaseModel):
    task: Optional[str] = "titles"
    title: Optional[str] = ""
    draft: Optional[str] = ""
    matOrigin: Optional[str] = ""
    cond: Optional[str] = ""
    process: Optional[str] = ""
    price: Optional[Union[str, int]] = None


def _decode_data_url(data_url: str) -> bytes:
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    return base64.b64decode(raw)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "crisp_dm_version": settings.crisp_dm_version,
        "classifier_ready": settings.model_path.exists() and settings.labels_path.exists(),
    }


@app.get("/crisp-dm/report")
def crisp_dm_report():
    if not settings.eval_report_path.exists():
        return {"status": "not_trained", "message": "Jalankan `python -m python_ai.crisp_dm_pipeline` untuk menghasilkan laporan CRISP-DM."}
    return json.loads(settings.eval_report_path.read_text(encoding="utf-8"))


@app.post("/api/sortir")
def api_sortir(body: SortirBody):
    if not body.imageDataUrl and not (body.description or "").strip():
        raise HTTPException(status_code=400, detail="Masukkan gambar atau deskripsi barang.")
    image_bytes = _decode_data_url(body.imageDataUrl) if body.imageDataUrl else None
    try:
        return analyze_item(image_bytes=image_bytes, description=body.description)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/listing-assist")
def api_listing_assist(body: ListingBody):
    name = body.title or body.draft or "Produk Upcycle"
    material = body.matOrigin or "Bahan Bekas"
    try:
        return generate_listing(
            name=name,
            material=material,
            condition=body.cond or "baru",
            process=body.process or body.draft or "",
            price=body.price,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
