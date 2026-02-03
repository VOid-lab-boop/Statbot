# StatBot

R Code Generator for Statistical Analysis

## How to Deploy This to Vercel

**IMPORTANT:** You're uploading the RIGHT files now. Do NOT add a .env.local file to GitHub (it's in .gitignore for security).

### Step 1: Upload These Files to GitHub
Upload all the files in this folder to a new GitHub repository.

### Step 2: Deploy on Vercel
1. Go to https://vercel.com
2. Click **New Project**
3. Click **Import Git Repository**
4. Connect your GitHub account
5. Select this repository
6. **BEFORE clicking Deploy:**
   - Click **Environment Variables**
   - Add: `ANTHROPIC_API_KEY` = (your key from console.anthropic.com)
7. Click **Deploy**

Done! Vercel will automatically install dependencies and build your app.

## Local Development (Optional)

If you want to test locally first:
```bash
npm install
# Create .env.local and add: ANTHROPIC_API_KEY=your_key_here
npm run dev
```

Then open http://localhost:3000
