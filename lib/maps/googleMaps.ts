interface AreaSearchInput {
  country: string;
  state: string;
  city: string;
  query?: string;
  maxResults: number;
  excludeKeys?: string[];
}

export interface AreaRestaurantCandidate {
  id: string;
  name: string;
  phone_number: string | null;
  address: string | null;
  category: string | null;
  maps_url: string | null;
}

export function makeLeadKey(name: string, phone: string | null | undefined) {
  const normalizedName = name.trim().toLowerCase();
  const normalizedPhone = (phone ?? "").replace(/\s+/g, "").toLowerCase();
  return `${normalizedName}|${normalizedPhone}`;
}

function safeGet(source: unknown, ...keys: Array<string | number>) {
  let current: unknown = source;

  for (const key of keys) {
    if (current == null) {
      return null;
    }

    if (Array.isArray(current) && typeof key === "number") {
      current = current[key];
      continue;
    }

    if (typeof current === "object" && typeof key === "string") {
      current = (current as Record<string, unknown>)[key];
      continue;
    }

    return null;
  }

  return current;
}

function stripPrefix(text: string) {
  let value = text.trim();

  for (const prefix of [")]}'", "/**/"]) {
    if (value.startsWith(prefix)) {
      value = value.slice(prefix.length).trim();
    }
  }

  if (value.startsWith("/*")) {
    const end = value.indexOf("*/");
    if (end >= 0) {
      value = value.slice(end + 2).trim();
    }
  }

  return value;
}

function parseJson(text: string) {
  return JSON.parse(stripPrefix(text));
}

function isPhone(value: string) {
  const compact = value.replace(/[\s\-\(\)\+]/g, "");
  if (value.startsWith("+") && compact.length >= 7) {
    return true;
  }

  return /^\d{7,15}$/.test(compact);
}

