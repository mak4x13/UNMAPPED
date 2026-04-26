from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from groq import Groq

from .data_store import get_isco_unit, get_major_group_label


load_dotenv()
client = Groq(api_key=os.environ["GROQ_API_KEY"]) if os.environ.get("GROQ_API_KEY") else None
MODEL = "llama-3.3-70b-versatile"

SKILLS_MAPPING_SYSTEM = """
You are an expert labor market analyst trained in ISCO-08 occupational classification and ESCO skills taxonomy.
You receive informal descriptions of a person's work experience and education, plus short follow-up interview answers.
You return ONLY valid JSON - no preamble, no markdown, no explanation outside the JSON object.
Map the person's experience to the most appropriate ISCO-08 unit group (4-digit code).
Be honest: if the description is ambiguous, reflect that in a lower confidence score.
Extract concrete, demonstrable skills only - do not invent skills not evidenced in the description.
Human-readable fields should be easy for the person to understand. Keep classification fields in standard English labels.
If the description contains two or more distinct activities, identify the PRIMARY livelihood activity first. Use the activity that appears to generate the main income, main work time, or core trade identity for the ISCO mapping.
Do NOT choose an ISCO code just because an activity is mentioned later in the sentence.
Map the PRIMARY livelihood activity to ISCO. Put secondary, part-time, weekend, seasonal, or side activities into informal_skills_extracted instead of letting them override the ISCO code.
When the description mixes technical repair work with customer-facing sales, classify to the technical occupation if repair/diagnosis is the core task and sales appears secondary.
If the description mentions pipes, leakage, taps, drainage, water pumps, fittings, or bathroom/kitchen water work, classify to plumbing-related work rather than electronics repair.
"""

SKILLS_MAPPING_USER = """
Country context: {country}
Preferred output language for human-readable fields: {ui_language_label}
Education level: {education_level}
Years of experience: {years_experience}
Description: "{informal_description}"
Languages: {languages}
Follow-up interview answers: {follow_up_answers}

If the description includes more than one activity, first decide which one is the primary livelihood activity.
Use the primary livelihood activity for isco_unit_code and isco_unit_label.
Record secondary or side activities as additional evidence in informal_skills_extracted where relevant.

Return JSON matching exactly this schema:
{{
  "isco_major_group": "string (1 digit)",
  "isco_major_label": "string",
  "isco_unit_code": "string (4 digits)",
  "isco_unit_label": "string",
  "esco_skills": ["string", ...],
  "informal_skills_extracted": ["string", ...],
  "credential_labor_market_signal": "string",
  "portability_score": integer (0-100),
  "portability_note": "string",
  "profile_summary": "string (2-3 sentences, second-person, human-readable, in the preferred output language when possible)",
  "confidence": float (0.0 - 1.0)
}}
"""

READINESS_SYSTEM = """
You are an honest labor market economist specializing in automation risk in low- and middle-income countries (LMICs).
You do NOT use generic global automation statistics. You calibrate explicitly for the country context provided.
Key principle: automation risk in Kampala is not the same as in Kuala Lumpur or Kansas.
Factors that reduce LMIC automation risk vs. high-income countries:
- Lower infrastructure penetration for automation hardware
- Higher relative cost of automation vs. local labor
- Informality of work context (automation targets formal, standardized processes first)
- Weak supply chains for automated equipment maintenance
You return ONLY valid JSON. Be honest about uncertainty. Never be aspirational - be grounded.
Human-readable narrative text should be clear to a first-time user and use the preferred output language when possible.
"""

READINESS_USER = """
Occupation: {isco_unit_label} (ISCO {isco_unit_code})
Country: {country_name} (ISO: {country_code})
Preferred output language for human-readable fields: {ui_language_label}
LMIC calibration factor: {calibration_factor}
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
  "narrative": "string (3-4 sentences, honest, second-person, no corporate jargon, in the preferred output language when possible)"
}}
"""

INTERVIEW_SYSTEM = """
You are a careful, low-jargon intake interviewer for a public-interest skills platform.
Your job is to ask only the highest-value follow-up questions after a user gives an initial work description.
You are not a chatbot for general conversation. You ask short, specific, practical questions that help classify real work experience.
Ask at most 4 follow-up questions. Do not ask for private or irrelevant details.
If the user already gave a detail clearly, do not ask for it again.
Write questions for a first-time user on a phone, using the preferred output language when possible.
Return ONLY valid JSON.
"""

