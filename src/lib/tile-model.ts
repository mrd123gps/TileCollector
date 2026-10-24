export const SLOT_COUNT = 32;
export const MAIN_ID = "main";
export const SCALE_MIN = 50;
export const SCALE_MAX = 160;
export const SCALE_STEP = 10;

export const DEFAULT_PASSWORD_HASH =
  "262121c5372be8af3ae6ff0d3d138d9e6e1249335222c7f0e02535e35073bb0b";

export type ImageType = "favicon" | "emoji" | "upload" | "screenshot";
export type SortMode = "az" | "count" | "date";
export type FitMode = "cover" | "fit-width" | "fit-height";

export interface Tile {
  position: number;
  link: string | null;
  title: string | null;
  imageType: ImageType | null;
  imageData: string | null;
  linkedCollectionId: string | null;
  imageScale: number | null;
}

export interface BoardCollection {
  id: string;
  title: string;
  hidden: boolean;
  updatedAt: string;
  tiles: Tile[];
}

export interface ParsedLink {
  url: string;
  title: string;
}

export function emptyTile(position: number): Tile {
  return {
    position,
    link: null,
    title: null,
    imageType: null,
    imageData: null,
    linkedCollectionId: null,
    imageScale: null,
  };
}

export function blankTiles(): Tile[] {
  return Array.from({ length: SLOT_COUNT }, (_, position) => emptyTile(position));
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function domainLabel(value: string): string {
  try {
    const host = new URL(value).hostname.replace(/^www\./i, "");
    return host || value;
  } catch {
    return value;
  }
}

export function clampScale(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 100;
  const stepped = Math.round(n / SCALE_STEP) * SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, stepped));
}

export function occupied(tile: Tile): boolean {
  return Boolean(
    (tile.link && tile.link.trim()) ||
      tile.linkedCollectionId ||
      tile.imageData ||
      (tile.title && tile.title.trim()),
  );
}

export function countOccupied(tiles: Tile[]): number {
  return tiles.filter(occupied).length;
}

export function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "collection";
}

export function uniqueId(title: string, existing: string[]): string {
  let base = slugify(title);
  if (base === "index") base = "collection";
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function titleTaken(
  collections: BoardCollection[],
  title: string,
  exceptId?: string,
): boolean {
  const key = title.trim().toLocaleLowerCase();
  if (!key) return false;
  return collections.some(
    (c) => c.id !== exceptId && c.title.trim().toLocaleLowerCase() === key,
  );
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

export function cleanTile(position: number, src: unknown): Tile {
  const raw = src && typeof src === "object" ? (src as Partial<Tile>) : {};
  const linked =
    typeof raw.linkedCollectionId === "string" &&
    /^[a-z0-9-]{1,48}$/.test(raw.linkedCollectionId)
      ? raw.linkedCollectionId
      : null;
  const link =
    linked || typeof raw.link !== "string" || !isHttpUrl(raw.link.trim())
      ? null
      : raw.link.trim();
  let imageType: ImageType | null =
    raw.imageType === "favicon" ||
    raw.imageType === "emoji" ||
    raw.imageType === "upload" ||
    raw.imageType === "screenshot"
      ? raw.imageType
      : null;
  let imageData: string | null = null;
  if (imageType === "emoji") {
    imageData = cleanString(raw.imageData, 16);
    if (!imageData) imageType = null;
  } else if (imageType === "upload" || imageType === "screenshot") {
    const data = cleanString(raw.imageData, 500_000);
    if (data?.startsWith("data:image/")) imageData = data;
    else imageType = null;
  } else if (imageType !== "favicon") {
    imageType = null;
  }
  const scale =
    typeof raw.imageScale === "number" && Number.isFinite(raw.imageScale)
      ? clampScale(raw.imageScale)
      : null;
  return {
    position,
    link,
    title: cleanString(raw.title, 140),
    imageType,
    imageData,
    linkedCollectionId: linked,
    imageScale: scale === 100 ? null : scale,
  };
}

export function normalizeTiles(input: unknown): Tile[] {
  let raw = input;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: SLOT_COUNT }, (_, position) => {
    const found = list.find(
      (tile) => tile && typeof tile === "object" && (tile as Tile).position === position,
    );
    return cleanTile(position, found);
  });
}

export function parseLinkList(text: string): ParsedLink[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const links: ParsedLink[] = [];
  for (const line of lines) {
    const md = line.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:\s*\|\s*(.*))?$/i);
    if (md) {
      const inner = md[1].trim();
      const url = md[2].trim();
      const after = md[3]?.trim();
      const title = after || (isHttpUrl(inner) ? domainLabel(url) : inner);
      if (isHttpUrl(url)) links.push({ url, title: title || domainLabel(url) });
      continue;
    }
    const pipe = line.indexOf("|");
    if (pipe > 0) {
      const url = line.slice(0, pipe).trim();
      const title = line.slice(pipe + 1).trim();
      if (isHttpUrl(url)) links.push({ url, title: title || domainLabel(url) });
      continue;
    }
    if (isHttpUrl(line)) links.push({ url: line, title: domainLabel(line) });
  }
  return links;
}

