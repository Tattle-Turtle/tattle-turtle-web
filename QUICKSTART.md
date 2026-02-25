# ⚡ Quick Start Guide

## 1. Fill in `.env.local` (2 minutes)

Open `.env.local` and replace the placeholder values:

```env
GEMINI_API_KEY="AIza..."        # Get from: https://ai.google.dev/
SUPABASE_URL="https://..."       # Get from: https://app.supabase.com/
SUPABASE_ANON_KEY="eyJ..."       # Get from: https://app.supabase.com/
```

### Get Gemini API Key
1. Visit https://ai.google.dev/
2. Click "Get API key in Google AI Studio"
3. Create API key
4. Copy and paste into `.env.local`

### Get Supabase Credentials
1. Visit https://app.supabase.com/
2. Create new project (or select existing)
3. Go to **Project Settings** → **API**
4. Copy **URL** and **anon/public key**
5. Paste into `.env.local`

## 2. Set up Database (1 minute)

In Supabase dashboard:
1. Click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `supabase-schema.sql` from this project
4. Copy entire contents
5. Paste and click **Run**

## 3. Verify & Run (30 seconds)

```bash
# Check configuration
npm run check-env

# If all checks pass, start the app
npm run dev
```

## 4. Open App

Visit: http://localhost:3000

---

## Troubleshooting

### ❌ "GEMINI_API_KEY: Not set"
- Open `.env.local`
- Make sure key starts with `AIza`
- Remove any quotes or extra spaces
- Restart server

### ❌ "SUPABASE_URL: Not set"
- Open `.env.local`
- Make sure URL starts with `https://`
- Must end with `.supabase.co`
- Restart server

### ❌ Database errors
- Go to Supabase SQL Editor
- Re-run `supabase-schema.sql`
- Check for error messages

### 🔄 After changing `.env.local`
Always restart the dev server:
```bash
Ctrl+C (to stop)
npm run dev (to restart)
```

---

## Next Steps

Once running:
1. ✅ Click "GET STARTED"
2. ✅ Complete setup wizard
3. ✅ Test chat with Shelly
4. ✅ Check Parent Portal

Need more help? See [SETUP.md](./SETUP.md) for detailed instructions.
