/**
 * Universal Avatar Gallery & Presets
 * High-definition Dicebear Avataaars with curated seeds for modern executive and developer profiles.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  category: "Executive" | "Developer" | "Creative" | "Specialist";
  url: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // Executive & Leadership
  {
    id: "exec-1",
    name: "Vanguard Lead",
    category: "Executive",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus&accessories[]=eyepatch&hair=shortHairShortFlat&facialHair=beardLight&clothing=blazerAndShirt",
  },
  {
    id: "exec-2",
    name: "Managing Director",
    category: "Executive",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&clothing=blazerAndShirt&eyes=happy&mouth=smile",
  },
  {
    id: "exec-3",
    name: "Agency Principal",
    category: "Executive",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander&hair=shortHairShortWaved&clothing=blazerAndSweater",
  },
  {
    id: "exec-4",
    name: "Operations Director",
    category: "Executive",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&hair=longHairBob&accessories[]=round&clothing=collarAndSweater",
  },

  // Tech & Senior Developers
  {
    id: "dev-1",
    name: "Architect Mustafa",
    category: "Developer",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mustafa&facialHair=beardMedium&clothing=hoodie",
  },
  {
    id: "dev-2",
    name: "Core Engineer Alex",
    category: "Developer",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&accessories[]=round&clothing=hoodie&hair=shortHairShortCurly",
  },
  {
    id: "dev-3",
    name: "Full-Stack Elena",
    category: "Developer",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena&hair=longHairStraight&clothing=collarAndSweater",
  },
  {
    id: "dev-4",
    name: "Systems Hacker Kai",
    category: "Developer",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai&hair=shortHairFrizzle&accessories[]=prescription02&clothing=graphicShirt",
  },
  {
    id: "dev-5",
    name: "Backend Guru Jordan",
    category: "Developer",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&hair=shortHairShortWaved&clothing=hoodie&facialHair=beardLight",
  },
  {
    id: "dev-6",
    name: "Frontend Lead Sophia",
    category: "Developer",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&hair=longHairCurly&clothing=overall",
  },

  // Creative & UI/UX
  {
    id: "cre-1",
    name: "Design Lead Maya",
    category: "Creative",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya&hair=longHairBun&accessories[]=sunglasses&clothing=sweater",
  },
  {
    id: "cre-2",
    name: "Product Designer Liam",
    category: "Creative",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&hair=shortHairDreads01&accessories[]=round&clothing=collarAndSweater",
  },
  {
    id: "cre-3",
    name: "Brand Stylist Chloe",
    category: "Creative",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&hair=longHairBigHair&clothing=graphicShirt",
  },
  {
    id: "cre-4",
    name: "Visual Artist Noah",
    category: "Creative",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah&hair=shortHairSides&clothing=hoodie",
  },

  // Specialists & Zero-Trust Sentinels
  {
    id: "spec-1",
    name: "SecOps Sentinel Zane",
    category: "Specialist",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zane&hair=shortHairShortFlat&accessories[]=prescription01&clothing=blazerAndShirt",
  },
  {
    id: "spec-2",
    name: "QA Specialist Mia",
    category: "Specialist",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&hair=longHairStraight2&clothing=shirtCrewNeck",
  },
  {
    id: "spec-3",
    name: "WordPress Broker Oliver",
    category: "Specialist",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&hair=shortHairTheCaesar&clothing=shirtVNeck&facialHair=beardLight",
  },
  {
    id: "spec-4",
    name: "Client Advocate Harper",
    category: "Specialist",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Harper&hair=longHairBob&clothing=sweater",
  },
];

/**
 * Returns a guaranteed valid avatar URL for any user.
 * Prioritizes user's custom avatarUrl, falls back to deterministic Dicebear seed.
 */
export function getUserAvatarUrl(user?: {
  name?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
  email?: string | null;
} | null): string {
  if (user?.avatarUrl && typeof user.avatarUrl === "string" && user.avatarUrl.trim().length > 0) {
    return user.avatarUrl.trim();
  }
  if (user?.image && typeof user.image === "string" && user.image.trim().length > 0) {
    return user.image.trim();
  }
  const seed = user?.name?.trim() || user?.email?.trim() || "Vanguard";
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}
