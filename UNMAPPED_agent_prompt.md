# UNMAPPED — AI Coding Agent Build Prompt
### Hack-Nation Global AI Hackathon 5 | Challenge 05 | World Bank Youth Summit
### Stack: React + Vite (Vercel) · FastAPI + Docker (HuggingFace Spaces) · Groq API · Free public APIs

---

## 0. MISSION STATEMENT

Build **UNMAPPED** — a two-module skills infrastructure tool for youth in low- and middle-income countries (LMICs). The system takes a young person's informal education and work experience as plain-language input, maps it to a standardized, portable skills profile (ISCO-08 taxonomy), then produces an honest AI readiness assessment: which skills are at automation risk, which are durable, and what adjacent skills increase resilience.

Target user: A 22-year-old in Accra with informal tech repair experience and no formal credential. She should be able to understand and own her profile — not just an algorithm.

**Modules to build (both required):**
- **Module 01 — Skills Signal Engine:** Input → ISCO-mapped portable skills profile (human-readable)
- **Module 02 — AI Readiness & Displacement Risk Lens:** Profile + country → automation risk scores + durable skills + upskilling paths, calibrated to LMIC context

A lightweight **Module 03 panel** (Opportunity Matching) should exist as a static/mocked view — enough to show dual interface (youth user + policymaker dashboard).

---

## 1. JUDGING CRITERIA MAP

| Criterion | Weight | How to win it |
|---|---|---|
| Show the data | High | Surface ILO ILOSTAT + World Bank WDI numbers visibly, not buried |
| Design for constraint | High | Mobile-first, low-bandwidth feel, works on shared device |
| Demonstrate localizability | High | Config-driven country switching (no code changes) |
| Be honest about limits | Medium | Show confidence intervals, flag missing data explicitly |
| Close the loop | High | End-to-end: input → profile → risk → opportunities |

Every UI panel must show at least one real econometric number (wage, employment rate, NEET rate) from a live API call — not hardcoded.

---

## 2. REPOSITORY STRUCTURE

```
unmapped/
├── frontend/                    # React + Vite → deploy to Vercel
│   ├── src/
│   │   ├── components/
│   │   │   ├── OnboardingFlow.jsx       # Step-by-step conversational input
│   │   │   ├── SkillsProfile.jsx        # ISCO-mapped profile card
│   │   │   ├── ReadinessLens.jsx        # Automation risk + durable skills
│   │   │   ├── OpportunityPanel.jsx     # Mocked matching + real wage data
│   │   │   ├── PolicyDashboard.jsx      # Aggregate policymaker view
│   │   │   ├── CountrySelector.jsx      # Config switcher (Ghana / Pakistan / Kenya / Bangladesh)
│   │   │   ├── EconSignalBadge.jsx      # Reusable: shows live ILO/WB data point with source label
│   │   │   └── RiskBar.jsx              # Visual automation probability bar (0–1 scale)
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # Landing with "Get Started" CTA
│   │   │   ├── ProfilePage.jsx          # Module 01 output
│   │   │   ├── ReadinessPage.jsx        # Module 02 output
│   │   │   └── PolicyPage.jsx           # Policymaker dashboard
│   │   ├── config/
│   │   │   └── countries.js             # Country config objects (see Section 6)
│   │   ├── hooks/
│   │   │   ├── useProfile.js
│   │   │   └── useReadiness.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example                     # VITE_API_BASE_URL
│   ├── package.json
│   └── vercel.json
│
├── backend/                     # FastAPI → Docker → HuggingFace Spaces
│   ├── main.py                  # App entry, CORS, router registration
│   ├── routes/
│   │   ├── profile.py           # POST /api/profile
│   │   ├── readiness.py         # POST /api/readiness
│   │   ├── opportunities.py     # GET /api/opportunities (lightweight)
│   │   └── econdata.py          # GET /api/econdata/{country_code}
│   ├── services/
│   │   ├── groq_service.py      # All Groq API calls, structured outputs
│   │   ├── ilo_service.py       # ILO ILOSTAT API wrapper
│   │   └── worldbank_service.py # World Bank WDI API wrapper
│   ├── data/
│   │   ├── frey_osborne.json    # 702 occupations, SOC codes, automation probability 0–1
│   │   ├── isco08_taxonomy.json # ISCO-08 major groups + unit groups (simplified 400 entries)
│   │   ├── esco_skills.json     # Top 200 ESCO skill labels for mapping display
│   │   └── country_configs.json # Country-specific calibration parameters
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example             # GROQ_API_KEY
│
└── README.md
```

