# 🚀 Render Deployment Guide: Voice WebSocket Server (`voice-server.js`)

This guide explains step-by-step how to deploy your low-latency Node.js WebSocket Voice Server (`voice-server.js`) to **Render's Free Tier**.

---

## 📌 Prerequisites
1. A **Render account** (Sign up at [render.com](https://render.com) if you don't have one).
2. Your GitHub repository pushed to GitHub (e.g., `https://github.com/LMSWEBAPP/Vedika.git`).
3. Your **Gemini API Key**.

---

## 🛠️ Step 1: Create a New Web Service on Render

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** ➔ Select **Web Service**.
3. Connect your GitHub repository: `LMSWEBAPP/Vedika`.
4. Fill in the deployment details:

| Setting | Value |
| :--- | :--- |
| **Name** | `vedika-voice-server` (or any custom name) |
| **Region** | Oregon (US West) or Singapore (pick closest to your users) |
| **Branch** | `main` |
| **Root Directory** | `vedika/Vyomanta/frontend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node voice-server.js` |
| **Instance Type** | **Free** ($0 / month) |

---

## 🔑 Step 2: Configure Environment Variables on Render

In the Render Web Service setup page, scroll down to **Environment Variables** and add the following keys:

| Key | Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key |
| `NODE_ENV` | `production` | Production environment flag |
| `PORT` | `10000` *(Render auto-sets this)* | Required for Render port binding |

Click **Create Web Service**.

---

## 🌐 Step 3: Get Your Render WebSocket URL

Once Render completes the build, you will see a public URL at the top left of your Render Dashboard:
`https://vedika-voice-server.onrender.com`

Since WebSockets run over SSL on Render, your production WebSocket URL is:
`wss://vedika-voice-server.onrender.com/api/ws`

---

## ⚙️ Step 4: Update Frontend Environment Variable

In your Next.js frontend (e.g., in `.env.local` or Vercel Environment Variables), set:

```env
NEXT_PUBLIC_VOICE_WS_URL=wss://vedika-voice-server.onrender.com/api/ws
```

*In your Next.js code (`app/viva-interview/page.jsx` & `VoiceAgentView.jsx`), connect dynamically:*

```javascript
const wsUrl = process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://localhost:5001/api/ws';
const ws = new WebSocket(wsUrl);
```

---

## ⚡ Important Notes for Render Free Tier

1. **Native WebSocket Support**: Render natively supports WebSockets over HTTPS (`wss://`) on port `443`.
2. **Auto-Sleep (Spin Down)**: On Render's Free tier, the server spins down after **15 minutes of inactivity**.
   - When a user opens the Viva / Technical Interview page, the first WebSocket connection request will take **~15–25 seconds** to wake up the Render container.
   - Subsequent voice interactions will run at full low-latency speed.
3. **No Timeout Limits on WS**: Active WebSocket connections on Render will stay open as long as the user is speaking!
