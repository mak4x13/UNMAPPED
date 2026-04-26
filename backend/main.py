from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import profile, readiness, opportunities, econdata, interview, policy

app = FastAPI(title="UNMAPPED API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(readiness.router, prefix="/api")
app.include_router(opportunities.router, prefix="/api")
app.include_router(econdata.router, prefix="/api")
app.include_router(policy.router, prefix="/api")
