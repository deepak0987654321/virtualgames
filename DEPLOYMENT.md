# 🚀 FREE DEPLOYMENT GUIDE (No Domain Purchase Needed)

You asked for a free domain. The best way to get a URL like `virtualgames.fun` for free is to use a **Hosting Subdomain**. This gives you a public link (HTTPS) instantly.

## Option 1: Render (Best FREE Option)
Render offers a completely **Free Tier** for web services.
*Note: Your app will "sleep" after 15 minutes of inactivity and take 30s to wake up.*
*Warning: On the free tier, the SQLite database will reset if the server restarts. (For permanent data, you'd need a cloud database).*

1.  **Sign Up**: [Render.com](https://render.com).
2.  **New Web Service**: Click "New" -> "Web Service".
3.  **Connect GitHub**: Select your `virtualgames` repo.
4.  **Settings**:
    *   **Runtime**: Docker
    *   **Plan**: Free
5.  **Deploy**: It will go live at `virtualgames.onrender.com`.

## Option 2: Railway (Best Performance, Custom Domain)
Railway allows you to deploy the `Dockerfile` I created.
*Trial users get $5 of free credit, which lasts a few months.*

1.  **Sign Up**: Go to [Railway.app](https://railway.app) (Github login recommended).
2.  **New Project**: Click "New Project" -> "Deploy from Repo" -> Select your `virtualgames` repo.
3.  **Wait**: Railway will detect `Dockerfile` and build it automatically.
4.  **Get URL**:
    *   Once active, go to "Settings" -> "Domains".
    *   Click "Generate Domain" or Add your `virtualgather.games`.
    *   **This is your professional host.**

## 🌐 HOSTING ON VERCEL? (Read Carefully)
**Vercel is NOT recommended** for this specific app version because:
1.  **WebSockets**: Vercel Serverless functions crash with long-running WebSocket connections.
2.  **Database**: This app uses a local SQLite file (`virtualgames.sqlite`), which gets deleted every time Vercel redeploys (ephemeral filesystem).

### ✅ The Solution: Use Railway or Render
These platforms simulate a "Real Server" (VPS) which keeps your game running 24/7 and saves your database.

---

## 🌐 Custom Domain Guide (`virtualgather.games`)

If you want to use **`virtualgather.games`**, follow these steps on **Railway** (easiest):

1.  **Register the Domain**: First, ensure you have bought/registered `virtualgather.games` (e.g., on Namecheap, GoDaddy, or Squarespace).
2.  **Deploy Code**: Deploy this repository to **Railway** (Option 1 above).
3.  **Connect Domain**:
    *   In Railway, go to **Settings** -> **Domains**.
    *   Click **Custom Domain**.
    *   Enter `virtualgather.games`.
4.  **Update DNS**:
    *   Railway will give you a **CNAME** or **A Record**.
    *   Go to your Registrar (where you bought the domain).
    *   Add the record (e.g., CNAME `virtualgather.games` -> `virtualgames-prod.up.railway.app`).
5.  **Wait**: DNS propagates in 5-60 minutes. Your app will then resolve at your custom link!

