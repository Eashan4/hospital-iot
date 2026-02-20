# Deployment Guide: Hospital IoT System

This guide outlines how to push your code to GitHub and deploy it to a cloud provider like Render or Heroku.

## 1. Push to GitHub

Since your project is now initialized as a Git repository (with the `venv/` and `.env` files correctly ignored), you just need to create a remote repository and push your code.

1. Go to [GitHub](https://github.com/new) and create a new repository (e.g., `hospital-iot-system`).
2. Do **not** initialize it with a README, .gitignore, or license (we already have those).
3. Copy the URL of your new repository.
4. Run the following commands in your terminal (make sure you are in `/Users/eashanjain/Documents/Iot project`):

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hospital-iot-system.git
git push -u origin main
```

## 2. Prepare Database for Production

Currently, your project uses a local MySQL database (`hospital_iot`). For production, you will need a hosted MySQL database.

1. Create a free hosted MySQL database on a provider like:
   - [Aiven](https://aiven.io/mysql)
   - [Railway](https://railway.app/)
   - [PlanetScale](https://planetscale.com/) (Note: PlanetScale requires SSL, which aiomysql supports).
2. Get your connection string credentials (Host, Port, User, Password, Database Name).

## 3. Deploy to Render (Recommended for FastAPI)

Render provides a free tier for web services that perfectly supports FastAPI/Uvicorn.

1. Create an account on [Render.com](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `hospital-iot-system` repository.
4. Configure the Web Service:
   - **Name**: `hospital-iot-backend` (or similar)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Scroll down to **Advanced** and click **Add Environment Variable**. Add the following variables (replacing values with your production database credentials):
   - `DB_USER`: (Your Prod DB User)
   - `DB_PASS`: (Your Prod DB Password)
   - `DB_HOST`: (Your Prod DB Host)
   - `DB_PORT`: (Your Prod DB Port, usually 3306)
   - `DB_NAME`: (Your Prod DB Name)
   - `JWT_SECRET_KEY`: (Generate a secure random string, e.g. using `openssl rand -hex 32`)
   - `MQTT_BROKER`: `broker.hivemq.com`
   - `PORT`: `10000` (Render explicitly sets this, but your code must listen to `0.0.0.0`)
6. Click **Create Web Service**.

Render will now build your virtual environment and start your FastAPI server. The dashboard will be available at `https://YOUR-RENDER-URL.onrender.com/dashboard/`.

## 4. Hardware Updates (ESP8266)

Once deployed, your backend URL changes from `http://your-local-ip:8000/` to `https://YOUR-RENDER-URL.onrender.com/`.

You must update the ESP8266 firmware:
1. Open `esp8266_firmware/esp8266_firmware.ino` in the Arduino IDE.
2. Change the `serverUrl` string from your local IP to your new Render URL:
   ```cpp
   String serverUrl = "https://YOUR-RENDER-URL.onrender.com/api/device/data";
   ```
3. Re-flash the ESP8266.

Your devices will now send data to the cloud dashboard!
