import json
import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
IMAGE_SIZE = int(os.getenv("AI_GREEN_IMAGE_SIZE", "224"))

SPECIES_MODEL_TYPE = os.getenv("AI_GREEN_SPECIES_MODEL_TYPE", os.getenv("AI_GREEN_MODEL_TYPE", "yolo_cls")).lower()
SPECIES_MODEL_PATH = Path(
    os.getenv(
        "AI_GREEN_SPECIES_MODEL_PATH",
        os.getenv("AI_GREEN_MODEL_PATH", BASE_DIR / "models" / "species-yolo" / "train" / "weights" / "best.pt")
    )
)
SPECIES_CLASSES_PATH = Path(
    os.getenv(
        "AI_GREEN_SPECIES_CLASSES_PATH",
        os.getenv("AI_GREEN_CLASSES_PATH", BASE_DIR / "models" / "species-yolo" / "species_classes.json")
    )
)

DIAGNOSIS_MODEL_TYPE = os.getenv("AI_GREEN_DIAGNOSIS_MODEL_TYPE", "yolo_cls").lower()
DIAGNOSIS_MODEL_PATH = Path(
    os.getenv("AI_GREEN_DIAGNOSIS_MODEL_PATH", BASE_DIR / "models" / "diagnosis-yolo" / "train" / "weights" / "best.pt")
)
DIAGNOSIS_CLASSES_PATH = Path(
    os.getenv("AI_GREEN_DIAGNOSIS_CLASSES_PATH", BASE_DIR / "models" / "diagnosis-yolo" / "diagnosis_classes.json")
)

SPECIES_CLASSES = [
    "black_termite_mushroom",
    "lingzhi",
    "oyster_mushroom",
    "straw_mushroom",
    "wood_ear"
]

DIAGNOSIS_CLASSES = [
    "bacterial_rot",
    "black_mold",
    "green_mold",
    "healthy",
    "white_mold",
    "yellow_blotch"
]

SPECIES_ALIASES = {
    "oyster": "oyster_mushroom",
    "oyster_mushroom": "oyster_mushroom",
    "pleurotus": "oyster_mushroom",
    "pleurotus_ostreatus": "oyster_mushroom",
    "nam_bao_ngu": "oyster_mushroom",
    "bao_ngu": "oyster_mushroom",
    "nam_so": "oyster_mushroom",
    "lingzhi": "lingzhi",
    "linh_chi": "lingzhi",
    "nam_linh_chi": "lingzhi",
    "reishi": "lingzhi",
    "ganoderma": "lingzhi",
    "ganoderma_lucidum": "lingzhi",
    "black_termite_mushroom": "black_termite_mushroom",
    "termite_mushroom": "black_termite_mushroom",
    "termitomyces": "black_termite_mushroom",
    "nam_moi": "black_termite_mushroom",
    "nam_moi_den": "black_termite_mushroom",
    "straw_mushroom": "straw_mushroom",
    "volvariella": "straw_mushroom",
    "volvariella_volvacea": "straw_mushroom",
    "nam_rom": "straw_mushroom",
    "wood_ear": "wood_ear",
    "auricularia": "wood_ear",
    "auricularia_polytricha": "wood_ear",
    "moc_nhi": "wood_ear",
    "nam_meo": "wood_ear"
}

DIAGNOSIS_ALIASES = {
    "healthy": "healthy",
    "normal": "healthy",
    "green_mold": "green_mold",
    "green_mould": "green_mold",
    "trichoderma": "green_mold",
    "black_mold": "black_mold",
    "black_mould": "black_mold",
    "white_mold": "white_mold",
    "white_mould": "white_mold",
    "mold_white": "white_mold",
    "mould_white": "white_mold",
    "bacterial_rot": "bacterial_rot",
    "bacterial_blotch": "bacterial_rot",
    "bacterial_disease": "bacterial_rot",
    "yellow_blotch": "yellow_blotch",
    "yellow_spot": "yellow_blotch"
}

