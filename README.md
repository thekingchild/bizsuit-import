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

## Compatibility note

CSV and XLSX downloads are implemented. A real Bizsuite import test should confirm which format is preferred before the application labels one as the default production format. Existing undocumented `combo` products are detected and blocked from export until compatibility is confirmed.
