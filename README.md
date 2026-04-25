# UNMAPPED

UNMAPPED is a skills-intelligence platform for youth in low- and middle-income countries who have real work experience but weak formal credentials. It turns informal education and work histories into a portable skills profile, then shows an LMIC-calibrated AI readiness and displacement-risk view with country context.

This project was built for a hackathon challenge track linked to the World Bank Youth Summit. It is an independent project and is not affiliated with or endorsed by the World Bank.

## What The Platform Does

- Guides users through a low-friction intake flow with simple language
- Supports optional speech-to-text input for selected country/language combinations
- Uses agentic follow-up questions to improve skills mapping accuracy
- Maps experience into an ISCO-08 occupation profile with ESCO-style skills
- Shows a country-calibrated readiness and automation-risk view
- Surfaces illustrative adjacent opportunities grounded in country context
- Includes a separate policy dashboard for analysts and program teams

## Who It Is For

- Youth in LMICs with informal or non-traditional work histories
- NGO workers, facilitators, and employment-support programs
- Policymakers and analysts who need country-level labor-market signals

## Core Product Areas

### Youth Journey

- Guided onboarding
- Country and language selection
- Voice-assisted input
- Follow-up interview generation
- Skills profile generation
- AI readiness and opportunity view

### Policy View

- Country comparison dashboard
- NEET and youth unemployment signals
- Illustrative occupation risk comparison

## Tech Stack

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
- Embedded ISCO / ESCO / Frey-Osborne reference files

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
|-- UNMAPPED_agent_prompt.md
|-- .gitignore
`-- README.md
```

## Main API Routes

- `POST /api/interview`
- `POST /api/profile`
- `POST /api/readiness`
- `GET /api/opportunities?country_code=GHA&isco_unit_code=7421`
- `GET /api/econdata/GHA`

## Local Setup On Windows PC

### Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer
- npm
- Git

### 1. Clone The Repository

```powershell
git clone https://github.com/mak4x13/UNMAPPED.git
cd UNMAPPED
```

### 2. Backend Setup

Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` and set:

```env
GROQ_API_KEY=your_actual_groq_api_key
```

Create and activate a virtual environment, then install dependencies:

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

### 3. Frontend Setup

Open a second terminal and create the frontend environment file:

```powershell
cd c:\path\to\UNMAPPED
Copy-Item frontend\.env.example frontend\.env
```

`frontend\.env` should contain:

```env
VITE_API_BASE_URL=http://localhost:7860
```

Install dependencies and run the frontend:

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

## Suggested Local Demo Flow

1. Open the youth journey
2. Select a country
3. Choose platform language and voice-input language
4. Describe informal work experience
5. Answer the follow-up interview questions
6. Generate the profile
7. Review readiness, risk, and adjacent opportunities
8. Switch to the policy dashboard

## Deployment

### Backend

The backend is structured for Docker-based deployment, including HuggingFace Spaces.

### Frontend

The frontend is structured for Vercel deployment.

Set:

```env
VITE_API_BASE_URL=https://your-backend-url
```

## Notes

- Speech-to-text support depends on browser/device support
- Groq calls are real when `GROQ_API_KEY` is configured
- ILO and World Bank data are live where available, with fallback behavior
- Opportunity matching is intentionally illustrative