INTERVIEW_USER = """
Country context: {country}
Preferred output language: {ui_language_label}
Education level: {education_level}
Years of experience: {years_experience}
Age: {age}
Reported languages: {languages}
Initial description: "{informal_description}"

Return JSON exactly matching this schema:
{{
  "summary_for_user": "string (1-2 short sentences, plain language)",
  "interview_confidence": float (0.0 - 1.0),
  "follow_up_questions": [
    {{
      "question_id": "string",
      "question": "string",
      "help_text": "string",
      "suggested_answers": ["string", ...]
    }}
  ]
}}
"""

PROFILE_RULES = [
    {
        "match": [
            "plumb",
            "plumbing",
            "pipe",
            "pipes",
            "pipeline",
            "water line",
            "water lines",
            "tap",
            "taps",
            "faucet",
            "leak",
            "leakage",
            "drain",
            "drainage",
            "sink",
            "toilet",
            "bathroom fitting",
            "bathroom fittings",
            "water pump",
            "water pumps",
        ],
        "unit_code": "7126",
        "esco_skills": [
            "install plumbing systems",
            "install water pumps",
            "maintain pumps and motors",
            "perform preventive maintenance",
            "source spare parts",
        ],
        "informal": [
            "leak detection",
            "pipe fitting",
            "on-site installation",
            "field troubleshooting",
            "client coordination",
        ],
    },
    {
        "match": [
            "phone repair",
            "repair phones",
            "phone repairs",
            "smartphone",
            "mobile phone",
            "laptop",
            "electronics repair",
            "mobile repair",
            "tablet",
            "screen replace",
            "replace screen",
            "screen replacement",
            "soldering iron",
            "multimeter",
        ],
        "unit_code": "7421",
        "esco_skills": [
            "repair electronic equipment",
            "diagnose malfunctions in equipment",
            "use diagnostic tools",
            "advise customers on purchases",
            "manage small-scale sales operations",
        ],
        "informal": [
            "self-directed learning",
            "hardware troubleshooting",
            "mobile device repair",
            "customer-facing sales",
            "basic inventory management",
        ],
    },
    {
        "match": [
            "car repair",
            "auto repair",
            "mechanic",
            "garage",
            "engine",
            "motorcycle",
            "motorcycles",
            "motorbike",
            "motorbikes",
            "bike repair",
            "repair motorcycles",
            "repair motorcycle",
        ],
        "unit_code": "7231",
        "esco_skills": [
            "repair vehicles",
            "inspect mechanical components of vehicles",
            "replace vehicle parts",
            "diagnose malfunctions in equipment",
            "maintain workshop equipment",
        ],
        "informal": [
            "hands-on diagnostics",
            "preventive maintenance",
            "customer communication",
            "spare parts sourcing",
        ],
    },
    {
        "match": ["shop", "retail", "sold", "sales", "store", "cashier", "accessories"],
        "unit_code": "5223",
        "esco_skills": [
            "sell products to customers",
            "maintain customer service",
            "advise customers on purchases",
            "manage small-scale sales operations",
            "monitor stock level",
        ],
        "informal": [
            "customer-facing sales",
            "product recommendation",
            "stock awareness",
            "cash handling",
        ],
    },
    {
        "match": ["tailor", "sew", "garment", "dressmaking", "alteration"],
        "unit_code": "7531",
        "esco_skills": [
            "operate sewing equipment",
            "alter wearing apparel",
            "measure body dimensions",
            "maintain textile products",
            "advise customers on materials",
        ],
        "informal": [
            "pattern adjustment",
            "precision handwork",
            "client consultation",
        ],
    },
    {
        "match": ["teacher", "tutor", "teach", "lesson", "classroom"],
        "unit_code": "2330",
        "esco_skills": [
            "teach class content",
            "prepare lesson plans",
            "assess students",
            "support learner development",
            "communicate with education stakeholders",
        ],
        "informal": [
            "instruction delivery",
            "curriculum adaptation",
            "classroom facilitation",
        ],
    },
    {
        "match": ["software", "web", "developer", "coding", "frontend", "backend", "website"],
        "unit_code": "2513",
        "esco_skills": [
            "develop software",
            "test software functionality",
            "write programming code",
            "maintain application software",
            "document software design",
        ],
        "informal": [
            "self-directed learning",
            "problem solving",
            "digital collaboration",
        ],
    },
    {
        "match": ["hair", "barber", "salon", "braid", "beauty"],
        "unit_code": "5141",
        "esco_skills": [
            "style hair",
            "maintain customer service",
            "sterilise working environment",
            "advise customers on personal care",
            "schedule appointments",
        ],
        "informal": [
            "customer trust-building",
            "visual styling judgement",
            "repeat-client retention",
        ],
    },
]