_tf_models = {}
_yolo_models = {}


def _normalize_label(label, aliases):
    normalized = str(label).strip().lower()
    normalized = normalized.replace(" ", "_").replace("-", "_")
    return aliases.get(normalized, normalized)


def _load_classes(classes_path, aliases, fallback):
    if classes_path.exists():
        with classes_path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict):
            data = data.get("classes") or data.get("species") or data.get("diagnosis") or data.get("names")

        if isinstance(data, dict):
            ordered = [
                data[key]
                for key in sorted(data, key=lambda value: int(value) if str(value).isdigit() else str(value))
            ]
            return [_normalize_label(item, aliases) for item in ordered]

        if isinstance(data, list):
            return [_normalize_label(item, aliases) for item in data]

    return fallback


def _prediction(label_key, allowed_classes, confidence, mock_mode=False, warning=None):
    normalized_label = label_key if label_key in allowed_classes else "unknown"
    return {
        "label": normalized_label,
        "confidence": float(confidence),
        "mock_mode": mock_mode,
        "warning": warning
    }


def _mock_species_predict(image_path):
    filename = Path(image_path).stem.lower().replace(" ", "_").replace("-", "_")

    for alias, species_id in SPECIES_ALIASES.items():
        if alias in filename:
            return _prediction(species_id, SPECIES_CLASSES, 0.86, mock_mode=True)

    return _prediction(
        "unknown",
        SPECIES_CLASSES,
        0.35,
        mock_mode=True,
        warning="Mock mode chỉ nhận dạng khi tên file có chứa tên loài nấm."
    )


def _mock_diagnosis_predict(image_path):
    filename = Path(image_path).stem.lower().replace(" ", "_").replace("-", "_")

    for alias, disease_id in DIAGNOSIS_ALIASES.items():
        if alias in filename:
            return _prediction(disease_id, DIAGNOSIS_CLASSES, 0.82, mock_mode=True)

    return _prediction(
        "unknown",
        DIAGNOSIS_CLASSES,
        0.30,
        mock_mode=True,
        warning="Mock mode chỉ nhận dạng bệnh khi tên file có chứa nhãn bệnh."
    )


def _predict_efficientnet(image_path, *, model_key, model_path, classes_path, aliases, allowed_classes):
    import numpy as np
    from PIL import Image
    from tensorflow.keras.models import load_model

    if model_key not in _tf_models:
        if not model_path.exists():
            raise FileNotFoundError(f"Không tìm thấy model EfficientNet: {model_path}")
        _tf_models[model_key] = load_model(model_path)

    classes = _load_classes(classes_path, aliases, allowed_classes)
    image = Image.open(image_path).convert("RGB").resize((IMAGE_SIZE, IMAGE_SIZE))
    batch = np.expand_dims(np.asarray(image, dtype="float32"), axis=0)
    preds = _tf_models[model_key].predict(batch, verbose=0)[0]
    top_idx = int(np.argmax(preds))
    label = classes[top_idx] if top_idx < len(classes) else "unknown"

    return _prediction(label, allowed_classes, preds[top_idx], mock_mode=False)


def _predict_yolo_classification(image_path, *, model_key, model_path, aliases, allowed_classes):
    from ultralytics import YOLO

    if model_key not in _yolo_models:
        if not model_path.exists():
            raise FileNotFoundError(f"Không tìm thấy model YOLO classification: {model_path}")
        _yolo_models[model_key] = YOLO(str(model_path))

    result = _yolo_models[model_key](str(image_path), verbose=False)[0]
    top_idx = int(result.probs.top1)
    confidence = float(result.probs.top1conf)
    raw_label = result.names[top_idx]
    label = _normalize_label(raw_label, aliases)

    return _prediction(label, allowed_classes, confidence, mock_mode=False)


def _unsupported_detection_model(purpose):
    return _prediction(
        "unknown",
        SPECIES_CLASSES if purpose == "species" else DIAGNOSIS_CLASSES,
        0.0,
        mock_mode=False,
        warning="Model YOLO detection cũ chỉ phát hiện vùng bất thường, không phù hợp cho classification."
    )


