"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BIZSUITE_HEADERS,
  FIELD_KEYS,
  FIELD_LABELS,
  createProduct,
  createVariation,
  duplicateSkuIssues,
  productFromMappedRow,
  serializeProduct,
  suggestField,
  validateProduct,
  type CanonicalField,
  type Product,
  type ValidationIssue,
  type Variation,
} from "@/lib/bizsuite";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import { catalogueItemToProduct, type CatalogueItem } from "@/lib/catalogue";
import { TemplateCatalogueModal } from "./TemplateCatalogueModal";

type RowFilter = "all" | "errors" | "setup" | "warnings" | "ready" | "variable";

interface PendingImport {
  sourceName: string;
  headers: string[];
  rows: unknown[][];
  mapping: Record<string, CanonicalField | "ignore">;
}

const PAGE_SIZE = 50;

function hasFieldIssue(issues: ValidationIssue[], field: CanonicalField) {
  return issues.some((issue) => issue.severity === "error" && issue.field === field);
}

function statusFor(issues: ValidationIssue[], fromTemplate = false) {
  if (issues.some((issue) => issue.severity === "error")) return fromTemplate ? "setup" : "error";
  if (issues.some((issue) => issue.severity === "warning")) return "warning";
  return "ready";
}

function RequiredMark() {
  return <span className="required-mark" aria-label="required">*</span>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <span className="field-hint">{children}</span>;
}

