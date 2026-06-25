# Deploy Render

Ban release nay co the deploy len Render theo kieu **mot Python Web Service**:

- FastAPI serve giao dien web tai `/`
- API AI nam cung domain:
  - `POST /analyze`
  - `POST /diagnose`
  - `GET /health`

## Cach 1: Dung render.yaml

Day folder `release_webnhakinh_ai_green` len GitHub repository rieng, sau do tren Render chon:

```text
New -> Blueprint -> Connect repository
```

Render se doc file `render.yaml`.

## Cach 2: Tao Web Service thu cong

Neu tao thu cong:

```text
Environment: Python
Build Command: cd ai_backend && pip install -r requirements-api.txt
Start Command: cd ai_backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

## Sau khi deploy

Mo URL Render cap, vi du:

```text
https://webnhakinh-ai-green.onrender.com
```

Khong can chay rieng cong 5500 hay 8000 tren may local.

## Luu y

- Goi Python phai cai `ultralytics`, Render se keo them `torch`, nen lan build dau co the lau.
- Neu dung plan qua yeu, lan dau goi AI co the cham vi model YOLO phai load vao RAM.
- Frontend da tu nhan biet moi truong:
  - Localhost thi goi `http://127.0.0.1:8000`
  - Render/domain that thi goi API cung domain, vi du `/analyze`