def _predict(
    image_path,
    *,
    purpose,
    model_type,
    model_path,
    classes_path,
    aliases,
    allowed_classes,
    mock_predictor
):
    if model_type == "efficientnet":
        return _predict_efficientnet(
            image_path,
            model_key=purpose,
            model_path=model_path,
            classes_path=classes_path,
            aliases=aliases,
            allowed_classes=allowed_classes
        )

    if model_type in {"yolo", "yolo_cls", "yolov8"}:
        return _predict_yolo_classification(
            image_path,
            model_key=purpose,
            model_path=model_path,
            aliases=aliases,
            allowed_classes=allowed_classes
        )

    if model_type in {"yolo_det", "yolo_detect", "detection"}:
        return _unsupported_detection_model(purpose)

    return mock_predictor(image_path)


def predict_species_image(image_path):
    prediction = _predict(
        image_path,
        purpose="species",
        model_type=SPECIES_MODEL_TYPE,
        model_path=SPECIES_MODEL_PATH,
        classes_path=SPECIES_CLASSES_PATH,
        aliases=SPECIES_ALIASES,
        allowed_classes=SPECIES_CLASSES,
        mock_predictor=_mock_species_predict
    )
    prediction["species_id"] = prediction.pop("label")
    return prediction


def predict_diagnosis_image(image_path):
    prediction = _predict(
        image_path,
        purpose="diagnosis",
        model_type=DIAGNOSIS_MODEL_TYPE,
        model_path=DIAGNOSIS_MODEL_PATH,
        classes_path=DIAGNOSIS_CLASSES_PATH,
        aliases=DIAGNOSIS_ALIASES,
        allowed_classes=DIAGNOSIS_CLASSES,
        mock_predictor=_mock_diagnosis_predict
    )
    prediction["diagnosis_id"] = prediction.pop("label")
    return prediction


def get_model_status():
    return {
        "species_model": {
            "model_type": SPECIES_MODEL_TYPE,
            "model_path": str(SPECIES_MODEL_PATH),
            "model_exists": SPECIES_MODEL_PATH.exists(),
            "classes_path": str(SPECIES_CLASSES_PATH),
            "classes_exists": SPECIES_CLASSES_PATH.exists(),
            "supported_species": SPECIES_CLASSES
        },
        "diagnosis_model": {
            "model_type": DIAGNOSIS_MODEL_TYPE,
            "model_path": str(DIAGNOSIS_MODEL_PATH),
            "model_exists": DIAGNOSIS_MODEL_PATH.exists(),
            "classes_path": str(DIAGNOSIS_CLASSES_PATH),
            "classes_exists": DIAGNOSIS_CLASSES_PATH.exists(),
            "supported_diagnosis": DIAGNOSIS_CLASSES,
            "generic_mold_logic": "green_mold, black_mold and white_mold are diagnosed as generic disease classes across mushroom species."
        }
    }

def preload_models():
    """Load model ngay khi app khởi động, tránh user đầu tiên phải chờ lâu."""
    try:
        if SPECIES_MODEL_TYPE in {"yolo", "yolo_cls", "yolov8"} and SPECIES_MODEL_PATH.exists():
            from ultralytics import YOLO
            _yolo_models["species"] = YOLO(str(SPECIES_MODEL_PATH))
            print("[preload] Đã load species model thành công")
    except Exception as e:
        print(f"[preload] Lỗi load species model: {e}")

    try:
        if DIAGNOSIS_MODEL_TYPE in {"yolo", "yolo_cls", "yolov8"} and DIAGNOSIS_MODEL_PATH.exists():
            from ultralytics import YOLO
            _yolo_models["diagnosis"] = YOLO(str(DIAGNOSIS_MODEL_PATH))
            print("[preload] Đã load diagnosis model thành công")
    except Exception as e:
        print(f"[preload] Lỗi load diagnosis model: {e}")