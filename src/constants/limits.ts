// src/constants/limits.ts
// Safety limits untuk beta phase

export const BETA_LIMITS = {
  // Arena Reward Limits
  MAX_REWARD_PER_ARENA: 2, // SOL - Conservative start
  MIN_REWARD_AMOUNT: 0.01, // SOL - Avoid dust
  
  // Platform Capacity Limits
  MAX_CONCURRENT_ARENAS: 10, // Total active arenas at once
  MAX_TOTAL_TVL: 30, // SOL - Total escrowed across all arenas
  
  // Time Constraints
  MIN_ARENA_DURATION_HOURS: 24, // Minimum 1 day
  MAX_ARENA_DURATION_DAYS: 30, // Maximum 1 month
  
  // Entry Fee Limits
  MAX_ENTRY_FEE: 1, // SOL per participant
  
  // Feature Flags
  BETA_MODE: true, // Set false when ready for full launch
  REQUIRE_CONSENT: true, // User must acknowledge risks
  
  // Warning Thresholds
  WARNING_TVL_THRESHOLD: 20, // Show warning when TVL exceeds this
  WARNING_CONCURRENT_THRESHOLD: 7, // Show warning when active arenas exceed this
} as const;

// Phase-based limits (untuk scale gradually)
export const PHASE_LIMITS = {
  PHASE_1: { // Week 1-4
    MAX_REWARD_PER_ARENA: 2,
    MAX_CONCURRENT_ARENAS: 10,
    MAX_TOTAL_TVL: 30,
  },
  PHASE_2: { // Month 2-3
    MAX_REWARD_PER_ARENA: 5,
    MAX_CONCURRENT_ARENAS: 20,
    MAX_TOTAL_TVL: 100,
  },
  PHASE_3: { // Month 4+
    MAX_REWARD_PER_ARENA: 10,
    MAX_CONCURRENT_ARENAS: 50,
    MAX_TOTAL_TVL: 500,
  }
} as const;