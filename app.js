const GITHUB_USER = "mrd123gps";
const GITHUB_REPO = "TileCollector";
const GITHUB_BRANCH = "main";

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;
const API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`;

const PASSWORD_HASH = "cd6ca56c9b4d7a7a768c45542d035408ff610611a79efa2a10bf2da0006ec70f";

const MAX_UPLOAD_DIMENSION = 300;
const AUTOSAVE_DELAY_MS = 800;

const gridLeftEl = document.getElementById("gridLeft");
const gridRightEl = document.getElementById("gridRight");
const collectionTitleEl = document.getElementById("collectionTitle");
const statusMsgEl = document.getElementById("statusMsg");
const panelEl = document.getElementById("panel");
const editBadgeEl = document.getElementById("editBadge");
const saveIndicatorEl = document.getElementById("saveIndicator");
const editModeBtn = document.getElementById("editModeBtn");
const addCollectionBtn = document.getElementById("addCollectionBtn");
const switchCollectionBtn = document.getElementById("switchCollectionBtn");

const passwordOverlay = document.getElementById("passwordOverlay");
const passwordInput = document.getElementById("passwordInput");
const passwordError = document.getElementById("passwordError");
const passwordSubmitBtn = document.getElementById("passwordSubmitBtn");
const passwordCancelBtn = document.getElementById("passwordCancelBtn");

const tokenOverlay = document.getElementById("tokenOverlay");
const tokenInput = document.getElementById("tokenInput");
const tokenError = document.getElementById("tokenError");
const tokenSubmitBtn = document.getElementById("tokenSubmitBtn");
const tokenCancelBtn = document.getElementById("tokenCancelBtn");

const tileMenuOverlay = document.getElementById("tileMenuOverlay");
const tileMenuTitle = document.getElementById("tileMenuTitle");
const menuOpenBtn = document.getElementById("menuOpenBtn");
const menuEditBtn = document.getElementById("menuEditBtn");
const menuMoveBtn = document.getElementById("menuMoveBtn");
const menuClearBtn = document.getElementById("menuClearBtn");
const tileMenuCancelBtn = document.getElementById("tileMenuCancelBtn");

const moveOverlay = document.getElementById("moveOverlay");
const moveGridPreview = document.getElementById("moveGridPreview");
const moveCancelBtn = document.getElementById("moveCancelBtn");

const tileEditOverlay = document.getElementById("tileEditOverlay");
const linkTypeUrlBtn = document.getElementById("linkTypeUrlBtn");
const linkTypeCollectionBtn = document.getElementById("linkTypeCollectionBtn");
const urlFieldGroup = document.getElementById("urlFieldGroup");
const collectionFieldGroup = document.getElementById("collectionFieldGroup");
const tileLinkInput = document.getElementById("tileLinkInput");
const pasteClipboardBtn = document.getElementById("pasteClipboardBtn");
const tileCollectionSelect = document.getElementById("tileCollectionSelect");
const tileTitleInput = document.getElementById("tileTitleInput");
const imgOptFavicon = document.getElementById("imgOptFavicon");
const imgOptScreenshot = document.getElementById("imgOptScreenshot");
const imgOptEmoji = document.getElementById("imgOptEmoji");
const imgOptUpload = document.getElementById("imgOptUpload");
const emojiPickerGroup = document.getElementById("emojiPickerGroup");
const emojiPreview = document.getElementById("emojiPreview");
const openEmojiPickerBtn = document.getElementById("openEmojiPickerBtn");
const emojiPickerWrap = document.getElementById("emojiPickerWrap");
const emojiPickerEl = document.getElementById("emojiPickerEl");
const uploadGroup = document.getElementById("uploadGroup");
const imageUploadInput = document.getElementById("imageUploadInput");
const uploadPreviewImg = document.getElementById("uploadPreviewImg");
const tileEditError = document.getElementById("tileEditError");
const tileEditCancelBtn = document.getElementById("tileEditCancelBtn");
const tileEditSaveBtn = document.getElementById("tileEditSaveBtn");

let indexData = null;
let currentCollection = null;
let currentCollectionId = null;
let isEditMode = false;
let activeTilePosition = null;
let pendingUploadDataUrl = null;
let selectedEmoji = "";
let githubToken = null;
let autosaveTimer = null;
let saveInFlight = false;
let hasUnsavedChanges = false;

/* ---------- Data loading (fast raw CDN reads) ---------- */

function getHashCollectionId() {
  const hash = window.location.hash.replace("#", "").trim();
  return hash || null;
}

async function fetchJson(path) {
  const res = await fetch(RAW_BASE + path + `?t=${Date.now()}`, { cache: "no-store" });
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

function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getTile(position) {
  return currentCollection.tiles.find(t => t.position === position);
}

function isTileEmpty(tile) {
  return !tile.link && !tile.linkedCollectionId;
}

/* ---------- GitHub write layer ---------- */

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

async function githubApiRequest(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Authorization": `token ${githubToken}`,
      "Accept": "application/vnd.github+json",
      ...(options.headers || {})
    }
  });
  return res;
}

async function verifyToken(token) {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`, {
      headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github+json" }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function saveFileToGithub(path, jsonData, commitMessage) {
  const getRes = await githubApiRequest(`${path}?ref=${GITHUB_BRANCH}`);
  let sha = undefined;
  if (getRes.status === 200) {
    const meta = await getRes.json();
    sha = meta.sha;
  } else if (getRes.status !== 404) {
    throw new Error(`Could not read current file state (${getRes.status})`);
  }

  const body = {
    message: commitMessage,
    content: utf8ToBase64(JSON.stringify(jsonData, null, 2)),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const putRes = await githubApiRequest(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody.message || `Save failed (${putRes.status})`);
  }
  return putRes.json();
}