READINESS_ADJACENCIES = {
    "7421": [
        {
            "skill": "Remote IT support",
            "effort": "2-4 months",
            "why": "Troubleshooting logic, device setup, and customer explanation already overlap with entry-level support work.",
            "free_resource": "Cisco Networking Academy - IT Essentials",
        },
        {
            "skill": "Solar panel installation and maintenance",
            "effort": "2-4 months",
            "why": "Tool use, field diagnostics, and installation habits transfer well into energy-related service work.",
            "free_resource": "GOGLA training modules",
        },
    ],
    "7126": [
        {
            "skill": "Water pump installation and maintenance",
            "effort": "2-4 months",
            "why": "This stays close to pipe fitting, leakage diagnosis, and site-based installation work you already understand.",
            "free_resource": "Alison technical courses",
        },
        {
            "skill": "Building maintenance coordination",
            "effort": "1-3 months",
            "why": "Plumbing work often opens into broader facilities maintenance where quick response and recurring service matter.",
            "free_resource": "Google Digital Garage",
        },
    ],
    "7231": [
        {
            "skill": "Generator and small-engine servicing",
            "effort": "2-4 months",
            "why": "Mechanical diagnostics and repair routines transfer into nearby equipment service markets.",
            "free_resource": "Alison technical courses",
        },
        {
            "skill": "Fleet maintenance recordkeeping",
            "effort": "1-3 months",
            "why": "Workshop experience becomes more portable when paired with basic service planning and maintenance logs.",
            "free_resource": "CFI financial literacy resources",
        },
    ],
    "5223": [
        {
            "skill": "E-commerce operations support",
            "effort": "1-3 months",
            "why": "Sales, customer handling, and stock awareness already overlap with online order workflows.",
            "free_resource": "Google Digital Garage",
        },
        {
            "skill": "Basic bookkeeping and sales records",
            "effort": "1-3 months",
            "why": "Small businesses increasingly value workers who can track money and inventory more clearly.",
            "free_resource": "CFI financial literacy resources",
        },
    ],
    "7531": [
        {
            "skill": "Garment quality assurance",
            "effort": "1-3 months",
            "why": "Attention to fit, consistency, and finishing can transfer into line-based quality checks.",
            "free_resource": "Alison technical courses",
        },
        {
            "skill": "Online custom order management",
            "effort": "1-3 months",
            "why": "Tailoring becomes more resilient when paired with simple digital order handling and client communication.",
            "free_resource": "Google Digital Garage",
        },
    ],
    "2330": [
        {
            "skill": "Digital literacy facilitation",
            "effort": "1-3 months",
            "why": "Teaching skill transfers well into practical training for first-time users of digital tools.",
            "free_resource": "Google Digital Garage",
        },
        {
            "skill": "Structured learning support",
            "effort": "1-3 months",
            "why": "Lesson planning and learner support can broaden into tutoring, program delivery, and educational facilitation.",
            "free_resource": "Coursera - Digital Skills: User Experience (audit mode)",
        },
    ],
    "2513": [
        {
            "skill": "Quality assurance testing",
            "effort": "1-3 months",
            "why": "Testing and debugging are accessible extensions of software problem-solving skills.",
            "free_resource": "Google Career Certificates - digital support resources",
        },
        {
            "skill": "IT support operations",
            "effort": "1-3 months",
            "why": "Developer troubleshooting habits also translate into entry-level systems and user support roles.",
            "free_resource": "Cisco Networking Academy - IT Essentials",
        },
    ],
    "5141": [
        {
            "skill": "Appointment and client record management",
            "effort": "1-3 months",
            "why": "Service workers become more resilient when repeat clients and schedules are handled more systematically.",
            "free_resource": "Google Digital Garage",
        },
        {
            "skill": "Product advisory and retail support",
            "effort": "1-3 months",
            "why": "Beauty work already depends on trust and recommendation, which carries into product-led income streams.",
            "free_resource": "CFI financial literacy resources",
        },
    ],
    "default": [
        {
            "skill": "Digital record keeping",
            "effort": "1-3 months",
            "why": "Basic digital administration makes many informal skills easier to explain and reuse in other settings.",
            "free_resource": "Google Digital Garage",
        },
        {
            "skill": "Customer support workflows",
            "effort": "1-3 months",
            "why": "Clear communication and repeatable service processes raise portability in many local labor markets.",
            "free_resource": "Cisco Networking Academy - IT Essentials",
        },
    ],
}


