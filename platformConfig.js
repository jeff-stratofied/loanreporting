// ===================================================
// Platform Config (single source of truth)
// ===================================================

export let PLATFORM_CONFIG = {
  fees: {
    setupFee: 150,
    monthlyServicingBps: 25
  },
  users: {}
};

// ----------------------------------
// Load platform config from GitHub
// ----------------------------------
export async function loadPlatformConfig(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load platform config: ${res.status}`);
  }

  const cfg = await res.json();

  PLATFORM_CONFIG.fees = cfg.fees ?? PLATFORM_CONFIG.fees;

  // Normalize users into an object keyed by id
  PLATFORM_CONFIG.users = {};
  (cfg.users || []).forEach(u => {
    PLATFORM_CONFIG.users[u.id] = {
      id: u.id,
      name: u.name,
      role: u.role,
      feePolicy: u.feeWaiver ?? "none",
      active: u.active !== false
    };
  });
}


// ----------------------------------
// Save platform config back to GitHub
// (ADMIN ONLY)
// ----------------------------------
// ----------------------------------
// Save platform config (ADMIN ONLY)
// ----------------------------------
export function savePlatformConfig() {
  // Same behavior as loans: commit in-memory state only
  console.log("Platform config saved (in-memory)");
}


