"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogueItem, CatalogueManifest, CataloguePack, CataloguePackData } from "@/lib/catalogue";

type ImportMode = "append" | "replace";

export function TemplateCatalogueModal({ onClose, onImport }: {
  onClose: () => void;
  onImport: (items: CatalogueItem[], packId: string, catalogueVersion: string, mode: ImportMode) => void;
}) {
  const [manifest, setManifest] = useState<CatalogueManifest | null>(null);
  const [activePack, setActivePack] = useState<CataloguePack | null>(null);
  const [packData, setPackData] = useState<CataloguePackData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPack(pack: CataloguePack) {
    if (!pack.path) return;
    setActivePack(pack);
    setPackData(null);
    setSelected(new Set());
    setCategory("all");
    setQuery("");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(pack.path, { cache: "force-cache" });
      if (!response.ok) throw new Error("This catalogue pack could not be loaded.");
      const data = await response.json() as CataloguePackData;
      if (data.packId !== pack.id || !Array.isArray(data.items)) throw new Error("The catalogue pack is malformed.");
      setPackData(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "This catalogue pack could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/catalogue/manifest.json", { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error("The template catalogue is unavailable.");
        return response.json() as Promise<CatalogueManifest>;
      })
      .then((data) => {
        if (cancelled) return;
        setManifest(data);
        const firstPack = data.packs.find((pack) => pack.path);
        if (firstPack) void loadPack(firstPack);
        else setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "The template catalogue is unavailable.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    return [...new Set((packData?.items ?? []).map((item) => item.category))].sort();
  }, [packData]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (packData?.items ?? []).filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesQuery = !normalizedQuery || [item.name, item.brand, item.category, item.subCategory, item.barcode?.value]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, packData, query]);

  const selectedItems = useMemo(() => {
    return (packData?.items ?? []).filter((item) => selected.has(item.id));
  }, [packData, selected]);

  function toggleItem(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      const everyVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => next.has(item.id));
      filteredItems.forEach((item) => everyVisibleSelected ? next.delete(item.id) : next.add(item.id));
      return next;
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card template-modal" role="dialog" aria-modal="true" aria-labelledby="template-title">
        <div className="modal-header template-header">
          <div>
            <p className="eyebrow">QUICK START CATALOGUE</p>
            <h2 id="template-title">Start with products Nigerians already buy</h2>
            <p>Choose source-backed supermarket products, then add your prices, stock settings, tax type, and locations.</p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close template catalogue">×</button>
        </div>

        <div className="template-layout">
          <aside className="template-packs" aria-label="Catalogue packs">
            <h3>Catalogue stages</h3>
            {manifest?.packs.map((pack) => (
              <button
                key={pack.id}
                className={activePack?.id === pack.id ? "active" : ""}
                disabled={!pack.path}
                onClick={() => void loadPack(pack)}
              >
                <span><strong>{pack.name}</strong><small>{pack.availableCount.toLocaleString()} available of {pack.targetCount.toLocaleString()}</small></span>
                <em className={`pack-status ${pack.status}`}>{pack.status === "preview" ? "Preview" : pack.status === "available" ? "Ready" : "Planned"}</em>
              </button>
            ))}
            {manifest ? <div className="method-note"><strong>How products are included</strong><p>{manifest.methodology}</p><small>Catalogue version {manifest.version} · reviewed {manifest.updatedAt}</small></div> : null}
          </aside>

          <div className="template-browser">
            <div className="template-toolbar">
              <label className="search-box template-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, brand, category or barcode…" /></label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter template products by category">
                <option value="all">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            {activePack ? <div className="pack-summary"><div><strong>{activePack.name}</strong><p>{activePack.description}</p></div><span>{packData?.items.length ?? activePack.availableCount} available</span></div> : null}

            {loading ? <div className="template-state">Loading supermarket products…</div> : null}
            {error ? <div className="template-state error"><strong>Catalogue unavailable</strong><span>{error}</span></div> : null}
            {!loading && !error && packData ? (
              <>
                <div className="template-select-row">
                  <label><input type="checkbox" checked={filteredItems.length > 0 && filteredItems.every((item) => selected.has(item.id))} onChange={toggleVisible} /> Select {filteredItems.length === packData.items.length ? "all products" : `${filteredItems.length} shown`}</label>
                  <span>{selected.size.toLocaleString()} selected</span>
                </div>
                <div className="template-product-list">
                  {filteredItems.map((item) => (
                    <article key={item.id} className={selected.has(item.id) ? "selected" : ""}>
                      <label className="template-check"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleItem(item.id)} /><span /></label>
                      <div className="template-product-copy">
                        <div><strong>{item.name}</strong><span>{item.brand}</span></div>
                        <p>{item.description}</p>
                        <small>{item.category} · {item.subCategory} · {item.unit}</small>
                      </div>
                      <div className="template-evidence">
                        <span className={`barcode-chip ${item.barcode ? "verified" : "missing"}`}>{item.barcode ? `${item.barcode.type} verified` : "Barcode not supplied"}</span>
                        <strong>{item.sources.length.toLocaleString()} source{item.sources.length === 1 ? "" : "s"}</strong>
                        <small>official retailer listing</small>
                        <a href={item.sources[0]?.url} target="_blank" rel="noreferrer">View source</a>
                      </div>
                    </article>
                  ))}
                  {!filteredItems.length ? <div className="template-state">No products match this search.</div> : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="modal-actions template-actions">
          <div><strong>{selected.size.toLocaleString()} products selected</strong><span>Missing store-specific fields will be marked "Needs setup".</span></div>
          <div><button className="secondary-button" onClick={onClose}>Cancel</button><button className="secondary-button" disabled={!selectedItems.length || !packData} onClick={() => packData && onImport(selectedItems, packData.packId, packData.catalogueVersion, "append")}>Add to current</button><button className="primary-button" disabled={!selectedItems.length || !packData} onClick={() => packData && onImport(selectedItems, packData.packId, packData.catalogueVersion, "replace")}>Replace and use template</button></div>
        </div>
      </section>
    </div>
  );
}
