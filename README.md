# Hospital IoT - Bed Occupancy & Patient Vital Monitoring System

Real-time IoT-based hospital monitoring system with AI anomaly detection, WebSocket streaming, and a 3D animated dashboard.

## Tech Stack

- **Backend**: Python FastAPI + SQLAlchemy
- **Database**: PostgreSQL (Supabase)
- **Frontend**: HTML/CSS/JS + Three.js
- **IoT**: ESP8266 + MAX30100 sensors
- **AI**: LSTM-based anomaly detection

## Project Structure

```
├── backend/           # FastAPI backend
│   ├── main.py        # All routes, WebSocket, scheduler, AI
│   ├── config.py      # Configuration from environment
│   ├── database.py    # SQLAlchemy engine & session
│   ├── models.py      # ORM models
│   └── migrate.py     # Database migration script
├── dashboard/         # Frontend dashboard
│   ├── index.html     # Main HTML
│   ├── style.css      # Styles
│   ├── app.js         # Authentication & API
│   ├── dashboard.js   # Dashboard logic
│   └── three_scene.js # 3D visualization
├── firmware/          # ESP8266 Arduino code
├── api/               # Vercel serverless entry
│   └── index.py
├── schema.sql         # PostgreSQL schema
├── requirements.txt   # Python dependencies
├── vercel.json        # Vercel deployment config
└── docker-compose.yml # Docker setup
```

## Setup

### 1. Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secure-secret
HEARTBEAT_TIMEOUT=20
OFFLINE_CHECK_INTERVAL=10
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Initialize Database

```bash
cd backend
python migrate.py
```

### 4. Run Locally

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Dashboard: `http://localhost:8000/dashboard/`

### Default Login

- **Username**: `admin`
- **Password**: `admin123`

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Set `DATABASE_URL` and `JWT_SECRET` environment variables
4. Deploy

### Docker

```bash
docker-compose up -d
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/device/register` | Register new device |
| POST | `/api/device/data` | Receive sensor data |
| POST | `/api/device/heartbeat` | Device heartbeat |
| GET | `/api/dashboard/devices` | List all devices |
| GET | `/api/dashboard/device/{id}` | Device details |
| GET | `/api/dashboard/stats` | Overview statistics |
| GET | `/api/dashboard/alerts` | Alert list |
| WS | `/ws/live` | Real-time WebSocket feed |
