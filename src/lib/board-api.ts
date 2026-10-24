import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import {
  DEFAULT_PASSWORD_HASH,
  MAIN_ID,
  type BoardCollection,
  blankTiles,
  normalizeTiles,
  seedCollections,
  sha256Hex,
  titleTaken,
  uniqueId,
} from "@/lib/tile-model";

interface CollectionRow {
  id: string;
  title: string;
  hidden: boolean;
  tiles: unknown;
  updated_at: string | Date;
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapRow(row: CollectionRow): BoardCollection {
  return {
    id: row.id,
    title: row.title,
    hidden: Boolean(row.hidden),
    updatedAt: toIso(row.updated_at),
    tiles: normalizeTiles(row.tiles),
  };
}

async function passwordHash(): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ password_hash: string }>`
    select password_hash from board_settings where id = 1
  `;
  return rows[0]?.password_hash || DEFAULT_PASSWORD_HASH;
}

async function assertPassword(password: string) {
  if (typeof password !== "string" || password.length < 1 || password.length > 80) {
    throw new Error("Incorrect password.");
  }
  const hash = await sha256Hex(password);
  const expected = await passwordHash();
  if (hash !== expected) throw new Error("Incorrect password.");
}

async function ensureSeed() {
  const sql = await getSql();
  await sql`
    insert into board_settings (id, password_hash)
    values (1, ${DEFAULT_PASSWORD_HASH})
    on conflict (id) do nothing
  `;
  const counts = await sql<{ n: number }>`select count(*)::int as n from collections`;
  if (Number(counts[0]?.n ?? 0) > 0) return;
  for (const collection of seedCollections()) {
    await sql`
      insert into collections (id, title, hidden, tiles, updated_at)
      values (
        ${collection.id},
        ${collection.title},
        ${collection.hidden},
        ${JSON.stringify(collection.tiles)}::jsonb,
        ${collection.updatedAt}
      )
      on conflict (id) do nothing
    `;
  }
}

async function readAll(): Promise<BoardCollection[]> {
  const sql = await getSql();
  const rows = await sql<CollectionRow>`
    select id, title, hidden, tiles, updated_at
    from collections
    order by title asc
  `;
  return rows.map(mapRow);
}

function requirePassword(input: unknown): string {
  if (!input || typeof input !== "object" || !("password" in input)) {
    throw new Error("Incorrect password.");
  }
  const password = (input as { password?: unknown }).password;
  if (typeof password !== "string") throw new Error("Incorrect password.");
  return password;
}

export const getBoard = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeed();
  const [collections, hash] = await Promise.all([readAll(), passwordHash()]);
  return {
    collections,
    passwordIsDefault: hash === DEFAULT_PASSWORD_HASH,
  };
});

export const checkPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const password = requirePassword(input);
    return { password };
  })
  .handler(async ({ data }) => {
    await assertPassword(data.password);
    return { ok: true as const };
  });

export const changePassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Enter a new password.");
    const raw = input as { password?: unknown; next?: unknown };
    if (typeof raw.password !== "string" || typeof raw.next !== "string") {
      throw new Error("Enter a new password.");
    }
    const next = raw.next.trim();
    if (next.length < 4 || next.length > 80) {
      throw new Error("Use at least 4 characters.");
    }
    return { password: raw.password, next };
  })
  .handler(async ({ data }) => {
    await assertPassword(data.password);
    const sql = await getSql();
    const hash = await sha256Hex(data.next);
    await sql`
      insert into board_settings (id, password_hash)
      values (1, ${hash})
      on conflict (id) do update set password_hash = excluded.password_hash
    `;
    return { ok: true as const };
  });

export const saveCollection = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Could not save.");
    const raw = input as { id?: unknown; tiles?: unknown; password?: unknown };
    if (typeof raw.id !== "string" || !/^[a-z0-9-]{1,48}$/.test(raw.id)) {
      throw new Error("Could not save.");
    }
    if (typeof raw.password !== "string") throw new Error("Incorrect password.");
    const tiles = normalizeTiles(raw.tiles).map((tile) =>
      tile.linkedCollectionId === raw.id ? { ...tile, linkedCollectionId: null } : tile,
    );
    return { id: raw.id, tiles, password: raw.password };
  })
  .handler(async ({ data }) => {
    await assertPassword(data.password);
    const sql = await getSql();
    const updated = await sql<{ updated_at: string | Date }>`
      update collections
      set tiles = ${JSON.stringify(data.tiles)}::jsonb,
          updated_at = now()
      where id = ${data.id}
      returning updated_at
    `;
    if (!updated[0]) throw new Error("That collection is gone.");
    return { updatedAt: toIso(updated[0].updated_at) };
  });

