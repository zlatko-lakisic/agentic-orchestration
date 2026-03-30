# CrewAI Demo

Minimal CrewAI demo with two agents (researcher + writer) running sequential tasks.

## 1) Create and activate a virtual environment

PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## 2) Install dependencies

```powershell
pip install -r requirements.txt
```

## 3) Configure environment variables

```powershell
copy .env.example .env
```

Then edit `.env` and set your real `OPENAI_API_KEY`.

Optional:

- `OPENAI_MODEL_NAME` (default `gpt-4o-mini`)
- `DEMO_TOPIC` (default topic is set in `main.py`)

## 4) Run the demo

```powershell
$env:PYTHONUTF8=1
python main.py
```

You should see CrewAI logs and a final generated briefing.