function setSaveIndicator(state, text) {
  saveIndicatorEl.hidden = false;
  saveIndicatorEl.className = "save-indicator state-" + state;
  saveIndicatorEl.textContent = text;
}

function clearSaveIndicatorSoon() {
  setTimeout(() => {
    if (!hasUnsavedChanges && !saveInFlight) saveIndicatorEl.hidden = true;
  }, 2500);
}

async function persistCurrentCollection() {
  if (!githubToken) {
    openTokenModal();
    return;
  }
  const entry = indexData.collections.find(c => c.id === currentCollectionId);
  if (!entry) return;

  saveInFlight = true;
  setSaveIndicator("saving", "Saving…");
  try {
    // currentCollection already reflects every edit made in this session,
    // so we save it directly rather than re-fetching first.
    await saveFileToGithub(entry.file, currentCollection, `Update collection: ${currentCollection.title}`);
    hasUnsavedChanges = false;
    setSaveIndicator("saved", "All changes saved");
    clearSaveIndicatorSoon();
  } catch (err) {
    console.error(err);
    setSaveIndicator("error", "Save failed — check connection");
  } finally {
    saveInFlight = false;
  }
}

function markUnsaved() {
  hasUnsavedChanges = true;
  setSaveIndicator("saving", "Unsaved changes…");
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(persistCurrentCollection, AUTOSAVE_DELAY_MS);
}

window.addEventListener("beforeunload", (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ---------- Token modal ---------- */

function openTokenModal() {
  tokenInput.value = "";
  tokenError.hidden = true;
  tokenOverlay.hidden = false;
  tokenInput.focus();
}

function closeTokenModal() {
  tokenOverlay.hidden = true;
}

tokenSubmitBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  tokenSubmitBtn.disabled = true;
  const valid = await verifyToken(token);
  tokenSubmitBtn.disabled = false;
  if (valid) {
    githubToken = token;
    try { sessionStorage.setItem("tc_gh_token", token); } catch (e) {}
    closeTokenModal();
    if (hasUnsavedChanges) persistCurrentCollection();
  } else {
    tokenError.hidden = false;
  }
});

tokenCancelBtn.addEventListener("click", closeTokenModal);
tokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tokenSubmitBtn.click();
  if (e.key === "Escape") closeTokenModal();
});
tokenOverlay.addEventListener("click", (e) => {
  if (e.target === tokenOverlay) closeTokenModal();
});