---

## 3. BACKEND — FastAPI

### 3.1 requirements.txt

```
fastapi==0.111.0
uvicorn==0.29.0
httpx==0.27.0
groq==0.9.0
python-dotenv==1.0.0
pydantic==2.7.1
```

### 3.2 Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

> HuggingFace Spaces requires port **7860**. Set Space SDK to **Docker**.

### 3.3 main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import profile, readiness, opportunities, econdata

app = FastAPI(title="UNMAPPED API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api")
app.include_router(readiness.router, prefix="/api")
app.include_router(opportunities.router, prefix="/api")
app.include_router(econdata.router, prefix="/api")
```

---

## 4. API ROUTES — Exact Specifications

### 4.1 POST /api/profile

**Input:**
```json
{
  "country_code": "GHA",
  "education_level": "secondary",
  "years_experience": 5,
  "informal_description": "I fix smartphones and laptops. I taught myself from YouTube. I also sell accessories.",
  "languages": ["English", "Twi"],
  "age": 22
}
```

**What the backend does:**
1. Load `isco08_taxonomy.json` and `esco_skills.json`
2. Call Groq with structured output prompt (see Section 7.1)
3. Return ISCO-mapped profile

**Output:**
```json
{
  "isco_major_group": "7",
  "isco_major_label": "Craft and Related Trades Workers",
  "isco_unit_code": "7421",
  "isco_unit_label": "Electronics Mechanics and Servicers",
  "esco_skills": [
    "repair electronic equipment",
    "diagnose malfunctions in equipment",
    "use diagnostic tools",
    "advise customers on purchases",
    "manage small-scale sales operations"
  ],
  "informal_skills_extracted": [
    "self-directed learning",
    "customer-facing sales",
    "hardware troubleshooting",
    "mobile device repair",
    "basic inventory management"
  ],
  "education_credential": "Secondary School Certificate",
  "credential_labor_market_signal": "Low — informal skills not visible to formal employers",
  "portability_score": 72,
  "portability_note": "Profile is portable across 38 countries using ISCO-08 standard.",
  "profile_summary": "Amara is a self-taught electronics repair technician with 5 years of hands-on experience running a mobile phone repair and accessories business. Her skills map to ISCO-08 unit group 7421 and are internationally portable.",
  "confidence": 0.87
}
```

---

### 4.2 POST /api/readiness

**Input:**
```json
{
  "isco_unit_code": "7421",
  "country_code": "GHA",
  "esco_skills": ["repair electronic equipment", "diagnose malfunctions"],
  "informal_skills_extracted": ["self-directed learning", "customer-facing sales"]
}
```

**What the backend does:**
1. Look up `frey_osborne.json` for occupation automation probability (SOC → ISCO crosswalk included in the JSON)
2. Apply LMIC calibration factor from `country_configs.json` (see Section 6)
3. Call Groq to generate skill-level risk breakdown and upskilling paths
4. Call World Bank + ILO APIs for country labor market context

**Output:**
```json
{
  "automation_probability_raw": 0.56,
  "automation_probability_lmic_calibrated": 0.38,
  "calibration_note": "Adjusted for Ghana context: lower automation infrastructure penetration, higher labor cost differential reduces displacement urgency vs. high-income countries.",
  "risk_level": "moderate",
  "risk_horizon_years": "5–10 years",
  "skills_at_risk": [
    {"skill": "basic hardware repair (routine)", "risk": "high", "reason": "Repetitive diagnostic steps are automatable"},
    {"skill": "inventory tracking", "risk": "moderate", "reason": "Mobile POS apps already replacing manual logs"}
  ],
  "durable_skills": [
    {"skill": "customer trust-building", "risk": "low", "reason": "Relational, context-specific, not automatable"},
    {"skill": "adaptive troubleshooting of novel faults", "risk": "low", "reason": "Requires real-world judgment"},
    {"skill": "self-directed learning", "risk": "low", "reason": "Meta-skill that enables continuous adaptation"}
  ],
  "adjacent_skills_recommended": [
    {
      "skill": "IoT device configuration",
      "effort": "3–6 months",
      "why": "Smart home devices are entering Ghanaian urban market; repair demand is growing",
      "free_resource": "Cisco NetAcad IoT course (free)"
    },
    {
      "skill": "Solar panel installation and maintenance",
      "effort": "2–4 months",
      "why": "Off-grid solar penetration in West Africa is accelerating; technician shortage is real",
      "free_resource": "GOGLA training modules"
    }
  ],
  "wittgenstein_projection": {
    "region": "Sub-Saharan Africa",
    "secondary_completion_2025": "41%",
    "secondary_completion_2035_projected": "58%",
    "implication": "Credential competition will increase. Informal skills documentation becomes more critical."
  },
  "econometric_signals": {
    "youth_unemployment_rate": {"value": "12.1%", "source": "ILO ILOSTAT 2023", "indicator": "SL.UEM.1524.ZS"},
    "neet_rate": {"value": "28.4%", "source": "ILO ILOSTAT 2023"},
    "ict_sector_employment_growth": {"value": "+6.2% YoY", "source": "World Bank WDI"}
  },
  "narrative": "Amara's core repair skills face moderate displacement risk over the next decade, primarily from automated diagnostic tools. However, her adaptive troubleshooting ability and customer relationships are highly durable. Moving into IoT and solar represents a realistic, reachable path with strong local demand."
}
```

---

### 4.3 GET /api/econdata/{country_code}

Fetches and caches live data from ILO + World Bank for the selected country. Used by the frontend `EconSignalBadge` components.

**What it fetches (exact endpoints):**

**World Bank WDI** (no API key required):
```
https://api.worldbank.org/v2/country/{iso2}/indicator/SL.UEM.1524.ZS?format=json&mrv=1
https://api.worldbank.org/v2/country/{iso2}/indicator/NY.GDP.PCAP.CD?format=json&mrv=1
https://api.worldbank.org/v2/country/{iso2}/indicator/SE.SEC.CUAT.LO.ZS?format=json&mrv=1
```

**ILO ILOSTAT** (no API key required):
```
https://rplumber.ilo.org/data/indicator/?id=SDG_0851_SEX_AGE_RT&ref_area={iso3}&sex=SEX_T&classif1=AGE_YTHADULT_YTH&timefrom=2020&type=label&lang=en
```

**Response format from this endpoint:**
```json
{
  "country": "Ghana",
  "country_code": "GHA",
  "signals": [
    {
      "label": "Youth Unemployment Rate (15–24)",
      "value": "12.1%",
      "year": 2023,
      "source": "ILO ILOSTAT",
      "indicator_id": "SDG_0851"
    },
    {
      "label": "GDP per capita (current USD)",
      "value": "$2,363",
      "year": 2023,
      "source": "World Bank WDI"
    },
    {
      "label": "Secondary Education Completion Rate",
      "value": "68.3%",
      "year": 2022,
      "source": "World Bank WDI"
    }
  ],
  "data_freshness": "live",
  "fetched_at": "2026-04-25T10:00:00Z"
}
```

If a live API call fails, return cached fallback from `country_configs.json` and set `"data_freshness": "cached"`. Never show empty panels — always show something with a transparency note.

---

## 5. GROQ SERVICE — Exact Prompt Templates

### groq_service.py structure

```python
from groq import Groq
import json, os

