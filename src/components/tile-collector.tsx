import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ChevronDown,
  Download,
  Eraser,
  ExternalLink,
  EyeOff,
  Globe,
  House,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Lock,
  LockOpen,
  Minus,
  Move,
  Pencil,
  Plus,
  Smile,
  Type,
  Unlink,
  Upload,
  X,
} from "lucide-react";
import {
  changePassword,
  checkPassword,
  createCollection,
  deleteCollection,
  renameCollection,
  saveCollection,
} from "@/lib/board-api";
import {
  MAIN_ID,
  SCALE_MAX,
  SCALE_MIN,
  SCALE_STEP,
  SLOT_COUNT,
  type BoardCollection,
  type FitMode,
  type ParsedLink,
  type SortMode,
  type Tile,
  blankTiles,
  clampScale,
  countOccupied,
  domainLabel,
  formatLinkLine,
  isHttpUrl,
  occupied,
  parseLinkList,
  sortedCollections,
  titleTaken,
} from "@/lib/tile-model";

interface BoardState {
  collections: BoardCollection[];
  passwordIsDefault: boolean;
}

interface PendingSave {
  id: string;
  tiles: Tile[];
  gen: number;
}

type ImageChoice = "favicon" | "emoji" | "upload" | "icon";

interface Draft {
  position: number;
  kind: "web" | "collection";
  url: string;
  linkedCollectionId: string;
  title: string;
  titleTouched: boolean;
  imageChoice: ImageChoice;
  emoji: string;
  uploadData: string | null;
  sourceData: string | null;
  fit: FitMode;
  imageScale: number;
  selfLinkNote: boolean;
}

const EMOJIS = [
  "😀", "😊", "😎", "🤩", "🤔", "👍", "👏", "✨", "⭐", "🔥", "💡", "✅",
  "📚", "📖", "✏️", "📝", "🔢", "➗", "📐", "🔬", "🧪", "🌍", "🗺️", "🎨",
  "🎵", "⚽", "🏃", "🍎", "🧠", "💻", "🧮", "🏠", "📁", "🔗", "🎯", "🚀",
  "🌈", "🌻", "🍁", "🐻", "🇫🇷", "🇨🇦",
];

const fieldClass =
  "mt-1 h-11 w-full rounded-xl border border-line bg-panel px-3 text-base text-ink outline-none focus-visible:border-primary";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

function faviconSources(url: string): string[] {
  try {
    const host = new URL(url).hostname;
    return [
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
    ];
  } catch {
    return [];
  }
}

function withProtocol(value: string) {
  const trimmed = value.trim();
  if (!trimmed || isHttpUrl(trimmed) || trimmed.includes(" ")) return trimmed;
  return `https://${trimmed}`;
}

function autoTitle(
  draft: Pick<Draft, "kind" | "url" | "linkedCollectionId">,
  collections: BoardCollection[],
) {
  if (draft.kind === "collection") {
    return collections.find((c) => c.id === draft.linkedCollectionId)?.title ?? "";
  }
  const url = withProtocol(draft.url);
  return isHttpUrl(url) ? domainLabel(url) : "";
}

function draftFrom(tile: Tile, collections: BoardCollection[], currentId: string): Draft {
  const self = tile.linkedCollectionId === currentId;
  const kind = tile.linkedCollectionId && !self ? "collection" : tile.linkedCollectionId ? "collection" : "web";
  const linkedCollectionId = self ? "" : (tile.linkedCollectionId ?? "");
  const imageChoice: ImageChoice =
    tile.imageType === "emoji"
      ? "emoji"
      : tile.imageType === "upload" || tile.imageType === "screenshot"
        ? "upload"
        : kind === "collection"
          ? "icon"
          : "favicon";
  const base: Draft = {
    position: tile.position,
    kind: self ? "collection" : kind,
    url: tile.link ?? "",
    linkedCollectionId,
    title: tile.title ?? "",
    titleTouched: false,
    imageChoice,
    emoji: tile.imageType === "emoji" ? (tile.imageData ?? "") : "",
    uploadData:
      tile.imageType === "upload" || tile.imageType === "screenshot" ? tile.imageData : null,
    sourceData:
      tile.imageType === "upload" || tile.imageType === "screenshot" ? tile.imageData : null,
    fit: "cover",
    imageScale: clampScale(tile.imageScale),
    selfLinkNote: self,
  };
  const auto = autoTitle(base, collections);
  base.titleTouched = Boolean(tile.title) && tile.title !== auto;
  if (!base.title) base.title = auto;
  return base;
}

