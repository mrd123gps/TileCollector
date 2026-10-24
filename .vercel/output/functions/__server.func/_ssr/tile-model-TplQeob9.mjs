//#region node_modules/.nitro/vite/services/ssr/assets/tile-model-TplQeob9.js
var MAIN_ID = "main";
var DEFAULT_PASSWORD_HASH = "262121c5372be8af3ae6ff0d3d138d9e6e1249335222c7f0e02535e35073bb0b";
function emptyTile(position) {
	return {
		position,
		link: null,
		title: null,
		imageType: null,
		imageData: null,
		linkedCollectionId: null,
		imageScale: null
	};
}
function blankTiles() {
	return Array.from({ length: 32 }, (_, position) => emptyTile(position));
}
function isHttpUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}
function domainLabel(value) {
	try {
		return new URL(value).hostname.replace(/^www\./i, "") || value;
	} catch {
		return value;
	}
}
function clampScale(value) {
	const stepped = Math.round((typeof value === "number" && Number.isFinite(value) ? value : 100) / 10) * 10;
	return Math.min(160, Math.max(50, stepped));
}
function occupied(tile) {
	return Boolean(tile.link && tile.link.trim() || tile.linkedCollectionId || tile.imageData || tile.title && tile.title.trim());
}
function countOccupied(tiles) {
	return tiles.filter(occupied).length;
}
function slugify(title) {
	return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "collection";
}
function uniqueId(title, existing) {
	let base = slugify(title);
	if (base === "index") base = "collection";
	const taken = new Set(existing);
	if (!taken.has(base)) return base;
	let n = 2;
	while (taken.has(`${base}-${n}`)) n += 1;
	return `${base}-${n}`;
}
function titleTaken(collections, title, exceptId) {
	const key = title.trim().toLocaleLowerCase();
	if (!key) return false;
	return collections.some((c) => c.id !== exceptId && c.title.trim().toLocaleLowerCase() === key);
}
function cleanString(value, max) {
	if (typeof value !== "string") return null;
	return value.trim().slice(0, max) || null;
}
function cleanTile(position, src) {
	const raw = src && typeof src === "object" ? src : {};
	const linked = typeof raw.linkedCollectionId === "string" && /^[a-z0-9-]{1,48}$/.test(raw.linkedCollectionId) ? raw.linkedCollectionId : null;
	const link = linked || typeof raw.link !== "string" || !isHttpUrl(raw.link.trim()) ? null : raw.link.trim();
	let imageType = raw.imageType === "favicon" || raw.imageType === "emoji" || raw.imageType === "upload" || raw.imageType === "screenshot" ? raw.imageType : null;
	let imageData = null;
	if (imageType === "emoji") {
		imageData = cleanString(raw.imageData, 16);
		if (!imageData) imageType = null;
	} else if (imageType === "upload" || imageType === "screenshot") {
		const data = cleanString(raw.imageData, 5e5);
		if (data?.startsWith("data:image/")) imageData = data;
		else imageType = null;
	} else if (imageType !== "favicon") imageType = null;
	const scale = typeof raw.imageScale === "number" && Number.isFinite(raw.imageScale) ? clampScale(raw.imageScale) : null;
	return {
		position,
		link,
		title: cleanString(raw.title, 140),
		imageType,
		imageData,
		linkedCollectionId: linked,
		imageScale: scale === 100 ? null : scale
	};
}
function normalizeTiles(input) {
	let raw = input;
	if (typeof raw === "string") try {
		raw = JSON.parse(raw);
	} catch {
		raw = [];
	}
	const list = Array.isArray(raw) ? raw : [];
	return Array.from({ length: 32 }, (_, position) => {
		return cleanTile(position, list.find((tile) => tile && typeof tile === "object" && tile.position === position));
	});
}
function parseLinkList(text) {
	const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const links = [];
	for (const line of lines) {
		const md = line.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:\s*\|\s*(.*))?$/i);
		if (md) {
			const inner = md[1].trim();
			const url = md[2].trim();
			const title = md[3]?.trim() || (isHttpUrl(inner) ? domainLabel(url) : inner);
			if (isHttpUrl(url)) links.push({
				url,
				title: title || domainLabel(url)
			});
			continue;
		}
		const pipe = line.indexOf("|");
		if (pipe > 0) {
			const url = line.slice(0, pipe).trim();
			const title = line.slice(pipe + 1).trim();
			if (isHttpUrl(url)) links.push({
				url,
				title: title || domainLabel(url)
			});
			continue;
		}
		if (isHttpUrl(line)) links.push({
			url: line,
			title: domainLabel(line)
		});
	}
	return links;
}
function formatLinkLine(link) {
	return `${link.url} | ${link.title}`;
}
async function sha256Hex(text) {
	const data = new TextEncoder().encode(text);
	const buf = await crypto.subtle.digest("SHA-256", data);
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function web(position, url, title) {
	return {
		position,
		link: url,
		title,
		imageType: "favicon",
		imageData: null,
		linkedCollectionId: null,
		imageScale: null
	};
}
function jump(position, id, title, emoji) {
	return {
		position,
		link: null,
		title,
		imageType: "emoji",
		imageData: emoji,
		linkedCollectionId: id,
		imageScale: null
	};
}
function deck(items) {
	const tiles = blankTiles();
	for (const tile of items) tiles[tile.position] = tile;
	return tiles;
}
function seedCollections() {
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
				jump(6, "fsl", "FSL", "🇫🇷")
			])
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
				web(7, "https://www.ixl.com/math", "IXL Math")
			])
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
				web(4, "https://www.newsela.com/", "Newsela")
			])
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
				web(3, "https://www.natgeokids.com/", "National Geographic Kids")
			])
		},
		{
			id: "social-studies",
			title: "Social Studies",
			hidden: false,
			updatedAt: "2026-07-15T15:00:00.000Z",
			tiles: deck([
				web(0, "https://www.google.com/maps", "Google Maps"),
				web(1, "https://www.nationalgeographic.com/", "National Geographic"),
				web(2, "https://www.britannica.com/", "Britannica")
			])
		},
		{
			id: "arts",
			title: "Arts",
			hidden: false,
			updatedAt: "2026-06-01T15:00:00.000Z",
			tiles: deck([
				web(0, "https://artsandculture.google.com/", "Google Arts & Culture"),
				web(1, "https://www.metmuseum.org/", "The Met"),
				web(2, "https://www.nga.gov/", "National Gallery of Art")
			])
		},
		{
			id: "hpe",
			title: "HPE",
			hidden: false,
			updatedAt: "2026-09-01T15:00:00.000Z",
			tiles: deck([web(0, "https://www.gonoodle.com/", "GoNoodle"), web(1, "https://kidshealth.org/", "KidsHealth")])
		},
		{
			id: "fsl",
			title: "FSL",
			hidden: false,
			updatedAt: "2026-08-28T15:00:00.000Z",
			tiles: deck([
				web(0, "https://www.duolingo.com/", "Duolingo"),
				web(1, "https://www.tv5monde.com/", "TV5Monde"),
				web(2, "https://www.podcastfrancaisfacile.com/", "Podcast Français Facile")
			])
		},
		{
			id: "staff",
			title: "Staff",
			hidden: true,
			updatedAt: "2026-10-10T15:00:00.000Z",
			tiles: deck([web(0, "https://classroom.google.com/", "Google Classroom"), web(1, "https://docs.google.com/", "Google Docs")])
		}
	];
}
function sortedCollections(collections, edit, sort) {
	const list = collections.filter((c) => {
		if (c.id === "main") return false;
		return edit || !c.hidden;
	});
	const alpha = (a, b) => a.title.localeCompare(b.title, void 0, { sensitivity: "base" });
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
//#endregion
export { countOccupied as a, isHttpUrl as c, parseLinkList as d, seedCollections as f, uniqueId as g, titleTaken as h, clampScale as i, normalizeTiles as l, sortedCollections as m, MAIN_ID as n, domainLabel as o, sha256Hex as p, blankTiles as r, formatLinkLine as s, DEFAULT_PASSWORD_HASH as t, occupied as u };
