import { SERVICES } from "./data";
import type { FaqTopic, ServiceId } from "./types";

export type Intent =
  | { k: "escalate"; reason: string }
  | { k: "late" }
  | { k: "reschedule" }
  | { k: "cancel" }
  | { k: "book"; serviceId?: ServiceId }
  | { k: "preview" }
  | { k: "faqTopic"; topic: FaqTopic }
  | { k: "faq" }
  | { k: "greet" }
  | { k: "unknown" };

const ESCALATIONS: [RegExp, string][] = [
  [/allerg|allergic|reaction|rash/, "Allergy"],
  [/bridal|bride|wedding|bridesmaid/, "Bridal party"],
  [/group|party of|for \d+ (people|of us|ladies)|all of us/, "Group booking"],
  [/refund|money back/, "Refund request"],
  [/complain|complaint|unhappy|disappointed|terrible|rude|bad experience|not happy/, "Complaint"],
  [/medical|pregnan|medication|doctor|eczema|psoriasis|condition|chemo/, "Medical question"],
  [
    /\b(a person|real person|human|someone|somebody|manager|staff member|agent)\b|talk to|speak to|speak with|call me/,
    "Asked for a person",
  ],
];

export function detectService(text: string): ServiceId | undefined {
  const t = text.toLowerCase();
  // Check "lash"/"brow" before "hair" etc. by scanning in a fixed order.
  for (const s of SERVICES) {
    if (s.keywords.some((k) => new RegExp(`\\b${k}`).test(t))) return s.id;
  }
  return undefined;
}

export function parseIntent(raw: string): Intent {
  const t = raw.toLowerCase().trim();
  if (!t) return { k: "unknown" };

  for (const [re, reason] of ESCALATIONS) {
    if (re.test(t)) return { k: "escalate", reason };
  }
  if (/\blate\b|running behind|stuck in traffic|delayed/.test(t)) return { k: "late" };
  if (/polic/.test(t)) return { k: "faqTopic", topic: "policy" };
  if (/reschedul|move my|change my (booking|appointment|time)|different time|another time/.test(t))
    return { k: "reschedule" };
  if (/cancel/.test(t)) return { k: "cancel" };
  if (/\bbook|appointment|reserve|slot\b|make a booking/.test(t)) {
    const serviceId = detectService(t);
    return serviceId ? { k: "book", serviceId } : { k: "book" };
  }
  if (/preview|hairstyle|hair style|try on|what would .* look/.test(t)) return { k: "preview" };
  if (/hour|open|clos|what time|when are you|sunday|saturday/.test(t))
    return { k: "faqTopic", topic: "hours" };
  if (/deposit|pay|price|cost|how much|fee/.test(t)) return { k: "faqTopic", topic: "deposits" };
  if (/prep|prepare|before my|what should i bring|get ready/.test(t))
    return { k: "faqTopic", topic: "prep" };
  if (/service|what do you (offer|do)|treatments|how long/.test(t))
    return { k: "faqTopic", topic: "services" };
  if (/\bfaq|question|help\b|info/.test(t)) return { k: "faq" };
  const serviceId = detectService(t);
  if (serviceId) return { k: "book", serviceId };
  if (/^(hi|hey|hello|hallo|sawubona|molo|morning|good (morning|afternoon|evening)|menu|start|yo)\b/.test(t))
    return { k: "greet" };
  return { k: "unknown" };
}
