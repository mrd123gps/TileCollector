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
}

export default async () => {
  const token = process.env.GITHUB_BACKUP_TOKEN;
  if (!token) {
    return jsonResponse({ error: "GITHUB_BACKUP_TOKEN is not set in Netlify environment variables." }, 500);
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const timestamp = new Date().toISOString();
  const backedUp = [];
  const failed = [];

  try {
    const indexData = await store.get("index", { type: "json" });
    if (!indexData || !Array.isArray(indexData.collections)) {
      return jsonResponse({ error: "Could not read 'index' from Blobs, or it has no collections list." }, 500);
    }

    try {
      await putFile(
        `${BACKUP_ROOT}/index.json`,
        token,
        JSON.stringify(indexData, null, 2),
        `Backup index.json — ${timestamp}`
      );
      backedUp.push("index");
    } catch (err) {
      failed.push({ id: "index", error: err.message });
    }

    for (const entry of indexData.collections) {
      const id = entry.id;
      try {
        const collectionData = await store.get(id, { type: "json" });
        if (collectionData === null) {
          failed.push({ id, error: "Not found in Blobs store." });
          continue;
        }
        await putFile(
          `${BACKUP_ROOT}/collections/${id}.json`,
          token,
          JSON.stringify(collectionData, null, 2),
          `Backup collection "${id}" — ${timestamp}`
        );
        backedUp.push(id);
      } catch (err) {
        failed.push({ id, error: err.message });
      }
    }

    const allSucceeded = failed.length === 0;
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
    return jsonResponse({ error: err.message }, 500);
  }
};

export const config = {
  path: "/api/backup-to-github"
};
