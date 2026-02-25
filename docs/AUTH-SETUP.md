# Auth setup (Supabase)

Multi-role auth uses Supabase Auth with roles stored in `public.profiles` and injected into the JWT via a database function.

## 1. Custom Access Token Hook

The migration creates `public.custom_access_token_hook(event jsonb)`. You must **register it** in the Supabase Dashboard so every issued token includes the `role` claim:

1. Open [Supabase Dashboard](https://app.supabase.com) → your project.
2. Go to **Authentication** → **Hooks** (or **Customize**).
3. Under **Customize Access Token**, set the hook to the function **`custom_access_token_hook`** (schema: `public`).

After this, new sign-ins will receive a JWT with `role` (admin | school | parent | child).

## 2. First admin

The first admin cannot be set by another admin. Create them manually after they sign up:

1. Have the user sign up (e.g. as a parent).
2. In Supabase Dashboard → **SQL Editor**, run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<the user auth.users id>';
```

Or get the user id from **Authentication** → **Users**, then run the same `UPDATE` with that id (UUID for Supabase users, or Firebase UID string for Firebase users).

## 3. Firebase (third-party auth)

If you use **Firebase** as a third-party auth provider in Supabase:

1. **Custom claim `role: 'authenticated'`**  
   Supabase needs the JWT `role` claim to grant the Postgres `authenticated` role. Set this for all Firebase users:
   - **Blocking function** (Firebase Identity Platform): `beforeUserCreated` / `beforeUserSignedIn` with `customClaims: { role: 'authenticated' }`, or  
   - **onCreate** Cloud Function + a one-time script with the Firebase Admin SDK to set `role: 'authenticated'` for existing users.

2. **App role (admin/school/parent/child)**  
   Firebase JWTs do not get the Custom Access Token Hook, so they only have `role: 'authenticated'`. The server looks up the app role from `profiles`; on first sign-in with a Firebase JWT it creates a profile with `role = 'parent'`. To make a Firebase user an admin, run in SQL:  
   `UPDATE public.profiles SET role = 'admin' WHERE id = '<firebase-uid>';`

3. **Restrictive RLS**  
   Restrictive policies are in place so only JWTs from this Supabase project or from the Firebase project **tattle-turtle** are accepted. If you use a different Firebase project ID, add a migration that updates `public.is_allowed_jwt()` to include that project’s `iss` and `aud`.

## 4. Environment

- **Server**: `SUPABASE_SERVICE_ROLE_KEY` is required for server-side writes (bypasses RLS). Add to `.env.local`; never expose to the client.
- **Client**: Browser auth uses the same `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Vite injects them). If unset, parent login will show "Auth not configured."

## 5. Roles

- **admin**: Full access; can set user roles via `PATCH /api/admin/users/:id/role`.
- **school**: For school officials (dashboard/invites can be added later).
- **parent**: Default for new signups; can add children and use parent portal.
- **child**: Reserved for future child accounts.

All roles are managed in the database and exposed in the JWT by the Custom Access Token Hook.
