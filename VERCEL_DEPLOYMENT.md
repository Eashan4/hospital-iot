# Vercel Deployment Guide

Your codebase has been fully updated and configured to deploy to Vercel!

## 1. What Changed?
- Added `vercel.json` to route API traffic to the Python backend and serve the `dashboard/` directory directly.
- Added `api/index.py`, which Vercel requires to use Python Serverless Functions.
- Updated `app.js`. Since Vercel Serverless Functions **do not support persistent WebSockets**, I wrote a fallback into the Javascript. The dashboard will now try to connect via WebSocket, immediately realize it's on Vercel, and silently fall back to fetching live data every 3 seconds via standard HTTP polling. So your live vitals will still update!

## 2. Pushing to GitHub
All of these changes have already been successfully pushed to your GitHub repository:
[https://github.com/Eashan4/hospital-iot](https://github.com/Eashan4/hospital-iot)

## 3. Deploying to Vercel

1. Go to [Vercel](https://vercel.com/) and create a free account if you haven't already.
2. Click **Add New Project**.
3. Connect your GitHub account and select the **`hospital-iot`** repository.
4. Leave the Framework Preset as **Other**.
5. Open the **Environment Variables** section and add the exact connection string for your Supabase PostgreSQL database:
   - **Name:** `DATABASE_URL`
   - **Value:** `postgresql+asyncpg://postgres:i2bJBN$L4@Lp.g-@db.uardwuhacfsvlklekugb.supabase.co:5432/postgres`
   *(Also add `JWT_SECRET` with any random secure phrase).*
6. Click **Deploy**.

Vercel will build the Python environment automatically. Once finished, it will provide you with a live URL (e.g., `https://hospital-iot.vercel.app/dashboard/`).