/* ---------- Tile rendering ---------- */

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
  const isEmpty = isTileEmpty(tile);
  const el = document.createElement("div");
  el.className = "tile" + (isEmpty ? " empty" : "");
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", isEmpty ? "-1" : "0");
  el.dataset.position = tile.position;

  el.appendChild(buildTileFace(tile));
  const titleEl = document.createElement("div");
  titleEl.className = "tile-title";
  titleEl.textContent = isEmpty ? "" : (tile.title || "");
  el.appendChild(titleEl);

  el.addEventListener("click", () => handleTileClick(tile));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTileClick(tile);
    }
  });

  return el;
}

function handleTileClick(tile) {
  if (isEditMode) {
    activeTilePosition = tile.position;
    if (isTileEmpty(tile)) {
      openTileEditPopup(tile);
    } else {
      openTileMenu(tile);
    }
    return;
  }
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
    let tile = tiles.find(t => t.position === i);
    if (!tile) {
      tile = { position: i, link: null, title: null, imageType: null, imageData: null, linkedCollectionId: null };
      tiles.push(tile);
    }
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
    currentCollectionId = collectionId;
    renderCollection(data);
  } catch (err) {
    statusMsgEl.textContent = "Could not load this collection. Please try again later.";
    console.error(err);
  }
}

/* ---------- Edit mode toggle ---------- */

async function enterEditMode() {
  isEditMode = true;
  panelEl.classList.add("edit-mode");
  editBadgeEl.hidden = false;
  editModeBtn.classList.add("active");
  addCollectionBtn.hidden = false;
  addCollectionBtn.disabled = false;
  switchCollectionBtn.disabled = false;
  renderCollection(currentCollection);

  let saved = null;
  try { saved = sessionStorage.getItem("tc_gh_token"); } catch (e) {}

  if (saved) {
    const stillValid = await verifyToken(saved);
    if (stillValid) {
      githubToken = saved;
    } else {
      githubToken = null;
      try { sessionStorage.removeItem("tc_gh_token"); } catch (e) {}
    }
  }

  if (!githubToken) openTokenModal();
}

function exitEditMode() {
  if (hasUnsavedChanges) {
    const proceed = confirm("You have unsaved changes. Leave edit mode anyway? Unsaved changes will be lost.");
    if (!proceed) return;
    hasUnsavedChanges = false;
    saveIndicatorEl.hidden = true;
    loadCollection(currentCollectionId);
  }
  isEditMode = false;
  panelEl.classList.remove("edit-mode");
  editBadgeEl.hidden = true;
  editModeBtn.classList.remove("active");
  addCollectionBtn.hidden = true;
  addCollectionBtn.disabled = true;
  switchCollectionBtn.disabled = true;
  renderCollection(currentCollection);
}

function openPasswordModal() {
  passwordInput.value = "";
  passwordError.hidden = true;
  passwordOverlay.hidden = false;
  passwordInput.focus();
}

function closePasswordModal() {
  passwordOverlay.hidden = true;
}

async function attemptUnlock() {
  const entered = passwordInput.value;
  const hash = await sha256Hex(entered);
  if (hash === PASSWORD_HASH) {
    closePasswordModal();
    enterEditMode();
  } else {
    passwordError.hidden = false;
    passwordInput.value = "";
    passwordInput.focus();
  }
}

editModeBtn.addEventListener("click", () => {
  if (isEditMode) {
    exitEditMode();
  } else {
    openPasswordModal();
  }
});

passwordSubmitBtn.addEventListener("click", attemptUnlock);
passwordCancelBtn.addEventListener("click", closePasswordModal);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptUnlock();
  if (e.key === "Escape") closePasswordModal();
});
passwordOverlay.addEventListener("click", (e) => {
  if (e.target === passwordOverlay) closePasswordModal();
});

/* ---------- Populated-tile menu ---------- */

function openTileMenu(tile) {
  tileMenuTitle.textContent = tile.title || "Tile options";
  menuOpenBtn.hidden = !tile.link;
  tileMenuOverlay.hidden = false;
}

function closeTileMenu() {
  tileMenuOverlay.hidden = true;
}

menuOpenBtn.addEventListener("click", () => {
  const tile = getTile(activeTilePosition);
  if (tile && tile.link) window.open(tile.link, "_blank", "noopener,noreferrer");
  closeTileMenu();
});

menuEditBtn.addEventListener("click", () => {
  const tile = getTile(activeTilePosition);
  closeTileMenu();
  openTileEditPopup(tile);
});

