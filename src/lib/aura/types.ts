export type ServiceId = "makeup" | "hair" | "skin" | "nails" | "lash";

export interface Service {
  id: ServiceId;
  name: string;
  duration: number; // minutes
  deposit: number; // rand
  specialist: string;
  keywords: string[];
  prep: string[];
}

export type BookingSource = "example" | "chat" | "refill";

export interface Booking {
  id: string;
  ref: string;
  serviceId: ServiceId;
  dayKey: string; // yyyy-MM-dd (local)
  start: number; // minutes from midnight
  clientName: string;
  isChatClient: boolean;
  source: BookingSource;
  status: "confirmed" | "cancelled";
  depositPaid: number;
  depositOutcome?: "refunded" | "kept";
  createdAt: number;
}

export interface WaitlistEntry {
  id: string;
  clientName: string;
  serviceId: ServiceId;
  dayKey: string | null; // null = any day
  isChatClient: boolean;
  status: "waiting" | "offered" | "booked" | "declined";
  joinedAt: number;
}

export interface Offer {
  id: string;
  waitlistId: string;
  clientName: string;
  isChatClient: boolean;
  serviceId: ServiceId;
  dayKey: string;
  start: number;
  status: "pending" | "accepted" | "declined" | "taken";
  sentAt: number;
}

export interface Escalation {
  id: string;
  time: number;
  reason: string;
  trigger: string;
  summary: string[];
  status: "open" | "replied";
}

export interface Reminder {
  id: string;
  bookingId: string;
  sendAt: number;
  status: "queued" | "sent" | "cancelled";
}

export type LogKind =
  | "chat"
  | "booking"
  | "cancel"
  | "waitlist"
  | "escalation"
  | "reminder"
  | "fallback"
  | "system";

export interface LogEntry {
  id: string;
  time: number;
  kind: LogKind;
  text: string;
}

export interface Counters {
  messages: number;
  bookings: number;
  refilled: number;
  escalated: number;
  unrecognised: number;
}

export type FaqTopic = "hours" | "deposits" | "services" | "policy" | "late" | "prep";

export type ChatAction =
  | { k: "menu" }
  | { k: "book"; serviceId?: ServiceId }
  | { k: "pickService"; serviceId: ServiceId }
  | { k: "pickDay"; dayKey: string }
  | { k: "otherDay" }
  | { k: "pickTime"; start: number }
  | { k: "otherTime" }
  | { k: "pay" }
  | { k: "joinWaitlist" }
  | { k: "reschedule" }
  | { k: "rsPick"; bookingId: string }
  | { k: "rsConfirm" }
  | { k: "cancel" }
  | { k: "cxPick"; bookingId: string }
  | { k: "cxConfirm" }
  | { k: "cxKeep" }
  | { k: "offerAccept"; offerId: string }
  | { k: "offerDecline"; offerId: string }
  | { k: "preview" }
  | { k: "faq" }
  | { k: "faqTopic"; topic: FaqTopic }
  | { k: "prepFor"; serviceId: ServiceId }
  | { k: "human" };

export interface ChatOption {
  label: string;
  action: ChatAction;
  primary?: boolean;
}

export type ChatCard =
  | {
      type: "summary";
      mode: "book" | "reschedule";
      serviceId: ServiceId;
      dayKey: string;
      start: number;
      from?: { dayKey: string; start: number };
    }
  | {
      type: "confirmation";
      ref: string;
      serviceId: ServiceId;
      dayKey: string;
      start: number;
      deposit: number;
      title: string;
    }
  | { type: "prep"; serviceId: ServiceId }
  | { type: "preview" }
  | { type: "escalation"; reason: string; summary: string[] }
  | { type: "payment"; amount: number };

export interface ChatMessage {
  id: string;
  from: "bot" | "client" | "manager";
  text: string;
  time: number;
  options?: ChatOption[];
  card?: ChatCard;
}

export type Reply = Omit<ChatMessage, "id" | "time">;

export interface Draft {
  mode: "book" | "reschedule" | "cancel";
  serviceId?: ServiceId;
  dayKey?: string;
  start?: number;
  bookingId?: string;
}

export interface DemoState {
  days: string[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  offers: Offer[];
  escalations: Escalation[];
  reminders: Reminder[];
  log: LogEntry[];
  counters: Counters;
  messages: ChatMessage[];
  draft: Draft | null;
  seq: number;
  refSeq: number;
}

export interface EngineResult {
  state: DemoState;
  replies: Reply[];
}
