import { o as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as countOccupied, c as isHttpUrl, d as parseLinkList, h as titleTaken, i as clampScale, m as sortedCollections, n as MAIN_ID, o as domainLabel, r as blankTiles, s as formatLinkLine, u as occupied } from "./tile-model-TplQeob9.mjs";
import { S as ChevronDown, _ as Globe, b as Eraser, c as Pencil, d as Lock, f as LockOpen, g as House, h as Image$1, i as Type, l as Move, m as KeyRound, n as Upload, o as Smile, p as LayoutGrid, r as Unlink, s as Plus, t as X, u as Minus, v as EyeOff, x as Download, y as ExternalLink } from "../_libs/lucide-react.mjs";
import { a as createCollection, c as saveCollection, i as checkPassword, n as Route, o as deleteCollection, r as changePassword, s as renameCollection } from "./router-CLnpeW9g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B_N61VLK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EMOJIS = [
	"😀",
	"😊",
	"😎",
	"🤩",
	"🤔",
	"👍",
	"👏",
	"✨",
	"⭐",
	"🔥",
	"💡",
	"✅",
	"📚",
	"📖",
	"✏️",
	"📝",
	"🔢",
	"➗",
	"📐",
	"🔬",
	"🧪",
	"🌍",
	"🗺️",
	"🎨",
	"🎵",
	"⚽",
	"🏃",
	"🍎",
	"🧠",
	"💻",
	"🧮",
	"🏠",
	"📁",
	"🔗",
	"🎯",
	"🚀",
	"🌈",
	"🌻",
	"🍁",
	"🐻",
	"🇫🇷",
	"🇨🇦"
];
var fieldClass = "mt-1 h-11 w-full rounded-xl border border-line bg-panel px-3 text-base text-ink outline-none focus-visible:border-primary";
function cx(...parts) {
	return parts.filter(Boolean).join(" ");
}
function errorText(error, fallback) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return fallback;
}
function faviconSources(url) {
	try {
		const host = new URL(url).hostname;
		return [`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`, `https://icons.duckduckgo.com/ip3/${host}.ico`];
	} catch {
		return [];
	}
}
function withProtocol(value) {
	const trimmed = value.trim();
	if (!trimmed || isHttpUrl(trimmed) || trimmed.includes(" ")) return trimmed;
	return `https://${trimmed}`;
}
function autoTitle(draft, collections) {
	if (draft.kind === "collection") return collections.find((c) => c.id === draft.linkedCollectionId)?.title ?? "";
	const url = withProtocol(draft.url);
	return isHttpUrl(url) ? domainLabel(url) : "";
}
function draftFrom(tile, collections, currentId) {
	const self = tile.linkedCollectionId === currentId;
	const kind = tile.linkedCollectionId && !self ? "collection" : tile.linkedCollectionId ? "collection" : "web";
	const linkedCollectionId = self ? "" : tile.linkedCollectionId ?? "";
	const imageChoice = tile.imageType === "emoji" ? "emoji" : tile.imageType === "upload" || tile.imageType === "screenshot" ? "upload" : kind === "collection" ? "icon" : "favicon";
	const base = {
		position: tile.position,
		kind: self ? "collection" : kind,
		url: tile.link ?? "",
		linkedCollectionId,
		title: tile.title ?? "",
		titleTouched: false,
		imageChoice,
		emoji: tile.imageType === "emoji" ? tile.imageData ?? "" : "",
		uploadData: tile.imageType === "upload" || tile.imageType === "screenshot" ? tile.imageData : null,
		sourceData: tile.imageType === "upload" || tile.imageType === "screenshot" ? tile.imageData : null,
		fit: "cover",
		imageScale: clampScale(tile.imageScale),
		selfLinkNote: self
	};
	const auto = autoTitle(base, collections);
	base.titleTouched = Boolean(tile.title) && tile.title !== auto;
	if (!base.title) base.title = auto;
	return base;
}
function draftToTile(draft) {
	const url = draft.kind === "web" ? withProtocol(draft.url) : null;
	return {
		position: draft.position,
		link: draft.kind === "web" && url && isHttpUrl(url) ? url : null,
		title: draft.title.trim() || autoTitle(draft, []) || null,
		imageType: draft.imageChoice === "emoji" ? "emoji" : draft.imageChoice === "upload" ? "upload" : draft.imageChoice === "favicon" ? "favicon" : null,
		imageData: draft.imageChoice === "emoji" ? draft.emoji : draft.imageChoice === "upload" ? draft.uploadData : null,
		linkedCollectionId: draft.kind === "collection" ? draft.linkedCollectionId || null : null,
		imageScale: draft.imageScale === 100 ? null : draft.imageScale
	};
}
function readFile(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Could not read that image."));
		reader.readAsDataURL(file);
	});
}
function fitImage(src, mode) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const size = 300;
			const canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(/* @__PURE__ */ new Error("Could not read that image."));
				return;
			}
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, size, size);
			const iw = img.naturalWidth || 1;
			const ih = img.naturalHeight || 1;
			let dw = size;
			let dh = size;
			let dx = 0;
			let dy = 0;
			if (mode === "cover") {
				const scale = Math.max(size / iw, size / ih);
				dw = iw * scale;
				dh = ih * scale;
				dx = (size - dw) / 2;
				dy = (size - dh) / 2;
			} else if (mode === "fit-width") {
				const scale = size / iw;
				dw = size;
				dh = ih * scale;
				dy = (size - dh) / 2;
			} else {
				const scale = size / ih;
				dh = size;
				dw = iw * scale;
				dx = (size - dw) / 2;
			}
			ctx.drawImage(img, dx, dy, dw, dh);
			resolve(canvas.toDataURL("image/jpeg", .86));
		};
		img.onerror = () => reject(/* @__PURE__ */ new Error("Could not read that image."));
		img.src = src;
	});
}
function FaviconImg({ url, className }) {
	const sources = faviconSources(url);
	const [index, setIndex] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => setIndex(0), [url]);
	if (!sources[index]) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
		className,
		"aria-hidden": "true"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: sources[index],
		alt: "",
		className,
		onError: () => setIndex((n) => n + 1)
	});
}
function TileArt({ tile, broken }) {
	if (broken) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Unlink, {
		className: "size-8 text-muted",
		"aria-hidden": "true"
	});
	if ((tile.imageType === "upload" || tile.imageType === "screenshot") && tile.imageData) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: tile.imageData,
		alt: "",
		className: "h-full w-full object-cover"
	});
	if (tile.imageType === "emoji" && tile.imageData) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-5xl leading-none",
		children: tile.imageData
	});
	if (tile.linkedCollectionId && tile.imageType !== "favicon") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, {
			className: "size-7",
			"aria-hidden": "true"
		})
	});
	if (tile.link) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaviconImg, {
		url: tile.link,
		className: "size-12 object-contain"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
		className: "size-8 text-muted",
		"aria-hidden": "true"
	});
}
function TileView({ tile, broken }) {
	const scale = clampScale(tile.imageScale);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "w-full",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "tile-face relative aspect-square overflow-hidden rounded-2xl",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center",
				style: { transform: `scale(${scale / 100})` },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileArt, {
					tile,
					broken
				})
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 line-clamp-2 min-h-8 text-center text-xs font-medium leading-4 text-ink",
			children: tile.title
		})]
	});
}
function Modal({ title, wide, onClose, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "dialog",
			"aria-modal": "true",
			"aria-label": title,
			className: cx("modal-card max-h-[92vh] w-full overflow-y-auto rounded-3xl p-5", wide ? "max-w-2xl" : "max-w-lg"),
			onMouseDown: (event) => event.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg font-semibold text-balance",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "grid size-11 shrink-0 place-items-center rounded-xl text-ink hover:bg-ink/5",
					"aria-label": "Close",
					onClick: onClose,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
				})]
			}), children]
		})
	});
}
function IconButton({ label, danger, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		title: label,
		onClick,
		className: cx("grid size-11 place-items-center rounded-xl hover:bg-ink/5", danger ? "text-danger" : "text-ink"),
		children
	});
}
function TileCollector({ initial }) {
	const [board, setBoard] = (0, import_react.useState)(initial.collections);
	const [passwordIsDefault, setPasswordIsDefault] = (0, import_react.useState)(initial.passwordIsDefault);
	const [activeId, setActiveId] = (0, import_react.useState)(MAIN_ID);
	const [edit, setEdit] = (0, import_react.useState)(false);
	const [sort, setSort] = (0, import_react.useState)("az");
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [saveState, setSaveState] = (0, import_react.useState)("idle");
	const [action, setAction] = (0, import_react.useState)(null);
	const [editorPos, setEditorPos] = (0, import_react.useState)(null);
	const [moveFrom, setMoveFrom] = (0, import_react.useState)(null);
	const [showCreate, setShowCreate] = (0, import_react.useState)(false);
	const [showRename, setShowRename] = (0, import_react.useState)(false);
	const [showDelete, setShowDelete] = (0, import_react.useState)(false);
	const [showImport, setShowImport] = (0, import_react.useState)(false);
	const [showBackup, setShowBackup] = (0, import_react.useState)(false);
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [showPassChange, setShowPassChange] = (0, import_react.useState)(false);
	const [notice, setNotice] = (0, import_react.useState)("");
	const boardRef = (0, import_react.useRef)(board);
	boardRef.current = board;
	const passRef = (0, import_react.useRef)(null);
	const pending = (0, import_react.useRef)(null);
	const pumping = (0, import_react.useRef)(false);
	const timer = (0, import_react.useRef)(null);
	const gen = (0, import_react.useRef)(0);
	const menuRef = (0, import_react.useRef)(null);
	const active = board.find((c) => c.id === activeId) ?? board.find((c) => c.id === "main");
	(0, import_react.useEffect)(() => {
		const saved = localStorage.getItem("tilecollector-sort");
		if (saved === "az" || saved === "count" || saved === "date") setSort(saved);
		const id = location.hash.replace(/^#/, "");
		if (id && initial.collections.some((c) => c.id === id)) setActiveId(id);
	}, [initial.collections]);
	(0, import_react.useEffect)(() => {
		function onHash() {
			const id = location.hash.replace(/^#/, "") || "main";
			if (boardRef.current.some((c) => c.id === id)) setActiveId(id);
		}
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, []);
	(0, import_react.useEffect)(() => {
		function onLeave(event) {
			if (pending.current) {
				event.preventDefault();
				event.returnValue = "";
			}
		}
		window.addEventListener("beforeunload", onLeave);
		return () => window.removeEventListener("beforeunload", onLeave);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!menuOpen) return;
		function onDoc(event) {
			if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [menuOpen]);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			if (event.key !== "Escape") return;
			setMenuOpen(false);
			setAction(null);
			setEditorPos(null);
			setMoveFrom(null);
			setShowCreate(false);
			setShowRename(false);
			setShowDelete(false);
			setShowImport(false);
			setShowBackup(false);
			setShowPassword(false);
			setShowPassChange(false);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	async function pump() {
		if (pumping.current) return;
		pumping.current = true;
		try {
			while (pending.current && passRef.current) {
				const job = pending.current;
				setSaveState("saving");
				try {
					const result = await saveCollection({ data: {
						id: job.id,
						tiles: job.tiles,
						password: passRef.current
					} });
					if (pending.current === job) {
						pending.current = null;
						setSaveState("saved");
					}
					setBoard((prev) => prev.map((c) => c.id === job.id ? {
						...c,
						updatedAt: result.updatedAt
					} : c));
				} catch (error) {
					if (pending.current === job) setSaveState("error");
					setNotice(errorText(error, "Couldn't save."));
					break;
				}
			}
		} finally {
			pumping.current = false;
		}
	}
	function schedule() {
		setSaveState("saving");
		if (timer.current) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			pump();
		}, 800);
	}
	function writeTiles(id, tiles) {
		gen.current += 1;
		const job = {
			id,
			tiles,
			gen: gen.current
		};
		pending.current = job;
		setBoard((prev) => prev.map((c) => c.id === id ? {
			...c,
			tiles
		} : c));
		schedule();
	}
	function go(id) {
		setMenuOpen(false);
		setAction(null);
		if (timer.current) window.clearTimeout(timer.current);
		pump();
		setActiveId(id);
		if ((location.hash.replace(/^#/, "") || "main") !== id) location.hash = id;
	}
	function openTile(tile) {
		if (tile.linkedCollectionId) {
			if (!boardRef.current.some((c) => c.id === tile.linkedCollectionId)) return;
			go(tile.linkedCollectionId);
			return;
		}
		if (tile.link) window.open(tile.link, "_blank", "noopener,noreferrer");
	}
	function chooseSort(next) {
		setSort(next);
		localStorage.setItem("tilecollector-sort", next);
	}
	async function lock() {
		if (timer.current) window.clearTimeout(timer.current);
		await pump();
		passRef.current = null;
		setEdit(false);
		setAction(null);
	}
	const others = sortedCollections(board, edit, sort);
	const editorTile = editorPos == null ? null : active.tiles[editorPos];
	const status = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn't save" : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen max-w-6xl px-3 py-5 sm:px-6 sm:py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: cx("board-panel rounded-3xl p-4 sm:p-6 lg:p-8", edit && "is-editing"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex flex-col gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex min-w-0 items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: "/favicon.svg",
									alt: "",
									className: "size-10 shrink-0"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "truncate font-display text-2xl font-semibold tracking-tight text-balance",
									children: "Mr. D's Links"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1 sm:gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "hidden text-xs text-muted sm:block",
										"aria-live": "polite",
										children: status
									}),
									edit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-ink",
										children: "Editing"
									}) : null,
									edit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
										label: "Change password",
										onClick: () => setShowPassChange(true),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "size-5" })
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
										label: edit ? "Lock editing" : "Unlock editing",
										onClick: () => edit ? void lock() : setShowPassword(true),
										children: edit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-5" })
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative w-full sm:w-72",
									ref: menuRef,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-panel px-3 text-left font-medium",
										"aria-expanded": menuOpen,
										"aria-haspopup": "listbox",
										onClick: () => setMenuOpen((open) => !open),
										children: [
											active.id === "main" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "size-4 text-primary" }) : null,
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "min-w-0 flex-1 truncate",
												children: active.title
											}),
											edit && active.hidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-4 text-muted" }) : null,
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-muted" })
										]
									}), menuOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-panel",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "p-2",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													className: cx("flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left font-medium", activeId === "main" ? "bg-primary/10" : "hover:bg-ink/5"),
													onClick: () => go(MAIN_ID),
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "size-4 text-primary" }), "Main"]
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-3 border-t border-line" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex gap-2 p-2",
												role: "group",
												"aria-label": "Sort collections",
												children: [
													["az", "A–Z"],
													["count", "#"],
													["date", "Date"]
												].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													"aria-pressed": sort === id,
													className: cx("h-10 flex-1 rounded-full text-sm font-semibold", sort === id ? "bg-primary text-primary-ink" : "bg-line text-ink"),
													onClick: () => chooseSort(id),
													children: label
												}, id))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-3 border-t border-line" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "max-h-64 overflow-y-auto p-2",
												children: others.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "px-3 py-2 text-sm text-muted",
													children: "No other collections"
												}) : others.map((collection) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													className: cx("flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left", collection.id === activeId ? "bg-primary/10 font-semibold" : "hover:bg-ink/5"),
													onClick: () => go(collection.id),
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "min-w-0 flex-1 truncate",
														children: collection.title
													}), collection.hidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-4 shrink-0 text-muted" }) : null]
												}, collection.id))
											})
										]
									}) : null]
								}),
								edit && active.id === "main" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									label: "Add collection",
									onClick: () => setShowCreate(true),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
								}) : null,
								edit && active.id !== "main" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									label: "Delete collection",
									danger: true,
									onClick: () => setShowDelete(true),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-5" })
								}) : null,
								edit && active.id !== "main" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									label: "Rename collection",
									onClick: () => setShowRename(true),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Type, { className: "size-5" })
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flex-1" }),
								edit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									label: "Backup",
									onClick: () => setShowBackup(true),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-5" })
								}) : null,
								edit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									label: "Import links",
									onClick: () => setShowImport(true),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-5" })
								}) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted sm:hidden",
							"aria-live": "polite",
							children: status
						}),
						notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-danger",
							children: notice
						}) : null
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 flex flex-col gap-6 lg:mt-8 lg:flex-row lg:gap-10",
					children: [0, 16].map((start) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid min-w-0 flex-1 grid-cols-4 gap-2 sm:gap-3",
						children: active.tiles.slice(start, start + 16).map((tile) => {
							const filled = occupied(tile);
							const broken = Boolean(tile.linkedCollectionId && !board.some((c) => c.id === tile.linkedCollectionId));
							if (!filled && !edit) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "w-full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "aspect-square rounded-2xl border border-dashed border-line" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-1 min-h-8" })]
							}, tile.position);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "w-full rounded-2xl text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
								onClick: (event) => {
									if (!edit) {
										openTile(tile);
										return;
									}
									if (!filled) {
										setEditorPos(tile.position);
										setAction(null);
										return;
									}
									const rect = event.currentTarget.getBoundingClientRect();
									const width = 220;
									const height = 220;
									let left = rect.left;
									let top = rect.bottom + 8;
									if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
									if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height);
									setAction({
										position: tile.position,
										left,
										top
									});
								},
								children: filled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileView, {
									tile,
									broken
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "block w-full",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/40 text-primary",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-medium",
											children: "Add"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-1 block min-h-8" })]
								})
							}, tile.position);
						})
					}, start))
				})]
			}),
			action ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionMenu, {
				tile: active.tiles[action.position],
				left: action.left,
				top: action.top,
				broken: Boolean(active.tiles[action.position].linkedCollectionId) && !board.some((c) => c.id === active.tiles[action.position].linkedCollectionId),
				onClose: () => setAction(null),
				onOpen: () => {
					openTile(active.tiles[action.position]);
					setAction(null);
				},
				onEdit: () => {
					setEditorPos(action.position);
					setAction(null);
				},
				onMove: () => {
					setMoveFrom(action.position);
					setAction(null);
				},
				onClear: () => {
					const position = action.position;
					const tiles = active.tiles.slice();
					tiles[position] = {
						...blankTiles()[0],
						position
					};
					writeTiles(active.id, tiles);
					setAction(null);
				}
			}) : null,
			editorTile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorModal, {
				tile: editorTile,
				collections: board,
				currentId: active.id,
				onClose: () => setEditorPos(null),
				onSave: (tile) => {
					const tiles = active.tiles.slice();
					tiles[tile.position] = tile;
					writeTiles(active.id, tiles);
					setEditorPos(null);
				}
			}, `${active.id}-${editorTile.position}`) : null,
			moveFrom != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoveModal, {
				tiles: active.tiles,
				from: moveFrom,
				onClose: () => setMoveFrom(null),
				onPick: (to) => {
					if (to === moveFrom) return;
					const tiles = active.tiles.map((tile) => ({ ...tile }));
					const a = tiles[moveFrom];
					const b = tiles[to];
					tiles[moveFrom] = {
						...b,
						position: moveFrom
					};
					tiles[to] = {
						...a,
						position: to
					};
					writeTiles(active.id, tiles);
					setMoveFrom(null);
				}
			}) : null,
			showCreate ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateModal, {
				collections: board,
				onClose: () => setShowCreate(false),
				onCreate: async (title, hidden) => {
					const password = passRef.current;
					if (!password) return;
					const created = await createCollection({ data: {
						title,
						hidden,
						password
					} });
					setBoard((prev) => [...prev, created]);
					setShowCreate(false);
					go(created.id);
				}
			}) : null,
			showRename && active.id !== "main" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RenameModal, {
				collection: active,
				collections: board,
				onClose: () => setShowRename(false),
				onSave: async (title, hidden) => {
					const password = passRef.current;
					if (!password) return;
					if (timer.current) window.clearTimeout(timer.current);
					await pump();
					const result = await renameCollection({ data: {
						id: active.id,
						title,
						hidden,
						password
					} });
					setBoard((prev) => {
						const updates = new Map(result.collections.map((c) => [c.id, c]));
						return prev.map((c) => updates.get(c.id) ?? c);
					});
					setShowRename(false);
				}
			}) : null,
			showDelete && active.id !== "main" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeleteModal, {
				title: active.title,
				inbound: board.reduce((sum, collection) => collection.id === active.id ? sum : sum + collection.tiles.filter((tile) => tile.linkedCollectionId === active.id).length, 0),
				onClose: () => setShowDelete(false),
				onConfirm: async () => {
					const password = passRef.current;
					if (!password) return;
					await deleteCollection({ data: {
						id: active.id,
						password
					} });
					setBoard((prev) => prev.filter((c) => c.id !== active.id));
					setShowDelete(false);
					go(MAIN_ID);
				}
			}) : null,
			showImport ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImportModal, {
				tiles: active.tiles,
				onClose: () => setShowImport(false),
				onImport: (items) => {
					const tiles = active.tiles.map((tile) => ({ ...tile }));
					const holes = tiles.filter((tile) => !occupied(tile)).sort((a, b) => a.position - b.position);
					items.forEach((item, index) => {
						const slot = holes[index];
						if (!slot) return;
						tiles[slot.position] = {
							position: slot.position,
							link: item.url,
							title: item.title,
							imageType: "favicon",
							imageData: null,
							linkedCollectionId: null,
							imageScale: null
						};
					});
					writeTiles(active.id, tiles);
				}
			}) : null,
			showBackup ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackupModal, {
				collections: board,
				onClose: () => setShowBackup(false)
			}) : null,
			showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PasswordModal, {
				passwordIsDefault,
				onClose: () => setShowPassword(false),
				onUnlock: (password) => {
					passRef.current = password;
					setEdit(true);
					setShowPassword(false);
					setNotice("");
				}
			}) : null,
			showPassChange ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChangePasswordModal, {
				onClose: () => setShowPassChange(false),
				onSave: async (next) => {
					const password = passRef.current;
					if (!password) return;
					await changePassword({ data: {
						password,
						next
					} });
					passRef.current = next;
					setPasswordIsDefault(false);
					setShowPassChange(false);
				}
			}) : null
		]
	});
}
function ActionMenu({ tile, left, top, broken, onClose, onOpen, onEdit, onMove, onClear }) {
	const [confirmClear, setConfirmClear] = (0, import_react.useState)(false);
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		function onDoc(event) {
			if (!ref.current?.contains(event.target)) onClose();
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [onClose]);
	const items = [
		{
			label: broken ? "Link missing" : "Open link",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-4" }),
			disabled: broken,
			run: onOpen
		},
		{
			label: "Edit tile",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-4" }),
			disabled: false,
			run: onEdit
		},
		{
			label: "Move tile",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Move, { className: "size-4" }),
			disabled: false,
			run: onMove
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "fixed z-40 w-56 rounded-2xl border border-line bg-panel p-2",
		style: {
			left,
			top
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate px-3 py-2 text-sm font-semibold",
				children: tile.title || "Tile"
			}),
			items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				disabled: item.disabled,
				className: "flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm hover:bg-ink/5 disabled:opacity-40",
				onClick: item.run,
				children: [item.icon, item.label]
			}, item.label)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-danger hover:bg-ink/5",
				onClick: () => confirmClear ? onClear() : setConfirmClear(true),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eraser, { className: "size-4" }), confirmClear ? "Clear this tile?" : "Clear tile"]
			})
		]
	});
}
function EditorModal({ tile, collections, currentId, onClose, onSave }) {
	const [draft, setDraft] = (0, import_react.useState)(() => draftFrom(tile, collections, currentId));
	const [over, setOver] = (0, import_react.useState)(false);
	const [imageError, setImageError] = (0, import_react.useState)("");
	const choices = collections.filter((c) => c.id !== currentId);
	(0, import_react.useEffect)(() => {
		if (draft.imageChoice !== "upload") return;
		function onPaste(event) {
			const file = [...event.clipboardData?.files ?? []].find((item) => item.type.startsWith("image/"));
			if (!file) return;
			event.preventDefault();
			ingest(file);
		}
		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	}, [draft.imageChoice, draft.fit]);
	function setUrl(url) {
		setDraft((current) => {
			const next = {
				...current,
				url
			};
			if (current.titleTouched) return next;
			return {
				...next,
				title: autoTitle(next, collections)
			};
		});
	}
	function setKind(kind) {
		setDraft((current) => {
			const next = {
				...current,
				kind,
				imageChoice: kind === "web" && current.imageChoice === "icon" ? "favicon" : kind === "collection" && current.imageChoice === "favicon" ? "icon" : current.imageChoice
			};
			if (current.titleTouched) return next;
			return {
				...next,
				title: autoTitle(next, collections)
			};
		});
	}
	function setLinked(id) {
		setDraft((current) => {
			const next = {
				...current,
				linkedCollectionId: id,
				selfLinkNote: false
			};
			if (current.titleTouched) return next;
			return {
				...next,
				title: autoTitle(next, collections)
			};
		});
	}
	async function ingest(file) {
		if (!file.type.startsWith("image/")) return;
		if (file.size > 8e6) {
			setImageError("That image is too large.");
			return;
		}
		try {
			const source = await readFile(file);
			const fitted = await fitImage(source, draft.fit);
			setDraft((current) => ({
				...current,
				imageChoice: "upload",
				sourceData: source,
				uploadData: fitted
			}));
			setImageError("");
		} catch (error) {
			setImageError(errorText(error, "Could not read that image."));
		}
	}
	async function changeFit(mode) {
		const source = draft.sourceData;
		if (!source) {
			setDraft((current) => ({
				...current,
				fit: mode
			}));
			return;
		}
		const fitted = await fitImage(source, mode);
		setDraft((current) => ({
			...current,
			fit: mode,
			uploadData: fitted,
			imageChoice: "upload"
		}));
	}
	const preview = draftToTile({
		...draft,
		title: draft.title.trim() || autoTitle(draft, collections),
		url: withProtocol(draft.url)
	});
	const urlOk = draft.kind === "collection" || isHttpUrl(withProtocol(draft.url));
	const linkOk = draft.kind === "web" || Boolean(draft.linkedCollectionId);
	const imageOk = draft.imageChoice === "favicon" || draft.imageChoice === "icon" || draft.imageChoice === "emoji" && Boolean(draft.emoji) || draft.imageChoice === "upload" && Boolean(draft.uploadData);
	const canSave = urlOk && linkOk && imageOk;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		title: "Edit tile",
		onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-5 sm:grid-cols-[9rem_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-xs font-semibold tracking-wide text-muted uppercase",
					children: "Preview"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileView, { tile: preview }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex items-center justify-between gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "grid size-11 place-items-center rounded-xl border border-line text-lg disabled:opacity-40",
							"aria-label": "Smaller image",
							disabled: draft.imageScale <= 50,
							onClick: () => setDraft((current) => ({
								...current,
								imageScale: Math.max(50, current.imageScale - 10)
							})),
							children: "−"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-center text-xs font-medium tabular-nums",
							children: [
								"Image size: ",
								draft.imageScale,
								"%"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "grid size-11 place-items-center rounded-xl border border-line text-lg disabled:opacity-40",
							"aria-label": "Larger image",
							disabled: draft.imageScale >= 160,
							onClick: () => setDraft((current) => ({
								...current,
								imageScale: Math.min(160, current.imageScale + 10)
							})),
							children: "+"
						})
					]
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
						className: "text-sm font-medium",
						children: "Opens"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex gap-2",
						children: [["web", "Web link"], ["collection", "Collection"]].map(([kind, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-pressed": draft.kind === kind,
							className: cx("h-10 flex-1 rounded-full text-sm font-semibold", draft.kind === kind ? "bg-primary text-primary-ink" : "bg-line text-ink"),
							onClick: () => setKind(kind),
							children: label
						}, kind))
					})] }),
					draft.kind === "web" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm font-medium",
						children: ["Link", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							value: draft.url,
							inputMode: "url",
							placeholder: "https://",
							onChange: (event) => setUrl(event.target.value),
							onBlur: () => setUrl(withProtocol(draft.url))
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm font-medium",
						children: ["Collection", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: fieldClass,
							value: draft.linkedCollectionId,
							onChange: (event) => setLinked(event.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Choose a collection"
							}), choices.map((collection) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: collection.id,
								children: [collection.title, collection.hidden ? " (hidden)" : ""]
							}, collection.id))]
						})]
					}),
					draft.selfLinkNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "This tile linked to itself. Choose another collection."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm font-medium",
						children: ["Title", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							value: draft.title,
							onChange: (event) => setDraft((current) => ({
								...current,
								title: event.target.value,
								titleTouched: true
							}))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Image"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex gap-2",
							children: [
								[
									draft.kind === "web" ? "favicon" : "icon",
									draft.kind === "web" ? "Favicon" : "Icon",
									Globe
								],
								[
									"emoji",
									"Emoji",
									Smile
								],
								[
									"upload",
									"Upload",
									Image$1
								]
							].map(([choice, label, Icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": draft.imageChoice === choice,
								className: cx("flex h-11 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold", draft.imageChoice === choice ? "bg-primary text-primary-ink" : "bg-line text-ink"),
								onClick: () => setDraft((current) => ({
									...current,
									imageChoice: choice
								})),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }), label]
							}, choice))
						}),
						draft.imageChoice === "emoji" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid max-h-40 grid-cols-7 gap-1 overflow-y-auto",
							children: EMOJIS.map((emoji) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": emoji,
								className: cx("grid size-11 place-items-center rounded-xl text-2xl", draft.emoji === emoji ? "bg-primary/15" : "hover:bg-ink/5"),
								onClick: () => setDraft((current) => ({
									...current,
									emoji,
									imageChoice: "emoji"
								})),
								children: emoji
							}, emoji))
						}) : null,
						draft.imageChoice === "upload" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: cx("flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed text-sm text-muted", over ? "border-primary bg-primary/5" : "border-line"),
									onDragOver: (event) => {
										event.preventDefault();
										setOver(true);
									},
									onDragLeave: () => setOver(false),
									onDrop: (event) => {
										event.preventDefault();
										setOver(false);
										const file = event.dataTransfer.files[0];
										if (file) ingest(file);
									},
									children: ["Drop, paste, or browse", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "file",
										accept: "image/*",
										className: "sr-only",
										onChange: (event) => {
											const file = event.target.files?.[0];
											if (file) ingest(file);
										}
									})]
								}),
								draft.uploadData ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap gap-2",
									children: [[
										["cover", "Cover"],
										["fit-width", "Fit ↔"],
										["fit-height", "Fit ↕"]
									].map(([mode, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: cx("h-10 rounded-full px-3 text-sm font-semibold", draft.fit === mode ? "bg-primary text-primary-ink" : "bg-line text-ink"),
										onClick: () => void changeFit(mode),
										children: label
									}, mode)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-10 rounded-full px-3 text-sm font-semibold text-danger",
										onClick: () => setDraft((current) => ({
											...current,
											uploadData: null,
											sourceData: null,
											imageChoice: current.kind === "web" ? "favicon" : "icon"
										})),
										children: "Remove image"
									})]
								}) : null,
								imageError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-danger",
									children: imageError
								}) : null
							]
						}) : null
					] })
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex justify-end gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "h-11 rounded-xl px-4 text-sm font-semibold",
				onClick: onClose,
				children: "Cancel"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: !canSave,
				className: "h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40",
				onClick: () => {
					onSave(draftToTile({
						...draft,
						title: draft.title.trim() || autoTitle(draft, collections),
						url: withProtocol(draft.url)
					}));
				},
				children: "Save"
			})]
		})]
	});
}
function MoveModal({ tiles, from, onClose, onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		title: "Move tile",
		wide: true,
		onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-sm text-muted",
			children: "Pick a slot. The two boards match the page. An occupied slot swaps."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-8",
			children: [[0, "Left board"], [16, "Right board"]].map(([start, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-xs font-semibold text-muted",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-4 gap-2",
				children: tiles.slice(Number(start), Number(start) + 16).map((tile) => {
					const filled = occupied(tile);
					const current = tile.position === from;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": current ? `Current slot, ${tile.title || "empty"}` : `Move to slot ${tile.position + 1}${filled ? `, swap with ${tile.title || "tile"}` : ""}`,
						className: cx("grid size-16 place-items-center rounded-xl border p-1 text-center sm:size-20", current ? "border-primary ring-2 ring-primary" : "border-line", filled ? "tile-face" : "border-dashed"),
						onClick: () => onPick(tile.position),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "line-clamp-3 text-xs leading-4",
							children: tile.imageType === "emoji" && tile.imageData ? tile.imageData : tile.title
						})
					}, tile.position);
				})
			})] }, label))
		})]
	});
}
function CreateModal({ collections, onClose, onCreate }) {
	const [title, setTitle] = (0, import_react.useState)("");
	const [hidden, setHidden] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const taken = titleTaken(collections, title);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
		title: "New collection",
		onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (event) => {
				event.preventDefault();
				if (!title.trim() || taken) return;
				setPending(true);
				setError("");
				onCreate(title.trim(), hidden).catch((err) => setError(errorText(err, "Could not create that collection."))).finally(() => setPending(false));
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm font-medium",
					htmlFor: "new-collection",
					children: ["Name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "new-collection",
						className: fieldClass,
						autoFocus: true,
						value: title,
						onChange: (event) => setTitle(event.target.value)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-4 flex items-center gap-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						className: "size-5 accent-primary",
						checked: hidden,
						onChange: (event) => setHidden(event.target.checked)
					}), "Hide this collection"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Hidden collections stay out of the public menu until editing is unlocked."
				}),
				taken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: "A collection with that name already exists."
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: !title.trim() || taken || pending,
					className: "mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40",
					children: pending ? "Creating…" : "Create collection"
				})
			]
		})
	});
}
function RenameModal({ collection, collections, onClose, onSave }) {
	const [title, setTitle] = (0, import_react.useState)(collection.title);
	const [hidden, setHidden] = (0, import_react.useState)(collection.hidden);
	const [error, setError] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const taken = titleTaken(collections, title, collection.id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
		title: "Rename collection",
		onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (event) => {
				event.preventDefault();
				if (!title.trim() || taken) return;
				setPending(true);
				onSave(title.trim(), hidden).catch((err) => setError(errorText(err, "Could not rename."))).finally(() => setPending(false));
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm font-medium",
					htmlFor: "rename-collection",
					children: ["Name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "rename-collection",
						className: fieldClass,
						autoFocus: true,
						value: title,
						onChange: (event) => setTitle(event.target.value)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-4 flex items-center gap-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						className: "size-5 accent-primary",
						checked: hidden,
						onChange: (event) => setHidden(event.target.checked)
					}), "Hide this collection"]
				}),
				taken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: "A collection with that name already exists."
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: !title.trim() || taken || pending,
					className: "mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40",
					children: pending ? "Saving…" : "Save"
				})
			]
		})
	});
}
function DeleteModal({ title, inbound, onClose, onConfirm }) {
	const [left, setLeft] = (0, import_react.useState)(3);
	const [pending, setPending] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (left <= 0) return;
		const timer = window.setTimeout(() => setLeft((n) => n - 1), 1e3);
		return () => window.clearTimeout(timer);
	}, [left]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		title: "Do you want to DELETE this collection?",
		onClose,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm",
				children: [title, " and its tiles will be removed."]
			}),
			inbound > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					inbound,
					" ",
					inbound === 1 ? "tile in another collection links" : "tiles in other collections link",
					" here and will stop working."
				]
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-danger",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 rounded-xl px-4 text-sm font-semibold",
					onClick: onClose,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: left > 0 || pending,
					className: "h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-primary-ink disabled:opacity-40",
					onClick: () => {
						setPending(true);
						onConfirm().catch((err) => {
							setError(errorText(err, "Could not delete."));
							setPending(false);
						});
					},
					children: left > 0 ? `Delete (${left})` : pending ? "Deleting…" : "Delete collection"
				})]
			})
		]
	});
}
function ImportModal({ tiles, onClose, onImport }) {
	const [text, setText] = (0, import_react.useState)("");
	const [items, setItems] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	const [leftover, setLeftover] = (0, import_react.useState)(null);
	const [imported, setImported] = (0, import_react.useState)(0);
	const space = 32 - countOccupied(tiles);
	const areaClass = "mt-2 min-h-36 w-full rounded-xl border border-line bg-panel p-3 text-base text-ink outline-none focus-visible:border-primary";
	if (leftover != null) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		title: "Some links did not fit",
		onClose,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm",
				children: [
					"Added ",
					imported,
					". These were not imported:"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				id: "leftover-links",
				className: areaClass,
				readOnly: true,
				value: leftover
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mt-3 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink",
				onClick: () => {
					document.getElementById("leftover-links")?.select();
					navigator.clipboard?.writeText(leftover);
				},
				children: "Copy remaining"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
		title: "Import links",
		wide: true,
		onClose,
		children: items == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (event) => {
				event.preventDefault();
				const parsed = parseLinkList(text);
				if (parsed.length === 0) {
					setError("No links found. Paste URL | Title lines.");
					return;
				}
				setError("");
				setItems(parsed);
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm font-medium",
					htmlFor: "import-links",
					children: ["Paste links", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "import-links",
						className: areaClass,
						value: text,
						placeholder: "https://example.com | Title",
						onChange: (event) => setText(event.target.value)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "OneTab, Markdown, or a plain URL all work."
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					className: "mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink",
					children: "Parse links"
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-3 text-sm text-muted",
				children: [
					items.length,
					" ",
					items.length === 1 ? "link" : "links",
					" · ",
					space,
					" open ",
					space === 1 ? "slot" : "slots"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "max-h-80 space-y-3 overflow-y-auto",
				children: items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaviconImg, {
						url: item.url,
						className: "size-8 shrink-0 object-contain"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "h-11 w-full rounded-xl border border-line px-3 text-base",
							value: item.title,
							"aria-label": `Title for ${item.url}`,
							onChange: (event) => setItems((current) => current?.map((link, i) => i === index ? {
								...link,
								title: event.target.value
							} : link) ?? null)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-xs text-muted",
							children: item.url
						})]
					})]
				}, `${item.url}-${index}`))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex flex-wrap gap-2",
				children: items.length <= space ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink",
					onClick: () => {
						onImport(items);
						onClose();
					},
					children: [
						"Import ",
						items.length,
						" ",
						items.length === 1 ? "link" : "links"
					]
				}) : space > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink",
					onClick: () => {
						const take = items.slice(0, space);
						const rest = items.slice(space);
						onImport(take);
						setImported(take.length);
						setLeftover(rest.map(formatLinkLine).join("\n"));
					},
					children: [
						"Proceed to add ",
						space,
						" out of ",
						items.length,
						" links."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "h-11 rounded-xl px-4 text-sm font-semibold",
					onClick: onClose,
					children: [
						"Cancel adding all ",
						items.length,
						" links."
					]
				})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "h-11 rounded-xl px-4 text-sm font-semibold",
					onClick: onClose,
					children: [
						"Cancel adding all ",
						items.length,
						" links."
					]
				})
			})
		] })
	});
}
function BackupModal({ collections, onClose }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		title: "Backup",
		onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Download a copy of every collection. The live board stays on this page for anyone who opens it."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink",
			onClick: () => {
				const blob = new Blob([JSON.stringify({ collections }, null, 2)], { type: "application/json" });
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = "tilecollector-backup.json";
				link.click();
				URL.revokeObjectURL(url);
			},
			children: "Download backup"
		})]
	});
}
function PasswordModal({ passwordIsDefault, onClose, onUnlock }) {
	const [value, setValue] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
		title: "Edit mode",
		onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (event) => {
				event.preventDefault();
				setPending(true);
				setError("");
				checkPassword({ data: { password: value } }).then(() => onUnlock(value)).catch((err) => setError(errorText(err, "Incorrect password."))).finally(() => setPending(false));
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm font-medium",
					htmlFor: "edit-password",
					children: ["Password", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "edit-password",
						type: "password",
						autoFocus: true,
						autoComplete: "current-password",
						className: fieldClass,
						value,
						onChange: (event) => setValue(event.target.value)
					})]
				}),
				passwordIsDefault ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Starting password: edit"
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: pending || !value,
					className: "mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40",
					children: pending ? "Checking…" : "Unlock"
				})
			]
		})
	});
}
function ChangePasswordModal({ onClose, onSave }) {
	const [next, setNext] = (0, import_react.useState)("");
	const [again, setAgain] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const mismatch = again.length > 0 && next !== again;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
		title: "Change password",
		onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (event) => {
				event.preventDefault();
				if (next.trim().length < 4 || next !== again) return;
				setPending(true);
				onSave(next.trim()).catch((err) => setError(errorText(err, "Could not change the password."))).finally(() => setPending(false));
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm font-medium",
					htmlFor: "new-password",
					children: ["New password", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "new-password",
						type: "password",
						autoFocus: true,
						className: fieldClass,
						value: next,
						onChange: (event) => setNext(event.target.value)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block text-sm font-medium",
					htmlFor: "confirm-password",
					children: ["Confirm", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "confirm-password",
						type: "password",
						className: fieldClass,
						value: again,
						onChange: (event) => setAgain(event.target.value)
					})]
				}),
				mismatch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: "Those passwords don't match."
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: pending || next.trim().length < 4 || next !== again,
					className: "mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40",
					children: pending ? "Saving…" : "Save password"
				})
			]
		})
	});
}
function Home() {
	const initial = Route.useLoaderData();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileCollector, { initial });
}
//#endregion
export { Home as component };