menuClearBtn.addEventListener("click", () => {
  const tile = getTile(activeTilePosition);
  tile.link = null;
  tile.title = null;
  tile.imageType = null;
  tile.imageData = null;
  tile.linkedCollectionId = null;
  closeTileMenu();
  renderCollection(currentCollection);
  markUnsaved();
});

menuMoveBtn.addEventListener("click", () => {
  closeTileMenu();
  openMovePicker();
});

tileMenuCancelBtn.addEventListener("click", closeTileMenu);
tileMenuOverlay.addEventListener("click", (e) => {
  if (e.target === tileMenuOverlay) closeTileMenu();
});

/* ---------- Move tile ---------- */

function openMovePicker() {
  moveGridPreview.innerHTML = "";
  for (let i = 0; i < 32; i++) {
    const slot = document.createElement("div");
    slot.className = "move-slot";
    if (i === activeTilePosition) {
      slot.classList.add("slot-current");
    } else {
      const t = getTile(i);
      if (isTileEmpty(t)) {
        slot.classList.add("slot-empty");
        slot.addEventListener("click", () => moveTileTo(i));
      } else {
        slot.classList.add("slot-filled");
      }
    }
    moveGridPreview.appendChild(slot);
  }
  moveOverlay.hidden = false;
}

function closeMovePicker() {
  moveOverlay.hidden = true;
}

function moveTileTo(destPosition) {
  const source = getTile(activeTilePosition);
  const dest = getTile(destPosition);
  dest.link = source.link;
  dest.title = source.title;
  dest.imageType = source.imageType;
  dest.imageData = source.imageData;
  dest.linkedCollectionId = source.linkedCollectionId;

  source.link = null;
  source.title = null;
  source.imageType = null;
  source.imageData = null;
  source.linkedCollectionId = null;

  closeMovePicker();
  renderCollection(currentCollection);
  markUnsaved();
}

moveCancelBtn.addEventListener("click", closeMovePicker);
moveOverlay.addEventListener("click", (e) => {
  if (e.target === moveOverlay) closeMovePicker();
});

/* ---------- Tile edit popup ---------- */

function resetTileEditForm() {
  tileEditError.hidden = true;
  tileLinkInput.value = "";
  tileTitleInput.value = "";
  imageUploadInput.value = "";
  uploadPreviewImg.hidden = true;
  uploadPreviewImg.src = "";
  pendingUploadDataUrl = null;
  selectedEmoji = "";
  emojiPreview.textContent = "🙂";
  emojiPickerWrap.hidden = true;
  setLinkType("url");
  setImageOption("favicon");

  tileCollectionSelect.innerHTML = "";
  indexData.collections.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.title;
    tileCollectionSelect.appendChild(opt);
  });
}

function setLinkType(type) {
  if (type === "url") {
    linkTypeUrlBtn.classList.add("active");
    linkTypeCollectionBtn.classList.remove("active");
    urlFieldGroup.hidden = false;
    collectionFieldGroup.hidden = true;
  } else {
    linkTypeUrlBtn.classList.remove("active");
    linkTypeCollectionBtn.classList.add("active");
    urlFieldGroup.hidden = true;
    collectionFieldGroup.hidden = false;
  }
}

function setImageOption(opt) {
  imgOptFavicon.checked = opt === "favicon";
  imgOptScreenshot.checked = opt === "screenshot";
  imgOptEmoji.checked = opt === "emoji";
  imgOptUpload.checked = opt === "upload";
  emojiPickerGroup.hidden = opt !== "emoji";
  uploadGroup.hidden = opt !== "upload";
  if (opt !== "emoji") emojiPickerWrap.hidden = true;
}

function getSelectedImageOption() {
  if (imgOptScreenshot.checked) return "screenshot";
  if (imgOptEmoji.checked) return "emoji";
  if (imgOptUpload.checked) return "upload";
  return "favicon";
}

