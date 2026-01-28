// Rumus Backend: Level = Math.floor(Math.sqrt(xp / 100)) + 1
// Maka: XP = ((Level - 1) ^ 2) * 100

export const getLevelInfo = (currentXp: number) => {
  const currentLevel = Math.floor(Math.sqrt(currentXp / 100)) + 1;
  
  // XP yang dibutuhkan untuk mencapai level saat ini
  const currentLevelBaseXp = Math.pow(currentLevel - 1, 2) * 100;
  
  // XP yang dibutuhkan untuk mencapai level berikutnya
  const nextLevelBaseXp = Math.pow(currentLevel, 2) * 100;
  
  // XP yang dibutuhkan user dari posisi sekarang ke level berikutnya
  const xpToNextLevel = nextLevelBaseXp - currentXp;
  
  // Total jarak XP antara level ini dan level depan
  const range = nextLevelBaseXp - currentLevelBaseXp;
  
  // Progress user di level ini (0 - 100)
  const progressPercent = Math.min(100, Math.max(0, ((currentXp - currentLevelBaseXp) / range) * 100));

  return {
    level: currentLevel,
    badge: getBadgeName(currentLevel),
    currentXp,
    nextLevelXp: nextLevelBaseXp,
    progress: progressPercent,
    xpNeeded: xpToNextLevel
  };
};

export const getBadgeName = (level: number): string => {
  if (level >= 50) return "Global Elite";
  if (level >= 40) return "Market Maker";
  if (level >= 30) return "Whale";
  if (level >= 20) return "Shark";
  if (level >= 10) return "Dolphin";
  if (level >= 5) return "Trader";
  return "Plankton";
};

export const getBadgeColor = (level: number): string => {
  if (level >= 50) return "text-[#FCD535] drop-shadow-[0_0_5px_rgba(252,213,53,0.8)]"; // Gold Glowing
  if (level >= 30) return "text-[#0ECB81]"; // Green
  if (level >= 10) return "text-[#3b82f6]"; // Blue
  return "text-[#848E9C]"; // Gray
};