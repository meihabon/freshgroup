# test_resend_email.py
from fastapi import FastAPI, HTTPException
import resend
import os

app = FastAPI()

# Load your Resend API key from environment
resend.api_key = os.getenv("RESEND_API_KEY")

@app.get("/test-resend")
async def test_resend():
    try:
        r = resend.Emails.send({
            "from": "onboarding@resend.dev",  # sandbox sender
            "to": "phbon7@gmail.com",          # your Gmail
            "subject": "🚀 Test Email from Resend",
            "html": "<p>Hello! This is a test from Resend ✅</p>"
        })
        return {"message": "Test email sent!", "response": r}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
