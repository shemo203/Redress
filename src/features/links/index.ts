import { validateClothingTagUrl } from "../../utils";

const PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DENYLIST = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

type CachedPreview = {
  expiresAt: number;
  value: OutboundLinkPreview;
};

export type OutboundLinkPolicy = {
  allowed: boolean;
  hostname: string;
  reason: string | null;
  siteLabel: string;
};

export type OutboundLinkPreview = {
  blockedReason: string | null;
  description: string | null;
  finalUrl: string;
  hostname: string;
  imageUrl: string | null;
  metadataFound: boolean;
  price: string | null;
  siteLabel: string;
  title: string;
  warning: string | null;
};

const previewCache = new Map<string, CachedPreview>();
const previewRequests = new Map<string, Promise<OutboundLinkPreview>>();

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function stripMetaContent(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = decodeHtmlEntities(value.replace(/\s+/g, " ").trim());
  return normalized.length > 0 ? normalized : null;
}

function normalizeWhitespace(value: string) {
  return decodeHtmlEntities(value.replace(/\s+/g, " ").trim());
}

function parseDomainList(rawValue: string | undefined) {
  return (rawValue ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.+$/, "");
}

function matchesDomainRule(hostname: string, rule: string) {
  const normalizedRule = normalizeHostname(rule);
  return (
    hostname === normalizedRule ||
    hostname.endsWith(`.${normalizedRule}`)
  );
}

function isPrivateIpv4Address(hostname: string) {
  const segments = hostname.split(".");
  if (segments.length !== 4 || segments.some((segment) => !/^\d+$/.test(segment))) {
    return false;
  }

  const [first, second] = segments.map((segment) => Number(segment));
  if (first === 10 || first === 127) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  return false;
}

function isBlockedPrivateHostname(hostname: string) {
  return (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isPrivateIpv4Address(hostname)
  );
}

function formatSiteLabel(hostname: string) {
  const withoutWww = hostname.replace(/^www\./, "");
  const pieces = withoutWww.split(".");
  if (pieces.length === 0 || pieces[0].length === 0) {
    return "site";
  }

  const candidate = pieces.length >= 2 ? pieces[pieces.length - 2] : pieces[0];
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

function extractMetaTag(html: string, attribute: "name" | "property", key: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]*${attribute}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${key}["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const content = stripMetaContent(match?.[1] ?? null);
    if (content) {
      return content;
    }
  }

  return null;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return stripMetaContent(match?.[1] ?? null);
}

function looksLikeBotBlock(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return [
    "access denied",
    "forbidden",
    "attention required",
    "just a moment",
    "temporarily unavailable",
    "verify you are human",
    "robot or human",
    "request blocked",
  ].some((pattern) => normalized.includes(pattern));
}

function cleanPreviewText(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = stripMetaContent(value);
  if (!normalized || looksLikeBotBlock(normalized)) {
    return null;
  }

  return normalized;
}

function resolveMaybeRelativeUrl(candidate: string | null, baseUrl: string) {
  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractJsonLdScripts(html: string) {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  return Array.from(matches)
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function flattenJsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenJsonLdNodes(item));
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const graph = Array.isArray(record["@graph"]) ? record["@graph"] : null;

  return [record, ...(graph ? graph.flatMap((item) => flattenJsonLdNodes(item)) : [])];
}

function hasProductType(node: Record<string, unknown>) {
  const typeValue = node["@type"];
  if (typeof typeValue === "string") {
    return typeValue.toLowerCase().includes("product");
  }
  if (Array.isArray(typeValue)) {
    return typeValue.some(
      (entry) => typeof entry === "string" && entry.toLowerCase().includes("product")
    );
  }
  return false;
}

