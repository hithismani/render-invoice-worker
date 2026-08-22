# render-invoice-worker

Self-hostable PDF workers for [RenderInvoice](https://renderinvoice.com).

| Folder | Platform |
| --- | --- |
| [`cf-worker/`](cf-worker/) | Cloudflare Workers |

## Deploy (Cloudflare)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hithismani/render-invoice-worker/tree/main/cf-worker)

```bash
cd cf-worker
pnpm install
npx wrangler secret put API_KEY_SECRET
npx wrangler deploy
```

This repo is a git submodule of [render-invoice](https://github.com/hithismani/render-invoice) at `workers/`.

## Reference client wrapper

Writing your own client around `POST /v1/render` (Apps Script, embeds, custom
editors)? The static playground package in the main repo is the reference
implementation - schema mirror, validation, markdown, and both invoice
templates in one dependency-free file:

- Package: [`web/public/renderinvoice.js`](https://github.com/hithismani/render-invoice/blob/main/web/public/renderinvoice.js) (served as `/renderinvoice.min.js`)
- Usage example: [`web/public/renderinvoice-demo.html`](https://github.com/hithismani/render-invoice/blob/main/web/public/renderinvoice-demo.html)
