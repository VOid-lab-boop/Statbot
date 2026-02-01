# StatBot — Deploy Guide

Follow these steps exactly. No coding knowledge needed.

---

## Step 1 — Install Node.js (if you don't have it)

Go to **https://nodejs.org** → download the version that says **"LTS"** → install it. That's it.

---

## Step 2 — Get your Anthropic API Key

1. Go to **https://console.anthropic.com**
2. Create a free account
3. Go to **API Keys** in the left sidebar
4. Click **Create API Key** → give it any name (e.g. "StatBot")
5. **Copy the key** — you'll need it in Step 4

---

## Step 3 — Install project dependencies

1. Open your **Terminal** (on Mac) or **Command Prompt** (on Windows)
2. Navigate to this folder. Type:

```
cd path/to/statbot-project
```

3. Then run:

```
npm install
```

Wait for it to finish (takes ~30 seconds).

---

## Step 4 — Add your API key

1. Open the file called **.env.local** in this folder (use any text editor — Notepad, TextEdit, VS Code, anything)
2. Replace `your_api_key_here` with the key you copied in Step 2
3. Save the file

It should look like this:
```
ANTHROPIC_API_KEY=sk-ant-api-03-xxxxxxxxxxxxxxxxx
```

---

## Step 5 — Test it locally (optional but recommended)

Run this in your terminal:

```
npm run dev
```

Then open your browser and go to: **http://localhost:3000**

You should see StatBot! Try it out. When you're done, press **Ctrl + C** in the terminal to stop it.

---

## Step 6 — Deploy to Vercel (make it live on the internet)

1. Go to **https://vercel.com** → create a free account
2. Click **New Project** → choose **Import Git Repository**
3. If you don't have Git, that's fine — use this alternative:
   - Click **New Project** → **Upload** → drag and drop the **statbot-project** folder
4. Vercel will detect it's a Next.js project automatically
5. Before deploying, click **Environment Variables** and add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** (paste your key from Step 2)
   - Click **Add**
6. Click **Deploy**
7. Vercel gives you a live URL like `https://statbot-your-name.vercel.app`

**That's it — send that URL to your dad and he can use it from any browser!**

---

## How much does it cost?

- **Vercel:** Free plan is enough for personal/family use
- **Anthropic API:** You get $5 free credit when you sign up. Each R code generation uses roughly $0.01–$0.03, so that covers hundreds of requests before you need to add funds.

---

## Project structure (for reference)

```
statbot-project/
├── .env.local              ← your API key lives here
├── package.json            ← project config
├── next.config.js          ← Next.js config
├── README.md               ← this file
└── src/
    ├── app/
    │   ├── layout.js       ← page layout & title
    │   ├── page.js         ← entry point
    │   └── StatBot.js      ← the main app UI
    └── pages/
        └── api/
            └── generate.js ← secure backend (calls Anthropic)
```
