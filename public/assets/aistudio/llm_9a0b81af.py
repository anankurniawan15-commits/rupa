import base64, json, requests
from rupa_ai.config import settings

def request_ai(messages, model):
    if not settings.api_key:
        raise RuntimeError("GROQ_API_KEY belum diisi pada file .env.")
    try:
        response = requests.post(
            settings.base_url.rstrip("/") + "/chat/completions",
            headers={"Authorization": f"Bearer {settings.api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "temperature": 0.2,
                  "response_format": {"type": "json_object"}},
            timeout=settings.timeout,
        )
        response.raise_for_status()
        return json.loads(response.json()["choices"][0]["message"]["content"])
    except requests.Timeout as e:
        raise RuntimeError("Analisis melewati batas waktu. Silakan coba lagi.") from e
    except (requests.RequestException, KeyError, ValueError) as e:
        raise RuntimeError(f"Permintaan AI gagal: {e}") from e

def ask_text(prompt):
    return request_ai([{"role": "user", "content": prompt}], settings.text_model)

def ask_vision(image_bytes, mime_type, prompt):
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    content = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}"}}
    ]
    return request_ai([{"role": "user", "content": content}], settings.vision_model)