export function ImporterApp() {
  const [products, setProducts] = useState<Product[]>([createProduct()]);
  const [draftReady, setDraftReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RowFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showPaste, setShowPaste] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDraft()
      .then((draft) => {
        if (draft?.length) setProducts(draft);
      })
      .finally(() => setDraftReady(true));
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const savingTimer = window.setTimeout(() => setSaveState("saving"), 0);
    const timer = window.setTimeout(() => {
      saveDraft(products)
        .then(() => setSaveState("saved"))
        .catch(() => setNotice("Your draft could not be saved locally."));
    }, 650);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(timer);
    };
  }, [products, draftReady]);

  const duplicateSkus = useMemo(() => duplicateSkuIssues(products), [products]);
  const issuesById = useMemo(() => {
    const result = new Map<string, ValidationIssue[]>();
    for (const product of products) {
      const issues = validateProduct(product);
      if (product.sku && duplicateSkus.has(product.sku.trim().toLowerCase())) {
        issues.push({ field: "sku", severity: "error", message: "This SKU is duplicated in the catalogue." });
      }
      if (product.variations.some((variation) => variation.sku && duplicateSkus.has(variation.sku.trim().toLowerCase()))) {
        issues.push({ field: "variationSkus", severity: "error", message: "A variation SKU is duplicated in the catalogue." });
      }
      result.set(product.id, issues);
    }
    return result;
  }, [duplicateSkus, products]);

  const totals = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let ready = 0;
    for (const product of products) {
      const issues = issuesById.get(product.id) ?? [];
      if (issues.some((issue) => issue.severity === "error")) errors += 1;
      else if (issues.some((issue) => issue.severity === "warning")) warnings += 1;
      else ready += 1;
    }
    const setup = products.filter((product) => product.template && statusFor(issuesById.get(product.id) ?? [], true) === "setup").length;
    const manualErrors = products.filter((product) => !product.template && (issuesById.get(product.id) ?? []).some((issue) => issue.severity === "error")).length;
    return { errors, setup, manualErrors, warnings, ready, total: products.length };
  }, [issuesById, products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const issues = issuesById.get(product.id) ?? [];
      const status = statusFor(issues, Boolean(product.template));
      const matchesFilter =
        filter === "all" ||
        (filter === "errors" && !product.template && issues.some((issue) => issue.severity === "error")) ||
        filter === status ||
        (filter === "variable" && product.productType === "variable");
      const matchesSearch =
        !query ||
        [product.name, product.sku, product.brand, product.category]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, issuesById, products, search]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const visibleProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedProduct = products.find((product) => product.id === selectedId) ?? null;

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...patch } : product)));
  }, []);

  function addProduct(seed: Partial<Product> = {}) {
    const product = createProduct(seed);
    setProducts((current) => [...current, product]);
    setFilter("all");
    setPage(Math.ceil((products.length + 1) / PAGE_SIZE));
    return product;
  }

  function duplicateProduct(product: Product) {
    const copy = createProduct({
      ...product,
      id: undefined,
      template: undefined,
      name: `${product.name} copy`.trim(),
      sku: "",
      variations: product.variations.map((variation) => createVariation({ ...variation, id: undefined, sku: "" })),
    });
    setProducts((current) => [...current, copy]);
    setSelectedId(copy.id);
  }

  function deleteProduct(id: string) {
    setProducts((current) => {
      const next = current.filter((product) => product.id !== id);
      return next.length ? next : [createProduct()];
    });
    setSelectedId(null);
  }

  function acceptTemplate(items: CatalogueItem[], packId: string, catalogueVersion: string, mode: "append" | "replace") {
    const imported = items.map((item) => catalogueItemToProduct(item, packId, catalogueVersion));
    let skipped = 0;
    let nextProducts = imported;
    if (mode === "append") {
      const isOnlyBlankRow = products.length === 1 && !products[0].name.trim() && !products[0].sku.trim();
      const base = isOnlyBlankRow ? [] : products;
      const existingKeys = new Set(base.map((product) => product.sku.trim()
        ? `sku:${product.sku.trim().toLowerCase()}`
        : `name:${product.brand.trim().toLowerCase()}|${product.name.trim().toLowerCase()}`));
      const unique = imported.filter((product) => {
        const key = product.sku.trim()
          ? `sku:${product.sku.trim().toLowerCase()}`
          : `name:${product.brand.trim().toLowerCase()}|${product.name.trim().toLowerCase()}`;
        if (existingKeys.has(key)) {
          skipped += 1;
          return false;
        }
        existingKeys.add(key);
        return true;
      });
      nextProducts = [...base, ...unique];
    }
    setProducts(nextProducts);
    setShowTemplates(false);
    setFilter("setup");
    setPage(1);
    setNotice(`${(items.length - skipped).toLocaleString()} template products added${skipped ? `; ${skipped} duplicates skipped` : ""}. Add prices and the remaining store settings.`);
  }

  async function parseWorkbook(sourceName: string, input: ArrayBuffer | string, type: "array" | "string") {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(input, { type, raw: true, cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("The workbook has no worksheet.");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1,
        raw: true,
        defval: "",
        blankrows: false,
      });
      if (rows.length < 2) throw new Error("The file needs a header row and at least one product row.");
      if (rows.length - 1 > 20_000) throw new Error("This file exceeds the 20,000-product limit. Split it into smaller catalogues.");
      const headers = rows[0].map((header, index) => String(header || `Column ${index + 1}`).trim());
      const mapping = Object.fromEntries(headers.map((header) => [header, suggestField(header)]));
      setPendingImport({ sourceName, headers, rows: rows.slice(1), mapping });
      if (rows.length - 1 > 5_000) setNotice("Large catalogue detected. Import and validation may take a few seconds.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The file could not be read.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    if (file.size > 25 * 1024 * 1024) {
      setNotice("The selected file is larger than the 25 MB limit.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      setNotice("Choose an XLSX, XLS, or CSV file.");
      return;
    }
    await parseWorkbook(file.name, await file.arrayBuffer(), "array");
  }

  async function parsePastedData() {
    if (!pasteValue.trim()) return;
    await parseWorkbook("Pasted table", pasteValue, "string");
    setShowPaste(false);
    setPasteValue("");
  }

  function acceptImport(mode: "replace" | "append") {
    if (!pendingImport) return;
    setBusy(true);
    window.setTimeout(() => {
      const imported = pendingImport.rows
        .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
        .map((row) => productFromMappedRow(pendingImport.headers, row, pendingImport.mapping));
      setProducts((current) => (mode === "replace" ? imported : [...current, ...imported]));
      setPendingImport(null);
      setFilter("all");
      setPage(1);
      setBusy(false);
      setNotice(`${imported.length.toLocaleString()} products imported. Review the highlighted required fields before export.`);
    }, 0);
  }

  function exportRows() {
    return [Array.from(BIZSUITE_HEADERS), ...products.map(serializeProduct)];
  }

  async function exportFile(format: "csv" | "xlsx") {
    if (totals.errors > 0) {
      setShowPreflight(true);
      setNotice("Export is blocked until all required-field and structural errors are fixed.");
      return;
    }
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.aoa_to_sheet(exportRows());
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Products");
      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\r\n" });
        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, `bizsuite-products-${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
        downloadBlob(
          new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `bizsuite-products-${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
      }
      setNotice(`${format.toUpperCase()} file generated with ${products.length.toLocaleString()} products.`);
    } catch {
      setNotice("The export could not be generated. Your draft is still saved locally.");
    } finally {
      setBusy(false);
    }
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function resetDraft() {
    if (!window.confirm("Clear this local catalogue and start again? This cannot be undone.")) return;
    await clearDraft();
    setProducts([createProduct()]);
    setSelectedId(null);
    setNotice("Local catalogue cleared.");
  }

  const completion = totals.total ? Math.round((totals.ready / totals.total) * 100) : 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">B</span>
          <div>
            <strong>Bizsuite Import Assistant</strong>
            <span>Prepare products without wrestling with Excel</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="privacy-chip"><span className="privacy-dot" /> Local &amp; private</span>
          <span className={`save-state ${saveState}`}>{saveState === "saving" ? "Saving…" : "Draft saved"}</span>
          <button className="text-button" onClick={resetDraft}>Clear draft</button>
        </div>
      </header>

      <main>
        <section className="workflow-header">
          <div className="workflow-copy">
            <p className="eyebrow">PRODUCT IMPORT WORKSPACE</p>
            <h1>Build a clean, upload-ready catalogue.</h1>
            <p>Required fields stay visible. Bizsuite formatting happens automatically at download.</p>
          </div>
          <div className="workflow-steps" aria-label="Import workflow">
            <div className="workflow-step active"><span>1</span><div><strong>Add products</strong><small>Enter, paste, or upload</small></div></div>
            <div className={totals.errors ? "workflow-step" : "workflow-step active"}><span>2</span><div><strong>Fix issues</strong><small>{totals.errors ? `${totals.errors} products blocked` : "Preflight passed"}</small></div></div>
            <div className={totals.errors ? "workflow-step" : "workflow-step active"}><span>3</span><div><strong>Download</strong><small>CSV or Excel</small></div></div>
          </div>
        </section>

        <section className="summary-strip">
          <div className="metric-card"><span>Products</span><strong>{totals.total.toLocaleString()}</strong><small>20,000 maximum</small></div>
          <div className="metric-card ready"><span>Ready</span><strong>{totals.ready.toLocaleString()}</strong><small>Can be exported</small></div>
          <div className="metric-card error"><span>Need attention</span><strong>{totals.errors.toLocaleString()}</strong><small>Blocking issues</small></div>
          <div className="progress-card">
            <div><span>Catalogue readiness</span><strong>{completion}%</strong></div>
            <div className="progress-track"><span style={{ width: `${completion}%` }} /></div>
            <small>{totals.warnings ? `${totals.warnings} products also have warnings` : "No warnings"}</small>
          </div>
        </section>

        <section className="required-banner">
          <div className="required-symbol">!</div>
          <div>
            <strong>Required for every product</strong>
            <p>Name, unit, manage stock, selling price tax type, product type, and at least one purchase price. Variable products also need a variation name and values.</p>
          </div>
          <button onClick={() => { setFilter("errors"); setPage(1); setShowPreflight(true); }}>Review missing fields</button>
        </section>

        <section className="workspace-card">
          <div className="workspace-toolbar">
            <div className="primary-actions">
              <button className="primary-button" onClick={() => addProduct()}><span>＋</span> Add product</button>
              <button className="template-button" onClick={() => setShowTemplates(true)}><span>✦</span> Start from template</button>
              <button className="secondary-button" onClick={() => setShowPaste(true)}>Paste table</button>
              <button className="secondary-button" onClick={() => fileInput.current?.click()}>Upload file</button>
              <input
                ref={fileInput}
                type="file"
                className="sr-only"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
            <div className="export-actions">
              <button className="preflight-button" onClick={() => setShowPreflight(true)}>
                Preflight <span className={totals.errors ? "count-badge error" : "count-badge"}>{totals.errors}</span>
              </button>
              <div className="download-group">
                <button disabled={busy || totals.errors > 0} onClick={() => exportFile("xlsx")}>Download Excel</button>
                <button disabled={busy || totals.errors > 0} onClick={() => exportFile("csv")} aria-label="Download CSV">CSV</button>
              </div>
            </div>
          </div>

          <div className="table-controls">
            <label className="search-box">
              <span>⌕</span>
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search product, SKU, brand…" />
            </label>
            <div className="filter-tabs" role="tablist" aria-label="Product filters">
              {(["all", "setup", "errors", "warnings", "ready", "variable"] as RowFilter[]).map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => { setFilter(item); setPage(1); }}>
                  {item === "all" ? "All products" : item === "setup" ? "Needs setup" : item[0].toUpperCase() + item.slice(1)}
                  {item === "setup" && totals.setup > 0 ? <span>{totals.setup}</span> : null}
                  {item === "errors" && totals.manualErrors > 0 ? <span>{totals.manualErrors}</span> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-scroll">
            <table className="product-grid">
              <thead>
                <tr>
                  <th className="status-column">Status</th>
                  <th className="name-column">Product name <RequiredMark /></th>
                  <th>Unit <RequiredMark /></th>
                  <th>Type <RequiredMark /></th>
                  <th>Manage stock <RequiredMark /></th>
                  <th>Purchase price <RequiredMark /></th>
                  <th>Tax type <RequiredMark /></th>
                  <th>Selling price</th>
                  <th>SKU</th>
                  <th className="actions-column">Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product, index) => {
                  const issues = issuesById.get(product.id) ?? [];
                  const status = statusFor(issues, Boolean(product.template));
                  const purchaseDisplay = product.productType === "variable"
                    ? `${product.variations.length || 0} variation${product.variations.length === 1 ? "" : "s"}`
                    : product.purchasePriceIncludingTax || product.purchasePriceExcludingTax;
                  return (
                    <tr key={product.id} className={status === "error" || status === "setup" ? "row-error" : ""}>
                      <td className="status-column">
                        <span className={`row-status ${status}`} title={issues.map((issue) => issue.message).join("\n")}>
                          {status === "ready" ? "✓" : status === "warning" ? "!" : status === "setup" ? "…" : "×"}
                        </span>
                        <small>{(page - 1) * PAGE_SIZE + index + 1}</small>
                      </td>
                      <td>
                        <input
                          className={hasFieldIssue(issues, "name") ? "invalid" : ""}
                          value={product.name}
                          onChange={(event) => updateProduct(product.id, { name: event.target.value })}
                          placeholder="e.g. Coca-Cola 50cl"
                          aria-label={`Product ${index + 1} name`}
                        />
                      </td>
                      <td>
                        <input
                          className={hasFieldIssue(issues, "unit") ? "invalid" : ""}
                          value={product.unit}
                          onChange={(event) => updateProduct(product.id, { unit: event.target.value })}
                          placeholder="Pc(s)"
                          aria-label={`Product ${index + 1} unit`}
                        />
                      </td>
                      <td>
                        <select
                          className={hasFieldIssue(issues, "productType") ? "invalid" : ""}
                          value={product.productType}
                          onChange={(event) => {
                            const productType = event.target.value as Product["productType"];
                            updateProduct(product.id, {
                              productType,
                              variations: productType === "variable" && !product.variations.length ? [createVariation()] : product.variations,
                            });
                          }}
                          aria-label={`Product ${index + 1} type`}
                        >
                          <option value="single">Single</option>
                          <option value="variable">Variable</option>
                          {product.productType === "combo" ? <option value="combo">Combo (unsupported)</option> : null}
                        </select>
                      </td>
                      <td>
                        <select
                          className={hasFieldIssue(issues, "manageStock") ? "invalid" : ""}
                          value={product.manageStock === null ? "" : product.manageStock ? "1" : "0"}
                          onChange={(event) => updateProduct(product.id, { manageStock: event.target.value === "" ? null : event.target.value === "1" })}
                          aria-label={`Product ${index + 1} manage stock`}
                        >
                          <option value="">Choose…</option>
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      </td>
                      <td>
                        {product.productType === "variable" ? (
                          <button className="inline-link" onClick={() => setSelectedId(product.id)}>{purchaseDisplay}</button>
                        ) : (
                          <input
                            inputMode="decimal"
                            className={hasFieldIssue(issues, "purchasePriceIncludingTax") ? "invalid" : ""}
                            value={product.purchasePriceIncludingTax || product.purchasePriceExcludingTax}
                            onChange={(event) => updateProduct(product.id, { purchasePriceIncludingTax: event.target.value })}
                            placeholder="0.00"
                            aria-label={`Product ${index + 1} purchase price`}
                          />
                        )}
                      </td>
                      <td>
                        <select
                          className={hasFieldIssue(issues, "sellingPriceTaxType") ? "invalid" : ""}
                          value={product.sellingPriceTaxType}
                          onChange={(event) => updateProduct(product.id, { sellingPriceTaxType: event.target.value as Product["sellingPriceTaxType"] })}
                          aria-label={`Product ${index + 1} selling price tax type`}
                        >
                          <option value="">Choose…</option>
                          <option value="exclusive">Exclusive</option>
                          <option value="inclusive">Inclusive</option>
                        </select>
                      </td>
                      <td>
                        {product.productType === "variable" ? (
                          <span className="muted-value">Per variation</span>
                        ) : (
                          <input
                            inputMode="decimal"
                            value={product.sellingPrice}
                            onChange={(event) => updateProduct(product.id, { sellingPrice: event.target.value })}
                            placeholder="Optional"
                            aria-label={`Product ${index + 1} selling price`}
                          />
                        )}
                      </td>
                      <td>
                        <input
                          className={hasFieldIssue(issues, "sku") ? "invalid" : ""}
                          value={product.sku}
                          onChange={(event) => updateProduct(product.id, { sku: event.target.value })}
                          placeholder="Auto"
                          aria-label={`Product ${index + 1} SKU`}
                        />
                      </td>
                      <td className="actions-column">
                        <button className="details-button" onClick={() => setSelectedId(product.id)}>Edit details</button>
                      </td>
                    </tr>
                  );
                })}
                {!visibleProducts.length ? (
                  <tr><td colSpan={10} className="empty-table">No products match this view.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>Showing {visibleProducts.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length.toLocaleString()}</span>
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span>Page {page} of {pageCount}</span>
              <button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
            </div>
          </div>
        </section>
      </main>

      {selectedProduct ? (
        <ProductDrawer
          product={selectedProduct}
          issues={issuesById.get(selectedProduct.id) ?? []}
          onChange={(patch) => updateProduct(selectedProduct.id, patch)}
          onDuplicate={() => duplicateProduct(selectedProduct)}
          onDelete={() => deleteProduct(selectedProduct.id)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      {showPaste ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowPaste(false)}>
          <section className="modal-card paste-modal" role="dialog" aria-modal="true" aria-labelledby="paste-title">
            <div className="modal-header"><div><p className="eyebrow">QUICK IMPORT</p><h2 id="paste-title">Paste a product table</h2></div><button className="close-button" onClick={() => setShowPaste(false)}>×</button></div>
            <p>Copy rows from Excel, Google Sheets, or another table. Include the header row so fields can be matched.</p>
            <textarea autoFocus value={pasteValue} onChange={(event) => setPasteValue(event.target.value)} placeholder={"Product Name\tUnit\tPurchase Price\nCoca-Cola 50cl\tPc(s)\t200"} />
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowPaste(false)}>Cancel</button><button className="primary-button" disabled={!pasteValue.trim() || busy} onClick={parsePastedData}>Review columns</button></div>
          </section>
        </div>
      ) : null}

      {showTemplates ? <TemplateCatalogueModal onClose={() => setShowTemplates(false)} onImport={acceptTemplate} /> : null}

      {pendingImport ? (
        <MappingModal
          pending={pendingImport}
          onChange={(source, field) => setPendingImport((current) => current ? { ...current, mapping: { ...current.mapping, [source]: field } } : null)}
          onCancel={() => setPendingImport(null)}
          onAccept={acceptImport}
          busy={busy}
        />
      ) : null}

      {showPreflight ? (
        <PreflightPanel
          products={products}
          issuesById={issuesById}
          totals={totals}
          onClose={() => setShowPreflight(false)}
          onOpenProduct={(id) => { setSelectedId(id); setShowPreflight(false); }}
          onExport={exportFile}
          busy={busy}
        />
      ) : null}

      {notice ? <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice(null)}>×</button></div> : null}
      {busy ? <div className="busy-bar" role="progressbar"><span /></div> : null}
    </div>
  );
}

