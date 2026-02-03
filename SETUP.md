# StatBot Setup — Super Simple Version

## What You're Doing
Putting your app on the internet so your dad can use it from any browser.

## Total Time: 10-15 minutes

---

## Step 1: Get an API Key

1. Go to **https://console.anthropic.com**
2. Click **Sign Up** → create free account
3. Click **API Keys** on the left
4. Click **Create API Key**
5. Give it any name (like "StatBot")
6. **COPY THE KEY** — save it in a notepad. You'll need it in Step 2.

---

## Step 2: Upload to Vercel

1. Go to **https://vercel.com**
2. Click **Sign Up** → create free account
3. Click **New Project**
4. Click **Upload** (not "Import from Git")
5. **Drag the statbot-project folder** into the upload box
6. Wait a few seconds for it to upload
7. **BEFORE clicking Deploy:**
   - Look for **"Environment Variables"** section
   - Click **Add New**
   - In "Name" box type: **ANTHROPIC_API_KEY**
   - In "Value" box paste the key you saved in Step 1
   - Click **Add**
8. Now click **Deploy**
9. Wait 10-15 seconds
10. You'll see a URL like: **https://statbot-yourname.vercel.app**

**Send that URL to your dad — he just opens it in any browser!**

---

## Troubleshooting

**"API Error" when I try to use the app:**
- Check Step 2 #7 — make sure you added the environment variable with the EXACT name **ANTHROPIC_API_KEY** (copy/paste it to be safe)
- Make sure the value is the full key starting with **sk-ant-api-**

**"Can't find the Environment Variables section":**
- After uploading, look for a section called "Environment Variables" or "Settings" before the Deploy button
- It might be collapsed/hidden — look for an arrow or "Show More"

**Still stuck?**
Tell me exactly what error message you see and I'll help fix it!

---

## Cost
- Vercel: **FREE**
- Anthropic: **$5 free credit** = ~150-200 R code generations before you need to add money
