# Deploy to Cloudflare (OpenNext + Workers)

This app uses Next.js App Router + SSR + Server Actions, so deploy with OpenNext Cloudflare (Workers runtime).

## 1) What is already configured

- `@opennextjs/cloudflare` installed
- `wrangler` installed
- `wrangler.jsonc` added
- `.dev.vars` added (`NEXTJS_ENV=development`)
- `public/_headers` added for static cache control
- npm scripts added:
  - `npm run cf:preview`
  - `npm run cf:deploy`
  - `npm run cf:upload`
  - `npm run cf:typegen`

## 2) Required environment variables in Cloudflare

Set these in Cloudflare Worker settings (Production and Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(Alternative supported by app code: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

## 3) Local verify

```bash
npm run build
npm run cf:preview
```

## 4) Deploy from CLI

```bash
npx wrangler login
npm run cf:deploy
```

## 5) Deploy from GitHub integration

- Cloudflare Dashboard -> Workers & Pages -> Create -> Workers
- Connect repository
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`

## Notes

- For full stack SSR Next.js, Cloudflare recommends Workers-based deployment.
- If you use Pages static mode, SSR routes and server actions will not work.
