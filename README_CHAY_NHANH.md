# Chay nhanh Webnhakinh / AI_Green

Folder nay la ban rut gon de chay web va test AI, khong kem dataset train.

## 1. Cai backend

```powershell
cd path\to\release_webnhakinh_ai_green\ai_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-api.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Neu PowerShell chan activate:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 2. Chay web

Mo PowerShell thu hai:

```powershell
cd path\to\release_webnhakinh_ai_green
python -m http.server 5500 --bind 127.0.0.1
```

Mo trinh duyet:

```text
http://127.0.0.1:5500/index.html
```

## 3. Test AI

- Dung `test/species/` cho tab Tu van cay trong.
- Dung `test/diagnosis/` cho tab Chan doan benh.
- Cac lop moc xanh, moc den, moc trang la benh chung, khong gan voi rieng tung loai nam.
