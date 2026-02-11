# Deploy NexaCare Backend on Vercel (Step-by-Step)

Use this when your manager deploys the **backend (API)** on Vercel using the **Express** preset. The frontend is already on Vercel; this is a **separate Vercel project** for the API.

---

## Step 1: Create a **new** Vercel project for the backend (separate from frontend)

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** the same repo: `https://github.com/akash-patil-apps/nexacare-medical-system` (or your repo URL).
3. Select the **main** branch (or your production branch).
4. **Important:** This must be a **different project** from the one you use for the frontend. The frontend project has Root = `client`; the backend project must use the **repo root** (see Step 2).

---

## Step 2: Application Preset and Root Directory (critical)

1. In the project setup, find **"Application Preset"** and choose **"Express"**.
2. **Root Directory** — this must be the **repository root**, not `client`:
   - Click **Edit** next to Root Directory.
   - In the modal, select **"nexacare-medical-system (root)"** (the first option — the repo root).
   - Click **Continue**.
   - If Root Directory is **client**, you will see **"bash: scripts/vercel-build-server.sh: No such file or directory"** and the build will fail. The backend project must use the repo root so that `scripts/` and `server/` exist.

---

## Step 3: Build and output settings

The repo has a **`vercel.json`** at the root and a **`scripts/vercel-build-server.sh`** script that runs the server build from the repo root. That way the build works even if Vercel’s build runs from a subdirectory (e.g. `client`).

If the build still fails with “path does not exist: server/tsconfig.server.json”, **override in the dashboard** and set Build Command to exactly:

```bash
bash scripts/vercel-build-server.sh || bash ../scripts/vercel-build-server.sh
```

| Setting | Value |
|--------|--------|
| **Build Command** | `bash scripts/vercel-build-server.sh || bash ../scripts/vercel-build-server.sh` |
| **Output Directory** | **Leave completely blank** — do not type `dist`, `N/A`, or any value. The backend is a Node server; Vercel runs it from the repo root. If you see "No Output Directory named 'dist' (or 'A') found", clear the field so it is truly empty (toggle off any override). |
| **Install Command** | `npm install` |

---

## Step 4: Environment variables

In **Settings → Environment Variables**, add these (for **Production** and **Preview** if you use previews):

### Required

| Name | Value | Notes |
|------|--------|--------|
| `DATABASE_URL` | Your PostgreSQL connection string | e.g. Neon, Supabase. Must be reachable from the internet. |
| `JWT_SECRET` | A long random string | e.g. run `openssl rand -base64 32` and paste the result. |
| `NODE_ENV` | `production` | So the app runs in production mode. |

### Optional (can add later)

