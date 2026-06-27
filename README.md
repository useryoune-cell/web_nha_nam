# Webnhakinh / AI_Green

Dashboard nhà kính có module AI_Green để nhận ảnh nấm và chạy 2 luồng riêng:

- `Tư vấn cây trồng`: nhận dạng loại nấm, sau đó tư vấn có trồng được không, môi trường, nước, ánh sáng, thông gió, giá thể và thu hoạch.
- `Chẩn đoán bệnh`: nhận dạng lớp bệnh chung và gợi ý xử lý ban đầu. `green_mold`, `black_mold` và `white_mold` được chẩn đoán chung cho mọi loại nấm, không khóa theo từng loài.

## Cấu trúc chính

```text
Webnhakinh/
├── index.html
├── app.js
├── style.css
├── ai_backend/
│   ├── main.py
│   ├── model_runner.py
│   ├── knowledge_base.json
│   ├── requirements-api.txt
│   ├── requirements-train.txt
│   ├── train_yolo_cls.py
│   └── models/
│       ├── species-yolo/
│       └── diagnosis-yolo/
├── datasets_processed/
├── data/
└── test/
    ├── species/
    └── diagnosis/
```

## Model hiện có

Model nhận dạng loài:

```text
ai_backend/models/species-yolo/train/weights/best.pt
ai_backend/models/species-yolo/species_classes.json
```

Các lớp loài nấm:

```text
black_termite_mushroom
enoki_mushroom
lingzhi
oyster_mushroom
shiitake_mushroom
straw_mushroom
wood_ear
```

Model chẩn đoán bệnh:

```text
ai_backend/models/diagnosis-yolo/train/weights/best.pt
ai_backend/models/diagnosis-yolo/diagnosis_classes.json
```

Các lớp bệnh:

```text
bacterial_rot
black_mold
green_mold
healthy
white_mold
yellow_blotch
```

## Cài thư viện

Mở PowerShell tại thư mục project:

```powershell
cd "D:\CONG_VIIEC\Kho Lưu Trữ 1\Webnhakinh"
```

Tạo môi trường Python trong ổ D của project:

```powershell
cd ai_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-api.txt
pip install ultralytics
```

Nếu cần train lại model thì cài thêm:

```powershell
pip install -r requirements-train.txt
```

## Chạy backend AI

Terminal 1:

```powershell
cd "D:\CONG_VIIEC\Kho Lưu Trữ 1\Webnhakinh\ai_backend"
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Kiểm tra backend:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health | ConvertTo-Json -Depth 6
```

API chính:

```text
POST http://127.0.0.1:8000/analyze   -> tư vấn cây trồng
POST http://127.0.0.1:8000/diagnose  -> chẩn đoán bệnh
```

## Chạy giao diện web

Terminal 2:

```powershell
cd "D:\CONG_VIIEC\Kho Lưu Trữ 1\Webnhakinh"
python -m http.server 5500 --bind 127.0.0.1
```

Mở trình duyệt:

```text
http://127.0.0.1:5500/index.html
```

Trong giao diện, bấm `AI_Green`, chọn ảnh hoặc mở camera, rồi chọn tab:

- `Tư vấn cây trồng`
- `Chẩn đoán bệnh`

## Ảnh test nhanh

Folder test đã có mỗi lớp 1 ảnh:

```text
test/species/
├── black_termite_mushroom.jpg
├── enoki_mushroom.jpg
├── lingzhi.jpg
├── oyster_mushroom.jpg
├── shiitake_mushroom.jpg
├── straw_mushroom.jpg
└── wood_ear.jpg

test/diagnosis/
├── bacterial_rot.jpg
├── black_mold.jpg
├── green_mold.jpg
├── healthy.jpg
├── white_mold.jpg
└── yellow_blotch.jpg
```

Test API bằng PowerShell/curl:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/analyze" `
  -F "image=@D:\CONG_VIIEC\Kho Lưu Trữ 1\Webnhakinh\test\species\oyster_mushroom.jpg"

curl.exe -X POST "http://127.0.0.1:8000/diagnose" `
  -F "image=@D:\CONG_VIIEC\Kho Lưu Trữ 1\Webnhakinh\test\diagnosis\green_mold.jpg"
```

## Train lại model nhận dạng loài

Dataset split nằm ở:

```text
datasets_processed/species_cls_split/
├── train/
├── val/
└── test/
```

Train:

```powershell
cd "D:\CONG_VIIEC\Kho Lưu Trữ 1\Webnhakinh\ai_backend"
.\.venv\Scripts\Activate.ps1
python train_yolo_cls.py `
  --data-dir ..\datasets_processed\species_cls_split `
  --output-dir models\species-yolo `
  --epochs 12 `
  --image-size 224 `
  --batch-size 16 `
  --classes-file species_classes.json
```

Model tốt nhất sẽ nằm ở:

```text
ai_backend/models/species-yolo/train/weights/best.pt
```

## Train lại model chẩn đoán bệnh

Dataset split nằm ở:

```text
datasets_processed/diagnosis_cls_split/
├── train/
├── val/
└── test/
```

Train:

```powershell
cd "D:\CONG_VIIEC\Kho Lưu Trữ 1\Webnhakinh\ai_backend"
.\.venv\Scripts\Activate.ps1
python train_yolo_cls.py `
  --data-dir ..\datasets_processed\diagnosis_cls_split `
  --output-dir models\diagnosis-yolo `
  --epochs 5 `
  --image-size 224 `
  --batch-size 16 `
  --classes-file diagnosis_classes.json
```

Model tốt nhất sẽ nằm ở:

```text
ai_backend/models/diagnosis-yolo/train/weights/best.pt
```

## Cấu hình model bằng biến môi trường

Mặc định backend đã trỏ tới 2 model YOLO trong `ai_backend/models/`. Nếu muốn đổi đường dẫn:

```powershell
$env:AI_GREEN_SPECIES_MODEL_PATH="models\species-yolo\train\weights\best.pt"
$env:AI_GREEN_SPECIES_CLASSES_PATH="models\species-yolo\species_classes.json"
$env:AI_GREEN_DIAGNOSIS_MODEL_PATH="models\diagnosis-yolo\train\weights\best.pt"
$env:AI_GREEN_DIAGNOSIS_CLASSES_PATH="models\diagnosis-yolo\diagnosis_classes.json"
```

Sau khi đổi biến môi trường, chạy lại backend.