function getStringFromUnknown(value: unknown): string | null {
  if (typeof value === "string") {
    return cleanPreviewText(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

function getImageFromUnknown(value: unknown, baseUrl: string): string | null {
  if (typeof value === "string") {
    return resolveMaybeRelativeUrl(value, baseUrl);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = getImageFromUnknown(item, baseUrl);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      getImageFromUnknown(record.url, baseUrl) ??
      getImageFromUnknown(record.contentUrl, baseUrl)
    );
  }
  return null;
}

function formatPrice(priceValue: string | null, currencyValue: string | null) {
  if (!priceValue) {
    return null;
  }

  const normalizedPrice = normalizeWhitespace(priceValue);
  if (!currencyValue) {
    return normalizedPrice;
  }

  const normalizedCurrency = currencyValue.trim().toUpperCase();
  return `${normalizedPrice} ${normalizedCurrency}`.trim();
}

function extractOfferPrice(offers: unknown): string | null {
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const price = extractOfferPrice(offer);
      if (price) {
        return price;
      }
    }
    return null;
  }

  if (!offers || typeof offers !== "object") {
    return null;
  }

  const record = offers as Record<string, unknown>;
  const directPrice =
    getStringFromUnknown(record.price) ??
    getStringFromUnknown(record.lowPrice) ??
    getStringFromUnknown(record.highPrice);
  const directCurrency = getStringFromUnknown(record.priceCurrency);

  if (directPrice) {
    return formatPrice(directPrice, directCurrency);
  }

  if (record.offers) {
    return extractOfferPrice(record.offers);
  }

  return null;
}

function extractProductJsonLd(html: string, baseUrl: string) {
  const scripts = extractJsonLdScripts(html);

  for (const script of scripts) {
    const parsed = safeJsonParse(script);
    const nodes = flattenJsonLdNodes(parsed);

    for (const node of nodes) {
      if (!hasProductType(node)) {
        continue;
      }

      const price = extractOfferPrice(node.offers);
      return {
        description: getStringFromUnknown(node.description),
        imageUrl: getImageFromUnknown(node.image, baseUrl),
        price,
        title:
          getStringFromUnknown(node.name) ??
          getStringFromUnknown(node.alternateName),
      };
    }
  }

  return null;
}

function extractMetaPrice(html: string) {
  const price =
    extractMetaTag(html, "property", "product:price:amount") ??
    extractMetaTag(html, "property", "og:price:amount");
  const currency =
    extractMetaTag(html, "property", "product:price:currency") ??
    extractMetaTag(html, "property", "og:price:currency");

  return formatPrice(price, currency);
}

function buildPreviewFromUrl(url: string, overrides: Partial<OutboundLinkPreview> = {}) {
  const parsed = new URL(url);
  const hostname = normalizeHostname(parsed.hostname);
  const siteLabel = overrides.siteLabel ?? formatSiteLabel(hostname);

  return {
    blockedReason: null,
    description: null,
    finalUrl: url,
    hostname,
    imageUrl: null,
    metadataFound: false,
    price: null,
    siteLabel,
    title: siteLabel,
    warning: null,
    ...overrides,
  };
}

function getConfiguredDomainLists() {
  return {
    allowlist: parseDomainList(process.env.EXPO_PUBLIC_OUTBOUND_DOMAIN_ALLOWLIST),
    denylist: [
      ...DEFAULT_DENYLIST,
      ...parseDomainList(process.env.EXPO_PUBLIC_OUTBOUND_DOMAIN_DENYLIST),
    ],
  };
}

export function getOutboundLinkPolicy(url: string): OutboundLinkPolicy {
  const validation = validateClothingTagUrl(url, { requireUrl: true });
  if (!validation.valid) {
    return {
      allowed: false,
      hostname: "",
      reason: validation.error ?? "Only http:// or https:// links are allowed.",
      siteLabel: "site",
    };
  }

  const parsed = new URL(validation.normalized);
  const hostname = normalizeHostname(parsed.hostname);
  const siteLabel = formatSiteLabel(hostname);
  const { allowlist, denylist } = getConfiguredDomainLists();

  if (
    denylist.some((rule) => matchesDomainRule(hostname, rule)) ||
    isBlockedPrivateHostname(hostname)
  ) {
    return {
      allowed: false,
      hostname,
      reason: "Links to local, private, or blocked domains are not allowed.",
      siteLabel,
    };
  }

  if (
    allowlist.length > 0 &&
    !allowlist.some((rule) => matchesDomainRule(hostname, rule))
  ) {
    return {
      allowed: false,
      hostname,
      reason: "This domain is not on the outbound allowlist.",
      siteLabel,
    };
  }

  return {
    allowed: true,
    hostname,
    reason: null,
    siteLabel,
  };
}

