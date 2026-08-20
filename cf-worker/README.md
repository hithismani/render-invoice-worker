# Cloudflare Worker

`POST /v1/render` → PDF (selectable text) or PNG.

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hithismani/render-invoice-worker/tree/main/cf-worker)

```bash
pnpm install
npx wrangler login
npx wrangler secret put API_KEY_SECRET
npx wrangler deploy
```

## Use

```bash
curl -X POST https://your-worker.workers.dev/v1/render \
  -H "Authorization: Bearer $API_KEY_SECRET" \
  -H 'Content-Type: application/json' \
  --data-binary @invoice.json \
  --output invoice.pdf
```

Optional: `?format=png`. Optional Worker var `ALLOWED_IPS`.

Parent monorepo: [render-invoice](https://github.com/hithismani/render-invoice) → submodule path `workers/`.
