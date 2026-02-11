# Backend Deployment Guide 

**Purpose:** Deploy the NexaCare **backend (API server)** so the frontend on Vercel can talk to it.  
**Repo:** Same repository — [github.com/itspatilakash/nexacare-medical-system](https://github.com/itspatilakash/nexacare-medical-system)  
**Frontend:** Already deployed on Vercel. You will get the backend URL to share so the frontend can be configured.

---

## 1. Repo link and what to deploy

- **Repository:** `https://github.com/itspatilakash/nexacare-medical-system`
- **Branch:** `main` (or the branch you use for production)
- **What to deploy:** Only the **backend** (Node/Express server in `server/`). The repo also has `client/` (frontend) — ignore it for this deployment; the frontend is already on Vercel.

---

## 2. Suggested hosting for the backend

Use a **Node-friendly** host that runs a long-lived process (not serverless):

- **Railway** — simple, good for first production deploy
- **Render** — free tier, then paid
- **Fly.io** — global, good defaults
- **Hetzner / AWS / GCP** — if you already use them

**Do not** deploy the backend to Vercel; it is built for frontend/serverless, not this Express server.

---

## 3. Build and run commands (from repo root)

These assume the deployment **root is the repository root** (not `server/`).

| Step | Command |
|------|--------|
| Install dependencies | `npm install` |
| Build the server | `npm run build:server` |
| Start the server | `npm run start` |

- **Install command:** `npm install`
- **Build command:** `npm run build:server`
- **Start command:** `npm run start` (or `node dist/server/server/index.js`)
- **Port:** The app reads `process.env.PORT` (e.g. Railway/Render set this automatically). Default is 3000.

---

## 4. Environment variables (required and optional)

Set these in the hosting dashboard (e.g. Railway/Render **Environment** or **Variables**). **Do not** commit real values to the repo.

### Required for a working API

| Variable | Description | Example (no real secrets) |
|----------|-------------|----------------------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon or any Postgres) | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET` | Secret for signing auth tokens (use a long random string) | e.g. generate with `openssl rand -base64 32` |
| `NODE_ENV` | Set to `production` in production | `production` |

### Optional (can keep unset for initial deploy)

| Variable | Description |
|----------|-------------|
| `PORT` | Usually set by the host (Railway/Render/Fly). Default 3000. |
| `ENABLE_MEDICINE_REMINDERS` | Set to `false` to disable in-process scheduler. Or keep default and use external cron for `/api/cron/medicine-reminders`. |
| `CRON_API_KEY` | If you call the cron endpoint from an external cron service, set this and pass it as `?key=...`. |
| `PAYMENT_GATEWAY` | `razorpay` or `mock`. For real payments set Razorpay keys below. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | For Razorpay (only if using real payments). |
| `STORAGE_PROVIDER` | `s3`, `cloudinary`, or `local`. For file uploads. |
| `AWS_*`, `CLOUDINARY_*` | Only if using S3 or Cloudinary. |
| `EMAIL_PROVIDER`, `SMS_PROVIDER` | `sendgrid`/`resend`/`twilio` or `mock` for emails/SMS. |

---

## 5. Database (first-time production)

- **Neon (or any Postgres):** Create a **production** database (do not reuse the same DB as local if it had test data only).
- **Connection string:** Set `DATABASE_URL` in the host’s env to this production DB.
- **Schema:** Run migrations from your machine (or a one-off deploy step) **before** or right after first deploy:
  - From repo root: `npm run db:push`  
  - Ensure `DATABASE_URL` in your **local** `.env` points to the **production** DB when you run this (or use the host’s CLI if they provide one).
- **Seeding:** If you need initial data (hospitals, test users, etc.), run the seed script once against the production DB (again with `DATABASE_URL` set to production). Do not run seed in an automated deploy.

---

## 6. CORS (frontend on Vercel)

The server currently allows all origins (`cors()` with no options). So the Vercel frontend (e.g. `https://nexacare-medical-system.vercel.app`) will work without changes.

If you later want to restrict to the frontend only, set CORS origin to the Vercel URL (and any other allowed domains). That would require a small code change in `server/index.ts`.

---

## 7. What to give back to the frontend owner

After the backend is deployed:

1. **Backend URL** — e.g. `https://nexacare-medical-system-api.up.railway.app` (no trailing slash).
2. Ask them to set this in **Vercel** → Project → **Settings** → **Environment Variables**:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://your-backend-url.com`
3. They must **redeploy** the frontend on Vercel after adding/updating this variable.

---

## 8. Challenges when moving from local to production

| Challenge | What to do |
|-----------|------------|
| **Env vars only on your machine** | Every secret (DB, JWT, etc.) must be set in the hosting dashboard. No `.env` file is deployed. |
| **Database not reachable** | Use a **cloud** Postgres (Neon, Supabase, RDS, etc.). Localhost DB will not work from Railway/Render. |
| **Schema not applied** | Run `npm run db:push` (or your migration flow) once against the production `DATABASE_URL`. |
| **Build fails** | Ensure **root** of the deployment is the **repo root** (so `server/` and `shared/` exist). Use `npm run build:server` from root. |
| **Server crashes or 503** | Check logs on the host. Often: missing `DATABASE_URL` or `JWT_SECRET`, or DB not reachable (firewall/SSL). |
| **Frontend still calls localhost** | Frontend must have `VITE_API_BASE_URL` set in Vercel and be redeployed. |
| **Medicine reminders not running** | They run in-process. Either leave default (scheduler runs) or set `ENABLE_MEDICINE_REMINDERS=false` and call `/api/cron/medicine-reminders?key=...` from an external cron. |
| **File uploads / payments / email** | Optional. For first deploy you can keep storage/payment/email as mock; add real keys when needed. |

---

## 9. Quick checklist for first deploy

- [ ] Clone repo, use `main` (or your prod branch).
- [ ] Create production Postgres DB (e.g. Neon), get `DATABASE_URL`.
- [ ] Set on host: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
- [ ] Install: `npm install`, Build: `npm run build:server`, Start: `npm run start`.
- [ ] Run `npm run db:push` against production DB (with prod `DATABASE_URL`).
- [ ] (Optional) Seed once if needed.
- [ ] Note the backend URL and share it for `VITE_API_BASE_URL` on Vercel.
- [ ] Test: open Vercel frontend, log in, and check one API flow (e.g. appointments).

---

**Repo link to share:** `https://github.com/itspatilakash/nexacare-medical-system`