function findPhone(data: unknown, depth = 0): string | null {
  if (depth > 5) {
    return null;
  }

  if (typeof data === "string" && isPhone(data)) {
    return data;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findPhone(item, depth + 1);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function parsePlace(d: unknown): AreaRestaurantCandidate | null {
  const name = safeGet(d, 11);
  if (typeof name !== "string" || !name.trim()) {
    return null;
  }

  const categoryRaw = safeGet(d, 13);
  const categories = Array.isArray(categoryRaw)
    ? categoryRaw.filter((item) => typeof item === "string")
    : [];
  const category = categories.join(", ") || null;

  const phonePrimary = safeGet(d, 178, 0, 0);
  const phone =
    typeof phonePrimary === "string" && isPhone(phonePrimary)
      ? phonePrimary
      : findPhone(safeGet(d, 178)) ?? null;

  const dataId = safeGet(d, 10);
  const mapsUrl = safeGet(d, 42);
  const address = safeGet(d, 39) ?? safeGet(d, 18);

  return {
    id:
      (typeof dataId === "string" && dataId) ||
      (typeof mapsUrl === "string" && mapsUrl) ||
      `${name}-${phone ?? ""}`,
    name: name.trim(),
    phone_number: phone,
    address: typeof address === "string" ? address : null,
    category,
    maps_url: typeof mapsUrl === "string" ? mapsUrl : null,
  };
}

class GoogleSession {
  private cookieHeader = "";

  private mergeCookies(setCookieHeaders: string[]) {
    const next = new Map<string, string>();

    if (this.cookieHeader) {
      this.cookieHeader.split(";").forEach((pair) => {
        const [name, ...rest] = pair.trim().split("=");
        if (!name || rest.length === 0) {
          return;
        }
        next.set(name, rest.join("="));
      });
    }

    for (const raw of setCookieHeaders) {
      const first = raw.split(";")[0];
      const [name, ...rest] = first.split("=");
      if (!name || rest.length === 0) {
        continue;
      }
      next.set(name, rest.join("="));
    }

    this.cookieHeader = Array.from(next.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  async request(url: string, init?: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.google.com/maps",
        ...(this.cookieHeader ? { Cookie: this.cookieHeader } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    const setCookie = response.headers.getSetCookie?.() ?? [];
    if (setCookie.length > 0) {
      this.mergeCookies(setCookie);
    }

    return response;
  }
}

async function discoverIds(session: GoogleSession, query: string): Promise<Set<string>> {
  const params = new URLSearchParams({
    tbm: "map",
    q: query,
    hl: "en",
    gl: "us",
  });

  const response = await session.request(`https://www.google.com/search?${params.toString()}`);
  if (!response.ok) {
    return new Set<string>();
  }

  const html = await response.text();
  const matches = html.match(/0x[0-9a-f]+:0x[0-9a-f]+/gi) ?? [];
  return new Set(matches.map((item) => item.toLowerCase()));
}

async function fetchPlaceDetail(
  session: GoogleSession,
  dataId: string,
  query: string,
): Promise<AreaRestaurantCandidate | null> {
  const pb =
    `!1m17!1s${dataId}` +
    "!3m12!1m3!1d14227.0!2d55.0!3d25.0" +
    "!2m3!1f0!2f0!3f0!3m2!1i1163!2i945!4f13.1" +
    "!4m2!3d25.0!4d55.0" +
    `!6s${encodeURIComponent(query)}` +
    "!13m50!2m2!1i408!2i240!3m2!2i10!5b1" +
    "!7m33!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2" +
    "!1m3!1e2!2b0!3e3!1m3!1e8!2b0!3e3" +
    "!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2" +
    "!1m3!1e10!2b0!3e4!1m3!1e9!2b1!3e2!2b1!9b0" +
    "!15m8!1m7!1m2!1m1!1e2!2m2!1i195!2i195!3i20" +
    "!15m49!1m10!4e2!18m7!3b0!6b0!14b1!17b1!20b1" +
    "!27m1!1b0!20e2" +
    "!4b1!10m1!8e3!11m1!3e1!17b1!20m2!1e3!1e6" +
    "!24b1!25b1!26b1!29b1!30m1!2b1!36b1!43b1!52b1" +
    "!55b1!56m1!1b1" +
    "!65m5!3m4!1m3!1m2!1i224!2i298" +
    "!98m3!1b1!2b1!3b1!107m2!1m1!1e1" +
    "!114m3!1b1!2m1!1b1" +
    "!22m1!1e81!29m0" +
    "!30m6!3b1!6m1!2b1!7m1!2b1!9b1!32b1!37i769";

  const params = new URLSearchParams({
    authuser: "0",
    hl: "en",
    gl: "us",
    pb,
    q: "*",
    pf: "t",
  });

  const response = await session.request(`https://www.google.com/maps/preview/place?${params.toString()}`);
  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  const data = parseJson(text);
  const placeArray = safeGet(data, 6);

  if (!Array.isArray(placeArray)) {
    return null;
  }

  return parsePlace(placeArray);
}

export async function scrapeRestaurantsByArea({
  country,
  state,
  city,
  query,
  maxResults,
  excludeKeys,
}: AreaSearchInput): Promise<AreaRestaurantCandidate[]> {
  const session = new GoogleSession();
  const locationText = `${city}, ${state}, ${country}`;
  const baseQuery = query?.trim() || `restaurants in ${locationText}`;

  await session.request(`https://www.google.com/maps/search/${encodeURIComponent(baseQuery)}`);

  const queryVariants = [
    baseQuery,
    `restaurants in ${city}`,
    `restaurants in ${city} ${state}`,
    `cafe in ${city}`,
    `food in ${city}`,
    `indian restaurant in ${city}`,
    `arabic restaurant in ${city}`,
    `chinese restaurant in ${city}`,
    `italian restaurant in ${city}`,
    `japanese restaurant in ${city}`,
    `thai restaurant in ${city}`,
    `turkish restaurant in ${city}`,
    `mexican restaurant in ${city}`,
    `seafood restaurant in ${city}`,
    `fast food in ${city}`,
    `bakery in ${city}`,
  ];

  const allIds = new Set<string>();

  for (const variant of queryVariants) {
    const ids = await discoverIds(session, variant);
    ids.forEach((id) => allIds.add(id));
    if (allIds.size >= maxResults * 8) {
      break;
    }
  }

  const candidates: AreaRestaurantCandidate[] = [];
  const dedupe = new Set<string>(excludeKeys ?? []);

  const ids = Array.from(allIds);
  const workerCount = Math.min(16, Math.max(4, Math.ceil(maxResults / 80)));
  let cursor = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        if (candidates.length >= maxResults) {
          return;
        }

        const index = cursor;
        cursor += 1;
        if (index >= ids.length) {
          return;
        }

        const dataId = ids[index];
        const place = await fetchPlaceDetail(session, dataId, baseQuery);
        if (!place || !place.name) {
          continue;
        }

        const key = makeLeadKey(place.name, place.phone_number);
        if (dedupe.has(key)) {
          continue;
        }

        dedupe.add(key);
        candidates.push(place);
      }
    }),
  );

  return candidates.slice(0, maxResults);
}