| Name | Value |
|------|--------|
| `ENABLE_MEDICINE_REMINDERS` | `false` | Recommended on Vercel (no long-running process). Use [Vercel Cron](https://vercel.com/docs/cron-jobs) or an external cron to call `/api/cron/medicine-reminders?key=YOUR_CRON_API_KEY`. |
| `CRON_API_KEY` | A secret string | Only if you call the cron endpoint from outside. |
| `PAYMENT_GATEWAY` | `mock` or `razorpay` | Plus Razorpay keys if you use real payments. |
| `CORS_ORIGIN` | Comma-separated URLs | Extra allowed origins for CORS (e.g. a custom frontend domain). Production already allows `*.vercel.app` and the main frontend URL. |

Do **not** commit real values; set them only in Vercel.

---

## Step 5: Deploy

1. Click **Deploy** (or save settings and let the first deployment run).
2. Wait for the build. It runs `npm install` and `npm run build:server`, then Vercel uses the root **index.js** as the Express entry.
3. If the build fails, check the logs (often missing env vars or Node version).

---

## Step 6: Get the backend URL and connect the frontend

1. After a successful deploy, open the **Deployment** and copy the URL (e.g. `https://nexacare-medical-system-api-xxx.vercel.app`).
2. **No trailing slash.** This is your **backend URL**.
3. In the **frontend** Vercel project (the one that serves the React app):
   - Go to **Settings → Environment Variables**.
   - Set **`VITE_API_BASE_URL`** = that backend URL (e.g. `https://nexacare-medical-system-api-xxx.vercel.app`).
   - **Redeploy** the frontend so the new env is applied.

Then the frontend will call `https://your-backend-url.vercel.app/api/...` for all API requests.

### If login returns 404 or “can’t login”

1. **Frontend must point to the backend**  
   In the **frontend** project, set **`VITE_API_BASE_URL`** to your backend URL (e.g. `https://nexacare-medical-system-backend.vercel.app`) with **no trailing slash**.  
   Then **redeploy the frontend** — Vite bakes this in at build time, so a new deployment is required.

2. **Check where the request goes**  
   In the browser, open DevTools → **Network**, try to log in (Sign In with password), and find the request to `/api/auth/login`.  
   - You may see **GET** `/api/auth/login` (e.g. from prefetch or other code); the backend returns **405 Method Not Allowed** for GET. Only **POST** is valid for login.  
   - Find the **POST** request when you click Sign In.  
     - If its URL is the **frontend** domain, the frontend build does not have the backend URL; set `VITE_API_BASE_URL` and **redeploy the frontend**.  
     - If the POST URL is the **backend** domain but you get **404**, the backend may not be receiving the request; check backend deployment and that the backend project’s Root Directory is the repo root.  
     - If the POST returns **200** but login still fails, check the response body and DB/seed (e.g. run `npm run db:push` and your seed script against the production `DATABASE_URL`).

3. **Backend and DB**  
   Ensure the **backend** project has **`DATABASE_URL`** and **`JWT_SECRET`** set.  
   Run **`npm run db:push`** (and optionally your seed script) against the **production** DB so the schema and seeded users exist; otherwise login will fail even if the request reaches the backend.

**CORS:** If the Network tab shows "CORS error" for the login request, the backend must allow your frontend origin. The latest backend code allows `*.vercel.app` and credentials; redeploy the backend. For a custom frontend domain, set `CORS_ORIGIN` (comma-separated) in the backend’s env vars.

---

## Step 7: Database (first-time)

- Use a **cloud** PostgreSQL (e.g. Neon, Supabase). Set `DATABASE_URL` in Vercel to that connection string.
- Apply the schema **once** from your machine (with `DATABASE_URL` pointing to the same DB):
  - From repo root: `npm run db:push`
- Optionally seed: `npm run seed:test` (or your seed script) with the same prod `DATABASE_URL` in your local `.env` for that run.

---

## TypeScript errors during build

The codebase currently has many TypeScript errors (schema types, Drizzle API, strict nulls). The Vercel build script is set up to **still produce output** so the backend can deploy (the script ignores the tsc exit code and only fails if `dist/server/server/index.js` is missing). The app may run; some code paths could hit runtime issues. Fixing the TypeScript errors in the codebase is recommended when you have time. Until then, deployment will continue to work.

---

## Important notes for backend on Vercel

| Topic | Detail |
|--------|--------|
| **Medicine reminders** | The in-process scheduler does **not** run on Vercel (no long-lived process). Set `ENABLE_MEDICINE_REMINDERS=false` and call `/api/cron/medicine-reminders?key=CRON_API_KEY` via [Vercel Cron](https://vercel.com/docs/cron-jobs) or an external cron (e.g. cron-job.org) every 15–30 minutes. |
| **CORS** | The server allows all origins. The Vercel frontend URL will work. |
| **Same repo, two projects** | One Vercel project = frontend (Root Directory = `client`). Second Vercel project = backend (Root Directory = empty, Express preset, build = `npm run build:server`). |
| **Function limits** | Single Express app = one serverless function. Stay within [Vercel function limits](https://vercel.com/docs/functions/limitations) (e.g. size, timeout). |

---

## Quick checklist

- [ ] New Vercel project from same repo (backend only).
- [ ] Application Preset = **Express**.
- [ ] Root Directory = **empty** (repo root).
- [ ] Build Command = **`npm run build:server`**.
- [ ] Env vars: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
- [ ] Deploy and copy backend URL.
- [ ] Set `VITE_API_BASE_URL` on **frontend** Vercel project and redeploy.
- [ ] Run `npm run db:push` against prod DB once.
- [ ] (Optional) Set `ENABLE_MEDICINE_REMINDERS=false` and set up cron for reminders.
