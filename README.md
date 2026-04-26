# UNMAPPED

UNMAPPED is a hackathon-ready skills-intelligence prototype for youth in low- and middle-income countries who have real work experience but weak formal proof. It turns informal work histories into a portable profile, then shows an LMIC-calibrated AI readiness and displacement-risk view with transparent country context.

This project was built for a challenge track linked to the World Bank Youth Summit. It is an independent project and is not affiliated with or endorsed by the World Bank.

## What It Does

- Guides users through a low-friction, one-question-at-a-time intake flow
- Supports optional speech-to-text input where browser support exists
- Uses follow-up questions to improve skills mapping accuracy
- Maps informal work into an ISCO-08 occupation profile with ESCO-aligned skills
- Shows a country-calibrated readiness and automation-risk view
- Surfaces adjacent opportunities and upskilling paths
- Includes a policy dashboard with cross-country labor-market signals

## Who It Is For

- Youth with informal or non-traditional work histories
- NGOs, facilitators, and employment-support programs
- Policymakers and program officers comparing country signals

## Stack

### Frontend

- React 18.3.1
- Vite 5.4.8
- React Router 6.26.2
- Axios 1.7.7
- Recharts 2.12.7

### Backend

- FastAPI 0.111.0
- Uvicorn 0.29.0
- HTTPX 0.27.0
- Groq SDK 0.9.0
- python-dotenv 1.0.0
- Pydantic 2.7.1

### External Data / Models

- Groq with `llama-3.3-70b-versatile`
- ILO ILOSTAT
- World Bank WDI
- Embedded ISCO / ESCO / Frey-Osborne reference data

## Repository Structure

```text
UNMAPPED/
|-- backend/
|   |-- data/
|   |-- routes/
|   |-- services/
|   |-- .env.example
|   |-- Dockerfile
|   |-- main.py
|   `-- requirements.txt
|-- frontend/
|   |-- public/
|   |-- src/
|   |-- .env.example
|   |-- package.json
|   `-- vite.config.js
|-- .dockerignore
|-- .gitignore
|-- Dockerfile
|-- LICENSE
|-- README.md
`-- UNMAPPED_agent_prompt.md
```

## Main API Routes

- `GET /api/countries`
- `POST /api/interview`
- `POST /api/profile`
- `POST /api/readiness`
- `GET /api/opportunities?country_code=GHA&isco_unit_code=7421`
- `GET /api/econdata/GHA`
- `GET /api/policy-dashboard`

## Local Setup

### Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer
- npm
- Git

### 1. Clone

```powershell
git clone https://github.com/mak4x13/UNMAPPED.git
cd UNMAPPED
```

### 2. Backend

Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set the Groq key in `backend\.env`:

```env
GROQ_API_KEY=your_actual_groq_api_key
```

Create a virtual environment and install dependencies:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Run the backend:

```powershell
uvicorn main:app --reload --port 7860
```

### 3. Frontend

Open a second terminal:

```powershell
cd c:\path\to\UNMAPPED
Copy-Item frontend\.env.example frontend\.env
```

Set:

```env
VITE_API_BASE_URL=http://localhost:7860
```

Install dependencies and run:

```powershell
cd frontend
npm install
npm run dev
```

### 4. Open The App

Open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Demo Flow

1. Open the youth journey.
2. Select a country and language mode.
3. Enter background details and describe the work in plain language.
4. Answer follow-up questions.
5. Generate the profile.
6. Review readiness, risk, and adjacent opportunities.
7. Open the policy dashboard for cross-country comparison.

## Dynamic Country System

The app now reads its country list from [backend/data/country_configs.json](/c:/Users/Lenovo/Desktop/UNMAPPED/backend/data/country_configs.json).

To add a new country, add one new top-level entry to that JSON file with this shape:

```json
"XXX": {
  "name": "Country Name",
  "iso2": "XY",
  "region": "Region Name",
  "economy_type": "short economy description",
  "lmic_calibration_factor": 0.65,
  "calibration_note": "Why this country needs this calibration",
  "context_note": "Short labor-market context note",
  "opportunity_types": ["self-employment", "gig", "informal_sme", "training_pathways"],
  "wittgenstein_secondary_2025": "40%",
  "wittgenstein_secondary_2035": "56%",
  "fallback_econdata": {
    "youth_unemployment": "12.0%",
    "gdp_per_capita": "$2,000",
    "secondary_completion": "50.0%"
  }
}
```

After editing the JSON:

- restart the backend, because the file is cached in Python
- refresh the frontend, because the country list is fetched at app startup

The new country will then appear automatically in:

- `/api/countries`
- the onboarding country selector
- the compact country switcher
- `/api/econdata/{CODE}`
- the policy dashboard

Locale behavior:

- if the country has no locale-specific entry, the platform falls back to English
- if the country has no voice-specific entry, voice input falls back to English

## Deployment

### Frontend On Vercel

Import the GitHub repository into Vercel and set:

- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Add this environment variable in Vercel:

```env
VITE_API_BASE_URL=https://your-space-name.hf.space
```

Then deploy.

### Backend On Hugging Face Spaces

This repository now includes a root-level [Dockerfile](/c:/Users/Lenovo/Desktop/UNMAPPED/Dockerfile) for Hugging Face Spaces. It copies only `backend/` into the image, and [.dockerignore](/c:/Users/Lenovo/Desktop/UNMAPPED/.dockerignore) excludes the frontend, Git metadata, caches, and virtual environments to keep the image small.

Recommended Space setup:

- Space SDK: `Docker`
- Space hardware: `CPU Basic` is enough for the prototype
- Port exposed by the container: `7860`

Steps:

1. Create a new Docker Space on Hugging Face.
2. Connect it to this GitHub repository.
3. Add a Space secret:

```env
GROQ_API_KEY=your_actual_groq_api_key
```

4. Let the Space build from the root `Dockerfile`.
5. After deployment, your backend URL will look like:

```text
https://your-space-name.hf.space
```

Then use that URL as `VITE_API_BASE_URL` in Vercel.

### Docker Size Note

The Hugging Face build uses:

- `python:3.11-slim`
- `pip install --no-cache-dir`
- a root `.dockerignore` that excludes the frontend and local caches
- a root `Dockerfile` that copies only `backend/`

With the current dependency set, this should stay comfortably below the 1 GB Hugging Face limit.

## Verification Used In This Repo

- `python -m py_compile backend\main.py backend\routes\countries.py backend\routes\policy.py backend\routes\readiness.py backend\services\data_store.py`
- `npm run build`

## Known Limits

- Speech-to-text depends on browser and device support.
- Opportunity matching is illustrative, not a live vacancy engine.
- The current prototype stores journey state in browser localStorage, not in a backend database.
