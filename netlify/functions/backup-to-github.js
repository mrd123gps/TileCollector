import { getStore } from "@netlify/blobs";

const STORE_NAME = "tilecollector-data";
const REPO_OWNER = "mrd123gps";
const REPO_NAME = "TileCollector";
const REPO_BRANCH = "main";
const BACKUP_ROOT = "backups";

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toBase64(str) {
  return Buffer.from(str, "utf-8").toString("base64");
}

async function githubRequest(path, token, options = {}) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "TileCollector-Backup",
      ...(options.headers || {})
    }
  });
  return res;
}

async function getExistingSha(path, token) {
  const res = await githubRequest(`${path}?ref=${REPO_BRANCH}`, token, { method: "GET" });
  if (res.status === 200) {
    const data = await res.json();
    return data.sha;
  }
  if (res.status === 404) {
    return null;
  }
  const errBody = await res.text();
  throw new Error(`GitHub GET ${path} failed (${res.status}): ${errBody}`);
}

async function putFile(path, token, content, commitMessage) {
  const sha = await getExistingSha(path, token);
  const body = {
    message: commitMessage,
    content: toBase64(content),
    branch: REPO_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await githubRequest(path, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (res.status !== 200 && res.status !== 201) {
    const errBody = await res.text();
    throw new Error(`GitHub PUT ${path} failed (${res.status}): ${errBody}`);
  }

  return res.status;
}

export default async () => {
  console.log("[backup-to-github] Invocation started.");

  const token = process.env.GITHUB_BACKUP_TOKEN;
  if (!token) {
    console.error("[backup-to-github] GITHUB_BACKUP_TOKEN is not set.");
    return jsonResponse({ error: "GITHUB_BACKUP_TOKEN is not set in Netlify environment variables." }, 500);
  }
  console.log(`[backup-to-github] Token present, length ${token.length}.`);

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const timestamp = new Date().toISOString();
  const backedUp = [];
  const failed = [];

  try {
    const indexData = await store.get("index", { type: "json" });
    if (!indexData || !Array.isArray(indexData.collections)) {
      console.error("[backup-to-github] index.json missing or malformed in Blobs store.");
      return jsonResponse({ error: "Could not read 'index' from Blobs, or it has no collections list." }, 500);
    }
    console.log(`[backup-to-github] Found ${indexData.collections.length} collections in index.`);

    try {
      const status = await putFile(
        `${BACKUP_ROOT}/index.json`,
        token,
        JSON.stringify(indexData, null, 2),
        `Backup index.json — ${timestamp}`
      );
      console.log(`[backup-to-github] index.json written, GitHub status ${status}.`);
      backedUp.push("index");
    } catch (err) {
      console.error(`[backup-to-github] index.json FAILED: ${err.message}`);
      failed.push({ id: "index", error: err.message });
    }

    for (const entry of indexData.collections) {
      const id = entry.id;
      try {
        const collectionData = await store.get(id, { type: "json" });
        if (collectionData === null) {
          console.error(`[backup-to-github] Collection "${id}" not found in Blobs.`);
          failed.push({ id, error: "Not found in Blobs store." });
          continue;
        }
        const status = await putFile(
          `${BACKUP_ROOT}/collections/${id}.json`,
          token,
          JSON.stringify(collectionData, null, 2),
          `Backup collection "${id}" — ${timestamp}`
        );
        console.log(`[backup-to-github] Collection "${id}" written, GitHub status ${status}.`);
        backedUp.push(id);
      } catch (err) {
        console.error(`[backup-to-github] Collection "${id}" FAILED: ${err.message}`);
        failed.push({ id, error: err.message });
      }
    }

    const allSucceeded = failed.length === 0;
    console.log(`[backup-to-github] Done. Succeeded: ${backedUp.length}, Failed: ${failed.length}.`);
    return jsonResponse(
      {
        ok: allSucceeded,
        timestamp,
        backedUp,
        failed
      },
      allSucceeded ? 200 : 207
    );
  } catch (err) {
    console.error(`[backup-to-github] Unhandled error: ${err.message}`);
    return jsonResponse({ error: err.message }, 500);
  }
};

export const config = {
  path: "/api/backup-to-github"
};
