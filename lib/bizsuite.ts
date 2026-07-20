export const BIZSUITE_HEADERS = [
  "NAME",
  "BRAND",
  "UNIT",
  "CATEGORY",
  "SUB-CATEGORY",
  "SKU (Leave blank to auto generate sku)",
  "BARCODE TYPE",
  "MANAGE STOCK (1=yes 0=No)",
  "ALERT QUANTITY",
  "EXPIRES IN",
  "EXPIRY PERIOD UNIT (months/days)",
  "APPLICABLE TAX",
  "Selling Price Tax Type (inclusive or exclusive)",
  "PRODUCT TYPE (single or variable)",
  "VARIATION NAME (Keep blank if product type is single)",
  "VARIATION VALUES (| seperated values & blank if product type if single)",
  "VARIATION SKUs (| seperated values & blank if product type if single)",
  "PURCHASE PRICE (Including tax)",
  "PURCHASE PRICE (Excluding tax)",
  "PROFIT MARGIN",
  "SELLING PRICE",
  "OPENING STOCK",
  "LOCATION",
  "EXPIRY DATE",
  "ENABLE IMEI OR SERIAL NUMBER(1=yes 0=No)",
  "WEIGHT",
  "RACK",
  "ROW",
  "POSITION",
  "IMAGE",
  "PRODUCT DESCRIPTION",
  "CUSTOM FIELD 1",
  "CUSTOM FIELD 2",
  "CUSTOM FIELD 3",
  "CUSTOM FIELD 4",
  "NOT FOR SELLING(1=yes 0=No)",
  "PRODUCT LOCATIONS",
] as const;

export const FIELD_KEYS = [
  "name",
  "brand",
  "unit",
  "category",
  "subCategory",
  "sku",
  "barcodeType",
  "manageStock",
  "alertQuantity",
  "expiresIn",
  "expiryPeriodUnit",
  "applicableTax",
  "sellingPriceTaxType",
  "productType",
  "variationName",
  "variationValues",
  "variationSkus",
  "purchasePriceIncludingTax",
  "purchasePriceExcludingTax",
  "profitMargin",
  "sellingPrice",
  "openingStock",
  "location",
  "expiryDate",
  "enableImei",
  "weight",
  "rack",
  "row",
  "position",
  "image",
  "description",
  "customField1",
  "customField2",
  "customField3",
  "customField4",
  "notForSelling",
  "productLocations",
] as const;

export type CanonicalField = (typeof FIELD_KEYS)[number];
export type ProductType = "" | "single" | "variable" | "combo";
export type TaxType = "" | "inclusive" | "exclusive";

export interface Variation {
  id: string;
  value: string;
  sku: string;
  purchasePriceIncludingTax: string;
  purchasePriceExcludingTax: string;
  profitMargin: string;
  sellingPrice: string;
  openingStock: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  unit: string;
  category: string;
  subCategory: string;
  sku: string;
  barcodeType: string;
  manageStock: boolean | null;
  alertQuantity: string;
  expiresIn: string;
  expiryPeriodUnit: "" | "months" | "days";
  applicableTax: string;
  sellingPriceTaxType: TaxType;
  productType: ProductType;
  variationName: string;
  variations: Variation[];
  purchasePriceIncludingTax: string;
  purchasePriceExcludingTax: string;
  profitMargin: string;
  sellingPrice: string;
  openingStock: string;
  location: string;
  expiryDate: string;
  enableImei: boolean | null;
  weight: string;
  rack: string;
  row: string;
  position: string;
  image: string;
  description: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  notForSelling: boolean | null;
  productLocations: string;
}

export interface ValidationIssue {
  field: CanonicalField | "variations" | "row";
  message: string;
  severity: "error" | "warning";
}

export const FIELD_LABELS: Record<CanonicalField, string> = {
  name: "Product name",
  brand: "Brand",
  unit: "Unit",
  category: "Category",
  subCategory: "Sub-category",
  sku: "SKU",
  barcodeType: "Barcode type",
  manageStock: "Manage stock",
  alertQuantity: "Alert quantity",
  expiresIn: "Expires in",
  expiryPeriodUnit: "Expiry period unit",
  applicableTax: "Applicable tax",
  sellingPriceTaxType: "Selling price tax type",
  productType: "Product type",
  variationName: "Variation name",
  variationValues: "Variation values",
  variationSkus: "Variation SKUs",
  purchasePriceIncludingTax: "Purchase price including tax",
  purchasePriceExcludingTax: "Purchase price excluding tax",
  profitMargin: "Profit margin",
  sellingPrice: "Selling price",
  openingStock: "Opening stock",
  location: "Opening stock location",
  expiryDate: "Expiry date",
  enableImei: "IMEI / serial number",
  weight: "Weight",
  rack: "Rack",
  row: "Row",
  position: "Position",
  image: "Image",
  description: "Product description",
  customField1: "Custom field 1",
  customField2: "Custom field 2",
  customField3: "Custom field 3",
  customField4: "Custom field 4",
  notForSelling: "Not for selling",
  productLocations: "Product locations",
};

