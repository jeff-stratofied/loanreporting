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

  // Fees
  PLATFORM_CONFIG.fees = cfg.fees ?? PLATFORM_CONFIG.fees;

  // Users (support object OR array)
  PLATFORM_CONFIG.users = {};

  if (Array.isArray(cfg.users)) {
    // legacy / older format
    cfg.users.forEach(u => {
      PLATFORM_CONFIG.users[u.id] = {
        id: u.id,
        name: u.name,
        role: u.role,
        feePolicy: u.feePolicy ?? u.feeWaiver ?? "none",
        active: u.active !== false
      };
    });
  } else if (cfg.users && typeof cfg.users === "object") {
    Object.entries(cfg.users).forEach(([id, u]) => {
      PLATFORM_CONFIG.users[id] = {
        id,
        name: u.name,
        role: u.role,
        feePolicy: u.feePolicy ?? "none",
        active: u.active !== false
      };
    });
  }

  return PLATFORM_CONFIG;
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


