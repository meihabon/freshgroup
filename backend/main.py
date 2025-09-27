import os
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

# Include all routers
for module in [auth, users, dashboard, students, clusters, cluster_playground, datasets, reports]:
    app.include_router(module.router)

# Root route for Railway health checks
@app.get("/")
def root():
    return {"status": "ok", "service": "FreshGroup API"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Use Railway's PORT
    uvicorn.run(app, host="0.0.0.0", port=port)
