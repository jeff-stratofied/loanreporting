// worker.js (update in GitHub, then copy to Cloudflare dashboard)

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://jeff-stratofied.github.io",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function withCORS(res) {
  const headers = new Headers(res.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));
  headers.set("X-Debug-Worker", "platformConfig-v3");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

const workerRequest = (...args) => globalThis.fetch(...args);

const GITHUB_OWNER = "jeff-stratofied";
const GITHUB_REPO = "loanreporting";
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;

// Helper to save JSON to GitHub (commits via Contents API)
async function saveJsonToGitHub({ path, content, message, sha: providedSha }) {
  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`, // From Cloudflare secret
    'User-Agent': 'Cloudflare Worker',
    'Content-Type': 'application/json'
  };

  // Fetch current SHA if not provided (for config; loans provide it)
  let currentSha = providedSha;
  if (!currentSha) {
    const getRes = await workerRequest(`${GITHUB_API_BASE}/${path}`, { headers });
    if (!getRes.ok) {
      throw new Error(`Failed to get current file: ${getRes.status}`);
    }
    const getData = await getRes.json();
    currentSha = getData.sha;
  }

  const body = {
    message,
    content: btoa(content), // Base64 encode
    sha: currentSha // For optimistic locking (fails if mismatch)
  };

  const putRes = await workerRequest(`${GITHUB_API_BASE}/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub save failed: ${putRes.status} - ${errText}`);
  }

  const putData = await putRes.json();
  return new Response(JSON.stringify({ sha: putData.content.sha }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// Load from GitHub API (gets content + SHA)
async function loadFromGitHub(path) {
  const res = await workerRequest(`${GITHUB_API_BASE}/${path}`, {
    headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`GitHub fetch failed: ${res.status}`);
  }
  const data = await res.json();
  const content = JSON.parse(atob(data.content));
  return { content, sha: data.sha };
}

async function handleFetch(request, env) { // Add env param if needed for secrets (Cloudflare auto-injects)
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(request.url);

    if (url.pathname === "/loans") {
      if (request.method === "GET") {
        const { content, sha } = await loadFromGitHub("data/loans.json");
        return withCORS(Response.json({ loans: content.loans || content, sha }));
      }

      if (request.method === "POST") {
        const body = await request.json();
        const content = JSON.stringify({ loans: body.loans }, null, 2);
        return withCORS(await saveJsonToGitHub({
          path: "data/loans.json",
          content,
          message: "Update loans",
          sha: body.sha // Client provides for locking
        }));
      }

      return withCORS(new Response("Method not allowed", { status: 405 }));
    }

    if (url.pathname === "/platformConfig") {
      if (request.method === "GET") {
        const { content, sha } = await loadFromGitHub("data/platformConfig.json");
        return withCORS(Response.json({ ...content, sha })); // Return SHA for future use
      }

      if (request.method === "POST") {
        const body = await request.json();
        const content = JSON.stringify(body, null, 2);
        return withCORS(await saveJsonToGitHub({
          path: "data/platformConfig.json",
          content,
          message: "Update platform config"
          // No sha provided; function fetches current
        }));
      }

      return withCORS(new Response("Method not allowed", { status: 405 }));
    }

    return withCORS(new Response("Not found", { status: 404 }));
  } catch (err) {
    return withCORS(new Response("Worker error: " + err.message, { status: 500 }));
  }
}

export default { fetch: (request, env) => handleFetch(request, env) }; // Env for secrets