client = Groq(api_key=os.environ["GROQ_API_KEY"])
MODEL = "llama-3.3-70b-versatile"
```

### 5.1 Skills Mapping Prompt (for /api/profile)

```python
SKILLS_MAPPING_SYSTEM = """
You are an expert labor market analyst trained in ISCO-08 occupational classification and ESCO skills taxonomy.
You receive informal descriptions of a person's work experience and education.
You return ONLY valid JSON — no preamble, no markdown, no explanation outside the JSON object.
Map the person's experience to the most appropriate ISCO-08 unit group (4-digit code).
Be honest: if the description is ambiguous, reflect that in a lower confidence score.
Extract concrete, demonstrable skills only — do not invent skills not evidenced in the description.
"""

SKILLS_MAPPING_USER = """
Country context: {country}
Education level: {education_level}
Years of experience: {years_experience}
Description: "{informal_description}"
Languages: {languages}

Return JSON matching exactly this schema:
{{
  "isco_major_group": "string (1 digit)",
  "isco_major_label": "string",
  "isco_unit_code": "string (4 digits)",
  "isco_unit_label": "string",
  "esco_skills": ["string", ...],  // max 6, use official ESCO skill labels
  "informal_skills_extracted": ["string", ...],  // max 6, plain language
  "credential_labor_market_signal": "string",  // honest assessment
  "portability_score": integer (0-100),
  "portability_note": "string",
  "profile_summary": "string (2-3 sentences, second-person, human-readable — written for Amara, not for an algorithm)",
  "confidence": float (0.0 - 1.0)
}}
"""
```

### 5.2 Readiness Assessment Prompt (for /api/readiness)

```python
READINESS_SYSTEM = """
You are an honest labor market economist specializing in automation risk in low- and middle-income countries (LMICs).
You do NOT use generic global automation statistics. You calibrate explicitly for the country context provided.
Key principle: automation risk in Kampala is not the same as in Kuala Lumpur or Kansas.
Factors that reduce LMIC automation risk vs. high-income countries:
- Lower infrastructure penetration for automation hardware
- Higher relative cost of automation vs. local labor
- Informality of work context (automation targets formal, standardized processes first)
- Weak supply chains for automated equipment maintenance
You return ONLY valid JSON. Be honest about uncertainty. Never be aspirational — be grounded.
"""

