import os
from fastapi import FastAPI

app = FastAPI(title="FreshGroup API", version="1.0.0")

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "FreshGroup API (minimal test)",
        "docs": "/docs",
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Railway injects PORT
    uvicorn.run(app, host="0.0.0.0", port=port)