export const createCollection = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Enter a name.");
    const raw = input as { title?: unknown; hidden?: unknown; password?: unknown };
    if (typeof raw.password !== "string") throw new Error("Incorrect password.");
    if (typeof raw.title !== "string") throw new Error("Enter a name.");
    const title = raw.title.trim().slice(0, 60);
    if (!title) throw new Error("Enter a name.");
    return { title, hidden: Boolean(raw.hidden), password: raw.password };
  })
  .handler(async ({ data }) => {
    await assertPassword(data.password);
    const existing = await readAll();
    if (titleTaken(existing, data.title)) {
      throw new Error("A collection with that name already exists.");
    }
    const id = uniqueId(data.title, existing.map((c) => c.id).concat(MAIN_ID, "index"));
    const tiles = blankTiles();
    const sql = await getSql();
    const rows = await sql<CollectionRow>`
      insert into collections (id, title, hidden, tiles, updated_at)
      values (${id}, ${data.title}, ${data.hidden}, ${JSON.stringify(tiles)}::jsonb, now())
      returning id, title, hidden, tiles, updated_at
    `;
    return mapRow(rows[0]);
  });

export const renameCollection = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Enter a name.");
    const raw = input as { id?: unknown; title?: unknown; hidden?: unknown; password?: unknown };
    if (typeof raw.password !== "string") throw new Error("Incorrect password.");
    if (typeof raw.id !== "string" || raw.id === MAIN_ID) throw new Error("Main cannot be renamed.");
    if (typeof raw.title !== "string") throw new Error("Enter a name.");
    const title = raw.title.trim().slice(0, 60);
    if (!title) throw new Error("Enter a name.");
    return { id: raw.id, title, hidden: Boolean(raw.hidden), password: raw.password };
  })
  .handler(async ({ data }) => {
    await assertPassword(data.password);
    const all = await readAll();
    const current = all.find((c) => c.id === data.id);
    if (!current) throw new Error("That collection is gone.");
    if (titleTaken(all, data.title, data.id)) {
      throw new Error("A collection with that name already exists.");
    }
    const changed: BoardCollection[] = [];
    const sql = await getSql();
    const renamedTiles = current.tiles;
    const renamed = await sql<CollectionRow>`
      update collections
      set title = ${data.title},
          hidden = ${data.hidden},
          updated_at = now()
      where id = ${data.id}
      returning id, title, hidden, tiles, updated_at
    `;
    changed.push(mapRow({ ...renamed[0], tiles: renamedTiles }));
    for (const collection of all) {
      if (collection.id === data.id) continue;
      let touched = false;
      const tiles = collection.tiles.map((tile) => {
        if (tile.linkedCollectionId === data.id && tile.title === current.title) {
          touched = true;
          return { ...tile, title: data.title };
        }
        return tile;
      });
      if (!touched) continue;
      const rows = await sql<CollectionRow>`
        update collections
        set tiles = ${JSON.stringify(tiles)}::jsonb,
            updated_at = now()
        where id = ${collection.id}
        returning id, title, hidden, tiles, updated_at
      `;
      if (rows[0]) changed.push(mapRow(rows[0]));
    }
    return { collections: changed };
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Could not delete.");
    const raw = input as { id?: unknown; password?: unknown };
    if (typeof raw.password !== "string") throw new Error("Incorrect password.");
    if (typeof raw.id !== "string" || raw.id === MAIN_ID) throw new Error("Main cannot be deleted.");
    return { id: raw.id, password: raw.password };
  })
  .handler(async ({ data }) => {
    await assertPassword(data.password);
    const sql = await getSql();
    await sql`delete from collections where id = ${data.id} and id <> ${MAIN_ID}`;
    return { ok: true as const };
  });