READINESS_USER = """
Occupation: {isco_unit_label} (ISCO {isco_unit_code})
Country: {country_name} (ISO: {country_code})
LMIC calibration factor: {calibration_factor}  // from country_configs.json, range 0.5–0.9
Raw Frey-Osborne automation probability: {raw_probability}
Calibrated probability: {calibrated_probability}
ESCO skills: {esco_skills}
Informal skills: {informal_skills_extracted}
Country context note: {country_context_note}

Return JSON exactly matching this schema:
{{
  "risk_level": "low | moderate | high",
  "risk_horizon_years": "string",
  "skills_at_risk": [{{"skill": "string", "risk": "low|moderate|high", "reason": "string"}}],
  "durable_skills": [{{"skill": "string", "risk": "low", "reason": "string"}}],
  "adjacent_skills_recommended": [
    {{
      "skill": "string",
      "effort": "string (e.g. 3-6 months)",
      "why": "string (grounded in local market reality)",
      "free_resource": "string (real, accessible resource)"
    }}
  ],
  "narrative": "string (3-4 sentences, honest, second-person, no corporate jargon)"
}}
"""
```

---

## 6. COUNTRY CONFIGURATION SYSTEM

### country_configs.json (embed in /backend/data/)

```json
{
  "GHA": {
    "name": "Ghana",
    "iso2": "GH",
    "region": "Sub-Saharan Africa",
    "economy_type": "lower-middle income, urban informal",
    "lmic_calibration_factor": 0.68,
    "calibration_note": "Strong informal economy, limited automation infrastructure penetration, mobile-first digital economy",
    "context_note": "Ghana has a rapidly growing fintech sector and high mobile penetration (>80%). Repair, solar, and digital services are growth sectors. NEET rate remains high at ~28%.",
    "opportunity_types": ["self-employment", "gig", "informal_sme", "training_pathways"],
    "wittgenstein_secondary_2025": "41%",
    "wittgenstein_secondary_2035": "58%",
    "fallback_econdata": {
      "youth_unemployment": "12.1%",
      "gdp_per_capita": "$2,363",
      "secondary_completion": "68.3%"
    }
  },
  "PAK": {
    "name": "Pakistan",
    "iso2": "PK",
    "region": "South Asia",
    "economy_type": "lower-middle income, mixed urban-rural",
    "lmic_calibration_factor": 0.62,
    "calibration_note": "Large informal sector, growing IT freelance economy, significant rural-urban divide in automation exposure",
    "context_note": "Pakistan has one of the world's largest freelance IT workforces. Manufacturing and agriculture face higher automation risk than services. Gender gap in formal labor market participation is significant.",
    "opportunity_types": ["freelance_remote", "formal_employment", "self-employment", "training_pathways"],
    "wittgenstein_secondary_2025": "38%",
    "wittgenstein_secondary_2035": "54%",
    "fallback_econdata": {
      "youth_unemployment": "7.8%",
      "gdp_per_capita": "$1,598",
      "secondary_completion": "44.1%"
    }
  },
  "KEN": {
    "name": "Kenya",
    "iso2": "KE",
    "region": "Sub-Saharan Africa",
    "economy_type": "lower-middle income, strong tech hub",
    "lmic_calibration_factor": 0.71,
    "calibration_note": "Nairobi is a regional tech hub; formal sector more exposed to automation than rural hinterland",
    "context_note": "Kenya has Africa's most sophisticated fintech ecosystem (M-Pesa). Digital skills command significant wage premium. Agricultural automation risk is rising.",
    "opportunity_types": ["gig", "formal_employment", "digital_freelance", "training_pathways"],
    "wittgenstein_secondary_2025": "44%",
    "wittgenstein_secondary_2035": "61%",
    "fallback_econdata": {
      "youth_unemployment": "13.7%",
      "gdp_per_capita": "$2,081",
      "secondary_completion": "72.1%"
    }
  },
  "BGD": {
    "name": "Bangladesh",
    "iso2": "BD",
    "region": "South Asia",
    "economy_type": "lower-middle income, garment-sector dependent",
    "lmic_calibration_factor": 0.59,
    "calibration_note": "Garment sector faces high automation risk. Digital sector growing rapidly. Rural agricultural workers face longer-term but real displacement.",
    "context_note": "Bangladesh's RMG sector employs ~4 million workers (80% women) and faces measurable automation risk from robotic sewing systems. Digital upskilling is a national priority.",
    "opportunity_types": ["formal_employment", "self-employment", "training_pathways"],
    "wittgenstein_secondary_2025": "43%",
    "wittgenstein_secondary_2035": "59%",
    "fallback_econdata": {
      "youth_unemployment": "10.6%",
      "gdp_per_capita": "$2,688",
      "secondary_completion": "66.7%"
    }
  }
}
```

### frontend/src/config/countries.js

```javascript
export const COUNTRIES = [
  { code: "GHA", name: "Ghana", flag: "🇬🇭", region: "Sub-Saharan Africa", context: "Urban informal economy" },
  { code: "PAK", name: "Pakistan", flag: "🇵🇰", region: "South Asia", context: "Mixed urban-rural" },
  { code: "KEN", name: "Kenya", flag: "🇰🇪", region: "Sub-Saharan Africa", context: "Tech hub + rural" },
  { code: "BGD", name: "Bangladesh", flag: "🇧🇩", region: "South Asia", context: "Garment sector economy" }
];
```

> **Localizability demo:** Switching country changes the API payload, the `country_configs.json` calibration, and the live econometric data fetch — zero code changes. Make this switch visible in the UI with a country selector that updates all panels.

---

## 7. FREY-OSBORNE DATA — How to Use

The Frey & Osborne (2013) dataset covers 702 US SOC-coded occupations with automation probability 0–1. Include a pre-processed version in `backend/data/frey_osborne.json`.

Key ISCO-to-SOC crosswalk mappings to include (sample):

```json
[
  {"isco_unit_code": "7421", "isco_label": "Electronics Mechanics and Servicers", "soc_code": "49-2094", "soc_label": "Electrical and Electronics Repairers", "automation_probability": 0.56},
  {"isco_unit_code": "4131", "isco_label": "Stock Clerks", "soc_code": "43-5081", "soc_label": "Stock Clerks and Order Fillers", "automation_probability": 0.92},
  {"isco_unit_code": "6111", "isco_label": "Field Crop and Vegetable Growers", "soc_code": "45-2092", "soc_label": "Farmworkers and Laborers", "automation_probability": 0.87},
  {"isco_unit_code": "2411", "isco_label": "Accountants", "soc_code": "13-2011", "soc_label": "Accountants and Auditors", "automation_probability": 0.94},
  {"isco_unit_code": "5223", "isco_label": "Shop Salesperson", "soc_code": "41-2031", "soc_label": "Retail Salespersons", "automation_probability": 0.92},
  {"isco_unit_code": "3355", "isco_label": "Police Inspector", "soc_code": "33-3051", "soc_label": "Police and Sheriff's Patrol Officers", "automation_probability": 0.09},
  {"isco_unit_code": "2642", "isco_label": "Journalists", "soc_code": "27-3022", "soc_label": "Reporters and Correspondents", "automation_probability": 0.11},
  {"isco_unit_code": "7231", "isco_label": "Motor Vehicle Mechanics and Repairers", "soc_code": "49-3023", "soc_label": "Automotive Service Technicians", "automation_probability": 0.45}
]
```

Include at least 50 mappings covering the most common LMIC occupations. For unmapped ISCO codes, use the mean automation probability for the ISCO major group as fallback and flag it in the response.

**LMIC calibration formula:**
```python
calibrated = raw_probability * country_config["lmic_calibration_factor"]
# Ghana example: 0.56 * 0.68 = 0.38
```

---

## 8. FRONTEND — React + Vite

### 8.1 Setup

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install axios react-router-dom recharts
```

