import json
import tempfile
from copy import deepcopy
from pathlib import Path
from model_runner import get_model_status, predict_diagnosis_image, predict_species_image, preload_models
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from model_runner import get_model_status, predict_diagnosis_image, predict_species_image


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent
KNOWLEDGE_PATH = BASE_DIR / "knowledge_base.json"
PUBLIC_FILES = {"index.html", "app.js", "style.css", "logo.png"}

app = FastAPI(title="AI_Green API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


def load_knowledge():
    with KNOWLEDGE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


KNOWLEDGE = load_knowledge()


def resolve_species_advice(species_id):
    mushrooms = KNOWLEDGE.get("mushrooms", {})
    advice = deepcopy(mushrooms.get(species_id) or KNOWLEDGE["unknown"])
    advice["species_id"] = species_id if species_id in mushrooms else "unknown"
    return advice


def resolve_diagnosis_advice(diagnosis_id):
    diagnosis = KNOWLEDGE.get("diagnosis", {})
    advice = deepcopy(diagnosis.get(diagnosis_id) or diagnosis.get("unknown", {}))
    advice["diagnosis_id"] = diagnosis_id if diagnosis_id in diagnosis else "unknown"
    return advice


async def save_upload_to_temp(image):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gửi lên phải là ảnh.")

    source_name = Path(image.filename or "image.jpg")
    suffix = source_name.suffix or ".jpg"
    prefix = f"{source_name.stem[:40]}_"

    with tempfile.NamedTemporaryFile(delete=False, prefix=prefix, suffix=suffix) as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.write(await image.read())

    return temp_path


@app.get("/health")
def health():
    return {"ok": True, "service": "AI_Green API", **get_model_status()}


@app.get("/")
def frontend_index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    temp_path = await save_upload_to_temp(image)

    try:
        prediction = predict_species_image(temp_path)
        species_id = prediction["species_id"]
        advice = resolve_species_advice(species_id)

        return {
            "species_id": advice["species_id"],
            "species_name": advice["name_vi"],
            "scientific_name": advice.get("scientific_name", ""),
            "confidence": prediction["confidence"],
            "mock_mode": prediction.get("mock_mode", False),
            "warning": prediction.get("warning"),
            "advice": advice
        }
    finally:
        temp_path.unlink(missing_ok=True)


@app.post("/diagnose")
async def diagnose(image: UploadFile = File(...)):
    temp_path = await save_upload_to_temp(image)

    try:
        prediction = predict_diagnosis_image(temp_path)
        diagnosis_id = prediction["diagnosis_id"]
        advice = resolve_diagnosis_advice(diagnosis_id)

        return {
            "diagnosis_id": advice["diagnosis_id"],
            "diagnosis_name": advice.get("name_vi", "Chưa xác định"),
            "confidence": prediction["confidence"],
            "mock_mode": prediction.get("mock_mode", False),
            "warning": prediction.get("warning"),
            "advice": advice
        }
    finally:
        temp_path.unlink(missing_ok=True)


@app.get("/{asset_path:path}")
def frontend_asset(asset_path: str):
    if asset_path not in PUBLIC_FILES:
        raise HTTPException(status_code=404, detail="Not found")

    path = FRONTEND_DIR / asset_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(path)

###
@app.on_event("startup")
def startup_event():
    preload_models()