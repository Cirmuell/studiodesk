# Fix: Email confirmation links landing on lovable.app instead of Vercel

## Why this happens
Your backend only trusts its own published URL (`studiodesk.lovable.app`) as a redirect target. When the confirmation link's `emailRedirectTo` points at `studiodesk-rouge.vercel.app` (not on the trusted list), the auth system silently falls back to the default site URL — so users land on lovable.app with the session tokens in the URL hash, and the app there errors out.

The redirect allow-list isn't directly editable on Lovable Cloud, so instead of fighting it, we add a tiny "bounce" step on the lovable.app side.

## Plan

1. **Add an auth-callback bounce in the app** (runs on `studiodesk.lovable.app`):
   - In the root/index route, detect when the page loads with `#access_token=...&type=signup` (or `recovery`) in the URL hash **and** the hostname is `studiodesk.lovable.app`.
   - Immediately redirect the browser to `https://studiodesk-rouge.vercel.app/auth` **preserving the full hash**, so the Vercel deployment receives the tokens and the Supabase client there picks up the session automatically.
   - If the hostname is already the Vercel domain (same codebase deployed there), skip the bounce and let the session be established, then navigate to the dashboard.

2. **Handle the token hash gracefully on `/auth`**:
   - On the auth page, if a session is detected after the hash is processed, show a brief "Email confirmed — signing you in…" state and route to the dashboard instead of the blank/error page.

3. **Keep `emailRedirectTo` pointing at the Vercel URL** (already done) — once you redeploy this code to Vercel, even links that fall back to lovable.app will hop straight over to Vercel with the session intact.

## Technical notes
- Files touched: `src/routes/index.tsx` (or `__root.tsx`) for the hash detection + bounce, and `src/routes/auth.tsx` for the confirmed-session handling.
- No backend/database changes required.
- You'll need to redeploy to Vercel after these changes for the flow to work end-to-end.
