# Bizsuite Product Import Assistant

A private, browser-based workspace for preparing and validating Bizsuite product imports.

## Included

- Exact 37-column Bizsuite export schema.
- Required-field and conditional validation.
- Simple and variable product entry.
- XLS, XLSX, CSV, and pasted-table input.
- Column mapping with Bizsuite header aliases.
- Preflight report that blocks invalid exports.
- CSV and XLSX downloads.
- IndexedDB draft autosave; product data remains on the device.
- Pagination designed for large catalogues.
- Versioned Nigerian quick-start catalogue packs with source evidence and staged product coverage.

## Quick-start catalogue

Use **Start from template** to browse reviewed Nigerian supermarket products, filter by category, and add selected items to the workspace. Template products include source-backed names, brands, pack units, categories, short descriptions, and optional verified barcodes. Store-specific fields remain blank and appear as **Needs setup** until completed.

Catalogue delivery is staged:

- Mini Market 400: reviewed preview available and expanding toward 400 products.
- Supermarket 1,000: planned after the 400-product pack is reviewed.
- Supermarket 2,000: planned after the 1,000-product pack is reviewed.

The files under `public/catalogue/` are static, versioned assets. This preserves the client-only architecture: selection, editing, draft saving, validation, and export all stay in the browser. Run `npm run catalogue:validate` after changing a catalogue file. The validator checks source evidence, counts, duplicate IDs and barcodes, supported barcode types, and GS1 check digits.

## Required product fields

- Product name.
- Unit.
- Manage stock (`1` or `0`).
- Selling price tax type.
- Product type.
- At least one purchase price.
- Variation name and values for variable products.

## Local development

```bash
npm install
npm run dev
```

Use `npm test` for the production build and server-rendered acceptance test.

## Cloudflare deployment

The repository includes a production Worker manifest and scripts for Cloudflare
deployment. See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) for the
GitHub connection settings and local deployment commands.

## Compatibility note

CSV and XLSX downloads are implemented. A real Bizsuite import test should confirm which format is preferred before the application labels one as the default production format. Existing undocumented `combo` products are detected and blocked from export until compatibility is confirmed.