function draftToTile(draft: Draft): Tile {
  const url = draft.kind === "web" ? withProtocol(draft.url) : null;
  return {
    position: draft.position,
    link: draft.kind === "web" && url && isHttpUrl(url) ? url : null,
    title: draft.title.trim() || autoTitle(draft, []) || null,
    imageType:
      draft.imageChoice === "emoji"
        ? "emoji"
        : draft.imageChoice === "upload"
          ? "upload"
          : draft.imageChoice === "favicon"
            ? "favicon"
            : null,
    imageData:
      draft.imageChoice === "emoji"
        ? draft.emoji
        : draft.imageChoice === "upload"
          ? draft.uploadData
          : null,
    linkedCollectionId: draft.kind === "collection" ? draft.linkedCollectionId || null : null,
    imageScale: draft.imageScale === 100 ? null : draft.imageScale,
  };
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

function fitImage(src: string, mode: FitMode) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 300;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not read that image."));
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
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

function FaviconImg({ url, className }: { url: string; className?: string }) {
  const sources = faviconSources(url);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [url]);
  if (!sources[index]) return <Globe className={className} aria-hidden="true" />;
  return (
    <img
      src={sources[index]}
      alt=""
      className={className}
      onError={() => setIndex((n) => n + 1)}
    />
  );
}

function TileArt({ tile, broken }: { tile: Tile; broken?: boolean }) {
  if (broken) return <Unlink className="size-8 text-muted" aria-hidden="true" />;
  if ((tile.imageType === "upload" || tile.imageType === "screenshot") && tile.imageData) {
    return <img src={tile.imageData} alt="" className="h-full w-full object-cover" />;
  }
  if (tile.imageType === "emoji" && tile.imageData) {
    return <span className="text-5xl leading-none">{tile.imageData}</span>;
  }
  if (tile.linkedCollectionId && tile.imageType !== "favicon") {
    return (
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <LayoutGrid className="size-7" aria-hidden="true" />
      </span>
    );
  }
  if (tile.link) return <FaviconImg url={tile.link} className="size-12 object-contain" />;
  return <Globe className="size-8 text-muted" aria-hidden="true" />;
}

function TileView({ tile, broken }: { tile: Tile; broken?: boolean }) {
  const scale = clampScale(tile.imageScale);
  return (
    <div className="w-full">
      <div className="tile-face relative aspect-square overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `scale(${scale / 100})` }}
        >
          <TileArt tile={tile} broken={broken} />
        </div>
      </div>
      <p className="mt-1 line-clamp-2 min-h-8 text-center text-xs font-medium leading-4 text-ink">
        {tile.title}
      </p>
    </div>
  );
}

