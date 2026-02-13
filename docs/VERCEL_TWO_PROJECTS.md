# Vercel: Two projects (frontend + backend)

If the **root URL** (e.g. `nexacare-medical-system.vercel.app`) shows **backend source code** (e.g. `index.js` with `import express`) instead of the app, the domain is pointing at the **backend** project.

## Fix: Use two Vercel projects

### 1. Frontend project (main domain)

- **Repository:** Same repo
- **Root Directory:** `client`
- **Build Command:** `npm run build` (or your client build)
- **Output Directory:** `dist`
- **Domain:** Assign **`nexacare-medical-system.vercel.app`** to this project

The `client/vercel.json` rewrites ensure routes like `/register`, `/dashboard/patient` serve `index.html` (SPA).

### 2. Backend project (API only)

- **Repository:** Same repo
- **Root Directory:** *(leave empty = repo root)*
- **Build / Output:** Use existing root `vercel.json` (server build)
- **Domain:** Use a **different** URL, e.g. `nexacare-medical-system-backend.vercel.app`

Do **not** assign the main marketing domain to this project.

### 3. Frontend API URL

In the frontend (env or config), set the API base URL to the **backend** project URL (e.g. `https://nexacare-medical-system-backend.vercel.app`).

---

**Summary:** Main domain → frontend project (root = `client`). Backend → separate project with its own URL.
