# Local development (testing new features before Vercel)

You deploy to Vercel for production, but test new features locally first. That’s the right approach.

## One token for both local and Vercel (recommended)

To use a **single login token** on both localhost and the deployed site:

1. **Use your local `.env` as the source of truth**  
   Ensure `.env` has one line (no spaces around `=`). The app trims the value, but avoid pasting extra newlines:
   ```bash
   JWT_SECRET=<your-secret-value>
   ```
   After changing or syncing `JWT_SECRET`, **log out and log in once** so a new token is issued with the current secret.

2. **Set the same value in Vercel (backend project)**  
   - Open [Vercel Dashboard](https://vercel.com/dashboard) → your **backend** project.  
   - Go to **Settings** → **Environment Variables**.  
   - Add or edit **`JWT_SECRET`** and paste the **exact same value** as in your local `.env` (copy the value from the line `JWT_SECRET=...`).  
   - Apply to **Production** (and Preview if you use it). Save.

3. **Redeploy the backend**  
   Trigger a new deployment (e.g. push a commit or use “Redeploy” in Vercel) so the backend picks up the updated `JWT_SECRET`.

4. **Restart your local server**  
   Restart the Node backend locally so it loads `.env` again.

After this, a token from **either** a local login or a Vercel login will be accepted by **both** your local API and the Vercel API. No need to log in again when switching between local and deployed.

---

## Why you see “invalid signature” locally (before syncing)

- The **token** in your browser was issued by the **Vercel backend** (signed with Vercel’s `JWT_SECRET`).
- Your **local** backend verifies with **local** `JWT_SECRET` from `.env`.
- If the two secrets differ → **“JsonWebTokenError: invalid signature”**.

Syncing `JWT_SECRET` as above fixes this.

## If you don’t sync the secret

When testing on **localhost** only:

1. Open your local app (e.g. `http://localhost:5173`).
2. Log out or clear `auth-token` in Application → Local Storage.
3. Log in again on that local URL so the token is issued by your local backend.

Then that token works only for the local API until you log in again on the deployed site.
