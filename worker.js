const workerRequest = (...args) => globalThis.fetch(...args);

/**
 * Load loans from GitHub
 */
async function loadLoans() {
  const url =
    "https://raw.githubusercontent.com/jeff-stratofied/loanreporting/main/data/loans.json";

  const res = await workerRequest(url);
  if (!res.ok) {
    throw new Error(
      `GitHub fetch failed: ${res.status} ${res.statusText}`
    );
  }

  const raw = await res.json();

  return (raw.loans || raw).map(l => ({
    id: l.loanId ?? l.id,
    name: l.loanName ?? l.name,
    school: l.school,
    purchaseDate: l.purchaseDate,
    loanStartDate: l.loanStartDate,
    purchasePrice: Number(l.principal ?? l.purchasePrice),
    nominalRate: Number(l.rate ?? l.nominalRate),
    termYears: Number(l.termYears),
    graceYears: Number(l.graceYears)
  }));
}

/**
 * Main fetch handler
 */
async function handleFetch(request, env) {
  try {
    const url = new URL(request.url);

    // =====================================================
    // PLATFORM CONFIG API
    // =====================================================
    if (url.pathname === "/config") {
      // GET config
      if (request.method === "GET") {
        const data = await env.CONFIG_KV.get("platformConfig");
        return new Response(data || "{}", {
          headers: { "Content-Type": "application/json" }
        });
      }

      // POST config
      if (request.method === "POST") {
        const body = await request.json();
        await env.CONFIG_KV.put(
          "platformConfig",
          JSON.stringify(body)
        );

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Method not allowed", { status: 405 });
    }

    // =====================================================
    // DEFAULT: LOANS API
    // =====================================================
    const loans = await loadLoans();
    return Response.json(loans);

  } catch (err) {
    return new Response(
      "Worker error: " + err.message,
      { status: 500 }
    );
  }
}

export default { fetch: handleFetch };
