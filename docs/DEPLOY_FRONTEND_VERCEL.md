# Deploy NexaCare Frontend on Vercel

Use this when the **root directory** of the project on Vercel is set to **`client`** (so Vercel builds only the frontend).

---

## 1. Build and output settings (exact values)

| Setting            | Value           | Toggle |
|--------------------|-----------------|--------|
| **Build Command**  | `npm run build` | On     |
| **Output Directory** | `dist`       | On     |
| **Install Command**  | `npm install` | On     |

Leave **Root Directory** as **`client`** (set when you import the repo).

---

## 2. Environment variables

You **must** add the backend API URL so the frontend can call your API. Until the backend is deployed, you can use a placeholder and redeploy later.

| Key                   | Value (example)                    | When to set |
|-----------------------|-------------------------------------|-------------|
| **VITE_API_BASE_URL** | `https://your-backend-url.com`      | When your manager gives you the live backend URL. Do **not** add a trailing slash. |

- **No backend yet:** Leave **VITE_API_BASE_URL** empty or omit it. The app will build and deploy, but API calls will go to the same domain (Vercel) and will 404 until you add the real URL and redeploy.
- **Backend ready:** Add **VITE_API_BASE_URL** with the full backend origin (e.g. `https://api.nexacare.com` or the URL from Railway/Render/etc.), then trigger a new deployment.

You can remove the example variable **EXAMPLE_NAME** if you don’t need it.

---

## 3. Domain

You don’t need a custom domain to start. Vercel will give you a URL like:

`https://your-project-name.vercel.app`

You can add a custom domain later in the project’s **Settings → Domains**.

---

## 4. Deploy

Click **Deploy**. The first build may take a couple of minutes.

After deploy:

- If **VITE_API_BASE_URL** is set: log in and use the app against the live backend.
- If it’s not set yet: when your manager deploys the backend and gives you the URL, add **VITE_API_BASE_URL** in **Settings → Environment Variables**, then redeploy (Deployments → … → Redeploy).

---

## 5. Quick checklist

- [ ] Root Directory = **`client`**
- [ ] Build Command = **`npm run build`**
- [ ] Output Directory = **`dist`**
- [ ] Install Command = **`npm install`**
- [ ] Env var **VITE_API_BASE_URL** = backend URL (when available)
- [ ] Deploy