### 8.2 Design System

**Aesthetic direction:** Clean, warm, and purposeful. Designed for someone using a shared Android phone on 3G, not a MacBook Pro. No heavy animations. High contrast text. Clear information hierarchy.

**Color palette (CSS variables):**
```css
:root {
  --color-bg: #0F1117;
  --color-surface: #1A1D27;
  --color-border: #2A2D3A;
  --color-primary: #4F9CF9;
  --color-accent: #56D4B0;
  --color-warn: #F4A623;
  --color-danger: #E05252;
  --color-text: #E8EBF4;
  --color-muted: #8B90A7;
  --font-display: 'DM Sans', sans-serif;
  --font-body: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
```

### 8.3 OnboardingFlow.jsx — Critical Component

This is the entry point. Make it conversational, not a form. Use a 4-step flow:

- **Step 1 — Country:** Large country selector cards (flag + name + region context)
- **Step 2 — Background:** Education level (dropdown), age, languages (multi-tag input)
- **Step 3 — Your Work:** Large textarea with placeholder: *"Describe what you do or have done — in your own words. No need for formal job titles."*
- **Step 4 — Review:** Show a summary card before submitting. Include a note: *"Your data stays on your device until you click Generate Profile."*

Progress indicator at top. Each step validated before proceeding. Mobile-first: full-width inputs, large tap targets (min 44px height).