export const REQUIRED_FIELDS: CanonicalField[] = [
  "name",
  "unit",
  "manageStock",
  "sellingPriceTaxType",
  "productType",
];

const HEADER_ALIASES: Record<string, CanonicalField> = {};

function normalized(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function registerAliases(field: CanonicalField, aliases: string[]) {
  for (const alias of aliases) HEADER_ALIASES[normalized(alias)] = field;
}

FIELD_KEYS.forEach((field, index) =>
  registerAliases(field, [BIZSUITE_HEADERS[index], FIELD_LABELS[field], field]),
);

registerAliases("name", ["product", "product name", "item", "item name"]);
registerAliases("subCategory", ["subcategory", "sub category"]);
registerAliases("manageStock", ["stock management", "track stock"]);
registerAliases("alertQuantity", ["reorder quantity", "reorder level", "low stock alert"]);
registerAliases("sellingPriceTaxType", ["tax type", "price tax type"]);
registerAliases("productType", ["type", "item type"]);
registerAliases("location", ["opening stock location", "stock location"]);
registerAliases("productLocations", ["available locations", "business locations"]);
registerAliases("purchasePriceIncludingTax", ["cost price", "purchase price", "cost including tax"]);
registerAliases("purchasePriceExcludingTax", ["cost excluding tax"]);
registerAliases("sellingPrice", ["retail price", "sale price"]);
registerAliases("description", ["details", "product details"]);

export function suggestField(header: unknown): CanonicalField | "ignore" {
  return HEADER_ALIASES[normalized(header)] ?? "ignore";
}

export function createId(prefix = "row") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createVariation(seed: Partial<Variation> = {}): Variation {
  return {
    id: createId("variation"),
    value: "",
    sku: "",
    purchasePriceIncludingTax: "",
    purchasePriceExcludingTax: "",
    profitMargin: "",
    sellingPrice: "",
    openingStock: "",
    ...seed,
  };
}

export function createProduct(seed: Partial<Product> = {}): Product {
  return {
    id: createId(),
    name: "",
    brand: "",
    unit: "",
    category: "",
    subCategory: "",
    sku: "",
    barcodeType: "C128",
    manageStock: null,
    alertQuantity: "",
    expiresIn: "",
    expiryPeriodUnit: "",
    applicableTax: "",
    sellingPriceTaxType: "",
    productType: "single",
    variationName: "",
    variations: [],
    purchasePriceIncludingTax: "",
    purchasePriceExcludingTax: "",
    profitMargin: "",
    sellingPrice: "",
    openingStock: "",
    location: "",
    expiryDate: "",
    enableImei: null,
    weight: "",
    rack: "",
    row: "",
    position: "",
    image: "",
    description: "",
    customField1: "",
    customField2: "",
    customField3: "",
    customField4: "",
    notForSelling: null,
    productLocations: "",
    ...seed,
  };
}

function isNumber(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

function isNonNegativeNumber(value: string) {
  return isNumber(value) && Number(value) >= 0;
}

function validDate(value: string) {
  return /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-\d{4}$/.test(value);
}

function pushNumericIssue(
  issues: ValidationIssue[],
  field: CanonicalField,
  value: string,
  label: string,
) {
  if (value && !isNonNegativeNumber(value)) {
    issues.push({ field, severity: "error", message: `${label} must be zero or a positive number.` });
  }
}

export function validateProduct(product: Product): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!product.name.trim()) issues.push({ field: "name", severity: "error", message: "Product name is required." });
  if (!product.unit.trim()) issues.push({ field: "unit", severity: "error", message: "Unit is required." });
  if (product.manageStock === null) issues.push({ field: "manageStock", severity: "error", message: "Choose Yes or No for manage stock." });
  if (!product.sellingPriceTaxType) issues.push({ field: "sellingPriceTaxType", severity: "error", message: "Selling price tax type is required." });
  if (!product.productType) issues.push({ field: "productType", severity: "error", message: "Product type is required." });
  if (product.productType === "combo") issues.push({ field: "productType", severity: "error", message: "Combo products are not documented as importable. Convert or exclude this row." });

  if (product.productType === "variable") {
    if (!product.variationName.trim()) {
      issues.push({ field: "variationName", severity: "error", message: "Variation name is required for a variable product." });
    }
    if (!product.variations.length || product.variations.every((variation) => !variation.value.trim())) {
      issues.push({ field: "variationValues", severity: "error", message: "Add at least one variation value." });
    }
    product.variations.forEach((variation, index) => {
      if (!variation.value.trim()) {
        issues.push({ field: "variations", severity: "error", message: `Variation ${index + 1} needs a value.` });
      }
      if (!isNumber(variation.purchasePriceIncludingTax) && !isNumber(variation.purchasePriceExcludingTax)) {
        issues.push({ field: "variations", severity: "error", message: `Variation ${index + 1} needs a purchase price.` });
      }
      for (const [field, value, label] of [
        ["purchasePriceIncludingTax", variation.purchasePriceIncludingTax, "Purchase price including tax"],
        ["purchasePriceExcludingTax", variation.purchasePriceExcludingTax, "Purchase price excluding tax"],
        ["profitMargin", variation.profitMargin, "Profit margin"],
        ["sellingPrice", variation.sellingPrice, "Selling price"],
        ["openingStock", variation.openingStock, "Opening stock"],
      ] as const) pushNumericIssue(issues, field, value, `${label} for variation ${index + 1}`);
    });
  } else if (!isNumber(product.purchasePriceIncludingTax) && !isNumber(product.purchasePriceExcludingTax)) {
    issues.push({ field: "purchasePriceIncludingTax", severity: "error", message: "Enter purchase price including tax or excluding tax." });
  }

  pushNumericIssue(issues, "purchasePriceIncludingTax", product.purchasePriceIncludingTax, "Purchase price including tax");
  pushNumericIssue(issues, "purchasePriceExcludingTax", product.purchasePriceExcludingTax, "Purchase price excluding tax");
  pushNumericIssue(issues, "profitMargin", product.profitMargin, "Profit margin");
  pushNumericIssue(issues, "sellingPrice", product.sellingPrice, "Selling price");
  pushNumericIssue(issues, "openingStock", product.openingStock, "Opening stock");
  pushNumericIssue(issues, "alertQuantity", product.alertQuantity, "Alert quantity");
  pushNumericIssue(issues, "expiresIn", product.expiresIn, "Expiry period");

  if (product.expiresIn && !product.expiryPeriodUnit) {
    issues.push({ field: "expiryPeriodUnit", severity: "error", message: "Choose months or days for the expiry period." });
  }
  if (product.expiryDate && !validDate(product.expiryDate)) {
    issues.push({ field: "expiryDate", severity: "error", message: "Expiry date must use mm-dd-yyyy." });
  }
  if (product.subCategory.trim() && !product.category.trim()) {
    issues.push({ field: "category", severity: "error", message: "Category is required when a sub-category is provided." });
  }
  if (product.openingStock && !product.location.trim()) {
    issues.push({ field: "location", severity: "warning", message: "No opening-stock location supplied; Bizsuite may use the first business location." });
  }
  if (/X-Amz-Expires=/i.test(product.image)) {
    issues.push({ field: "image", severity: "warning", message: "This appears to be a temporary signed image URL and may expire before import." });
  }
  return issues;
}

