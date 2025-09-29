from fastapi import APIRouter, HTTPException
from fastapi_mail import FastMail, MessageSchema
from config import conf  # 👈 adjust if your config path is different

router = APIRouter()

@router.get("/test-mail")
async def test_mail():
    message = MessageSchema(
        subject="🚀 Test Email from FreshGroup",
        recipients=["youraddress@gmail.com"],  # replace with your Gmail
        body="<p>Hello! If you see this, FastAPI → Gmail SMTP is working ✅</p>",
        subtype="html",
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        return {"message": "Test email sent!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mail send failed: {str(e)}")
