import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import ALLOW_ORIGINS
from routes import auth, users, dashboard, students, clusters, cluster_playground, datasets, reports

app = FastAPI(title="FreshGroup API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
for module in [auth, users, dashboard, students, clusters, cluster_playground, datasets, reports]:
    app.include_router(module.router)

# Health route (to avoid 404 on root)
@app.get("/")
def health():
    return {"status": "ok", "service": "FreshGroup API"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))  # Railway injects $PORT
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
