#!/usr/bin/env python3
"""
Tiny CLIP embedding server for Vibe ID.

Why: when PERSON_MATCHING=clip in the backend, anonymous reads call this
to get a 512-dim embedding of the uploaded photo. We then dedupe by
cosine similarity so the same person taking different photos lands on
the same archetype.

Setup (once):
    cd vibe-id-backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r scripts/requirements.txt
    python scripts/embed-server.py

Defaults to http://127.0.0.1:5050. The Node backend reads EMBED_URL
from .env. Apple Silicon (M1/M2/M3/M4/M5) uses MPS automatically.
"""
import base64
import io
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json

import torch
import open_clip
from PIL import Image

PORT = int(os.environ.get("PORT", "5050"))
HOST = os.environ.get("HOST", "127.0.0.1")
MODEL_NAME = os.environ.get("CLIP_MODEL", "ViT-B-32")
PRETRAINED = os.environ.get("CLIP_PRETRAINED", "openai")

if torch.backends.mps.is_available():
    DEVICE = "mps"
elif torch.cuda.is_available():
    DEVICE = "cuda"
else:
    DEVICE = "cpu"

print(f"[embed-server] loading {MODEL_NAME}/{PRETRAINED} on {DEVICE}...", file=sys.stderr)
model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED)
model = model.to(DEVICE).eval()
print(f"[embed-server] ready on http://{HOST}:{PORT}", file=sys.stderr)


def embed(image_b64: str) -> list[float]:
    raw = base64.b64decode(image_b64)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    tensor = preprocess(img).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        feats = model.encode_image(tensor)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.squeeze(0).cpu().tolist()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802
        if self.path != "/embed":
            self.send_error(404, "not found")
            return
        length = int(self.headers.get("content-length", 0))
        try:
            body = json.loads(self.rfile.read(length))
            b64 = body["imageBase64"]
            if b64.startswith("data:"):
                b64 = b64.split(",", 1)[1]
            embedding = embed(b64)
        except Exception as exc:
            self.send_response(400)
            self.send_header("content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode())
            return
        payload = json.dumps({"embedding": embedding}).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):  # noqa: N802
        if self.path == "/health":
            payload = json.dumps({"ok": True, "model": MODEL_NAME, "device": DEVICE}).encode()
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_error(404)

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write("[embed-server] " + fmt % args + "\n")


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[embed-server] shutting down", file=sys.stderr)
        server.shutdown()


if __name__ == "__main__":
    main()