function openTileEditPopup(tile) {
  resetTileEditForm();

  if (tile.linkedCollectionId) {
    setLinkType("collection");
    tileCollectionSelect.value = tile.linkedCollectionId;
  } else {
    setLinkType("url");
    tileLinkInput.value = tile.link || "";
  }

  tileTitleInput.value = tile.title || "";

  if (tile.imageType === "emoji") {
    setImageOption("emoji");
    selectedEmoji = tile.imageData || "";
    emojiPreview.textContent = selectedEmoji || "🙂";
  } else if (tile.imageType === "screenshot") {
    setImageOption("screenshot");
  } else if (tile.imageType === "upload") {
    setImageOption("upload");
    if (tile.imageData) {
      pendingUploadDataUrl = tile.imageData;
      uploadPreviewImg.src = tile.imageData;
      uploadPreviewImg.hidden = false;
    }
  } else {
    setImageOption("favicon");
  }

  tileEditOverlay.hidden = false;
  tileLinkInput.focus();
}

function closeTileEditPopup() {
  tileEditOverlay.hidden = true;
  emojiPickerWrap.hidden = true;
}

linkTypeUrlBtn.addEventListener("click", () => {
  setLinkType("url");
  tileLinkInput.focus();
});
linkTypeCollectionBtn.addEventListener("click", () => setLinkType("collection"));

[imgOptFavicon, imgOptScreenshot, imgOptEmoji, imgOptUpload].forEach(radio => {
  radio.addEventListener("change", () => setImageOption(getSelectedImageOption()));
});

openEmojiPickerBtn.addEventListener("click", () => {
  emojiPickerWrap.hidden = !emojiPickerWrap.hidden;
});

if (emojiPickerEl) {
  emojiPickerEl.addEventListener("emoji-click", (event) => {
    selectedEmoji = event.detail.unicode;
    emojiPreview.textContent = selectedEmoji;
    emojiPickerWrap.hidden = true;
  });
}

pasteClipboardBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    tileLinkInput.value = text.trim();
  } catch (err) {
    tileEditError.textContent = "Could not read clipboard. Paste manually with Ctrl+V / Cmd+V.";
    tileEditError.hidden = false;
  }
});

imageUploadInput.addEventListener("change", () => {
  const file = imageUploadInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = MAX_UPLOAD_DIMENSION;
      canvas.height = MAX_UPLOAD_DIMENSION;
      const ctx = canvas.getContext("2d");
      const scale = Math.max(MAX_UPLOAD_DIMENSION / img.width, MAX_UPLOAD_DIMENSION / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, (MAX_UPLOAD_DIMENSION - drawW) / 2, (MAX_UPLOAD_DIMENSION - drawH) / 2, drawW, drawH);
      pendingUploadDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      uploadPreviewImg.src = pendingUploadDataUrl;
      uploadPreviewImg.hidden = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

tileEditCancelBtn.addEventListener("click", closeTileEditPopup);
tileEditOverlay.addEventListener("click", (e) => {
  if (e.target === tileEditOverlay) closeTileEditPopup();
});

tileEditSaveBtn.addEventListener("click", () => {
  const tile = getTile(activeTilePosition);
  const linkType = !urlFieldGroup.hidden ? "url" : "collection";

  tileEditError.hidden = true;

  if (linkType === "url") {
    const linkVal = normalizeUrl(tileLinkInput.value);
    if (!linkVal) {
      tileEditError.textContent = "Please enter a link.";
      tileEditError.hidden = false;
      return;
    }
    tile.link = linkVal;
    tile.linkedCollectionId = null;
  } else {
    tile.linkedCollectionId = tileCollectionSelect.value;
    tile.link = null;
  }

  tile.title = tileTitleInput.value.trim();

  const imgOpt = getSelectedImageOption();
  if (imgOpt === "emoji") {
    if (!selectedEmoji) {
      tileEditError.textContent = "Please choose an emoji.";
      tileEditError.hidden = false;
      return;
    }
    tile.imageType = "emoji";
    tile.imageData = selectedEmoji;
  } else if (imgOpt === "upload") {
    tile.imageType = "upload";
    tile.imageData = pendingUploadDataUrl;
  } else if (imgOpt === "screenshot") {
    tile.imageType = "screenshot";
    tile.imageData = tile.imageData || null;
    // Live screenshot fetching is not yet implemented; falls back to existing image if any.
  } else {
    tile.imageType = "favicon";
    tile.imageData = null;
  }

  closeTileEditPopup();
  renderCollection(currentCollection);
  markUnsaved();
});

/* ---------- Init ---------- */

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