export function formatLinkLine(link: ParsedLink): string {
  return `${link.url} | ${link.title}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function web(position: number, url: string, title: string): Tile {
  return {
    position,
    link: url,
    title,
    imageType: "favicon",
    imageData: null,
    linkedCollectionId: null,
    imageScale: null,
  };
}

function jump(position: number, id: string, title: string, emoji: string): Tile {
  return {
    position,
    link: null,
    title,
    imageType: "emoji",
    imageData: emoji,
    linkedCollectionId: id,
    imageScale: null,
  };
}

function deck(items: Tile[]): Tile[] {
  const tiles = blankTiles();
  for (const tile of items) tiles[tile.position] = tile;
  return tiles;
}

export function seedCollections(): BoardCollection[] {
  return [
    {
      id: MAIN_ID,
      title: "Main",
      hidden: false,
      updatedAt: "2026-08-01T15:00:00.000Z",
      tiles: deck([
        jump(0, "math", "Math", "🔢"),
        jump(1, "english", "English", "📖"),
        jump(2, "science", "Science", "🔬"),
        jump(3, "social-studies", "Social Studies", "🌍"),
        jump(4, "arts", "Arts", "🎨"),
        jump(5, "hpe", "HPE", "⚽"),
        jump(6, "fsl", "FSL", "🇫🇷"),
      ]),
    },
    {
      id: "math",
      title: "Math",
      hidden: false,
      updatedAt: "2026-09-12T15:00:00.000Z",
      tiles: deck([
        web(0, "https://www.dudamath.com/", "Dudamath"),
        web(1, "https://www.mathlearningcenter.org/apps", "Math Learning Center"),
        web(2, "https://www.khanacademy.org/math", "Khan Academy Math"),
        web(3, "https://www.desmos.com/calculator", "Desmos"),
        web(4, "https://www.geogebra.org/", "GeoGebra"),
        web(5, "https://www.coolmathgames.com/", "Coolmath Games"),
        web(6, "https://www.prodigygame.com/", "Prodigy"),
        web(7, "https://www.ixl.com/math", "IXL Math"),
      ]),
    },
    {
      id: "english",
      title: "English",
      hidden: false,
      updatedAt: "2026-08-20T15:00:00.000Z",
      tiles: deck([
        web(0, "https://www.commonlit.org/", "CommonLit"),
        web(1, "https://www.vocabulary.com/", "Vocabulary"),
        web(2, "https://www.storylineonline.net/", "Storyline Online"),
        web(3, "https://www.noredink.com/", "NoRedInk"),
        web(4, "https://www.newsela.com/", "Newsela"),
      ]),
    },
    {
      id: "science",
      title: "Science",
      hidden: false,
      updatedAt: "2026-10-02T15:00:00.000Z",
      tiles: deck([
        web(0, "https://phet.colorado.edu/", "PhET"),
        web(1, "https://www.nasa.gov/", "NASA"),
        web(2, "https://www.brainpop.com/", "BrainPOP"),
        web(3, "https://www.natgeokids.com/", "National Geographic Kids"),
      ]),
    },
    {
      id: "social-studies",
      title: "Social Studies",
      hidden: false,
      updatedAt: "2026-07-15T15:00:00.000Z",
      tiles: deck([
        web(0, "https://www.google.com/maps", "Google Maps"),
        web(1, "https://www.nationalgeographic.com/", "National Geographic"),
        web(2, "https://www.britannica.com/", "Britannica"),
      ]),
    },
    {
      id: "arts",
      title: "Arts",
      hidden: false,
      updatedAt: "2026-06-01T15:00:00.000Z",
      tiles: deck([
        web(0, "https://artsandculture.google.com/", "Google Arts & Culture"),
        web(1, "https://www.metmuseum.org/", "The Met"),
        web(2, "https://www.nga.gov/", "National Gallery of Art"),
      ]),
    },
    {
      id: "hpe",
      title: "HPE",
      hidden: false,
      updatedAt: "2026-09-01T15:00:00.000Z",
      tiles: deck([
        web(0, "https://www.gonoodle.com/", "GoNoodle"),
        web(1, "https://kidshealth.org/", "KidsHealth"),
      ]),
    },
    {
      id: "fsl",
      title: "FSL",
      hidden: false,
      updatedAt: "2026-08-28T15:00:00.000Z",
      tiles: deck([
        web(0, "https://www.duolingo.com/", "Duolingo"),
        web(1, "https://www.tv5monde.com/", "TV5Monde"),
        web(2, "https://www.podcastfrancaisfacile.com/", "Podcast Français Facile"),
      ]),
    },
    {
      id: "staff",
      title: "Staff",
      hidden: true,
      updatedAt: "2026-10-10T15:00:00.000Z",
      tiles: deck([
        web(0, "https://classroom.google.com/", "Google Classroom"),
        web(1, "https://docs.google.com/", "Google Docs"),
      ]),
    },
  ];
}

export function sortedCollections(
  collections: BoardCollection[],
  edit: boolean,
  sort: SortMode,
): BoardCollection[] {
  const list = collections.filter((c) => {
    if (c.id === MAIN_ID) return false;
    return edit || !c.hidden;
  });
  const alpha = (a: BoardCollection, b: BoardCollection) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  return [...list].sort((a, b) => {
    if (sort === "count") {
      const diff = countOccupied(b.tiles) - countOccupied(a.tiles);
      return diff !== 0 ? diff : alpha(a, b);
    }
    if (sort === "date") {
      const diff = b.updatedAt.localeCompare(a.updatedAt);
      return diff !== 0 ? diff : alpha(a, b);
    }
    return alpha(a, b);
  });
}