function Modal({
  title,
  wide,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "modal-card max-h-[92vh] w-full overflow-y-auto rounded-3xl p-5",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-balance">{title}</h2>
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-ink hover:bg-ink/5"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "grid size-11 place-items-center rounded-xl hover:bg-ink/5",
        danger ? "text-danger" : "text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function TileCollector({ initial }: { initial: BoardState }) {
  const [board, setBoard] = useState(initial.collections);
  const [passwordIsDefault, setPasswordIsDefault] = useState(initial.passwordIsDefault);
  const [activeId, setActiveId] = useState(MAIN_ID);
  const [edit, setEdit] = useState(false);
  const [sort, setSort] = useState<SortMode>("az");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [action, setAction] = useState<{ position: number; left: number; top: number } | null>(null);
  const [editorPos, setEditorPos] = useState<number | null>(null);
  const [moveFrom, setMoveFrom] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassChange, setShowPassChange] = useState(false);
  const [notice, setNotice] = useState("");

  const boardRef = useRef(board);
  boardRef.current = board;
  const passRef = useRef<string | null>(null);
  const pending = useRef<PendingSave | null>(null);
  const pumping = useRef(false);
  const timer = useRef<number | null>(null);
  const gen = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = board.find((c) => c.id === activeId) ?? board.find((c) => c.id === MAIN_ID)!;

  useEffect(() => {
    const saved = localStorage.getItem("tilecollector-sort");
    if (saved === "az" || saved === "count" || saved === "date") setSort(saved);
    const id = location.hash.replace(/^#/, "");
    if (id && initial.collections.some((c) => c.id === id)) setActiveId(id);
  }, [initial.collections]);

  useEffect(() => {
    function onHash() {
      const id = location.hash.replace(/^#/, "") || MAIN_ID;
      if (boardRef.current.some((c) => c.id === id)) setActiveId(id);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (pending.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
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
          const result = await saveCollection({
            data: { id: job.id, tiles: job.tiles, password: passRef.current },
          });
          if (pending.current === job) {
            pending.current = null;
            setSaveState("saved");
          }
          setBoard((prev) =>
            prev.map((c) => (c.id === job.id ? { ...c, updatedAt: result.updatedAt } : c)),
          );
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
      void pump();
    }, 800);
  }

  function writeTiles(id: string, tiles: Tile[]) {
    gen.current += 1;
    const job = { id, tiles, gen: gen.current };
    pending.current = job;
    setBoard((prev) => prev.map((c) => (c.id === id ? { ...c, tiles } : c)));
    schedule();
  }

  function go(id: string) {
    setMenuOpen(false);
    setAction(null);
    if (timer.current) window.clearTimeout(timer.current);
    void pump();
    setActiveId(id);
    if ((location.hash.replace(/^#/, "") || MAIN_ID) !== id) location.hash = id;
  }

  function openTile(tile: Tile) {
    if (tile.linkedCollectionId) {
      if (!boardRef.current.some((c) => c.id === tile.linkedCollectionId)) return;
      go(tile.linkedCollectionId);
      return;
    }
    if (tile.link) window.open(tile.link, "_blank", "noopener,noreferrer");
  }

  function chooseSort(next: SortMode) {
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
  const status =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn't save" : "";

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-5 sm:px-6 sm:py-10">
      <section className={cx("board-panel rounded-3xl p-4 sm:p-6 lg:p-8", edit && "is-editing")}>
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/favicon.svg" alt="" className="size-10 shrink-0" />
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-balance">
                Mr. D's Links
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <p className="hidden text-xs text-muted sm:block" aria-live="polite">
                {status}
              </p>
              {edit ? (
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-ink">
                  Editing
                </span>
              ) : null}
              {edit ? (
                <IconButton label="Change password" onClick={() => setShowPassChange(true)}>
                  <KeyRound className="size-5" />
                </IconButton>
              ) : null}
              <IconButton label={edit ? "Lock editing" : "Unlock editing"} onClick={() => (edit ? void lock() : setShowPassword(true))}>
                {edit ? <LockOpen className="size-5" /> : <Lock className="size-5" />}
              </IconButton>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72" ref={menuRef}>
              <button
                type="button"
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-panel px-3 text-left font-medium"
                aria-expanded={menuOpen}
                aria-haspopup="listbox"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {active.id === MAIN_ID ? <House className="size-4 text-primary" /> : null}
                <span className="min-w-0 flex-1 truncate">{active.title}</span>
                {edit && active.hidden ? <EyeOff className="size-4 text-muted" /> : null}
                <ChevronDown className="size-4 text-muted" />
              </button>
              {menuOpen ? (
                <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-panel">
                  <div className="p-2">
                    <button
                      type="button"
                      className={cx(
                        "flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left font-medium",
                        activeId === MAIN_ID ? "bg-primary/10" : "hover:bg-ink/5",
                      )}
                      onClick={() => go(MAIN_ID)}
                    >
                      <House className="size-4 text-primary" />
                      Main
                    </button>
                  </div>
                  <div className="mx-3 border-t border-line" />
                  <div className="flex gap-2 p-2" role="group" aria-label="Sort collections">
                    {(
                      [
                        ["az", "A–Z"],
                        ["count", "#"],
                        ["date", "Date"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={sort === id}
                        className={cx(
                          "h-10 flex-1 rounded-full text-sm font-semibold",
                          sort === id ? "bg-primary text-primary-ink" : "bg-line text-ink",
                        )}
                        onClick={() => chooseSort(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mx-3 border-t border-line" />
                  <div className="max-h-64 overflow-y-auto p-2">
                    {others.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted">No other collections</p>
                    ) : (
                      others.map((collection) => (
                        <button
                          key={collection.id}
                          type="button"
                          className={cx(
                            "flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left",
                            collection.id === activeId ? "bg-primary/10 font-semibold" : "hover:bg-ink/5",
                          )}
                          onClick={() => go(collection.id)}
                        >
                          <span className="min-w-0 flex-1 truncate">{collection.title}</span>
                          {collection.hidden ? <EyeOff className="size-4 shrink-0 text-muted" /> : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            {edit && active.id === MAIN_ID ? (
              <IconButton label="Add collection" onClick={() => setShowCreate(true)}>
                <Plus className="size-5" />
              </IconButton>
            ) : null}
            {edit && active.id !== MAIN_ID ? (
              <IconButton label="Delete collection" danger onClick={() => setShowDelete(true)}>
                <Minus className="size-5" />
              </IconButton>
            ) : null}
            {edit && active.id !== MAIN_ID ? (
              <IconButton label="Rename collection" onClick={() => setShowRename(true)}>
                <Type className="size-5" />
              </IconButton>
            ) : null}
            <span className="flex-1" />
            {edit ? (
              <IconButton label="Backup" onClick={() => setShowBackup(true)}>
                <Upload className="size-5" />
              </IconButton>
            ) : null}
            {edit ? (
              <IconButton label="Import links" onClick={() => setShowImport(true)}>
                <Download className="size-5" />
              </IconButton>
            ) : null}
          </div>
          <p className="text-xs text-muted sm:hidden" aria-live="polite">
            {status}
          </p>
          {notice ? <p className="text-sm text-danger">{notice}</p> : null}
        </header>

        <div className="mt-6 flex flex-col gap-6 lg:mt-8 lg:flex-row lg:gap-10">
          {[0, 16].map((start) => (
            <div key={start} className="grid min-w-0 flex-1 grid-cols-4 gap-2 sm:gap-3">
              {active.tiles.slice(start, start + 16).map((tile) => {
                const filled = occupied(tile);
                const broken = Boolean(
                  tile.linkedCollectionId && !board.some((c) => c.id === tile.linkedCollectionId),
                );
                if (!filled && !edit) {
                  return (
                    <div key={tile.position} className="w-full">
                      <div className="aspect-square rounded-2xl border border-dashed border-line" />
                      <div className="mt-1 min-h-8" />
                    </div>
                  );
                }
                return (
                  <button
                    key={tile.position}
                    type="button"
                    className="w-full rounded-2xl text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    onClick={(event) => {
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
                      setAction({ position: tile.position, left, top });
                    }}
                  >
                    {filled ? (
                      <TileView tile={tile} broken={broken} />
                    ) : (
                      <span className="block w-full">
                        <span className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/40 text-primary">
                          <Plus className="size-5" />
                          <span className="text-xs font-medium">Add</span>
                        </span>
                        <span className="mt-1 block min-h-8" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {action ? (
        <ActionMenu
          tile={active.tiles[action.position]}
          left={action.left}
          top={action.top}
          broken={
            Boolean(active.tiles[action.position].linkedCollectionId) &&
            !board.some((c) => c.id === active.tiles[action.position].linkedCollectionId)
          }
          onClose={() => setAction(null)}
          onOpen={() => {
            openTile(active.tiles[action.position]);
            setAction(null);
          }}
          onEdit={() => {
            setEditorPos(action.position);
            setAction(null);
          }}
          onMove={() => {
            setMoveFrom(action.position);
            setAction(null);
          }}
          onClear={() => {
            const position = action.position;
            const tiles = active.tiles.slice();
            tiles[position] = { ...blankTiles()[0], position };
            writeTiles(active.id, tiles);
            setAction(null);
          }}
        />
      ) : null}

      {editorTile ? (
        <EditorModal
          key={`${active.id}-${editorTile.position}`}
          tile={editorTile}
          collections={board}
          currentId={active.id}
          onClose={() => setEditorPos(null)}
          onSave={(tile) => {
            const tiles = active.tiles.slice();
            tiles[tile.position] = tile;
            writeTiles(active.id, tiles);
            setEditorPos(null);
          }}
        />
      ) : null}

      {moveFrom != null ? (
        <MoveModal
          tiles={active.tiles}
          from={moveFrom}
          onClose={() => setMoveFrom(null)}
          onPick={(to) => {
            if (to === moveFrom) return;
            const tiles = active.tiles.map((tile) => ({ ...tile }));
            const a = tiles[moveFrom];
            const b = tiles[to];
            tiles[moveFrom] = { ...b, position: moveFrom };
            tiles[to] = { ...a, position: to };
            writeTiles(active.id, tiles);
            setMoveFrom(null);
          }}
        />
      ) : null}

      {showCreate ? (
        <CreateModal
          collections={board}
          onClose={() => setShowCreate(false)}
          onCreate={async (title, hidden) => {
            const password = passRef.current;
            if (!password) return;
            const created = await createCollection({ data: { title, hidden, password } });
            setBoard((prev) => [...prev, created]);
            setShowCreate(false);
            go(created.id);
          }}
        />
      ) : null}

      {showRename && active.id !== MAIN_ID ? (
        <RenameModal
          collection={active}
          collections={board}
          onClose={() => setShowRename(false)}
          onSave={async (title, hidden) => {
            const password = passRef.current;
            if (!password) return;
            if (timer.current) window.clearTimeout(timer.current);
            await pump();
            const result = await renameCollection({
              data: { id: active.id, title, hidden, password },
            });
            setBoard((prev) => {
              const updates = new Map(result.collections.map((c) => [c.id, c]));
              return prev.map((c) => updates.get(c.id) ?? c);
            });
            setShowRename(false);
          }}
        />
      ) : null}

      {showDelete && active.id !== MAIN_ID ? (
        <DeleteModal
          title={active.title}
          inbound={board.reduce(
            (sum, collection) =>
              collection.id === active.id
                ? sum
                : sum + collection.tiles.filter((tile) => tile.linkedCollectionId === active.id).length,
            0,
          )}
          onClose={() => setShowDelete(false)}
          onConfirm={async () => {
            const password = passRef.current;
            if (!password) return;
            await deleteCollection({ data: { id: active.id, password } });
            setBoard((prev) => prev.filter((c) => c.id !== active.id));
            setShowDelete(false);
            go(MAIN_ID);
          }}
        />
      ) : null}

      {showImport ? (
        <ImportModal
          tiles={active.tiles}
          onClose={() => setShowImport(false)}
          onImport={(items) => {
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
                imageScale: null,
              };
            });
            writeTiles(active.id, tiles);
          }}
        />
      ) : null}

      {showBackup ? (
        <BackupModal collections={board} onClose={() => setShowBackup(false)} />
      ) : null}

      {showPassword ? (
        <PasswordModal
          passwordIsDefault={passwordIsDefault}
          onClose={() => setShowPassword(false)}
          onUnlock={(password) => {
            passRef.current = password;
            setEdit(true);
            setShowPassword(false);
            setNotice("");
          }}
        />
      ) : null}

      {showPassChange ? (
        <ChangePasswordModal
          onClose={() => setShowPassChange(false)}
          onSave={async (next) => {
            const password = passRef.current;
            if (!password) return;
            await changePassword({ data: { password, next } });
            passRef.current = next;
            setPasswordIsDefault(false);
            setShowPassChange(false);
          }}
        />
      ) : null}
    </main>
  );
}

function ActionMenu({
  tile,
  left,
  top,
  broken,
  onClose,
  onOpen,
  onEdit,
  onMove,
  onClear,
}: {
  tile: Tile;
  left: number;
  top: number;
  broken: boolean;
  onClose: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onMove: () => void;
  onClear: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  const items = [
    { label: broken ? "Link missing" : "Open link", icon: <ExternalLink className="size-4" />, disabled: broken, run: onOpen },
    { label: "Edit tile", icon: <Pencil className="size-4" />, disabled: false, run: onEdit },
    { label: "Move tile", icon: <Move className="size-4" />, disabled: false, run: onMove },
  ];
  return (
    <div
      ref={ref}
      className="fixed z-40 w-56 rounded-2xl border border-line bg-panel p-2"
      style={{ left, top }}
    >
      <p className="truncate px-3 py-2 text-sm font-semibold">{tile.title || "Tile"}</p>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.disabled}
          className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm hover:bg-ink/5 disabled:opacity-40"
          onClick={item.run}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
      <button
        type="button"
        className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-danger hover:bg-ink/5"
        onClick={() => (confirmClear ? onClear() : setConfirmClear(true))}
      >
        <Eraser className="size-4" />
        {confirmClear ? "Clear this tile?" : "Clear tile"}
      </button>
    </div>
  );
}

function EditorModal({
  tile,
  collections,
  currentId,
  onClose,
  onSave,
}: {
  tile: Tile;
  collections: BoardCollection[];
  currentId: string;
  onClose: () => void;
  onSave: (tile: Tile) => void;
}) {
  const [draft, setDraft] = useState(() => draftFrom(tile, collections, currentId));
  const [over, setOver] = useState(false);
  const [imageError, setImageError] = useState("");
  const choices = collections.filter((c) => c.id !== currentId);

  useEffect(() => {
    if (draft.imageChoice !== "upload") return;
    function onPaste(event: ClipboardEvent) {
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
      if (!file) return;
      event.preventDefault();
      void ingest(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [draft.imageChoice, draft.fit]);

  function setUrl(url: string) {
    setDraft((current) => {
      const next = { ...current, url };
      if (current.titleTouched) return next;
      return { ...next, title: autoTitle(next, collections) };
    });
  }

  function setKind(kind: Draft["kind"]) {
    setDraft((current) => {
      const next: Draft = {
        ...current,
        kind,
        imageChoice:
          kind === "web" && current.imageChoice === "icon"
            ? "favicon"
            : kind === "collection" && current.imageChoice === "favicon"
              ? "icon"
              : current.imageChoice,
      };
      if (current.titleTouched) return next;
      return { ...next, title: autoTitle(next, collections) };
    });
  }

  function setLinked(id: string) {
    setDraft((current) => {
      const next = { ...current, linkedCollectionId: id, selfLinkNote: false };
      if (current.titleTouched) return next;
      return { ...next, title: autoTitle(next, collections) };
    });
  }

  async function ingest(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8_000_000) {
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
        uploadData: fitted,
      }));
      setImageError("");
    } catch (error) {
      setImageError(errorText(error, "Could not read that image."));
    }
  }

  async function changeFit(mode: FitMode) {
    const source = draft.sourceData;
    if (!source) {
      setDraft((current) => ({ ...current, fit: mode }));
      return;
    }
    const fitted = await fitImage(source, mode);
    setDraft((current) => ({ ...current, fit: mode, uploadData: fitted, imageChoice: "upload" }));
  }

  const preview = draftToTile({
    ...draft,
    title: draft.title.trim() || autoTitle(draft, collections),
    url: withProtocol(draft.url),
  });
  const urlOk = draft.kind === "collection" || isHttpUrl(withProtocol(draft.url));
  const linkOk = draft.kind === "web" || Boolean(draft.linkedCollectionId);
  const imageOk =
    draft.imageChoice === "favicon" ||
    draft.imageChoice === "icon" ||
    (draft.imageChoice === "emoji" && Boolean(draft.emoji)) ||
    (draft.imageChoice === "upload" && Boolean(draft.uploadData));
  const canSave = urlOk && linkOk && imageOk;

  return (
    <Modal title="Edit tile" onClose={onClose}>
      <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Preview</p>
          <TileView tile={preview} />
          <div className="mt-3 flex items-center justify-between gap-1">
            <button
              type="button"
              className="grid size-11 place-items-center rounded-xl border border-line text-lg disabled:opacity-40"
              aria-label="Smaller image"
              disabled={draft.imageScale <= SCALE_MIN}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  imageScale: Math.max(SCALE_MIN, current.imageScale - SCALE_STEP),
                }))
              }
            >
              −
            </button>
            <p className="text-center text-xs font-medium tabular-nums">
              Image size: {draft.imageScale}%
            </p>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-xl border border-line text-lg disabled:opacity-40"
              aria-label="Larger image"
              disabled={draft.imageScale >= SCALE_MAX}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  imageScale: Math.min(SCALE_MAX, current.imageScale + SCALE_STEP),
                }))
              }
            >
              +
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Opens</legend>
            <div className="mt-2 flex gap-2">
              {(
                [
                  ["web", "Web link"],
                  ["collection", "Collection"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={draft.kind === kind}
                  className={cx(
                    "h-10 flex-1 rounded-full text-sm font-semibold",
                    draft.kind === kind ? "bg-primary text-primary-ink" : "bg-line text-ink",
                  )}
                  onClick={() => setKind(kind)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {draft.kind === "web" ? (
            <label className="block text-sm font-medium">
              Link
              <input
                className={fieldClass}
                value={draft.url}
                inputMode="url"
                placeholder="https://"
                onChange={(event) => setUrl(event.target.value)}
                onBlur={() => setUrl(withProtocol(draft.url))}
              />
            </label>
          ) : (
            <label className="block text-sm font-medium">
              Collection
              <select
                className={fieldClass}
                value={draft.linkedCollectionId}
                onChange={(event) => setLinked(event.target.value)}
              >
                <option value="">Choose a collection</option>
                {choices.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                    {collection.hidden ? " (hidden)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.selfLinkNote ? (
            <p className="text-sm text-muted">This tile linked to itself. Choose another collection.</p>
          ) : null}
          <label className="block text-sm font-medium">
            Title
            <input
              className={fieldClass}
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value, titleTouched: true }))
              }
            />
          </label>
          <div>
            <p className="text-sm font-medium">Image</p>
            <div className="mt-2 flex gap-2">
              {(
                [
                  [draft.kind === "web" ? "favicon" : "icon", draft.kind === "web" ? "Favicon" : "Icon", Globe],
                  ["emoji", "Emoji", Smile],
                  ["upload", "Upload", ImageIcon],
                ] as const
              ).map(([choice, label, Icon]) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={draft.imageChoice === choice}
                  className={cx(
                    "flex h-11 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold",
                    draft.imageChoice === choice ? "bg-primary text-primary-ink" : "bg-line text-ink",
                  )}
                  onClick={() => setDraft((current) => ({ ...current, imageChoice: choice }))}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
            {draft.imageChoice === "emoji" ? (
              <div className="mt-3 grid max-h-40 grid-cols-7 gap-1 overflow-y-auto">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    className={cx(
                      "grid size-11 place-items-center rounded-xl text-2xl",
                      draft.emoji === emoji ? "bg-primary/15" : "hover:bg-ink/5",
                    )}
                    onClick={() => setDraft((current) => ({ ...current, emoji, imageChoice: "emoji" }))}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            {draft.imageChoice === "upload" ? (
              <div className="mt-3 space-y-2">
                <label
                  className={cx(
                    "flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed text-sm text-muted",
                    over ? "border-primary bg-primary/5" : "border-line",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOver(true);
                  }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setOver(false);
                    const file = event.dataTransfer.files[0];
                    if (file) void ingest(file);
                  }}
                >
                  Drop, paste, or browse
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void ingest(file);
                    }}
                  />
                </label>
                {draft.uploadData ? (
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["cover", "Cover"],
                        ["fit-width", "Fit ↔"],
                        ["fit-height", "Fit ↕"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        className={cx(
                          "h-10 rounded-full px-3 text-sm font-semibold",
                          draft.fit === mode ? "bg-primary text-primary-ink" : "bg-line text-ink",
                        )}
                        onClick={() => void changeFit(mode)}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="h-10 rounded-full px-3 text-sm font-semibold text-danger"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          uploadData: null,
                          sourceData: null,
                          imageChoice: current.kind === "web" ? "favicon" : "icon",
                        }))
                      }
                    >
                      Remove image
                    </button>
                  </div>
                ) : null}
                {imageError ? <p className="text-sm text-danger">{imageError}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="h-11 rounded-xl px-4 text-sm font-semibold" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40"
          onClick={() => {
            const tileOut = draftToTile({
              ...draft,
              title: draft.title.trim() || autoTitle(draft, collections),
              url: withProtocol(draft.url),
            });
            onSave(tileOut);
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function MoveModal({
  tiles,
  from,
  onClose,
  onPick,
}: {
  tiles: Tile[];
  from: number;
  onClose: () => void;
  onPick: (position: number) => void;
}) {
  return (
    <Modal title="Move tile" wide onClose={onClose}>
      <p className="mb-4 text-sm text-muted">
        Pick a slot. The two boards match the page. An occupied slot swaps.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-8">
        {[
          [0, "Left board"],
          [16, "Right board"],
        ].map(([start, label]) => (
          <div key={label}>
            <p className="mb-2 text-xs font-semibold text-muted">{label}</p>
            <div className="grid grid-cols-4 gap-2">
              {tiles.slice(Number(start), Number(start) + 16).map((tile) => {
                const filled = occupied(tile);
                const current = tile.position === from;
                return (
                  <button
                    key={tile.position}
                    type="button"
                    aria-label={
                      current
                        ? `Current slot, ${tile.title || "empty"}`
                        : `Move to slot ${tile.position + 1}${filled ? `, swap with ${tile.title || "tile"}` : ""}`
                    }
                    className={cx(
                      "grid size-16 place-items-center rounded-xl border p-1 text-center sm:size-20",
                      current ? "border-primary ring-2 ring-primary" : "border-line",
                      filled ? "tile-face" : "border-dashed",
                    )}
                    onClick={() => onPick(tile.position)}
                  >
                    <span className="line-clamp-3 text-xs leading-4">
                      {tile.imageType === "emoji" && tile.imageData ? tile.imageData : tile.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function CreateModal({
  collections,
  onClose,
  onCreate,
}: {
  collections: BoardCollection[];
  onClose: () => void;
  onCreate: (title: string, hidden: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const taken = titleTaken(collections, title);
  return (
    <Modal title="New collection" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || taken) return;
          setPending(true);
          setError("");
          void onCreate(title.trim(), hidden)
            .catch((err: unknown) => setError(errorText(err, "Could not create that collection.")))
            .finally(() => setPending(false));
        }}
      >
        <label className="block text-sm font-medium" htmlFor="new-collection">
          Name
          <input
            id="new-collection"
            className={fieldClass}
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={hidden}
            onChange={(event) => setHidden(event.target.checked)}
          />
          Hide this collection
        </label>
        <p className="mt-2 text-sm text-muted">
          Hidden collections stay out of the public menu until editing is unlocked.
        </p>
        {taken ? <p className="mt-2 text-sm text-danger">A collection with that name already exists.</p> : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={!title.trim() || taken || pending}
          className="mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40"
        >
          {pending ? "Creating…" : "Create collection"}
        </button>
      </form>
    </Modal>
  );
}

function RenameModal({
  collection,
  collections,
  onClose,
  onSave,
}: {
  collection: BoardCollection;
  collections: BoardCollection[];
  onClose: () => void;
  onSave: (title: string, hidden: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState(collection.title);
  const [hidden, setHidden] = useState(collection.hidden);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const taken = titleTaken(collections, title, collection.id);
  return (
    <Modal title="Rename collection" onClose={onClose}>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (!title.trim() || taken) return;
          setPending(true);
          void onSave(title.trim(), hidden)
            .catch((err: unknown) => setError(errorText(err, "Could not rename.")))
            .finally(() => setPending(false));
        }}
      >
        <label className="block text-sm font-medium" htmlFor="rename-collection">
          Name
          <input
            id="rename-collection"
            className={fieldClass}
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={hidden}
            onChange={(event) => setHidden(event.target.checked)}
          />
          Hide this collection
        </label>
        {taken ? <p className="mt-2 text-sm text-danger">A collection with that name already exists.</p> : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={!title.trim() || taken || pending}
          className="mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </Modal>
  );
}

function DeleteModal({
  title,
  inbound,
  onClose,
  onConfirm,
}: {
  title: string;
  inbound: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [left, setLeft] = useState(3);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);
  return (
    <Modal title="Do you want to DELETE this collection?" onClose={onClose}>
      <p className="text-sm">
        {title} and its tiles will be removed.
      </p>
      {inbound > 0 ? (
        <p className="mt-2 text-sm text-muted">
          {inbound} {inbound === 1 ? "tile in another collection links" : "tiles in other collections link"} here
          and will stop working.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="h-11 rounded-xl px-4 text-sm font-semibold" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={left > 0 || pending}
          className="h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-primary-ink disabled:opacity-40"
          onClick={() => {
            setPending(true);
            void onConfirm()
              .catch((err: unknown) => {
                setError(errorText(err, "Could not delete."));
                setPending(false);
              });
          }}
        >
          {left > 0 ? `Delete (${left})` : pending ? "Deleting…" : "Delete collection"}
        </button>
      </div>
    </Modal>
  );
}

function ImportModal({
  tiles,
  onClose,
  onImport,
}: {
  tiles: Tile[];
  onClose: () => void;
  onImport: (items: ParsedLink[]) => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ParsedLink[] | null>(null);
  const [error, setError] = useState("");
  const [leftover, setLeftover] = useState<string | null>(null);
  const [imported, setImported] = useState(0);
  const space = SLOT_COUNT - countOccupied(tiles);
  const areaClass = "mt-2 min-h-36 w-full rounded-xl border border-line bg-panel p-3 text-base text-ink outline-none focus-visible:border-primary";

  if (leftover != null) {
    return (
      <Modal title="Some links did not fit" onClose={onClose}>
        <p className="text-sm">
          Added {imported}. These were not imported:
        </p>
        <textarea id="leftover-links" className={areaClass} readOnly value={leftover} />
        <button
          type="button"
          className="mt-3 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink"
          onClick={() => {
            const area = document.getElementById("leftover-links") as HTMLTextAreaElement | null;
            area?.select();
            void navigator.clipboard?.writeText(leftover);
          }}
        >
          Copy remaining
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Import links" wide onClose={onClose}>
      {items == null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = parseLinkList(text);
            if (parsed.length === 0) {
              setError("No links found. Paste URL | Title lines.");
              return;
            }
            setError("");
            setItems(parsed);
          }}
        >
          <label className="block text-sm font-medium" htmlFor="import-links">
            Paste links
            <textarea
              id="import-links"
              className={areaClass}
              value={text}
              placeholder={"https://example.com | Title"}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <p className="mt-2 text-sm text-muted">OneTab, Markdown, or a plain URL all work.</p>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <button type="submit" className="mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink">
            Parse links
          </button>
        </form>
      ) : (
        <div>
          <p className="mb-3 text-sm text-muted">
            {items.length} {items.length === 1 ? "link" : "links"} · {space} open {space === 1 ? "slot" : "slots"}
          </p>
          <ul className="max-h-80 space-y-3 overflow-y-auto">
            {items.map((item, index) => (
              <li key={`${item.url}-${index}`} className="flex items-center gap-3">
                <FaviconImg url={item.url} className="size-8 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <input
                    className="h-11 w-full rounded-xl border border-line px-3 text-base"
                    value={item.title}
                    aria-label={`Title for ${item.url}`}
                    onChange={(event) =>
                      setItems((current) =>
                        current?.map((link, i) => (i === index ? { ...link, title: event.target.value } : link)) ?? null,
                      )
                    }
                  />
                  <p className="truncate text-xs text-muted">{item.url}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {items.length <= space ? (
              <button
                type="button"
                className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink"
                onClick={() => {
                  onImport(items);
                  onClose();
                }}
              >
                Import {items.length} {items.length === 1 ? "link" : "links"}
              </button>
            ) : space > 0 ? (
              <>
                <button
                  type="button"
                  className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink"
                  onClick={() => {
                    const take = items.slice(0, space);
                    const rest = items.slice(space);
                    onImport(take);
                    setImported(take.length);
                    setLeftover(rest.map(formatLinkLine).join("\n"));
                  }}
                >
                  Proceed to add {space} out of {items.length} links.
                </button>
                <button type="button" className="h-11 rounded-xl px-4 text-sm font-semibold" onClick={onClose}>
                  Cancel adding all {items.length} links.
                </button>
              </>
            ) : (
              <button type="button" className="h-11 rounded-xl px-4 text-sm font-semibold" onClick={onClose}>
                Cancel adding all {items.length} links.
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function BackupModal({
  collections,
  onClose,
}: {
  collections: BoardCollection[];
  onClose: () => void;
}) {
  return (
    <Modal title="Backup" onClose={onClose}>
      <p className="text-sm text-muted">
        Download a copy of every collection. The live board stays on this page for anyone who opens it.
      </p>
      <button
        type="button"
        className="mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink"
        onClick={() => {
          const blob = new Blob([JSON.stringify({ collections }, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "tilecollector-backup.json";
          link.click();
          URL.revokeObjectURL(url);
        }}
      >
        Download backup
      </button>
    </Modal>
  );
}

function PasswordModal({
  passwordIsDefault,
  onClose,
  onUnlock,
}: {
  passwordIsDefault: boolean;
  onClose: () => void;
  onUnlock: (password: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Modal title="Edit mode" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          void checkPassword({ data: { password: value } })
            .then(() => onUnlock(value))
            .catch((err: unknown) => setError(errorText(err, "Incorrect password.")))
            .finally(() => setPending(false));
        }}
      >
        <label className="block text-sm font-medium" htmlFor="edit-password">
          Password
          <input
            id="edit-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            className={fieldClass}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        {passwordIsDefault ? (
          <p className="mt-2 text-sm text-muted">Starting password: edit</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || !value}
          className="mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </Modal>
  );
}

function ChangePasswordModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (next: string) => Promise<void>;
}) {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const mismatch = again.length > 0 && next !== again;
  return (
    <Modal title="Change password" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (next.trim().length < 4 || next !== again) return;
          setPending(true);
          void onSave(next.trim())
            .catch((err: unknown) => setError(errorText(err, "Could not change the password.")))
            .finally(() => setPending(false));
        }}
      >
        <label className="block text-sm font-medium" htmlFor="new-password">
          New password
          <input
            id="new-password"
            type="password"
            autoFocus
            className={fieldClass}
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm font-medium" htmlFor="confirm-password">
          Confirm
          <input
            id="confirm-password"
            type="password"
            className={fieldClass}
            value={again}
            onChange={(event) => setAgain(event.target.value)}
          />
        </label>
        {mismatch ? <p className="mt-2 text-sm text-danger">Those passwords don't match.</p> : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || next.trim().length < 4 || next !== again}
          className="mt-4 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save password"}
        </button>
      </form>
    </Modal>
  );
}
