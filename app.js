const GITHUB_USER = "YOUR_GITHUB_USERNAME";
const GITHUB_REPO = "TileCollector";
const GITHUB_BRANCH = "main";

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;

const gridLeftEl = document.getElementById("gridLeft");
const gridRightEl = document.getElementById("gridRight");
const collectionTitleEl = document.getElementById("collectionTitle");
const statusMsgEl = document.getElementById("statusMsg");

let indexData = null;
let currentCollection = null;

function getHashCollectionId() {
  const hash = window.location.hash.replace("#", "").trim();
  return hash || null;
}

async function fetchJson(path) {
  const res = await fetch(RAW_BASE + path + `?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

function faviconUrl(link) {
  try {
    const url = new URL(link);
    return `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
  } catch (e) {
    return "";
  }
}

function buildTileFace(tile) {
  const face = document.createElement("div");
  face.className = "tile-face";

  if (tile.imageType === "emoji" && tile.imageData) {
    const span = document.createElement("span");
    span.className = "emoji-face";
    span.textContent = tile.imageData;
    face.appendChild(span);
  } else if (tile.imageType === "upload" || tile.imageType === "screenshot") {
    const img = document.createElement("img");
    img.src = tile.imageData || "";
    img.alt = "";
    face.appendChild(img);
  } else if (tile.link) {
    const wrap = document.createElement("div");
    wrap.className = "favicon-wrap";
    const img = document.createElement("img");
    img.src = faviconUrl(tile.link);
    img.alt = "";
    wrap.appendChild(img);
    face.appendChild(wrap);
  } else if (tile.linkedCollectionId) {
    const wrap = document.createElement("div");
    wrap.className = "favicon-wrap";
    wrap.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.43M14 11a5 5 0 0 0-7.07 0L5 12.93a5 5 0 0 0 7.07 7.07L13.5 18.57" fill="none" stroke="#4a6cf7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    face.appendChild(wrap);
  }

  return face;
}

function buildTileElement(tile) {
  const isEmpty = !tile.link && !tile.linkedCollectionId;
  const el = document.createElement("div");
  el.className = "tile" + (isEmpty ? " empty" : "");
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", isEmpty ? "-1" : "0");

  if (!isEmpty) {
    el.appendChild(buildTileFace(tile));

    const titleEl = document.createElement("div");
    titleEl.className = "tile-title";
    titleEl.textContent = tile.title || "";
    el.appendChild(titleEl);

    el.addEventListener("click", () => handleTileClick(tile));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleTileClick(tile);
      }
    });
  }

  return el;
}

function handleTileClick(tile) {
  if (tile.linkedCollectionId) {
    window.location.hash = tile.linkedCollectionId;
  } else if (tile.link) {
    window.open(tile.link, "_blank", "noopener,noreferrer");
  }
}

function renderCollection(collection) {
  collectionTitleEl.textContent = collection.title;
  gridLeftEl.innerHTML = "";
  gridRightEl.innerHTML = "";

  const tiles = collection.tiles || [];
  for (let i = 0; i < 32; i++) {
    const tile = tiles.find(t => t.position === i) || { position: i, link: null, title: null, imageType: null, imageData: null, linkedCollectionId: null };
    const el = buildTileElement(tile);
    if (i < 16) {
      gridLeftEl.appendChild(el);
    } else {
      gridRightEl.appendChild(el);
    }
  }
}

async function loadCollection(collectionId) {
  statusMsgEl.textContent = "";
  const entry = indexData.collections.find(c => c.id === collectionId);
  if (!entry) {
    statusMsgEl.textContent = `Collection "${collectionId}" not found.`;
    return;
  }
  try {
    const data = await fetchJson(entry.file);
    currentCollection = data;
    renderCollection(data);
  } catch (err) {
    statusMsgEl.textContent = "Could not load this collection. Please try again later.";
    console.error(err);
  }
}

async function init() {
  try {
    indexData = await fetchJson("collections/index.json");
  } catch (err) {
    statusMsgEl.textContent = "Could not load TileCollector data. Check your connection and try again.";
    console.error(err);
    return;
  }

  const requested = getHashCollectionId();
  const startId = requested && indexData.collections.some(c => c.id === requested)
    ? requested
    : (indexData.collections[0] ? indexData.collections[0].id : null);

  if (!startId) {
    statusMsgEl.textContent = "No collections found yet.";
    return;
  }

  if (!window.location.hash) {
    window.location.hash = startId;
  }
  await loadCollection(startId);
}

window.addEventListener("hashchange", () => {
  const id = getHashCollectionId();
  if (id) loadCollection(id);
});

init();