### 8.4 SkillsProfile.jsx — Module 01 Output

Display sections:
1. **Profile Header:** Name placeholder, ISCO unit label, portability score as circular gauge (0–100)
2. **Skills Grid:** Two columns — "Formal Skills" (ESCO labels) and "Informal Skills Extracted" — both as pill badges
3. **Credential Signal:** Color-coded signal pill (green/yellow/red) with `credential_labor_market_signal` text
4. **Portability Note:** Subtle info row with globe icon
5. **Profile Summary:** Full paragraph, slightly larger font, readable as a human statement
6. **EconSignalBadge row:** 3 badges from `/api/econdata/{country}` showing live youth unemployment, GDP per capita, secondary completion rate — each badge shows value, label, source, year

### 8.5 ReadinessLens.jsx — Module 02 Output

Display sections:
1. **Risk Header:** Large dial or gauge showing `automation_probability_lmic_calibrated` (0–1), color-coded (green < 0.35, orange 0.35–0.65, red > 0.65). Show both raw and calibrated values with the calibration note below.
2. **Skills at Risk table:** 3 columns: Skill | Risk Level (colored pill) | Reason
3. **Durable Skills panel:** Green-accented cards, each with skill name + reason
4. **Upskilling Paths:** Expandable cards per recommendation: skill name, effort estimate, why (local demand context), free resource link
5. **Wittgenstein Projection:** Small chart (Recharts BarChart) showing secondary completion 2025 → 2035 for the selected region
6. **Narrative block:** Full paragraph in slightly larger text, boxed with left accent border

### 8.6 EconSignalBadge.jsx

Reusable component. Used everywhere. Props: `{ label, value, source, year, loading }`.

```jsx
// Visual: small card with value large, label below, source + year in tiny muted text
// Shows skeleton loader while data is fetching
// Shows "Cached data" warning badge if data_freshness === "cached"
```

### 8.7 PolicyDashboard.jsx

Aggregate view for policymakers. Use Recharts. Show:
- Bar chart: NEET rate comparison across 4 configured countries
- Scatter plot: automation risk (calibrated) vs. youth unemployment rate per country
- Table: top 5 at-risk occupations by country (mocked data is fine here, labeled as "illustrative")
- Header note: *"This view is designed for program officers and government analysts. Data sources: ILO ILOSTAT, World Bank WDI."*

Toggle between Youth View and Policy View via a tab at the top of the app.

### 8.8 vercel.json

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### 8.9 .env.example

```
VITE_API_BASE_URL=https://your-hf-space.hf.space
```

