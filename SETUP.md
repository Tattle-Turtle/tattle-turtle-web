# Shelly the Safety Turtle - Setup Guide

## Quick Start (5 minutes)

### 1. Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in:
   - **Name**: `shelly-turtle` (or your choice)
   - **Database Password**: Save this securely
   - **Region**: Choose closest to you
4. Wait 2 minutes for project to initialize
5. Go to **Project Settings** → **API**
6. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (looks like: `eyJhbGci...`)

### 2. Set Up Your Database

1. In Supabase, go to the **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `supabase-schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

### 3. Get Your Gemini API Key

1. Go to [ai.google.dev](https://ai.google.dev/)
2. Click "Get API key in Google AI Studio"
3. Sign in with your Google account
4. Click "Create API Key"
5. Copy the key (starts with `AIza...`)

### 4. Configure Your App

1. In your project folder, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in your values:
   ```env
   GEMINI_API_KEY="AIza..."
   SUPABASE_URL="https://xxxxx.supabase.co"
   SUPABASE_ANON_KEY="eyJhbGci..."
   ```

### 5. Verify Your Configuration

Before running the app, check if everything is set up correctly:

```bash
npm run check-env
```

This will verify all your environment variables are valid.

### 6. Run the App

```bash
npm run dev
```

Or use the combined setup command:

```bash
npm run setup
```

Open [http://localhost:3000](http://localhost:3000)

## Verify Setup

### Check Database Connection

In Supabase:
1. Go to **Table Editor**
2. You should see tables: `messages`, `badges`, `child_profile`, etc.

### Check App Connection

1. Open the app at `http://localhost:3000`
2. Click "GET STARTED"
3. Fill in the setup wizard
4. If you see character creation, everything works!

## Troubleshooting

### "Shelly needs her magic key!" error

**Problem**: Gemini API key is missing or invalid

**Solution**:
- Check `.env.local` exists in project root
- Verify `GEMINI_API_KEY` is set correctly
- Try generating a new API key at [ai.google.dev](https://ai.google.dev/)
- Restart the dev server after changing `.env.local`

### "SUPABASE_URL and SUPABASE_ANON_KEY must be set" warning

**Problem**: Supabase credentials missing

**Solution**:
- Check `.env.local` exists
- Verify both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Make sure there are no extra spaces or quotes
- Restart the dev server

### Database errors when saving profile

**Problem**: Schema not created or columns missing

**Solution**:
1. Go to Supabase SQL Editor
2. Re-run the entire `supabase-schema.sql` file
3. Check for any error messages
4. Make sure all tables were created successfully

### Can't connect to localhost:3000

**Problem**: Port already in use

**Solution**:
```bash
# Find what's using port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

## Next Steps

Once your app is running:

1. **Create a Child Profile**
   - Click "GET STARTED"
   - Enter parent email/phone
   - Enter child's name and age
   - Choose character type and color
   - Wait for AI to generate character image

2. **Test Chat**
   - Click "LET'S PLAY"
   - Click "Brave Call"
   - Send a message to Shelly
   - Verify responses work

3. **Check Parent Portal**
   - Go back to home
   - Click "Parents Only"
   - View AI-generated report
   - Check safety status

## Database Schema

Your Supabase database includes:

- `messages` - Chat history
- `badges` - Earned achievements
- `child_profile` - Child settings and character info
- `child_requests` - Pending parent approval items
- `parent_reports` - AI-generated insights
- `memory` - AI context storage

## API Keys Security

**Important**: Never commit `.env.local` to git!

The `.gitignore` file already excludes:
- `.env.local`
- `.env`
- Any `.env.*` except `.env.example`

For production deployment:
- Use Vercel environment variables
- Never expose keys in client-side code
- Rotate keys if accidentally exposed

## Support

If you're still having issues:
1. Check the browser console for errors (F12)
2. Check the terminal running `npm run dev` for server errors
3. Verify all environment variables are set correctly
4. Make sure you're using Node.js v18 or higher
