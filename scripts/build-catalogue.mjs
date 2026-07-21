import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = "2026.07-preview.1";

const addideCollections = [
  { slug: "grocery", category: "Grocery", subCategory: "General Grocery" },
  { slug: "non-alcoholic-drinks", category: "Beverages", subCategory: "Non-Alcoholic Drinks" },
  { slug: "alcoholic-drinks", category: "Beverages", subCategory: "Alcoholic Drinks" },
  { slug: "household", category: "Household", subCategory: "Household Supplies" },
  { slug: "personal-care", category: "Personal Care", subCategory: "Personal Care" },
  { slug: "baby-care-food-products", category: "Baby & Toddler", subCategory: "Baby Care & Food" },
  { slug: "cosmetics", category: "Personal Care", subCategory: "Cosmetics" },
  { slug: "apparel-accessories", category: "Lifestyle", subCategory: "Apparel & Accessories" },
];

const sparCategories = [
  { slug: "baby-products", category: "Baby & Toddler", subCategory: "Baby Products" },
  { slug: "beverages", category: "Beverages", subCategory: "Beverages" },
  { slug: "electronics-2", category: "Electronics", subCategory: "Electronics" },
  { slug: "lifestyle", category: "Lifestyle", subCategory: "Lifestyle" },
  { slug: "food", category: "Prepared Food", subCategory: "Bakery & Ready Meals" },
  { slug: "fresh", category: "Fresh Food", subCategory: "Fresh Produce & Meat" },
  { slug: "it", category: "Electronics", subCategory: "Computing" },
  { slug: "mobiles", category: "Electronics", subCategory: "Mobiles" },
  { slug: "non-food", category: "Household", subCategory: "Non-Food" },
  { slug: "pet-food", category: "Pet Care", subCategory: "Pet Food" },
  { slug: "pet-products", category: "Pet Care", subCategory: "Pet Products" },
  { slug: "wines-spirits", category: "Beverages", subCategory: "Wines & Spirits" },
];

const miniMarketQuota = new Map([
  ["Grocery", 120],
  ["Beverages", 85],
  ["Household", 65],
  ["Personal Care", 75],
  ["Baby & Toddler", 20],
  ["Prepared Food", 20],
  ["Fresh Food", 15],
]);

const supermarketQuota = new Map([
  ["Grocery", 175],
  ["Beverages", 260],
  ["Household", 186],
  ["Personal Care", 210],
  ["Baby & Toddler", 40],
  ["Prepared Food", 20],
  ["Fresh Food", 16],
  ["Lifestyle", 20],
  ["Pet Care", 18],
  ["Electronics", 55],
]);

function decodeHtml(value) {
  return value
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8216;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&nbsp;/g, " ");
}

