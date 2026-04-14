# Deploy to Firebase Studio (Next.js App Router)

This project is configured for Firebase Hosting with web frameworks support.

## 1) Prerequisites

- Firebase project created in Firebase Console.
- Billing enabled (required for SSR/Cloud functions backend used by Next.js hosting).
- Node.js and npm installed.

## 2) Required environment variables

Set these in Firebase (Hosting framework runtime env) before production use:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

If both key vars are present, app uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` first.

## 3) Login and bind project

From the project root:

```bash
npm run firebase:login
npm run firebase:use
```

Choose your Firebase project when prompted.

## 4) Deploy

```bash
npm run deploy:firebase
```

Firebase CLI will detect Next.js and deploy hosting + required backend.

## 5) Optional: force clean local build cache before deploy

If you hit transient chunk errors locally, clean `.next` first:

```bash
# PowerShell
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
npm run build
npm run deploy:firebase
```

## 6) Common issues

- Missing Supabase env vars: app throws "Supabase environment variables are missing".
- Permission/auth errors during deploy: re-run login and verify selected project.
- SSR deploy blocked: ensure billing is enabled on the Firebase project.
