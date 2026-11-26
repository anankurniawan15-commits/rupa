"""Klien HTTP Groq & Gemini Text dengan rotasi API Key (Round-Robin + Cooldown).
Digunakan khusus untuk teks saran pengolahan barang, copywriting listing, dan ringkasan —
BUKAN untuk pengenalan gambar.
"""
import json
import threading
import time
import requests
from python_ai.config import settings

DEFAULT_TEXT_FALLBACK = "openai/gpt-oss-120b"


def extract_json(raw_text: str) -> dict:
    if not raw_text:
        raise ValueError("Respons AI kosong.")
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "", 1).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise ValueError("Respons AI bukan JSON yang valid.")


class _RotatingPool:
    def __init__(self, default_cooldown_sec: float = 60.0):
        self._lock = threading.Lock()
        self._cursor = 0
        self._cooldowns: dict[str, float] = {}
        self._default_cooldown = default_cooldown_sec

    def order_keys(self, keys: list[str]) -> list[str]:
        if len(keys) <= 1:
            return list(keys)
        now = time.monotonic()
        with self._lock:
            start = self._cursor % len(keys)
            self._cursor = (self._cursor + 1) % len(keys)
            rotated = [keys[(start + i) % len(keys)] for i in range(len(keys))]
            healthy = []
            cooling = []
            for k in rotated:
                until = self._cooldowns.get(k, 0.0)
                if until > now:
                    cooling.append((until, k))
                else:
                    self._cooldowns.pop(k, None)
                    healthy.append(k)
            cooling.sort(key=lambda x: x[0])
            return healthy + [k for _, k in cooling]

    def mark_cooldown(self, key: str, duration_sec: float | None = None) -> None:
        sec = max(1.0, duration_sec or self._default_cooldown)
        with self._lock:
            self._cooldowns[key] = time.monotonic() + sec

    def clear(self, key: str) -> None:
        with self._lock:
            self._cooldowns.pop(key, None)


_groq_pool = _RotatingPool(60.0)
_gemini_pool = _RotatingPool(60.0)
_provider_lock = threading.Lock()
_provider_cursor = 0


def _post_groq_chat(api_key: str, messages: list[dict], model: str, use_json_format: bool, timeout_sec: int) -> requests.Response:
    payload: dict = {
        "model": model,
        "messages": messages,
        "temperature": 0.25,
    }
    if use_json_format:
        payload["response_format"] = {"type": "json_object"}
    return requests.post(
        settings.base_url.rstrip("/") + "/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=timeout_sec,
    )


def _ask_groq_text(messages: list[dict], model: str, fallback_models: list[str] | None, timeout_sec: int) -> dict:
    keys = settings.groq_api_keys
    if not keys:
        raise RuntimeError("GROQ_API_KEY / GROQ_API_KEYS belum diisi.")

    candidates: list[str] = []
    for m in [model, *(fallback_models or [])]:
        if m and m not in candidates:
            candidates.append(m)

    last_exc: Exception | None = None
    for api_key in _groq_pool.order_keys(keys):
        for idx, candidate in enumerate(candidates):
            try:
                response = _post_groq_chat(api_key, messages, candidate, True, timeout_sec)
                if response.status_code == 400:
                    response_no_json = _post_groq_chat(api_key, messages, candidate, False, timeout_sec)
                    if response_no_json.ok:
                        _groq_pool.clear(api_key)
                        return extract_json(response_no_json.json()["choices"][0]["message"]["content"])
                    response = response_no_json

                if response.status_code in (401, 402, 403, 429) or response.status_code >= 500:
                    cd = 300.0 if response.status_code in (401, 403) else 60.0
                    _groq_pool.mark_cooldown(api_key, cd)
                    last_exc = RuntimeError(f"Groq HTTP {response.status_code}")
                    break  # Rotasi langsung ke key Groq berikutnya

                if response.status_code in (400, 404) and idx + 1 < len(candidates):
                    continue

                response.raise_for_status()
                _groq_pool.clear(api_key)
                return extract_json(response.json()["choices"][0]["message"]["content"])
            except requests.RequestException as e:
                _groq_pool.mark_cooldown(api_key, 15.0)
                last_exc = e
                break

    raise RuntimeError(f"Semua key Groq gagal: {last_exc}")


def _ask_gemini_text(prompt: str, timeout_sec: int) -> dict:
    keys = settings.gemini_api_keys
    if not keys:
        raise RuntimeError("GEMINI_API_KEY / GEMINI_API_KEYS belum diisi.")

    model = settings.gemini_text_model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    last_exc: Exception | None = None
    for api_key in _gemini_pool.order_keys(keys):
        try:
            response = requests.post(
                url,
                headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
                json=payload,
                timeout=timeout_sec,
            )
            if response.status_code in (401, 402, 403, 429) or response.status_code >= 500:
                cd = 300.0 if response.status_code in (401, 403) else 60.0
                _gemini_pool.mark_cooldown(api_key, cd)
                last_exc = RuntimeError(f"Gemini HTTP {response.status_code}")
                continue

            response.raise_for_status()
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            _gemini_pool.clear(api_key)
            return extract_json(text)
        except (requests.RequestException, KeyError, IndexError, ValueError) as e:
            _gemini_pool.mark_cooldown(api_key, 15.0)
            last_exc = e

    raise RuntimeError(f"Semua key Gemini gagal: {last_exc}")


def _provider_order() -> list[str]:
    global _provider_cursor
    avail = []
    if settings.groq_api_keys:
        avail.append("groq")
    if settings.gemini_api_keys:
        avail.append("gemini")
    if len(avail) <= 1:
        return avail
    with _provider_lock:
        idx = _provider_cursor % 2
        _provider_cursor += 1
    return ["groq", "gemini"] if idx == 0 else ["gemini", "groq"]


def has_text_llm_keys() -> bool:
    return bool(settings.groq_api_keys or settings.gemini_api_keys)


def ask_text(prompt: str) -> dict:
    providers = _provider_order()
    if not providers:
        raise RuntimeError("Tidak ada GROQ_API_KEY(S) atau GEMINI_API_KEY(S) yang terisi.")

    timeout_sec = max(settings.request_timeout, 8)
    last_exc: Exception | None = None
    for p in providers:
        try:
            if p == "groq":
                return _ask_groq_text([{"role": "user", "content": prompt}], settings.text_model, [DEFAULT_TEXT_FALLBACK], timeout_sec)
            return _ask_gemini_text(prompt, timeout_sec)
        except Exception as e:
            last_exc = e
    raise RuntimeError(f"Rotasi Groq/Gemini Teks gagal: {last_exc}")
