import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { f as seedCollections, g as uniqueId, h as titleTaken, l as normalizeTiles, n as MAIN_ID, p as sha256Hex, r as blankTiles, t as DEFAULT_PASSWORD_HASH } from "./tile-model-TplQeob9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/board-api-DAEjI6iu.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var _0002_collections_default = "create table if not exists collections (\n  id text primary key,\n  title text not null,\n  hidden boolean not null default false,\n  tiles jsonb not null,\n  updated_at timestamptz not null default now()\n);\n\ncreate table if not exists board_settings (\n  id integer primary key,\n  password_hash text not null\n);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_collections.sql": _0002_collections_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
function toIso(value) {
	if (value instanceof Date) return value.toISOString();
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? (/* @__PURE__ */ new Date()).toISOString() : parsed.toISOString();
}
function mapRow(row) {
	return {
		id: row.id,
		title: row.title,
		hidden: Boolean(row.hidden),
		updatedAt: toIso(row.updated_at),
		tiles: normalizeTiles(row.tiles)
	};
}
async function passwordHash() {
	return (await (await getSql())`
    select password_hash from board_settings where id = 1
  `)[0]?.password_hash || "262121c5372be8af3ae6ff0d3d138d9e6e1249335222c7f0e02535e35073bb0b";
}
async function assertPassword(password) {
	if (typeof password !== "string" || password.length < 1 || password.length > 80) throw new Error("Incorrect password.");
	if (await sha256Hex(password) !== await passwordHash()) throw new Error("Incorrect password.");
}
async function ensureSeed() {
	const sql = await getSql();
	await sql`
    insert into board_settings (id, password_hash)
    values (1, ${DEFAULT_PASSWORD_HASH})
    on conflict (id) do nothing
  `;
	const counts = await sql`select count(*)::int as n from collections`;
	if (Number(counts[0]?.n ?? 0) > 0) return;
	for (const collection of seedCollections()) await sql`
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
async function readAll() {
	return (await (await getSql())`
    select id, title, hidden, tiles, updated_at
    from collections
    order by title asc
  `).map(mapRow);
}
function requirePassword(input) {
	if (!input || typeof input !== "object" || !("password" in input)) throw new Error("Incorrect password.");
	const password = input.password;
	if (typeof password !== "string") throw new Error("Incorrect password.");
	return password;
}
var getBoard_createServerFn_handler = createServerRpc({
	id: "6145101ff080815fc76ad34e4ba8ee7b440fe166c015b1bbc3c9e18de6cadf85",
	name: "getBoard",
	filename: "src/lib/board-api.ts"
}, (opts) => getBoard.__executeServer(opts));
var getBoard = createServerFn({ method: "GET" }).handler(getBoard_createServerFn_handler, async () => {
	await ensureSeed();
	const [collections, hash] = await Promise.all([readAll(), passwordHash()]);
	return {
		collections,
		passwordIsDefault: hash === DEFAULT_PASSWORD_HASH
	};
});
var checkPassword_createServerFn_handler = createServerRpc({
	id: "eb7bba3a13864ae141d2d81a69d52f739e8a946f5a621c54d45965560c977fe5",
	name: "checkPassword",
	filename: "src/lib/board-api.ts"
}, (opts) => checkPassword.__executeServer(opts));
var checkPassword = createServerFn({ method: "POST" }).validator((input) => {
	return { password: requirePassword(input) };
}).handler(checkPassword_createServerFn_handler, async ({ data }) => {
	await assertPassword(data.password);
	return { ok: true };
});
var changePassword_createServerFn_handler = createServerRpc({
	id: "f6cb693069507ba3b48d82c4f0e2a92331c87f025f30faa592b11cc45308e566",
	name: "changePassword",
	filename: "src/lib/board-api.ts"
}, (opts) => changePassword.__executeServer(opts));
var changePassword = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Enter a new password.");
	const raw = input;
	if (typeof raw.password !== "string" || typeof raw.next !== "string") throw new Error("Enter a new password.");
	const next = raw.next.trim();
	if (next.length < 4 || next.length > 80) throw new Error("Use at least 4 characters.");
	return {
		password: raw.password,
		next
	};
}).handler(changePassword_createServerFn_handler, async ({ data }) => {
	await assertPassword(data.password);
	await (await getSql())`
      insert into board_settings (id, password_hash)
      values (1, ${await sha256Hex(data.next)})
      on conflict (id) do update set password_hash = excluded.password_hash
    `;
	return { ok: true };
});
var saveCollection_createServerFn_handler = createServerRpc({
	id: "f9e410f8aa474454bac67a1d1c2648db0b9ae3aabba20ee8e4458401ee1b8f87",
	name: "saveCollection",
	filename: "src/lib/board-api.ts"
}, (opts) => saveCollection.__executeServer(opts));
var saveCollection = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Could not save.");
	const raw = input;
	if (typeof raw.id !== "string" || !/^[a-z0-9-]{1,48}$/.test(raw.id)) throw new Error("Could not save.");
	if (typeof raw.password !== "string") throw new Error("Incorrect password.");
	const tiles = normalizeTiles(raw.tiles).map((tile) => tile.linkedCollectionId === raw.id ? {
		...tile,
		linkedCollectionId: null
	} : tile);
	return {
		id: raw.id,
		tiles,
		password: raw.password
	};
}).handler(saveCollection_createServerFn_handler, async ({ data }) => {
	await assertPassword(data.password);
	const updated = await (await getSql())`
      update collections
      set tiles = ${JSON.stringify(data.tiles)}::jsonb,
          updated_at = now()
      where id = ${data.id}
      returning updated_at
    `;
	if (!updated[0]) throw new Error("That collection is gone.");
	return { updatedAt: toIso(updated[0].updated_at) };
});
var createCollection_createServerFn_handler = createServerRpc({
	id: "b46b9f1a8b6de15a5c702451f8692ed915ed6f465e5d2ba4ab2df2f99aca95f2",
	name: "createCollection",
	filename: "src/lib/board-api.ts"
}, (opts) => createCollection.__executeServer(opts));
var createCollection = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Enter a name.");
	const raw = input;
	if (typeof raw.password !== "string") throw new Error("Incorrect password.");
	if (typeof raw.title !== "string") throw new Error("Enter a name.");
	const title = raw.title.trim().slice(0, 60);
	if (!title) throw new Error("Enter a name.");
	return {
		title,
		hidden: Boolean(raw.hidden),
		password: raw.password
	};
}).handler(createCollection_createServerFn_handler, async ({ data }) => {
	await assertPassword(data.password);
	const existing = await readAll();
	if (titleTaken(existing, data.title)) throw new Error("A collection with that name already exists.");
	const id = uniqueId(data.title, existing.map((c) => c.id).concat(MAIN_ID, "index"));
	const tiles = blankTiles();
	return mapRow((await (await getSql())`
      insert into collections (id, title, hidden, tiles, updated_at)
      values (${id}, ${data.title}, ${data.hidden}, ${JSON.stringify(tiles)}::jsonb, now())
      returning id, title, hidden, tiles, updated_at
    `)[0]);
});
var renameCollection_createServerFn_handler = createServerRpc({
	id: "7759f45c707c87fc57db3a8e7456809474276c637def2a440262ca4ca5dad7f9",
	name: "renameCollection",
	filename: "src/lib/board-api.ts"
}, (opts) => renameCollection.__executeServer(opts));
var renameCollection = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Enter a name.");
	const raw = input;
	if (typeof raw.password !== "string") throw new Error("Incorrect password.");
	if (typeof raw.id !== "string" || raw.id === "main") throw new Error("Main cannot be renamed.");
	if (typeof raw.title !== "string") throw new Error("Enter a name.");
	const title = raw.title.trim().slice(0, 60);
	if (!title) throw new Error("Enter a name.");
	return {
		id: raw.id,
		title,
		hidden: Boolean(raw.hidden),
		password: raw.password
	};
}).handler(renameCollection_createServerFn_handler, async ({ data }) => {
	await assertPassword(data.password);
	const all = await readAll();
	const current = all.find((c) => c.id === data.id);
	if (!current) throw new Error("That collection is gone.");
	if (titleTaken(all, data.title, data.id)) throw new Error("A collection with that name already exists.");
	const changed = [];
	const sql = await getSql();
	const renamedTiles = current.tiles;
	const renamed = await sql`
      update collections
      set title = ${data.title},
          hidden = ${data.hidden},
          updated_at = now()
      where id = ${data.id}
      returning id, title, hidden, tiles, updated_at
    `;
	changed.push(mapRow({
		...renamed[0],
		tiles: renamedTiles
	}));
	for (const collection of all) {
		if (collection.id === data.id) continue;
		let touched = false;
		const tiles = collection.tiles.map((tile) => {
			if (tile.linkedCollectionId === data.id && tile.title === current.title) {
				touched = true;
				return {
					...tile,
					title: data.title
				};
			}
			return tile;
		});
		if (!touched) continue;
		const rows = await sql`
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
var deleteCollection_createServerFn_handler = createServerRpc({
	id: "3f5f4a5c73bde1ae6953463b949d4c8036b6a329a3c9181a80337c72508eaed1",
	name: "deleteCollection",
	filename: "src/lib/board-api.ts"
}, (opts) => deleteCollection.__executeServer(opts));
var deleteCollection = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Could not delete.");
	const raw = input;
	if (typeof raw.password !== "string") throw new Error("Incorrect password.");
	if (typeof raw.id !== "string" || raw.id === "main") throw new Error("Main cannot be deleted.");
	return {
		id: raw.id,
		password: raw.password
	};
}).handler(deleteCollection_createServerFn_handler, async ({ data }) => {
	await assertPassword(data.password);
	await (await getSql())`delete from collections where id = ${data.id} and id <> ${MAIN_ID}`;
	return { ok: true };
});
//#endregion
export { changePassword_createServerFn_handler, checkPassword_createServerFn_handler, createCollection_createServerFn_handler, deleteCollection_createServerFn_handler, getBoard_createServerFn_handler, renameCollection_createServerFn_handler, saveCollection_createServerFn_handler };
