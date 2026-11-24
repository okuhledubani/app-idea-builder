import type { Service, ServiceId } from "./types";

export const SALON = "Glow Beauty Lounge";
export const SLOGAN = "Your glow, always on time.";
export const CHAT_CLIENT_NAME = "You (chat client)";

export const OPEN = 9 * 60; // 09:00
export const CLOSE = 17 * 60; // 17:00
export const STEP = 30;
export const DAYS_SHOWN = 6;
export const POLICY_HOURS = 24;

export const SERVICES: Service[] = [
  {
    id: "makeup",
    name: "Makeup",
    duration: 90,
    deposit: 200,
    specialist: "Thandi",
    keywords: ["makeup", "make-up", "make up", "glam"],
    prep: [
      "Arrive with a clean, moisturised face and no makeup.",
      "Bring one or two photos of looks you love.",
      "Let Thandi know if you wear contact lenses.",
    ],
  },
  {
    id: "hair",
    name: "Hair",
    duration: 120,
    deposit: 250,
    specialist: "Lerato",
    keywords: ["hair", "haircut", "blow", "braid", "colour", "color"],
    prep: [
      "Arrive with dry, detangled hair unless Lerato asks otherwise.",
      "Bring photos of the style or colour you have in mind.",
      "Mention any recent relaxers, dyes or treatments.",
    ],
  },
  {
    id: "skin",
    name: "Skin",
    duration: 60,
    deposit: 150,
    specialist: "Naledi",
    keywords: ["skin", "facial", "face treatment", "peel"],
    prep: [
      "Skip retinol and exfoliating products for 48 hours before.",
      "Come makeup-free if you can.",
      "Bring a list of the skincare products you use now.",
    ],
  },
  {
    id: "nails",
    name: "Nails",
    duration: 75,
    deposit: 100,
    specialist: "Zinhle",
    keywords: ["nail", "nails", "manicure", "pedicure", "gel", "acrylic", "mani", "pedi"],
    prep: [
      "Tell us if you have gel or acrylics that need removing.",
      "Skip hand cream on the day so polish bonds well.",
      "Bring screenshots of any nail art you like.",
    ],
  },
  {
    id: "lash",
    name: "Lash & brow",
    duration: 60,
    deposit: 120,
    specialist: "Amara",
    keywords: ["lash", "lashes", "brow", "brows", "eyebrow", "eyelash"],
    prep: [
      "Arrive without eye makeup or mascara.",
      "Wear glasses instead of contact lenses if possible.",
      "Avoid tinting or shaping your brows for two weeks before.",
    ],
  },
];

export function getService(id: ServiceId): Service {
  const s = SERVICES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown service ${id}`);
  return s;
}

export const MAIN_MENU_LABELS = [
  "Book",
  "Reschedule",
  "Cancel",
  "Preview a hairstyle",
  "FAQs",
  "Talk to a person",
] as const;

export const HAIR_STYLES = [
  { id: "bob", label: "Sleek bob" },
  { id: "waves", label: "Soft waves" },
  { id: "braids", label: "Braids" },
  { id: "curls", label: "Curls" },
  { id: "pixie", label: "Pixie" },
] as const;

export type HairStyleId = (typeof HAIR_STYLES)[number]["id"];

// Illustration colours (data for the SVG preview, not UI theme colours).
export const HAIR_COLOURS = [
  { id: "black", label: "Jet black", hex: "#1e1716" },
  { id: "espresso", label: "Espresso", hex: "#4a2e22" },
  { id: "honey", label: "Honey", hex: "#b9814a" },
  { id: "copper", label: "Copper", hex: "#b5532f" },
  { id: "burgundy", label: "Burgundy", hex: "#6e1f35" },
] as const;
