# Deploy to Cloudflare Workers from GitHub

The application is configured for Cloudflare Workers. It does not currently
require D1, R2, KV, or application secrets.

## One-time setup

1. Push this repository to GitHub with `main` as the production branch.
2. In Cloudflare, open **Workers & Pages** and select **Create application**.
3. Choose **Import a repository**, connect GitHub, and select this repository.
4. Use these build settings:

   - Worker name: `bizsuite-product-import-assistant`
   - Production branch: `main`
   - Root directory: `/`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy --no-bundle --cwd cloudflare --config wrangler.jsonc`
   - Node.js version: `22`

5. Save and deploy. Cloudflare will build and redeploy the Worker whenever a
   change is pushed to `main`.

If the GitHub repository contains the parent directory instead of this project
as its root, set the Cloudflare root directory to `/webapp`.

## Local Cloudflare checks

```bash
npm run cf:deploy:dry-run
```

To preview using the Cloudflare runtime:

```bash
npm run cf:preview
```

For a one-off deployment from a developer machine, authenticate once with
`npx wrangler login`, then run:

```bash
npm run cf:deploy
```

## Custom domain

After the first successful deployment, open the Worker in Cloudflare and add a
custom domain under **Settings > Domains & Routes**.

## Future D1 or R2 use

Add bindings to `cloudflare/wrangler.jsonc` only when cloud-saved drafts,
import history, or retained uploaded files are implemented. The current release
stores drafts in the user's browser and does not need cloud storage.