function MappingModal({ pending, onChange, onCancel, onAccept, busy }: {
  pending: PendingImport;
  onChange: (source: string, field: CanonicalField | "ignore") => void;
  onCancel: () => void;
  onAccept: (mode: "replace" | "append") => void;
  busy: boolean;
}) {
  const mapped = Object.values(pending.mapping).filter((field) => field !== "ignore").length;
  return (
    <div className="modal-backdrop">
      <section className="modal-card mapping-modal" role="dialog" aria-modal="true" aria-labelledby="mapping-title">
        <div className="modal-header">
          <div><p className="eyebrow">COLUMN MAPPING</p><h2 id="mapping-title">Review {pending.sourceName}</h2><p>{pending.rows.length.toLocaleString()} product rows · {mapped} of {pending.headers.length} columns matched</p></div>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <div className="mapping-note"><strong>Required fields:</strong> map product name, unit, manage stock, selling price tax type, product type, and at least one purchase price.</div>
        <div className="mapping-list">
          {pending.headers.map((header, index) => (
            <div className="mapping-row" key={`${header}-${index}`}>
              <div><strong>{header}</strong><small>Example: {String(pending.rows.find((row) => String(row[index] ?? "").trim())?.[index] ?? "Blank")}</small></div>
              <span>→</span>
              <select value={pending.mapping[header]} onChange={(event) => onChange(header, event.target.value as CanonicalField | "ignore")}>
                <option value="ignore">Do not import</option>
                {FIELD_KEYS.map((field) => <option key={field} value={field}>{FIELD_LABELS[field]}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="modal-actions split-actions">
          <button className="secondary-button" onClick={onCancel}>Cancel</button>
          <div><button className="secondary-button" disabled={busy || mapped === 0} onClick={() => onAccept("append")}>Add to current products</button><button className="primary-button" disabled={busy || mapped === 0} onClick={() => onAccept("replace")}>Replace and import</button></div>
        </div>
      </section>
    </div>
  );
}

function PreflightPanel({ products, issuesById, totals, onClose, onOpenProduct, onExport, busy }: {
  products: Product[];
  issuesById: Map<string, ValidationIssue[]>;
  totals: { errors: number; warnings: number; ready: number; total: number };
  onClose: () => void;
  onOpenProduct: (id: string) => void;
  onExport: (format: "csv" | "xlsx") => void;
  busy: boolean;
}) {
  const affected = products.filter((product) => (issuesById.get(product.id) ?? []).length > 0);
  const missingRequired = new Map<string, number>();
  for (const product of products) {
    for (const issue of issuesById.get(product.id) ?? []) {
      if (issue.severity === "error") missingRequired.set(issue.message, (missingRequired.get(issue.message) ?? 0) + 1);
    }
  }
  return (
    <div className="panel-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="preflight-panel" aria-label="Preflight report">
        <div className="panel-header"><div><p className="eyebrow">PREFLIGHT REPORT</p><h2>{totals.errors ? "Fix required fields before download" : "Catalogue is ready"}</h2></div><button className="close-button" onClick={onClose}>×</button></div>
        <div className={`preflight-hero ${totals.errors ? "blocked" : "passed"}`}>
          <span>{totals.errors ? "×" : "✓"}</span>
          <div><strong>{totals.errors ? "Export blocked" : "All blocking checks passed"}</strong><p>{totals.errors ? `${totals.errors} products contain required-field or structural errors.` : `${totals.ready} products are ready for Bizsuite.`}</p></div>
        </div>
        <div className="preflight-metrics"><div><strong>{totals.total}</strong><span>Total</span></div><div><strong>{totals.ready}</strong><span>Ready</span></div><div><strong>{totals.errors}</strong><span>Blocked</span></div><div><strong>{totals.warnings}</strong><span>Warnings</span></div></div>
        {missingRequired.size ? (
          <section className="issue-summary"><h3>What needs fixing</h3>{[...missingRequired.entries()].slice(0, 8).map(([message, count]) => <div key={message}><span>{message}</span><strong>{count}</strong></div>)}</section>
        ) : null}
        {affected.length ? (
          <section className="affected-list"><h3>Affected products</h3>{affected.slice(0, 50).map((product, index) => {
            const issues = issuesById.get(product.id) ?? [];
            const status = statusFor(issues, Boolean(product.template));
            return <button key={product.id} onClick={() => onOpenProduct(product.id)}><span className={`row-status ${status}`}>{status === "error" ? "×" : status === "setup" ? "…" : "!"}</span><div><strong>{product.name || `Product ${index + 1}`}</strong><small>{issues[0]?.message}</small></div><span>›</span></button>;
          })}</section>
        ) : null}
        <div className="panel-footer"><p>{totals.errors ? "Download unlocks automatically when all blocking errors are fixed." : "Choose the file format accepted by your Bizsuite importer."}</p><div><button disabled={busy || totals.errors > 0} onClick={() => onExport("csv")}>Download CSV</button><button className="primary-button" disabled={busy || totals.errors > 0} onClick={() => onExport("xlsx")}>Download Excel</button></div></div>
      </aside>
    </div>
  );
}

function ProductDrawer({ product, issues, onChange, onDuplicate, onDelete, onClose }: {
  product: Product;
  issues: ValidationIssue[];
  onChange: (patch: Partial<Product>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  function updateVariation(id: string, patch: Partial<Variation>) {
    onChange({ variations: product.variations.map((variation) => variation.id === id ? { ...variation, ...patch } : variation) });
  }
  return (
    <div className="panel-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="product-drawer" aria-label="Product details">
        <div className="panel-header"><div><p className="eyebrow">PRODUCT DETAILS</p><h2>{product.name || "Untitled product"}</h2><p>{issues.length ? `${issues.filter((issue) => issue.severity === "error").length} errors · ${issues.filter((issue) => issue.severity === "warning").length} warnings` : "All checks passed"}</p></div><button className="close-button" onClick={onClose}>×</button></div>
        {issues.length ? <div className="drawer-issues">{issues.slice(0, 4).map((issue, index) => <div key={`${issue.message}-${index}`} className={issue.severity}><span>{issue.severity === "error" ? "×" : "!"}</span>{issue.message}</div>)}</div> : null}
        <div className="drawer-content">
          <section><div className="section-heading"><div><h3>Classification</h3><p>How this product is organized in Bizsuite.</p></div></div><div className="form-grid">
            <label><span>Brand</span><input value={product.brand} onChange={(e) => onChange({ brand: e.target.value })} /></label>
            <label><span>Barcode type</span><select value={product.barcodeType} onChange={(e) => onChange({ barcodeType: e.target.value })}><option>C128</option><option>C39</option><option>EAN-13</option><option>EAN-8</option><option>UPC-A</option><option>UPC-E</option><option>ITF-14</option></select></label>
            <label><span>Category</span><input value={product.category} onChange={(e) => onChange({ category: e.target.value })} /></label>
            <label><span>Sub-category</span><input value={product.subCategory} onChange={(e) => onChange({ subCategory: e.target.value })} /></label>
            <label className="full-field"><span>Product locations</span><input value={product.productLocations} onChange={(e) => onChange({ productLocations: e.target.value })} placeholder="Location A,Location B" /><FieldHint>Use exact Bizsuite location names, separated by commas.</FieldHint></label>
          </div></section>

          {product.productType === "variable" ? <section><div className="section-heading"><div><h3>Variations <RequiredMark /></h3><p>Each row becomes an aligned pipe-separated value in the Bizsuite file.</p></div><button className="secondary-button small" onClick={() => onChange({ variations: [...product.variations, createVariation()] })}>＋ Add variation</button></div>
            <label className="standalone-field"><span>Variation name <RequiredMark /></span><input className={hasFieldIssue(issues, "variationName") ? "invalid" : ""} value={product.variationName} onChange={(e) => onChange({ variationName: e.target.value })} placeholder="e.g. Size, Colour, Pack" /></label>
            <div className="variation-table"><div className="variation-head"><span>Value *</span><span>SKU</span><span>Purchase inc. tax *</span><span>Selling price</span><span /></div>{product.variations.map((variation) => <div className="variation-row" key={variation.id}>
              <input value={variation.value} onChange={(e) => updateVariation(variation.id, { value: e.target.value })} placeholder="Red" />
              <input value={variation.sku} onChange={(e) => updateVariation(variation.id, { sku: e.target.value })} placeholder="Auto" />
              <input inputMode="decimal" value={variation.purchasePriceIncludingTax} onChange={(e) => updateVariation(variation.id, { purchasePriceIncludingTax: e.target.value })} placeholder="0.00" />
              <input inputMode="decimal" value={variation.sellingPrice} onChange={(e) => updateVariation(variation.id, { sellingPrice: e.target.value })} placeholder="Optional" />
              <button aria-label="Remove variation" onClick={() => onChange({ variations: product.variations.filter((item) => item.id !== variation.id) })}>×</button>
            </div>)}</div>
          </section> : null}

          <section><div className="section-heading"><div><h3>Pricing &amp; tax</h3><p>At least one purchase price is required.</p></div></div><div className="form-grid">
            {product.productType !== "variable" ? <><label><span>Purchase price including tax <RequiredMark /></span><input inputMode="decimal" value={product.purchasePriceIncludingTax} onChange={(e) => onChange({ purchasePriceIncludingTax: e.target.value })} /></label><label><span>Purchase price excluding tax</span><input inputMode="decimal" value={product.purchasePriceExcludingTax} onChange={(e) => onChange({ purchasePriceExcludingTax: e.target.value })} /></label><label><span>Profit margin %</span><input inputMode="decimal" value={product.profitMargin} onChange={(e) => onChange({ profitMargin: e.target.value })} /></label><label><span>Selling price</span><input inputMode="decimal" value={product.sellingPrice} onChange={(e) => onChange({ sellingPrice: e.target.value })} /></label></> : null}
            <label><span>Applicable tax</span><input value={product.applicableTax} onChange={(e) => onChange({ applicableTax: e.target.value })} placeholder="e.g. VAT" /></label>
            <label><span>Selling price tax type <RequiredMark /></span><select value={product.sellingPriceTaxType} onChange={(e) => onChange({ sellingPriceTaxType: e.target.value as Product["sellingPriceTaxType"] })}><option value="">Choose…</option><option value="exclusive">Exclusive</option><option value="inclusive">Inclusive</option></select></label>
          </div></section>

          <section><div className="section-heading"><div><h3>Inventory &amp; expiry</h3><p>Stock, storage, and shelf-life details.</p></div></div><div className="form-grid">
            <label><span>Alert quantity</span><input inputMode="decimal" value={product.alertQuantity} onChange={(e) => onChange({ alertQuantity: e.target.value })} /></label>
            <label><span>Opening stock</span><input inputMode="decimal" value={product.openingStock} onChange={(e) => onChange({ openingStock: e.target.value })} /></label>
            <label><span>Opening stock location</span><input value={product.location} onChange={(e) => onChange({ location: e.target.value })} /></label>
            <label><span>Expiry date</span><input value={product.expiryDate} onChange={(e) => onChange({ expiryDate: e.target.value })} placeholder="mm-dd-yyyy" /></label>
            <label><span>Expires in</span><input inputMode="decimal" value={product.expiresIn} onChange={(e) => onChange({ expiresIn: e.target.value })} /></label>
            <label><span>Expiry unit</span><select value={product.expiryPeriodUnit} onChange={(e) => onChange({ expiryPeriodUnit: e.target.value as Product["expiryPeriodUnit"] })}><option value="">Choose…</option><option value="months">Months</option><option value="days">Days</option></select></label>
            <label><span>Rack</span><input value={product.rack} onChange={(e) => onChange({ rack: e.target.value })} /></label><label><span>Row</span><input value={product.row} onChange={(e) => onChange({ row: e.target.value })} /></label><label><span>Position</span><input value={product.position} onChange={(e) => onChange({ position: e.target.value })} /></label><label><span>Weight</span><input value={product.weight} onChange={(e) => onChange({ weight: e.target.value })} /></label>
          </div></section>

          <section><div className="section-heading"><div><h3>Media &amp; additional fields</h3><p>Optional information passed through to Bizsuite.</p></div></div><div className="form-grid">
            <label className="full-field"><span>Image URL or filename</span><input value={product.image} onChange={(e) => onChange({ image: e.target.value })} /><FieldHint>Temporary signed image URLs will be flagged.</FieldHint></label>
            <label className="full-field"><span>Description</span><textarea value={product.description} onChange={(e) => onChange({ description: e.target.value })} rows={4} /></label>
            <label><span>Custom field 1</span><input value={product.customField1} onChange={(e) => onChange({ customField1: e.target.value })} /></label><label><span>Custom field 2</span><input value={product.customField2} onChange={(e) => onChange({ customField2: e.target.value })} /></label><label><span>Custom field 3</span><input value={product.customField3} onChange={(e) => onChange({ customField3: e.target.value })} /></label><label><span>Custom field 4</span><input value={product.customField4} onChange={(e) => onChange({ customField4: e.target.value })} /></label>
            <label><span>Enable IMEI / serial number</span><select value={product.enableImei === null ? "" : product.enableImei ? "1" : "0"} onChange={(e) => onChange({ enableImei: e.target.value === "" ? null : e.target.value === "1" })}><option value="">Default</option><option value="1">Yes</option><option value="0">No</option></select></label>
            <label><span>Not for selling</span><select value={product.notForSelling === null ? "" : product.notForSelling ? "1" : "0"} onChange={(e) => onChange({ notForSelling: e.target.value === "" ? null : e.target.value === "1" })}><option value="">Default</option><option value="1">Yes</option><option value="0">No</option></select></label>
          </div></section>
        </div>
        <div className="drawer-footer"><div><button className="danger-text" onClick={onDelete}>Delete product</button><button className="text-button" onClick={onDuplicate}>Duplicate</button></div><button className="primary-button" onClick={onClose}>Done</button></div>
      </aside>
    </div>
  );
}