function normalizeWhitespace(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b([a-z0-9]+)/g, (match) => {
      if (/^\d/.test(match)) return match;
      return match[0].toUpperCase() + match.slice(1);
    })
    .replace(/\bMl\b/g, "ml")
    .replace(/\bCl\b/g, "cl")
    .replace(/\bKg\b/g, "kg")
    .replace(/\bG\b/g, "g")
    .replace(/\bLtr\b/g, "Ltr")
    .replace(/\bTv\b/g, "TV")
    .replace(/\bHp\b/g, "HP")
    .replace(/\bAsus\b/g, "ASUS")
    .replace(/\bEdp\b/g, "EDP")
    .replace(/\bEdt\b/g, "EDT")
    .replace(/\bUhd\b/g, "UHD")
    .replace(/\bLed\b/g, "LED")
    .replace(/\bOled\b/g, "OLED")
    .replace(/\bIphone\b/g, "iPhone")
    .replace(/\bSamsung\b/g, "Samsung")
    .replace(/\bNescafe\b/g, "Nescafe")
    .replace(/\bMcvitie's\b/g, "McVitie's")
    .replace(/\bJohnson's\b/g, "Johnson's");
}

function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferUnit(title) {
  const value = title.toLowerCase();
  if (/\b(can|cans?)\b/.test(value)) return "Can";
  if (/\b(bottle|pet)\b/.test(value)) return "Bottle";
  if (/\b(tin)\b/.test(value)) return "Tin";
  if (/\b(carton)\b/.test(value)) return "Carton";
  if (/\b(pack|packs|x\d+)\b/.test(value)) return "Pack";
  if (/\b(box|boxes)\b/.test(value)) return "Box";
  if (/\b(sachet)\b/.test(value)) return "Sachet";
  if (/\b(refill)\b/.test(value)) return "Refill";
  if (/\b(tub)\b/.test(value)) return "Tub";
  if (/\b(bar|soap)\b/.test(value)) return "Bar";
  if (/\b(roll|rolls)\b/.test(value)) return "Roll";
  if (/\b(diaper|nappy|pants)\b/.test(value)) return "Pack";
  if (/\b(laptop|tv|iphone|galaxy|infinix|asus|hp)\b/.test(value)) return "Unit";
  if (/\b(perfume|oil|wash|cleaner|disinfectant|spray|water|yoghurt)\b/.test(value)) return "Bottle";
  if (/\b(cereal|custard|oats|powder|flour)\b/.test(value)) return "Pack";
  return "Item";
}

function inferBrand(title, fallback = "") {
  if (fallback) return titleCase(normalizeWhitespace(fallback));
  const words = normalizeWhitespace(title).split(" ");
  if (words.length === 1) return titleCase(words[0]);
  if (/^\d/.test(words[0]) && words[1]) return titleCase(`${words[0]} ${words[1]}`);
  if (words[0].endsWith("'s") && words[1]) return titleCase(words[0]);
  return titleCase(words[0]);
}

function buildDescription(title, category) {
  const label = normalizeWhitespace(title);
  const variants = {
    "Fresh Food": `A fresh-food supermarket item listed in Nigeria as ${label}.`,
    "Prepared Food": `A ready-to-serve supermarket food item listed in Nigeria as ${label}.`,
    Electronics: `An electronics item listed on a Nigerian supermarket catalogue as ${label}.`,
    Lifestyle: `A supermarket lifestyle item listed in Nigeria as ${label}.`,
    "Pet Care": `A pet-care item listed on a Nigerian supermarket catalogue as ${label}.`,
  };
  return (variants[category] ?? `A Nigerian supermarket product listed as ${label}.`).slice(0, 180);
}

function buildItem({ id, name, brand, unit, category, subCategory, sourceLabel, sourceUrl, evidence }) {
  return {
    id,
    name,
    brand,
    unit,
    category,
    subCategory,
    description: buildDescription(name, category),
    productType: "single",
    popularityScore: 50,
    popularityEvidence: [
      "Listed on an official Nigerian supermarket product or department page",
      "Included for Nigerian retail relevance rather than ranking priority",
    ],
    sources: [
      {
        label: sourceLabel,
        url: sourceUrl,
        checkedAt: "2026-07-21",
        evidence,
      },
    ],
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

async function loadAddideItems() {
  const items = [];

  for (const collection of addideCollections) {
    for (let page = 1; page <= 120; page++) {
      const url = `https://addide.com/collections/${collection.slug}?page=${page}`;
      const text = await fetchText(url);
      const matches = [...text.matchAll(/product-item__info-inner"><a class="product-item__vendor link"[^>]*>(.*?)<\/a>\s*<a href="([^"]*\/products\/[^"]+)" class="product-item__title[^>]*>(.*?)<\/a>/gs)];
      if (!matches.length) break;

      let pageAdded = 0;
      for (const match of matches) {
        const vendor = normalizeWhitespace(match[1]);
        const productUrl = `https://addide.com${match[2].replace(/^\/collections\/[^/]+/, "")}`;
        const title = titleCase(normalizeWhitespace(match[3]));
        if (!title) continue;
        items.push(buildItem({
          id: slugify(title),
          name: title,
          brand: inferBrand(title, vendor),
          unit: inferUnit(title),
          category: collection.category,
          subCategory: collection.subCategory,
          sourceLabel: `Addide ${collection.slug} collection`,
          sourceUrl: productUrl,
          evidence: `Product page is listed in Addide's ${collection.slug} collection.`,
        }));
        pageAdded += 1;
      }

      if (!pageAdded) break;
    }
  }

  return items;
}

async function loadSparItems() {
  const items = [];

  for (const category of sparCategories) {
    const url = `https://sparnigeria.com/products-catalogue/${category.slug}/`;
    const text = await fetchText(url);
    const seen = new Set();
    const matches = [...text.matchAll(/aria-label="([^"]+)" href="(https:\/\/sparnigeria\.com\/spar-product\/[^"]+)"/g)];

    for (const match of matches) {
      const title = titleCase(normalizeWhitespace(match[1]));
      const productUrl = match[2];
      if (!title || seen.has(productUrl)) continue;
      seen.add(productUrl);
      items.push(buildItem({
        id: slugify(title),
        name: title,
        brand: inferBrand(title),
        unit: inferUnit(title),
        category: category.category,
        subCategory: category.subCategory,
        sourceLabel: `SPAR Nigeria ${category.slug} catalogue`,
        sourceUrl: productUrl,
        evidence: `Department page links the product as ${normalizeWhitespace(match[1])}.`,
      }));
    }
  }

  return items;
}

function dedupeItems(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function sortByCatalogueOrder(items) {
  const order = new Map([
    ["Grocery", 1],
    ["Beverages", 2],
    ["Household", 3],
    ["Personal Care", 4],
    ["Baby & Toddler", 5],
    ["Prepared Food", 6],
    ["Fresh Food", 7],
    ["Lifestyle", 8],
    ["Pet Care", 9],
    ["Electronics", 10],
  ]);
  return [...items].sort((left, right) => {
    const categoryOrder = (order.get(left.category) ?? 99) - (order.get(right.category) ?? 99);
    if (categoryOrder !== 0) return categoryOrder;
    return left.name.localeCompare(right.name);
  });
}

function selectByQuota(items, quota, targetCount) {
  const selected = [];
  const used = new Set();

  for (const [category, count] of quota.entries()) {
    const matches = items.filter((item) => item.category === category).slice(0, count);
    for (const item of matches) {
      if (used.has(item.id)) continue;
      used.add(item.id);
      selected.push(item);
    }
  }

  for (const item of items) {
    if (selected.length >= targetCount) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    selected.push(item);
  }

  return selected.slice(0, targetCount);
}

async function main() {
  const addideItems = await loadAddideItems();
  const sparItems = await loadSparItems();
  const allItems = sortByCatalogueOrder(dedupeItems([...addideItems, ...sparItems]));

  if (allItems.length < 1000) {
    throw new Error(`Expected at least 1000 unique items, got ${allItems.length}.`);
  }

  const miniMarket400 = selectByQuota(allItems, miniMarketQuota, 400);
  if (miniMarket400.length < 400) {
    throw new Error(`Expected at least 400 mini-market items, got ${miniMarket400.length}.`);
  }

  const supermarket1000 = selectByQuota(allItems, supermarketQuota, 1000);

  await writeFile(
    path.join(root, "public/catalogue/2026.07-preview.1/mini-market-400.json"),
    JSON.stringify({ packId: "mini-market-400", catalogueVersion: version, items: miniMarket400 }, null, 2) + "\n",
    "utf8",
  );

  await writeFile(
    path.join(root, "public/catalogue/2026.07-preview.1/supermarket-1000.json"),
    JSON.stringify({ packId: "supermarket-1000", catalogueVersion: version, items: supermarket1000 }, null, 2) + "\n",
    "utf8",
  );

  console.log(`Built ${miniMarket400.length} items for mini-market-400 and ${supermarket1000.length} items for supermarket-1000.`);
}

await main();
