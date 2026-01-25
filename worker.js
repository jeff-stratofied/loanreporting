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
async function handleFetch(request) {
  try {
    const url = new URL(request.url);

    // =====================================================
    // PLATFORM CONFIG API (GitHub-backed, like loans)
    // =====================================================
    if (url.pathname === "/platformConfig") {

      // GET platform config
      if (request.method === "GET") {
        const res = await fetch(
          "https://raw.githubusercontent.com/jeff-stratofied/loanreporting/main/data/platformConfig.json",
          { cache: "no-store" }
        );

        if (!res.ok) {
          return new Response(
            "Failed to load platform config",
            { status: 500 }
          );
        }

        return new Response(await res.text(), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // POST platform config (ADMIN SAVE)
      if (request.method === "POST") {
        const body = await request.json();

        // Reuse the SAME GitHub commit helper as loans
        return await saveJsonToGitHub({
          path: "data/platformConfig.json",
          content: JSON.stringify(body, null, 2),
          message: "Update platform config"
        });
      }

      return new Response("Method not allowed", { status: 405 });
    }

    // =====================================================
    // DEFAULT: LOANS API (unchanged)
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