export function buildOutboundLinkFallbackPreview(url: string) {
  const validation = validateClothingTagUrl(url, { requireUrl: true });
  const normalizedUrl = validation.valid ? validation.normalized : "https://example.com";
  const policy = getOutboundLinkPolicy(normalizedUrl);

  return buildPreviewFromUrl(normalizedUrl, {
    blockedReason: policy.allowed ? null : policy.reason,
    siteLabel: policy.siteLabel,
    title: policy.siteLabel,
  });
}

async function fetchPreviewUncached(url: string) {
  const initialPolicy = getOutboundLinkPolicy(url);
  const basePreview = buildPreviewFromUrl(url, {
    blockedReason: initialPolicy.allowed ? null : initialPolicy.reason,
    siteLabel: initialPolicy.siteLabel,
    title: initialPolicy.siteLabel,
  });

  if (!initialPolicy.allowed) {
    return basePreview;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
      method: "GET",
    });

    const resolvedUrl = response.url?.trim() || url;
    const resolvedPolicy = getOutboundLinkPolicy(resolvedUrl);
    const previewBase = buildPreviewFromUrl(resolvedUrl, {
      blockedReason: resolvedPolicy.allowed ? null : resolvedPolicy.reason,
      siteLabel: resolvedPolicy.siteLabel,
      title: resolvedPolicy.siteLabel,
    });

    if (!resolvedPolicy.allowed) {
      return previewBase;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return previewBase;
    }

    const html = await response.text();
    const productJsonLd = extractProductJsonLd(html, resolvedUrl);
    const siteName =
      cleanPreviewText(extractMetaTag(html, "property", "og:site_name")) ??
      cleanPreviewText(extractMetaTag(html, "name", "application-name")) ??
      previewBase.siteLabel;
    const ogTitle =
      cleanPreviewText(extractMetaTag(html, "property", "og:title")) ??
      cleanPreviewText(extractMetaTag(html, "name", "twitter:title")) ??
      cleanPreviewText(extractTitleTag(html));
    const description =
      productJsonLd?.description ??
      cleanPreviewText(extractMetaTag(html, "property", "og:description")) ??
      cleanPreviewText(extractMetaTag(html, "name", "description")) ??
      cleanPreviewText(extractMetaTag(html, "name", "twitter:description"));
    const imageUrl = resolveMaybeRelativeUrl(
      productJsonLd?.imageUrl ??
        extractMetaTag(html, "property", "og:image") ??
        extractMetaTag(html, "name", "twitter:image"),
      resolvedUrl
    );
    const title = productJsonLd?.title ?? ogTitle ?? previewBase.title;
    const price = productJsonLd?.price ?? extractMetaPrice(html);
    const metadataBlocked = looksLikeBotBlock(extractTitleTag(html));

    return {
      ...previewBase,
      description,
      imageUrl,
      metadataFound: Boolean(title || description || imageUrl || price),
      price,
      siteLabel: siteName,
      title,
      warning: metadataBlocked
        ? "Preview details are limited because the destination returned an anti-bot page."
        : null,
    };
  } catch {
    return {
      ...basePreview,
      warning: "Preview unavailable right now. You can still open the site.",
    };
  }
}

export async function fetchOutboundLinkPreview(url: string) {
  const validation = validateClothingTagUrl(url, { requireUrl: true });
  if (!validation.valid) {
    return buildOutboundLinkFallbackPreview(url);
  }

  const normalizedUrl = validation.normalized;
  const now = Date.now();
  const cached = previewCache.get(normalizedUrl);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const existingRequest = previewRequests.get(normalizedUrl);
  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchPreviewUncached(normalizedUrl)
    .then((preview) => {
      previewCache.set(normalizedUrl, {
        expiresAt: now + PREVIEW_CACHE_TTL_MS,
        value: preview,
      });
      return preview;
    })
    .finally(() => {
      previewRequests.delete(normalizedUrl);
    });

  previewRequests.set(normalizedUrl, request);
  return request;
}
