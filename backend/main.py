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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
