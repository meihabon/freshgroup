# Student Profiling & Clustering System

Full stack project using:

Frontend: React + TypeScript + Vite 
Backend: FastAPI (Python)  
Database: MySQL  

Project structure:
- backend/ → FastAPI app with routes, main.py, requirements.txt  
- frontend/ → React app with components, vite.config.ts, package.json  
- .gitignore, README.md  

How to run locally:

Backend:
cd backend  
python -m venv venv  
venv\Scripts\activate  (Windows)  
source venv/bin/activate  (Mac/Linux)  
pip install -r requirements.txt  
uvicorn main:app --reload  

Backend runs on http://127.0.0.1:8000  

Frontend:
cd frontend  
npm install  
npm run dev  

Frontend runs on http://localhost:5173  

Database:
Use MySQL. Import schema if provided.  
Set up backend/.env with:

DB_HOST=localhost  
DB_PORT=3306  
DB_USER=root  
DB_PASSWORD=yourpassword  
DB_NAME=yourdbname  

Deployment:
Frontend → Vercel or Netlify  
Backend → Railway or Render  
Database → Railway MySQL, PlanetScale, or other hosted MySQL  

Author: Princess Mylene (Capstone Project)  
