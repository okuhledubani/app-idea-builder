import { CHAT_CLIENT_NAME, SALON, getService } from "./data";
import { mainMenu } from "./engine";
import { nextOpenDays, slotTime } from "./time";
import type { Booking, DemoState, ServiceId } from "./types";

const EXAMPLE_BOOKINGS: [day: number, service: ServiceId, start: string, name: string][] = [
  // Day 1 — Hair (Lerato) fully booked to demo the waitlist
  [0, "hair", "09:00", "Busi M."],
  [0, "hair", "11:00", "Kagiso T."],
  [0, "hair", "13:00", "Precious N."],
  [0, "hair", "15:00", "Lindiwe S."],
  [0, "makeup", "10:00", "Ayanda P."],
  [0, "nails", "14:00", "Mpho R."],
  // Day 2
  [1, "skin", "09:30", "Zanele K."],
  [1, "hair", "10:00", "Thato L."],
  [1, "lash", "11:00", "Naomi B."],
  [1, "makeup", "13:00", "Keabetswe D."],
  // Day 3
  [2, "nails", "10:00", "Sibongile V."],
  [2, "hair", "13:00", "Palesa J."],
  [2, "lash", "15:00", "Dineo F."],
];

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function createInitialState(now: number): DemoState {
  const days = nextOpenDays(now);
  const bookings: Booking[] = EXAMPLE_BOOKINGS.map(([di, serviceId, start, name], i) => ({
    id: `b${i + 1}`,
    ref: `GBL-${1001 + i}`,
    serviceId,
    dayKey: days[di] ?? days[0] ?? "",
    start: toMin(start),
    clientName: name,
    isChatClient: false,
    source: "example",
    status: "confirmed",
    depositPaid: getService(serviceId).deposit,
    createdAt: now,
  }));

  const reminders = bookings.map((b, i) => ({
    id: `r${i + 1}`,
    bookingId: b.id,
    sendAt: slotTime(b.dayKey, b.start) - 24 * 60 * 60 * 1000,
    status: "queued" as const,
  }));

  const state: DemoState = {
    days,
    bookings,
    waitlist: [
      {
        id: "w1",
        clientName: "Nomsa K.",
        serviceId: "hair",
        dayKey: days[0] ?? null,
        isChatClient: false,
        status: "waiting",
        joinedAt: now - 3 * 60 * 60 * 1000,
      },
      {
        id: "w2",
        clientName: "Refilwe D.",
        serviceId: "lash",
        dayKey: null,
        isChatClient: false,
        status: "waiting",
        joinedAt: now - 90 * 60 * 1000,
      },
    ],
    offers: [],
    escalations: [],
    reminders,
    log: [
      {
        id: "l1",
        time: now,
        kind: "system",
        text: `Demo started with 13 example bookings and 2 example waitlist clients. Chat client: ${CHAT_CLIENT_NAME}.`,
      },
    ],
    counters: { messages: 0, bookings: 0, refilled: 0, escalated: 0, unrecognised: 0 },
    messages: [
      {
        id: "m1",
        from: "bot",
        time: now,
        text: `Hi! I'm AuraBot, the booking assistant for ${SALON}. I can book, move or cancel appointments, answer common questions and show hairstyle ideas. How can I help today?`,
        options: mainMenu(),
      },
    ],
    draft: null,
    seq: 100,
    refSeq: 2001,
  };
  return state;
}
