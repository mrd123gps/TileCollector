import { getStore } from "@netlify/blobs";

const STORE_NAME = "tilecollector-data";
const GITHUB_USER = "mrd123gps";
const GITHUB_REPO = "TileCollector";
const GITHUB_BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

async function fetchRawJson(path) {
  const res = await fetch(RAW_BASE + path + `?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not fetch ${path} (${res.status})`);
  return res.json();
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });

  try {
    const indexData = await fetchRawJson("collections/index.json");
    await store.setJSON("index", indexData);

    const seeded = [];
    for (const entry of indexData.collections) {
      const data = await fetchRawJson(entry.file);
      await store.setJSON(entry.id, data);
      seeded.push(entry.id);
    }

    return new Response(JSON.stringify({ ok: true, seeded }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }
};

export const config = {
  path: "/api/seed-from-github"
};