def _extract_json(content: str) -> dict[str, Any]:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def _run_json_completion(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    if client is None:
        raise RuntimeError("GROQ_API_KEY is not configured")
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return _extract_json(response.choices[0].message.content)


def _preferred_locale(payload: dict) -> str:
    return str(payload.get("ui_locale") or "en").lower()


def _preferred_language_label(payload: dict) -> str:
    return str(payload.get("ui_language_label") or "English")


def _normalized_follow_up_answers(payload: dict):
    answers = []
    for item in payload.get("follow_up_answers", []):
        if isinstance(item, dict):
            question = str(item.get("question") or item.get("label") or "").strip()
            answer = str(item.get("answer") or item.get("value") or "").strip()
            if question and answer:
                answers.append({"question": question, "answer": answer})
    return answers


def _combined_experience_text(payload: dict) -> str:
    follow_ups = _normalized_follow_up_answers(payload)
    combined = [str(payload.get("informal_description") or "")]
    for item in follow_ups:
        combined.append(f"{item['question']}: {item['answer']}")
    return " ".join(combined).strip().lower()


def _fallback_profile_rule(description: str) -> dict[str, Any]:
    broad_rules = [
        ("7126", ["pipe", "water", "tap", "toilet", "drain", "pump", "leak"]),
        ("2330", ["teach", "teacher", "tutor", "lesson", "class"]),
        ("7531", ["tailor", "sew", "garment", "alteration"]),
        ("5141", ["hair", "barber", "salon", "beauty"]),
        ("2513", ["software", "developer", "coding", "website", "frontend", "backend"]),
        ("7231", ["car", "vehicle", "engine", "garage", "motorcycle"]),
        ("7421", ["repair", "fix", "diagnose", "install", "device", "electronic", "laptop", "phone"]),
        ("5223", ["sell", "sales", "shop", "store", "cash", "customer"]),
    ]
    for unit_code, keywords in broad_rules:
        if any(keyword in description for keyword in keywords):
            return next(rule for rule in PROFILE_RULES if rule["unit_code"] == unit_code)
    return next(rule for rule in PROFILE_RULES if rule["unit_code"] == "5223")


def _best_profile_rule_match(description: str) -> tuple[dict[str, Any], int]:
    selected = None
    best_hits = 0
    for rule in PROFILE_RULES:
        hits = sum(keyword in description for keyword in rule["match"])
        if hits > best_hits:
            best_hits = hits
            selected = rule

    if selected is None:
        return _fallback_profile_rule(description), 0

    return selected, best_hits


def _secondary_activity_signals(description: str, primary_unit_code: str) -> list[str]:
    secondary_patterns = [
        ("2330", ["teach", "teacher", "tutor", "quran", "lesson", "students"], "part-time teaching"),
        ("7231", ["motorcycle", "motorcycles", "motorbike", "mechanic", "garage", "engine"], "motorcycle repair"),
        ("7126", ["plumb", "pipe", "drain", "tap", "water pump", "leak"], "plumbing side work"),
        ("5223", ["sell", "sales", "shop", "store", "customer"], "sales and customer handling"),
    ]
    results = []
    for unit_code, keywords, label in secondary_patterns:
        if unit_code == primary_unit_code:
            continue
        if any(keyword in description for keyword in keywords):
            results.append(label)
    return results[:2]


def _profile_summary(unit_label: str, years_experience: int, locale: str) -> str:
    if locale == "ur":
        return (
            f"آپ نے {years_experience} سال کے عملی کام سے {unit_label} جیسا مضبوط پروفائل بنایا ہے، چاہے آپ کے پاس رسمی عہدہ نہ ہو۔ "
            "آپ کے تجربے میں مسئلہ حل کرنا، لوگوں سے کام لینا، اور خود سیکھ کر آگے بڑھنا واضح نظر آتا ہے۔ "
            "اس نقشے کی وجہ سے آپ کی مہارتیں ایک جگہ تک محدود نہیں رہتیں اور زیادہ وسیع لیبر مارکیٹ میں سمجھی جا سکتی ہیں۔"
        )
    if locale in {"roman-urdu", "roman_urdu", "rur"}:
        return (
            f"Aap ne {years_experience} saal ke amli kaam se {unit_label} jaisa mazboot profile banaya hai, chahe formal title na bhi ho. "
            "Aap ke tajurbe se masla hal karna, logon ke sath kaam karna, aur khud seekh kar aage barhna saaf nazar aata hai. "
            "Is mapping ki wajah se aap ki skills sirf ek jagah tak mehdood nahin rehtin aur wider labor market mein samjhi ja sakti hain."
        )
    return (
        f"You have built a real {unit_label.lower()} profile through {years_experience} years of hands-on work, even without a formal job title. "
        "Your experience shows practical troubleshooting, customer-facing work, and the ability to keep learning from real problems. "
        "That makes your skills legible beyond a single neighborhood or employer when they are mapped into a portable ISCO-08 profile."
    )


def _readiness_narrative(country_name: str, locale: str) -> str:
    if locale == "ur":
        return (
            f"آپ کے کام پر وہی خودکاری دباؤ نہیں ہے جو کسی امیر ملک میں اسی پیشے پر ہوتا ہے۔ "
            f"{country_name} میں غیر رسمی معیشت، کم خودکاری پھیلاؤ، اور عملی فیصلہ سازی کی اہمیت کی وجہ سے جگہ باقی ہے۔ "
            "سب سے زیادہ خطرہ ان حصوں کو ہے جو بار بار ایک جیسے طریقے سے ہوتے ہیں، جبکہ اعتماد، تشخیص، اور نئے مسئلے حل کرنے والی صلاحیت زیادہ مضبوط رہتی ہے۔ "
            "بہتر راستہ یہ ہے کہ آپ اپنی موجودہ مہارت کے قریب ایک نئی قابلِ استعمال مہارت شامل کریں، نہ کہ سب کچھ دوبارہ شروع کریں۔"
        )
    if locale in {"roman-urdu", "roman_urdu", "rur"}:
        return (
            f"Aap ke kaam par wahi automation pressure nahin hai jo kisi high-income market mein isi peshe par hota hai. "
            f"{country_name} mein informal economy, kam automation penetration, aur hands-on judgement ki ahmiyat ki wajah se kaafi jagah baqi hai. "
            "Sab se zyada khatra un hisson ko hai jo routine aur standard hain, jab ke trust, tashkhees, aur naye masail hal karne wali salahiyat zyada mazboot rehti hai. "
            "Behtar rasta yeh hai ke aap apni mojooda skills ke qareeb ek nayi usable skill add karein, na ke sab kuch dobara zero se shuru karein."
        )
    return (
        f"You are not facing the same automation pressure as a worker doing the same job in a high-income market. "
        f"In {country_name}, displacement is slowed by informality, lower automation penetration, and the continued value of hands-on judgement. "
        "The highest-risk parts of your work are the repetitive and standardized tasks, not the parts that depend on trust, diagnosis, or adaptation. "
        "Your best hedge is to layer in one adjacent technical skill that fits local demand rather than starting over from zero."
    )


def _localized_string(locale: str, english: str, urdu: str, roman_urdu: str) -> str:
    if locale == "ur":
        return urdu
    if locale in {"roman-urdu", "roman_urdu", "rur"}:
        return roman_urdu
    return english


def _fallback_interview_questions(locale: str):
    return [
        {
            "question_id": "task_scope",
            "question": _localized_string(
                locale,
                "What do you spend most of your time doing in this work?",
                "آپ اس کام میں زیادہ وقت کس چیز پر لگاتے ہیں؟",
                "Aap is kaam mein zyada waqt kis cheez par lagate hain?",
            ),
            "help_text": _localized_string(
                locale,
                "For example: repair, selling, teaching, installation, or troubleshooting.",
                "مثلاً مرمت، فروخت، پڑھانا، انسٹالیشن، یا مسئلہ حل کرنا۔",
                "Misal ke taur par: repair, selling, teaching, installation, ya troubleshooting.",
            ),
            "suggested_answers": [
                _localized_string(locale, "Mostly repair work", "زیادہ تر مرمت", "Zyada tar repair"),
                _localized_string(locale, "Mostly customer sales", "زیادہ تر گاہکوں سے ڈیل", "Zyada tar customer dealing"),
                _localized_string(locale, "A mix of both", "دونوں کا ملا جلا کام", "Dono ka mila jula kaam"),
            ],
        },
        {
            "question_id": "tools",
            "question": _localized_string(
                locale,
                "What tools or equipment do you use most often?",
                "آپ زیادہ تر کون سے اوزار یا آلات استعمال کرتے ہیں؟",
                "Aap zyada tar kaun se tools ya alat istemal karte hain?",
            ),
            "help_text": _localized_string(
                locale,
                "Mention real tools, apps, machines, or devices.",
                "اصل اوزار، ایپس، مشینیں، یا ڈیوائسز بتائیں۔",
                "Asal tools, apps, machines, ya devices batayein.",
            ),
            "suggested_answers": [],
        },
        {
            "question_id": "work_setting",
            "question": _localized_string(
                locale,
                "How do you usually work: alone, with a shop, or for other people?",
                "آپ عام طور پر کیسے کام کرتے ہیں: اکیلے، دکان کے ساتھ، یا دوسروں کے لیے؟",
                "Aap aam tor par kaise kaam karte hain: akelay, shop ke sath, ya doosron ke liye?",
            ),
            "help_text": _localized_string(
                locale,
                "This helps show whether your work is self-employed, informal, or attached to a business.",
                "اس سے پتہ چلتا ہے کہ آپ کا کام خود مختار ہے، غیر رسمی ہے، یا کسی کاروبار سے جڑا ہوا ہے۔",
                "Is se pata chalta hai ke aap ka kaam self-employed hai, informal hai, ya kisi business se jura hua hai.",
            ),
            "suggested_answers": [
                _localized_string(locale, "I work for myself", "میں اپنے لیے کام کرتا/کرتی ہوں", "Main apne liye kaam karta/karti hoon"),
                _localized_string(locale, "I work in or with a shop", "میں دکان میں یا دکان کے ساتھ کام کرتا/کرتی ہوں", "Main shop mein ya shop ke sath kaam karta/karti hoon"),
                _localized_string(locale, "I work for clients or an employer", "میں گاہکوں یا کسی آجر کے لیے کام کرتا/کرتی ہوں", "Main clients ya employer ke liye kaam karta/karti hoon"),
            ],
        },
        {
            "question_id": "learning",
            "question": _localized_string(
                locale,
                "How did you learn this work?",
                "آپ نے یہ کام کیسے سیکھا؟",
                "Aap ne yeh kaam kaise seekha?",
            ),
            "help_text": _localized_string(
                locale,
                "For example: family business, apprenticeship, YouTube, school, or on the job.",
                "مثلاً خاندانی کاروبار، شاگردی، یوٹیوب، اسکول، یا کام کرتے ہوئے۔",
                "Misal ke taur par: family business, apprenticeship, YouTube, school, ya kaam karte hue.",
            ),
            "suggested_answers": [],
        },
    ]


def heuristic_interview_questions(payload: dict, country_config: dict):
    locale = _preferred_locale(payload)
    combined = _combined_experience_text(payload)
    questions = _fallback_interview_questions(locale)

    if "customer" in combined or "sell" in combined or "shop" in combined:
        questions = [question for question in questions if question["question_id"] != "work_setting"] + [
            {
                "question_id": "customer_mix",
                "question": _localized_string(
                    locale,
                    "What do customers usually come to you for first?",
                    "گاہک سب سے پہلے آپ کے پاس عموماً کس کام کے لیے آتے ہیں؟",
                    "Customers sab se pehle aap ke paas aam tor par kis kaam ke liye aate hain?",
                ),
                "help_text": _localized_string(
                    locale,
                    "This helps separate repair, sales, and advisory work.",
                    "اس سے مرمت، فروخت، اور مشورے والے کام میں فرق سمجھ آتا ہے۔",
                    "Is se repair, sales, aur advisory kaam mein farq samajh aata hai.",
                ),
                "suggested_answers": [
                    _localized_string(locale, "Repair", "مرمت", "Repair"),
                    _localized_string(locale, "Buying advice", "خریداری کا مشورہ", "Buying advice"),
                    _localized_string(locale, "Accessories or products", "لوازمات یا مصنوعات", "Accessories ya products"),
                ],
            }
        ]

    questions = questions[:4]
    summary = _localized_string(
        locale,
        "You already gave enough to show this is real work. A few short follow-up questions will make the profile more accurate.",
        "آپ نے اتنی معلومات دے دی ہیں کہ یہ حقیقی کام نظر آتا ہے۔ چند مختصر سوالات سے پروفائل زیادہ درست ہو جائے گا۔",
        "Aap ne itni maloomat de di hain ke yeh haqeeqi kaam lagta hai. Chand mukhtasar sawalat se profile zyada durust ho jayega.",
    )
    return {
        "summary_for_user": summary,
        "interview_confidence": 0.52,
        "follow_up_questions": questions,
    }


def heuristic_profile_mapping(payload: dict, country_config: dict):
    locale = _preferred_locale(payload)
    description = _combined_experience_text(payload)
    selected, best_hits = _best_profile_rule_match(description)

    unit = get_isco_unit(selected["unit_code"])
    years_experience = int(payload.get("years_experience", 0))
    score_base = 55 + min(years_experience * 3, 15)
    portability_score = min(score_base + (8 if len(payload.get("languages", [])) > 1 else 0), 92)
    confidence = 0.87 if best_hits >= 2 else 0.71 if best_hits == 1 else 0.54

    informal_skills = list(selected["informal"][:6])
    for signal in _secondary_activity_signals(description, unit["code"]):
        if signal not in informal_skills:
            informal_skills.append(signal)

    return {
        "isco_major_group": unit["major_group"],
        "isco_major_label": get_major_group_label(unit["major_group"]),
        "isco_unit_code": unit["code"],
        "isco_unit_label": unit["label"],
        "esco_skills": selected["esco_skills"][:6],
        "informal_skills_extracted": informal_skills[:6],
        "credential_labor_market_signal": (
            "Low - informal skills are real but may be hard for formal employers to verify quickly."
        ),
        "portability_score": portability_score,
        "portability_note": "Profile is portable across labor markets using the ISCO-08 occupational standard.",
        "profile_summary": _profile_summary(unit["label"], years_experience, locale),
        "confidence": round(confidence, 2),
    }


def heuristic_readiness_assessment(payload: dict, country_config: dict, calibrated_probability: float):
    locale = _preferred_locale(payload)
    risk_level = "low" if calibrated_probability < 0.35 else "moderate" if calibrated_probability < 0.65 else "high"
    horizon = "7-10 years" if calibrated_probability < 0.35 else "5-10 years" if calibrated_probability < 0.65 else "2-5 years"
    esco_skills = payload.get("esco_skills", [])
    informal_skills = payload.get("informal_skills_extracted", [])
    skills_at_risk = [
        {
            "skill": esco_skills[0] if esco_skills else "routine task execution",
            "risk": "high" if calibrated_probability >= 0.55 else "moderate",
            "reason": "The most standardized parts of this work are the first pieces to be digitized or supported by automated tools.",
        },
        {
            "skill": esco_skills[1] if len(esco_skills) > 1 else "record keeping",
            "risk": "moderate",
            "reason": "Simple logging, inventory, and workflow tracking are increasingly handled by low-cost software.",
        },
    ]
    durable_skills = [
        {
            "skill": informal_skills[0] if informal_skills else "adaptive troubleshooting",
            "risk": "low",
            "reason": "Real-world variation, incomplete information, and context-specific judgement make this hard to automate fully.",
        },
        {
            "skill": informal_skills[1] if len(informal_skills) > 1 else "customer trust-building",
            "risk": "low",
            "reason": "Relationship-based work still depends heavily on human trust and local credibility.",
        },
        {
            "skill": "self-directed learning",
            "risk": "low",
            "reason": "Learning quickly is a resilience skill that helps you move into adjacent work as markets shift.",
        },
    ]
    adjacent = READINESS_ADJACENCIES.get(payload.get("isco_unit_code"), READINESS_ADJACENCIES["default"])
    return {
        "risk_level": risk_level,
        "risk_horizon_years": horizon,
        "skills_at_risk": skills_at_risk,
        "durable_skills": durable_skills,
        "adjacent_skills_recommended": adjacent[:2],
        "narrative": _readiness_narrative(country_config["name"], locale),
    }


async def generate_interview_questions(payload: dict, country_config: dict):
    prompt = INTERVIEW_USER.format(
        country=country_config["name"],
        ui_language_label=_preferred_language_label(payload),
        education_level=payload["education_level"],
        years_experience=payload["years_experience"],
        age=payload["age"],
        languages=json.dumps(payload.get("languages", []), ensure_ascii=False),
        informal_description=payload["informal_description"],
    )

    try:
        response = await asyncio.to_thread(_run_json_completion, INTERVIEW_SYSTEM, prompt)
        response["interview_confidence"] = max(0.0, min(float(response.get("interview_confidence", 0.5)), 1.0))
        cleaned = []
        for item in response.get("follow_up_questions", [])[:4]:
            if not isinstance(item, dict):
                continue
            cleaned.append(
                {
                    "question_id": str(item.get("question_id") or f"question_{len(cleaned) + 1}"),
                    "question": str(item.get("question") or "").strip(),
                    "help_text": str(item.get("help_text") or "").strip(),
                    "suggested_answers": [
                        str(answer).strip() for answer in item.get("suggested_answers", []) if str(answer).strip()
                    ][:4],
                }
            )
        response["follow_up_questions"] = [item for item in cleaned if item["question"]]
        return response
    except Exception:
        return heuristic_interview_questions(payload, country_config)


async def generate_profile_mapping(payload: dict, country_config: dict, esco_skills: list[str]):
    candidates = []
    description = _combined_experience_text(payload)
    matched_rule, matched_hits = _best_profile_rule_match(description)
    for rule in PROFILE_RULES:
        if any(keyword in description for keyword in rule["match"]):
            unit = get_isco_unit(rule["unit_code"])
            if unit:
                candidates.append({"code": unit["code"], "label": unit["label"]})

    prompt = SKILLS_MAPPING_USER.format(
        country=country_config["name"],
        ui_language_label=_preferred_language_label(payload),
        education_level=payload["education_level"],
        years_experience=payload["years_experience"],
        informal_description=payload["informal_description"],
        languages=json.dumps(payload.get("languages", []), ensure_ascii=False),
        follow_up_answers=json.dumps(_normalized_follow_up_answers(payload), ensure_ascii=False),
    )
    if candidates:
        prompt += f"\nReference occupations to consider: {json.dumps(candidates, ensure_ascii=False)}"
    if esco_skills:
        prompt += f"\nReference ESCO skills list (sample): {json.dumps(esco_skills[:60], ensure_ascii=False)}"

    try:
        response = await asyncio.to_thread(_run_json_completion, SKILLS_MAPPING_SYSTEM, prompt)
        unit = get_isco_unit(str(response.get("isco_unit_code", "")))
        if not unit:
            raise ValueError("Groq returned an unknown ISCO code")
        if matched_hits >= 2 and unit["code"] != matched_rule["unit_code"]:
            return heuristic_profile_mapping(payload, country_config)
        response["isco_unit_code"] = unit["code"]
        response["isco_unit_label"] = unit["label"]
        response["isco_major_group"] = unit["major_group"]
        response["isco_major_label"] = get_major_group_label(unit["major_group"])
        response["esco_skills"] = [skill for skill in response.get("esco_skills", []) if isinstance(skill, str)][:6]
        response["informal_skills_extracted"] = [
            skill for skill in response.get("informal_skills_extracted", []) if isinstance(skill, str)
        ][:6]
        response["portability_score"] = max(0, min(int(response.get("portability_score", 65)), 100))
        response["confidence"] = max(0.0, min(float(response.get("confidence", 0.65)), 1.0))
        return response
    except Exception:
        return heuristic_profile_mapping(payload, country_config)


async def generate_readiness_assessment(
    payload: dict,
    country_config: dict,
    isco_unit_label: str,
    raw_probability: float,
    calibrated_probability: float,
):
    prompt = READINESS_USER.format(
        isco_unit_label=isco_unit_label,
        isco_unit_code=payload["isco_unit_code"],
        country_name=country_config["name"],
        country_code=payload["country_code"],
        ui_language_label=_preferred_language_label(payload),
        calibration_factor=country_config["lmic_calibration_factor"],
        raw_probability=raw_probability,
        calibrated_probability=calibrated_probability,
        esco_skills=json.dumps(payload.get("esco_skills", []), ensure_ascii=False),
        informal_skills_extracted=json.dumps(payload.get("informal_skills_extracted", []), ensure_ascii=False),
        country_context_note=country_config["context_note"],
    )
    try:
        response = await asyncio.to_thread(_run_json_completion, READINESS_SYSTEM, prompt)
        response["skills_at_risk"] = response.get("skills_at_risk", [])[:5]
        response["durable_skills"] = response.get("durable_skills", [])[:5]
        response["adjacent_skills_recommended"] = response.get("adjacent_skills_recommended", [])[:3]
        return response
    except Exception:
        return heuristic_readiness_assessment(payload, country_config, calibrated_probability)
