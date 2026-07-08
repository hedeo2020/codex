import base64
import io
import json
import sys

import face_recognition
import numpy
from PIL import Image


def fail(message: str, code: int = 1) -> None:
    print(json.dumps({"ok": False, "error": message}))
    raise SystemExit(code)


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        fail("No image payload was provided.")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        fail("Input payload was not valid JSON.")

    image_data = payload.get("imageDataUrl", "")
    if not isinstance(image_data, str) or ";base64," not in image_data:
        fail("A valid image data URL is required.")

    _, encoded = image_data.split(";base64,", 1)

    try:
        image_bytes = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        fail("The captured image could not be decoded.")

    encodings = face_recognition.face_encodings(numpy.array(image))
    if not encodings:
        fail("No face was detected. Use a clearer, front-facing image.")
    if len(encodings) > 1:
        fail("Multiple faces were detected. Capture only one face per image.")

    embedding = [float(value) for value in encodings[0].tolist()]
    print(json.dumps({"ok": True, "embedding": embedding}))


if __name__ == "__main__":
    main()
