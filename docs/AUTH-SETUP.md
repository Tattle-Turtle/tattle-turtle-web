# Auth setup (Supabase)

**Auth is currently removed.** The app runs without login. The server uses a single parent identity from the environment so all data is scoped to that user.

## No-login mode (current)

1. **Create one parent user in Supabase** (so `child_profile.parent_id` has a valid `auth.users.id`):
   - Supabase Dashboard → **Authentication** → **Users** → **Add user** (email + password). Copy the user’s **UUID**.

2. **Set in `.env.local`:**
   - `DEFAULT_PARENT_ID=<paste-uuid>`  
   With this set, every API request without a Bearer token is treated as that parent. The client does not send a token, so the app works without any login screen.

3. **Other env (still required for DB):**
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` so the server can read/write Supabase (e.g. `child_profile`, `messages`).

## Behavior

- **Landing:** “Add your first child” / “Parent portal” goes to parent or setup; “I have a code” goes to child code entry.
- **Parent portal:** Add children, view reports, celebrations. No sign-in; server uses `DEFAULT_PARENT_ID`.
- **Child code:** Child (or parent on their device) goes to **/play**, enters the code; server verifies against the default parent’s children and returns `child_id`; client then loads the talk screen.
- **/login:** Route shows the parent portal (no login form).

## Re-enabling auth later

To bring back Supabase Auth and login UI you would:

- Restore client: `getSession` / `onAuthStateChange`, send `Authorization: Bearer <token>` in API requests.
- Server: in `requireAuth`, stop using `DEFAULT_PARENT_ID` when a valid token is present (keep validating JWT and set `req.user` from it).
- Optionally keep `DEFAULT_PARENT_ID` as fallback for development when no token is sent.