function boolCell(value: boolean | null) {
  return value === null ? "" : value ? 1 : 0;
}

function joinVariations(product: Product, key: keyof Omit<Variation, "id">) {
  if (product.productType !== "variable") return "";
  return product.variations.map((variation) => variation[key]).join("|");
}

export function serializeProduct(product: Product): (string | number)[] {
  const isVariable = product.productType === "variable";
  return [
    product.name.trim(),
    product.brand.trim(),
    product.unit.trim(),
    product.category.trim(),
    product.subCategory.trim(),
    product.sku.trim(),
    product.barcodeType || "C128",
    boolCell(product.manageStock),
    product.alertQuantity,
    product.expiresIn,
    product.expiryPeriodUnit,
    product.applicableTax.trim(),
    product.sellingPriceTaxType,
    product.productType,
    isVariable ? product.variationName.trim() : "",
    joinVariations(product, "value"),
    joinVariations(product, "sku"),
    isVariable ? joinVariations(product, "purchasePriceIncludingTax") : product.purchasePriceIncludingTax,
    isVariable ? joinVariations(product, "purchasePriceExcludingTax") : product.purchasePriceExcludingTax,
    isVariable ? joinVariations(product, "profitMargin") : product.profitMargin,
    isVariable ? joinVariations(product, "sellingPrice") : product.sellingPrice,
    isVariable ? joinVariations(product, "openingStock") : product.openingStock,
    product.location.trim(),
    product.expiryDate,
    boolCell(product.enableImei),
    product.weight,
    product.rack,
    product.row,
    product.position,
    product.image.trim(),
    product.description,
    product.customField1,
    product.customField2,
    product.customField3,
    product.customField4,
    boolCell(product.notForSelling),
    product.productLocations.trim(),
  ];
}

function toStringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function toBoolean(value: unknown, blankValue: boolean | null = null) {
  if (value === null || value === undefined || String(value).trim() === "") return blankValue;
  const comparable = String(value).trim().toLowerCase();
  if (["1", "yes", "true", "y"].includes(comparable)) return true;
  if (["0", "no", "false", "n"].includes(comparable)) return false;
  return blankValue;
}

function sanitizeDescription(value: unknown) {
  const source = toStringValue(value);
  if (typeof DOMParser === "undefined" || !source.includes("<")) return source;
  const document = new DOMParser().parseFromString(source, "text/html");
  document.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  document.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.toLowerCase().startsWith("on")) node.removeAttribute(attribute.name);
    }
  });
  return document.body.innerHTML;
}

export function productFromMappedRow(
  sourceHeaders: string[],
  row: unknown[],
  mapping: Record<string, CanonicalField | "ignore">,
): Product {
  const raw: Partial<Record<CanonicalField, unknown>> = {};
  sourceHeaders.forEach((header, index) => {
    const field = mapping[header];
    if (field && field !== "ignore") raw[field] = row[index];
  });

  const variationValues = toStringValue(raw.variationValues).split("|").filter((value) => value !== "");
  const variationSkus = toStringValue(raw.variationSkus).split("|");
  const purchaseInc = toStringValue(raw.purchasePriceIncludingTax).split("|");
  const purchaseEx = toStringValue(raw.purchasePriceExcludingTax).split("|");
  const margins = toStringValue(raw.profitMargin).split("|");
  const selling = toStringValue(raw.sellingPrice).split("|");
  const stocks = toStringValue(raw.openingStock).split("|");
  const productType = toStringValue(raw.productType).toLowerCase() as ProductType;
  const isVariable = productType === "variable";
  const variations = isVariable
    ? variationValues.map((value, index) =>
        createVariation({
          value,
          sku: variationSkus[index] ?? "",
          purchasePriceIncludingTax: purchaseInc[index] ?? "",
          purchasePriceExcludingTax: purchaseEx[index] ?? "",
          profitMargin: margins[index] ?? "",
          sellingPrice: selling[index] ?? "",
          openingStock: stocks[index] ?? "",
        }),
      )
    : [];

  return createProduct({
    name: toStringValue(raw.name),
    brand: toStringValue(raw.brand),
    unit: toStringValue(raw.unit),
    category: toStringValue(raw.category),
    subCategory: toStringValue(raw.subCategory),
    sku: toStringValue(raw.sku),
    barcodeType: toStringValue(raw.barcodeType) || "C128",
    manageStock: toBoolean(raw.manageStock, false),
    alertQuantity: toStringValue(raw.alertQuantity),
    expiresIn: toStringValue(raw.expiresIn),
    expiryPeriodUnit: toStringValue(raw.expiryPeriodUnit).toLowerCase() as Product["expiryPeriodUnit"],
    applicableTax: toStringValue(raw.applicableTax),
    sellingPriceTaxType: toStringValue(raw.sellingPriceTaxType).toLowerCase() as TaxType,
    productType: productType || "single",
    variationName: toStringValue(raw.variationName),
    variations,
    purchasePriceIncludingTax: isVariable ? "" : toStringValue(raw.purchasePriceIncludingTax),
    purchasePriceExcludingTax: isVariable ? "" : toStringValue(raw.purchasePriceExcludingTax),
    profitMargin: isVariable ? "" : toStringValue(raw.profitMargin),
    sellingPrice: isVariable ? "" : toStringValue(raw.sellingPrice),
    openingStock: isVariable ? "" : toStringValue(raw.openingStock),
    location: toStringValue(raw.location),
    expiryDate: toStringValue(raw.expiryDate),
    enableImei: toBoolean(raw.enableImei),
    weight: toStringValue(raw.weight),
    rack: toStringValue(raw.rack),
    row: toStringValue(raw.row),
    position: toStringValue(raw.position),
    image: toStringValue(raw.image),
    description: sanitizeDescription(raw.description),
    customField1: toStringValue(raw.customField1),
    customField2: toStringValue(raw.customField2),
    customField3: toStringValue(raw.customField3),
    customField4: toStringValue(raw.customField4),
    notForSelling: toBoolean(raw.notForSelling),
    productLocations: toStringValue(raw.productLocations),
  });
}

export function duplicateSkuIssues(products: Product[]) {
  const counts = new Map<string, number>();
  for (const product of products) {
    const sku = product.sku.trim().toLowerCase();
    if (sku) counts.set(sku, (counts.get(sku) ?? 0) + 1);
    for (const variation of product.variations) {
      const variationSku = variation.sku.trim().toLowerCase();
      if (variationSku) counts.set(variationSku, (counts.get(variationSku) ?? 0) + 1);
    }
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([sku]) => sku));
}