---

## 9. DEPLOYMENT

### Backend — HuggingFace Spaces (Docker)

1. Create new Space: huggingface.co/new-space → SDK: Docker
2. Add `GROQ_API_KEY` to Space secrets (Settings → Variables and secrets)
3. Push backend folder contents to the Space repo
4. Space auto-builds from Dockerfile. Port 7860 is exposed as HTTPS automatically.
5. Your API base URL will be: `https://{username}-{space-name}.hf.space`

### Frontend — Vercel

```bash
cd frontend
npm run build
npx vercel --prod
# Set environment variable: VITE_API_BASE_URL = your HF Space URL
```

---

## 10. WHAT TO MOCK vs. WHAT MUST BE REAL

| Component | Status | Reason |
|---|---|---|
| Groq LLM calls (profile mapping, readiness) | **REAL** | Core judging criterion |
| ILO ILOSTAT API data | **REAL** (with cached fallback) | Judge will verify this is live |
| World Bank WDI API data | **REAL** (with cached fallback) | Judge will verify this is live |
| Frey-Osborne automation scores | **REAL static data** | Embed the real dataset |
| ISCO-08 taxonomy lookup | **REAL static data** | Use official codes |
| Wittgenstein projections | **Real numbers, static** | Embed published values per region |
| Opportunity matching (Module 03) | **MOCKED** | OK — brief explicitly allows partial |
| PolicyDashboard charts | **Mixed** — real API + illustrative occupation data | Label clearly |
| Authentication / user accounts | **DO NOT BUILD** | Waste of time, not in criteria |
| Payment / signup flows | **DO NOT BUILD** | Not in scope |

---

## 11. LOCALIZABILITY DEMONSTRATION

The challenge requires showing the tool configured for **one context**, then showing what reconfiguring for **another context** takes.

**Demo script for submission video:**
1. Show Ghana (GHA) config: profile maps Amara's skills, readiness shows 0.38 calibrated risk, live ILO/WB data for Ghana loads
2. Switch country selector to Pakistan (PAK)
3. Show: calibration factor changes (0.62), econometric signals reload with Pakistan data, opportunity types shift (freelance_remote appears), context note changes
4. Say on camera: *"Zero code changes. Country is a config input, not a hardcoded assumption."*

---

## 12. KEY THINGS THAT WILL SEPARATE THIS FROM GENERIC SUBMISSIONS

1. **The calibration factor is explained to the user** — show the raw vs. calibrated probability side by side, with a tooltip explaining why LMIC context changes the number. Judges will love this transparency.

2. **Profile summary is written for Amara, not for an algorithm** — second-person, plain language, no jargon. The Groq prompt enforces this. A 22-year-old with a secondary certificate should read this and feel seen.

3. **Every econometric signal is labeled with its source and year** — "12.1% Youth Unemployment — ILO ILOSTAT 2023." Not buried. Visible on the main panel.

4. **Failed API calls are handled gracefully with transparency** — show "Cached data — ILO API unavailable" badge rather than blank panel or fake data.

5. **The upskilling paths are grounded in local market reality** — IoT and solar for Ghana, freelance IT for Pakistan. Groq prompt explicitly asks for locally relevant resources, not generic "take a Coursera course."

6. **Module 03 is shown, labeled as illustrative** — a simple panel showing matched opportunities with a note "opportunity data is illustrative; production system would connect to ILO WBES and local job boards." Honest about limits = strong submission signal.

---

## 13. DEMO FLOW (for submission video / live demo)

1. Land on Home page → click "Map My Skills"
2. Select Ghana → fill secondary education, 5 years, phone repair description
3. Submit → show loading state → SkillsProfile renders with ISCO code, ESCO skills, 3 live econometric badges
4. Click "Check AI Readiness" → ReadinessLens renders with calibrated risk gauge, skills breakdown, upskilling paths
5. Switch to Pakistan → watch country data reload and calibration change
6. Switch to Policy View → show aggregate dashboard with charts
7. Say: "All LLM inference via Groq (free tier). All labor market data from ILO ILOSTAT and World Bank WDI public APIs. Backend on HuggingFace Spaces, frontend on Vercel. Total infrastructure cost: zero."

---

*Built for Hack-Nation Global AI Hackathon 5 | Challenge 05 — UNMAPPED | World Bank Youth Summit*
