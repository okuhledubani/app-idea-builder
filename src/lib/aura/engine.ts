import {
  CHAT_CLIENT_NAME,
  CLOSE,
  OPEN,
  POLICY_HOURS,
  SERVICES,
  STEP,
  getService,
} from "./data";
import { parseIntent } from "./intent";
import { fmtDay, fmtTime, slotTime } from "./time";
import type {
  Booking,
  ChatAction,
  ChatOption,
  DemoState,
  EngineResult,
  FaqTopic,
  LogKind,
  Offer,
  Reply,
  ServiceId,
} from "./types";

const HOUR = 60 * 60 * 1000;

/* ---------------------------------------------------------------- helpers */

export function mainMenu(): ChatOption[] {
  return [
    { label: "Book", action: { k: "book" }, primary: true },
    { label: "Reschedule", action: { k: "reschedule" } },
    { label: "Cancel", action: { k: "cancel" } },
    { label: "Preview a hairstyle", action: { k: "preview" } },
    { label: "FAQs", action: { k: "faq" } },
    { label: "Talk to a person", action: { k: "human" } },
  ];
}

const backToMenu: ChatOption = { label: "Main menu", action: { k: "menu" } };

function nextId(d: DemoState, prefix: string) {
  d.seq += 1;
  return `${prefix}${d.seq}`;
}

function nextRef(d: DemoState) {
  d.refSeq += 1;
  return `GBL-${d.refSeq}`;
}

function log(d: DemoState, now: number, kind: LogKind, text: string) {
  d.log.unshift({ id: nextId(d, "l"), time: now, kind, text });
}

function overlaps(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && b0 < a1;
}

export function endOf(b: Pick<Booking, "serviceId" | "start">) {
  return b.start + getService(b.serviceId).duration;
}

export function slotLabel(serviceId: ServiceId, dayKey: string, start: number) {
  const s = getService(serviceId);
  return `${s.name} with ${s.specialist}, ${fmtDay(dayKey)} at ${fmtTime(start)}`;
}

/**
 * Start times where the whole service fits before closing, the specialist is free and
 * (optionally) the chat client has no other booking at the same time.
 */
export function availableStarts(
  s: DemoState,
  serviceId: ServiceId,
  dayKey: string,
  now: number,
  opts: { excludeBookingId?: string; forChatClient?: boolean } = {},
): number[] {
  const svc = getService(serviceId);
  const out: number[] = [];
  for (let t = OPEN; t + svc.duration <= CLOSE; t += STEP) {
    if (slotTime(dayKey, t) <= now) continue;
    const clash = s.bookings.some((b) => {
      if (b.status !== "confirmed" || b.dayKey !== dayKey || b.id === opts.excludeBookingId)
        return false;
      const sameSpecialist = getService(b.serviceId).specialist === svc.specialist;
      const sameClient = opts.forChatClient === true && b.isChatClient;
      if (!sameSpecialist && !sameClient) return false;
      return overlaps(t, t + svc.duration, b.start, endOf(b));
    });
    if (!clash) out.push(t);
  }
  return out;
}

export function cancellationOutcome(b: Pick<Booking, "dayKey" | "start">, now: number) {
  return slotTime(b.dayKey, b.start) - now > POLICY_HOURS * HOUR ? "refunded" : "kept";
}

export function chatBookings(s: DemoState, now: number) {
  return s.bookings
    .filter((b) => b.isChatClient && b.status === "confirmed" && slotTime(b.dayKey, b.start) > now)
    .sort((a, b) => slotTime(a.dayKey, a.start) - slotTime(b.dayKey, b.start));
}

function clone(s: DemoState): DemoState {
  return structuredClone(s);
}

function addReminder(d: DemoState, b: Booking) {
  d.reminders.push({
    id: nextId(d, "r"),
    bookingId: b.id,
    sendAt: slotTime(b.dayKey, b.start) - 24 * HOUR,
    status: "queued",
  });
}

/* ------------------------------------------------------------ chat appends */

export function appendBot(s: DemoState, reply: Reply, now: number): DemoState {
  const d = { ...s, seq: s.seq + 1 };
  d.messages = [...s.messages, { ...reply, id: `m${d.seq}`, time: now }];
  return d;
}

/* ---------------------------------------------------------------- flows */

function serviceOptions(): ChatOption[] {
  return SERVICES.map((s) => ({
    label: `${s.name} · ${s.duration} min · R${s.deposit} deposit`,
    action: { k: "pickService", serviceId: s.id },
  }));
}

function dayOptions(d: DemoState, serviceId: ServiceId, now: number, excludeBookingId?: string) {
  return d.days.map<ChatOption>((day) => {
    const free = availableStarts(d, serviceId, day, now, {
      forChatClient: true,
      ...(excludeBookingId ? { excludeBookingId } : {}),
    }).length;
    return { label: free ? fmtDay(day) : `${fmtDay(day)} · full`, action: { k: "pickDay", dayKey: day } };
  });
}

function askDay(d: DemoState, now: number, replies: Reply[]) {
  const serviceId = d.draft?.serviceId;
  if (!serviceId) return askService(d, replies);
  const s = getService(serviceId);
  replies.push({
    from: "bot",
    text: `${s.name} with ${s.specialist} takes ${s.duration} minutes. Which day suits you? We're open Monday to Saturday.`,
    options: [...dayOptions(d, serviceId, now, d.draft?.bookingId), backToMenu],
  });
}

function askService(d: DemoState, replies: Reply[]) {
  d.draft = { mode: "book" };
  replies.push({
    from: "bot",
    text: "Lovely! Which service would you like? Each one has a fixed length and a deposit to hold your chair.",
    options: [...serviceOptions(), backToMenu],
  });
}

function askTime(d: DemoState, now: number, replies: Reply[]) {
  const draft = d.draft;
  if (!draft?.serviceId || !draft.dayKey) return askDay(d, now, replies);
  const s = getService(draft.serviceId);
  const starts = availableStarts(d, draft.serviceId, draft.dayKey, now, {
    forChatClient: true,
    ...(draft.bookingId ? { excludeBookingId: draft.bookingId } : {}),
  });
  if (starts.length === 0) {
    const options: ChatOption[] = [];
    if (draft.mode === "book") options.push({ label: "Join the waitlist", action: { k: "joinWaitlist" }, primary: true });
    options.push({ label: "Pick another day", action: { k: "otherDay" } }, backToMenu);
    replies.push({
      from: "bot",
      text:
        draft.mode === "book"
          ? `Sorry, ${fmtDay(draft.dayKey)} is fully booked for ${s.name} with ${s.specialist}. You can join the waitlist for that day, or pick another day.`
          : `Sorry, there's no free ${s.name} time on ${fmtDay(draft.dayKey)}. Please pick another day.`,
      options,
    });
    return;
  }
  replies.push({
    from: "bot",
    text: `Here are the open start times on ${fmtDay(draft.dayKey)}. Each one leaves room for the full ${s.duration} minutes with ${s.specialist}.`,
    options: [
      ...starts.map<ChatOption>((t) => ({
        label: `${fmtTime(t)}–${fmtTime(t + s.duration)}`,
        action: { k: "pickTime", start: t },
      })),
      { label: "Pick another day", action: { k: "otherDay" } },
    ],
  });
}

function bookingOptions(list: Booking[], kind: "rsPick" | "cxPick"): ChatOption[] {
  return list.map((b) => ({
    label: `${getService(b.serviceId).name} · ${fmtDay(b.dayKey)} ${fmtTime(b.start)}`,
    action: { k: kind, bookingId: b.id },
  }));
}

const FAQ_TEXT: Record<Exclude<FaqTopic, "prep">, string> = {
  hours:
    "We're open Monday to Saturday, 09:00 to 17:00, with start times every 30 minutes. We're closed on Sundays.",
  deposits: `A deposit holds your chair and is paid when you book:\n${SERVICES.map((s) => `• ${s.name}: R${s.deposit}`).join("\n")}\nI can only share deposit amounts. The salon confirms full service prices.`,
  services: `Here's what we offer and how long each takes:\n${SERVICES.map((s) => `• ${s.name}: ${s.duration} min with ${s.specialist}`).join("\n")}`,
  policy: `Cancel more than ${POLICY_HOURS} hours before your appointment and your deposit is refunded. Inside ${POLICY_HOURS} hours the deposit is kept, because the chair is hard to refill at short notice. (This is a demo policy.)`,
  late: "Thanks for letting us know. Please message as soon as you can and we'll tell your specialist. Every service has a fixed length, so arriving late may mean a shorter service or moving to a later time, so the next client isn't kept waiting.",
};

function faqMenu(): ChatOption[] {
  return [
    { label: "Opening hours", action: { k: "faqTopic", topic: "hours" } },
    { label: "Deposits", action: { k: "faqTopic", topic: "deposits" } },
    { label: "Services & timings", action: { k: "faqTopic", topic: "services" } },
    { label: "Cancellation policy", action: { k: "faqTopic", topic: "policy" } },
    { label: "Running late", action: { k: "faqTopic", topic: "late" } },
    { label: "Prep guides", action: { k: "faqTopic", topic: "prep" } },
    backToMenu,
  ];
}

function escalationSummary(d: DemoState, now: number, reason: string): string[] {
  const lines: string[] = [`Client: ${CHAT_CLIENT_NAME} via WhatsApp (demo)`, `Reason: ${reason}`];
  const recent = d.messages
    .filter((m) => m.from === "client")
    .slice(-3)
    .map((m) => `“${m.text}”`);
  if (recent.length) lines.push(`Recent messages: ${recent.join(" · ")}`);
  const upcoming = chatBookings(d, now);
  lines.push(
    upcoming.length
      ? `Upcoming bookings: ${upcoming.map((b) => `${slotLabel(b.serviceId, b.dayKey, b.start)} (${b.ref})`).join("; ")}`
      : "Upcoming bookings: none",
  );
  if (d.draft?.serviceId)
    lines.push(`Was in the middle of: ${d.draft.mode} ${getService(d.draft.serviceId).name}`);
  return lines;
}

function escalate(d: DemoState, now: number, reason: string, trigger: string, replies: Reply[]) {
  const summary = escalationSummary(d, now, reason);
  d.escalations.unshift({ id: nextId(d, "e"), time: now, reason, trigger, summary, status: "open" });
  d.counters.escalated += 1;
  log(d, now, "escalation", `Escalated to senior management: ${reason}.`);
  d.draft = null;
  replies.push({
    from: "bot",
    text: "Thank you. I've passed this to our senior management team with a summary of our chat, so you won't need to repeat yourself. A manager will reply right here.",
    card: { type: "escalation", reason, summary },
    options: [backToMenu],
  });
}

/* --------------------------------------------------------- waitlist refill */

/** Offer a freed slot to the next waiting client for that service. */
export function offerSlot(
  d: DemoState,
  slot: { serviceId: ServiceId; dayKey: string; start: number },
  now: number,
  replies: Reply[],
  opts: { skipChatClient?: boolean } = {},
) {
  if (slotTime(slot.dayKey, slot.start) <= now) return;
  if (!availableStarts(d, slot.serviceId, slot.dayKey, now).includes(slot.start)) return;
  const next = d.waitlist
    .filter(
      (w) =>
        w.status === "waiting" &&
        w.serviceId === slot.serviceId &&
        (w.dayKey === null || w.dayKey === slot.dayKey) &&
        !(opts.skipChatClient && w.isChatClient),
    )
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  const label = slotLabel(slot.serviceId, slot.dayKey, slot.start);
  if (!next) {
    log(d, now, "waitlist", `No one waiting for ${label}. Slot is open for new bookings.`);
    return;
  }
  next.status = "offered";
  const offer: Offer = {
    id: nextId(d, "o"),
    waitlistId: next.id,
    clientName: next.clientName,
    isChatClient: next.isChatClient,
    serviceId: slot.serviceId,
    dayKey: slot.dayKey,
    start: slot.start,
    status: "pending",
    sentAt: now,
  };
  d.offers.unshift(offer);
  log(d, now, "waitlist", `Offered freed slot (${label}) to ${next.clientName}.`);
  if (next.isChatClient) {
    replies.push({
      from: "bot",
      text: `Good news! A slot has opened up: ${label}. You're next on the waitlist. Would you like it? Your R${getService(slot.serviceId).deposit} deposit will be taken (pretend payment).`,
      options: [
        { label: "Yes, book it", action: { k: "offerAccept", offerId: offer.id }, primary: true },
        { label: "No thanks", action: { k: "offerDecline", offerId: offer.id } },
      ],
    });
  }
}

export function respondToOffer(d: DemoState, offerId: string, yes: boolean, now: number, replies: Reply[]) {
  const offer = d.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== "pending") {
    if (offer?.isChatClient)
      replies.push({ from: "bot", text: "That offer is no longer open, sorry.", options: mainMenu() });
    return;
  }
  const entry = d.waitlist.find((w) => w.id === offer.waitlistId);
  const label = slotLabel(offer.serviceId, offer.dayKey, offer.start);
  if (!yes) {
    offer.status = "declined";
    if (entry) entry.status = "declined";
    log(d, now, "waitlist", `${offer.clientName} declined ${label}.`);
    if (offer.isChatClient)
      replies.push({
        from: "bot",
        text: "No problem. I've offered the slot to the next person and removed you from this waitlist.",
        options: mainMenu(),
      });
    offerSlot(d, offer, now, replies);
    return;
  }
  const stillFree = availableStarts(d, offer.serviceId, offer.dayKey, now, {
    forChatClient: offer.isChatClient,
  }).includes(offer.start);
  if (!stillFree) {
    offer.status = "taken";
    if (entry) entry.status = "waiting";
    log(d, now, "waitlist", `${label} was no longer free when ${offer.clientName} replied.`);
    if (offer.isChatClient)
      replies.push({
        from: "bot",
        text: "Sorry, that time is no longer free. You're still on the waitlist and I'll message you if another slot opens.",
        options: mainMenu(),
      });
    return;
  }
  offer.status = "accepted";
  if (entry) entry.status = "booked";
  const svc = getService(offer.serviceId);
  const booking: Booking = {
    id: nextId(d, "b"),
    ref: nextRef(d),
    serviceId: offer.serviceId,
    dayKey: offer.dayKey,
    start: offer.start,
    clientName: offer.clientName,
    isChatClient: offer.isChatClient,
    source: "refill",
    status: "confirmed",
    depositPaid: svc.deposit,
    createdAt: now,
  };
  d.bookings.push(booking);
  addReminder(d, booking);
  d.counters.refilled += 1;
  if (offer.isChatClient) d.counters.bookings += 1;
  log(d, now, "booking", `Slot refilled from waitlist: ${offer.clientName}, ${label} (${booking.ref}).`);
  if (offer.isChatClient) {
    replies.push({ from: "bot", text: "", card: { type: "payment", amount: svc.deposit } });
    replies.push({
      from: "bot",
      text: "You're booked!",
      card: {
        type: "confirmation",
        title: "Booking confirmed",
        ref: booking.ref,
        serviceId: booking.serviceId,
        dayKey: booking.dayKey,
        start: booking.start,
        deposit: svc.deposit,
      },
    });
    replies.push({ from: "bot", text: "", card: { type: "prep", serviceId: booking.serviceId }, options: mainMenu() });
  }
}

function cancelBooking(d: DemoState, b: Booking, now: number) {
  const outcome = cancellationOutcome(b, now);
  b.status = "cancelled";
  b.depositOutcome = outcome;
  for (const r of d.reminders) if (r.bookingId === b.id && r.status === "queued") r.status = "cancelled";
  log(
    d,
    now,
    "cancel",
    `${b.clientName} cancelled ${slotLabel(b.serviceId, b.dayKey, b.start)} (${b.ref}). Deposit ${outcome === "refunded" ? "refunded" : "kept (inside 24 hours)"}.`,
  );
  return outcome;
}

/* ------------------------------------------------------------ action router */

function runAction(d: DemoState, a: ChatAction, now: number, replies: Reply[]) {
  switch (a.k) {
    case "menu":
      d.draft = null;
      replies.push({ from: "bot", text: "What would you like to do?", options: mainMenu() });
      return;

    case "book":
      if (a.serviceId) {
        d.draft = { mode: "book", serviceId: a.serviceId };
        askDay(d, now, replies);
      } else askService(d, replies);
      return;

    case "pickService":
      d.draft = { mode: "book", serviceId: a.serviceId };
      askDay(d, now, replies);
      return;

    case "pickDay":
      if (!d.draft?.serviceId) return askService(d, replies);
      d.draft = { ...d.draft, dayKey: a.dayKey };
      delete d.draft.start;
      askTime(d, now, replies);
      return;

    case "otherDay":
      askDay(d, now, replies);
      return;

    case "otherTime":
      askTime(d, now, replies);
      return;

    case "pickTime": {
      const dr = d.draft;
      if (!dr?.serviceId || !dr.dayKey) return askService(d, replies);
      const free = availableStarts(d, dr.serviceId, dr.dayKey, now, {
        forChatClient: true,
        ...(dr.bookingId ? { excludeBookingId: dr.bookingId } : {}),
      }).includes(a.start);
      if (!free) {
        replies.push({ from: "bot", text: "Sorry, that time was just taken. Please choose another time." });
        return askTime(d, now, replies);
      }
      dr.start = a.start;
      const svc = getService(dr.serviceId);
      if (dr.mode === "reschedule" && dr.bookingId) {
        const old = d.bookings.find((b) => b.id === dr.bookingId);
        replies.push({
          from: "bot",
          text: "Please check the new time. Your deposit moves with the booking.",
          card: {
            type: "summary",
            mode: "reschedule",
            serviceId: dr.serviceId,
            dayKey: dr.dayKey,
            start: a.start,
            ...(old ? { from: { dayKey: old.dayKey, start: old.start } } : {}),
          },
          options: [
            { label: "Confirm new time", action: { k: "rsConfirm" }, primary: true },
            { label: "Choose another time", action: { k: "otherTime" } },
            { label: "Keep my original booking", action: { k: "menu" } },
          ],
        });
      } else {
        replies.push({
          from: "bot",
          text: `Here's your booking summary. A R${svc.deposit} deposit secures your chair.`,
          card: { type: "summary", mode: "book", serviceId: dr.serviceId, dayKey: dr.dayKey, start: a.start },
          options: [
            { label: `Pay R${svc.deposit} deposit (demo)`, action: { k: "pay" }, primary: true },
            { label: "Choose another time", action: { k: "otherTime" } },
            { label: "Start over", action: { k: "book" } },
          ],
        });
      }
      return;
    }

    case "pay": {
      const dr = d.draft;
      if (dr?.mode !== "book" || !dr.serviceId || !dr.dayKey || dr.start === undefined) {
        replies.push({
          from: "bot",
          text: "I couldn't find a booking to pay for. Let's start again.",
          options: mainMenu(),
        });
        d.draft = null;
        return;
      }
      if (!availableStarts(d, dr.serviceId, dr.dayKey, now, { forChatClient: true }).includes(dr.start)) {
        replies.push({
          from: "bot",
          text: "Sorry, that time was taken while you were paying. No deposit was taken. Please choose another time.",
        });
        delete dr.start;
        return askTime(d, now, replies);
      }
      const svc = getService(dr.serviceId);
      const booking: Booking = {
        id: nextId(d, "b"),
        ref: nextRef(d),
        serviceId: dr.serviceId,
        dayKey: dr.dayKey,
        start: dr.start,
        clientName: CHAT_CLIENT_NAME,
        isChatClient: true,
        source: "chat",
        status: "confirmed",
        depositPaid: svc.deposit,
        createdAt: now,
      };
      d.bookings.push(booking);
      addReminder(d, booking);
      d.counters.bookings += 1;
      d.draft = null;
      log(d, now, "booking", `Booked in chat: ${slotLabel(booking.serviceId, booking.dayKey, booking.start)} (${booking.ref}). Reminder queued.`);
      replies.push({ from: "bot", text: "", card: { type: "payment", amount: svc.deposit } });
      replies.push({
        from: "bot",
        text: "You're booked! I'll send a reminder 24 hours before.",
        card: {
          type: "confirmation",
          title: "Booking confirmed",
          ref: booking.ref,
          serviceId: booking.serviceId,
          dayKey: booking.dayKey,
          start: booking.start,
          deposit: svc.deposit,
        },
      });
      replies.push({
        from: "bot",
        text: "",
        card: { type: "prep", serviceId: booking.serviceId },
        options: mainMenu(),
      });
      return;
    }

    case "joinWaitlist": {
      const dr = d.draft;
      if (!dr?.serviceId || !dr.dayKey) return askService(d, replies);
      const svc = getService(dr.serviceId);
      const exists = d.waitlist.some(
        (w) => w.isChatClient && w.serviceId === dr.serviceId && w.dayKey === dr.dayKey && w.status === "waiting",
      );
      if (!exists) {
        d.waitlist.push({
          id: nextId(d, "w"),
          clientName: CHAT_CLIENT_NAME,
          serviceId: dr.serviceId,
          dayKey: dr.dayKey,
          isChatClient: true,
          status: "waiting",
          joinedAt: now,
        });
        log(d, now, "waitlist", `${CHAT_CLIENT_NAME} joined the ${svc.name} waitlist for ${fmtDay(dr.dayKey)}.`);
      }
      const ahead = d.waitlist.filter(
        (w) => !w.isChatClient && w.status === "waiting" && w.serviceId === dr.serviceId && (w.dayKey === null || w.dayKey === dr.dayKey),
      ).length;
      replies.push({
        from: "bot",
        text: `${exists ? "You're already" : "Done, you're"} on the waitlist for ${svc.name} on ${fmtDay(dr.dayKey)}.${ahead ? ` There ${ahead === 1 ? "is 1 person" : `are ${ahead} people`} ahead of you.` : ""} If a slot opens I'll message you here straight away.`,
        options: [{ label: "Pick another day", action: { k: "otherDay" } }, backToMenu],
      });
      return;
    }

    case "reschedule":
    case "cancel": {
      const list = chatBookings(d, now);
      if (!list.length) {
        d.draft = null;
        replies.push({
          from: "bot",
          text: `You don't have any upcoming bookings made in this chat, so there's nothing to ${a.k === "cancel" ? "cancel" : "move"}. Would you like to book?`,
          options: [{ label: "Book", action: { k: "book" }, primary: true }, backToMenu],
        });
        return;
      }
      d.draft = { mode: a.k === "cancel" ? "cancel" : "reschedule" };
      replies.push({
        from: "bot",
        text: a.k === "cancel" ? "Which booking would you like to cancel?" : "Which booking would you like to move?",
        options: [...bookingOptions(list, a.k === "cancel" ? "cxPick" : "rsPick"), backToMenu],
      });
      return;
    }

    case "rsPick": {
      const b = d.bookings.find((x) => x.id === a.bookingId && x.status === "confirmed");
      if (!b) {
        replies.push({ from: "bot", text: "I couldn't find that booking. It may already be cancelled.", options: mainMenu() });
        return;
      }
      d.draft = { mode: "reschedule", bookingId: b.id, serviceId: b.serviceId };
      askDay(d, now, replies);
      return;
    }

    case "rsConfirm": {
      const dr = d.draft;
      const b = dr?.bookingId ? d.bookings.find((x) => x.id === dr.bookingId) : undefined;
      if (!dr || !b || b.status !== "confirmed" || !dr.dayKey || dr.start === undefined) {
        d.draft = null;
        replies.push({ from: "bot", text: "Something went wrong finding that booking. Please start again.", options: mainMenu() });
        return;
      }
      if (!availableStarts(d, b.serviceId, dr.dayKey, now, { forChatClient: true, excludeBookingId: b.id }).includes(dr.start)) {
        replies.push({ from: "bot", text: "Sorry, that time was just taken. Please choose another time." });
        return askTime(d, now, replies);
      }
      const old = { serviceId: b.serviceId, dayKey: b.dayKey, start: b.start };
      b.dayKey = dr.dayKey;
      b.start = dr.start;
      for (const r of d.reminders)
        if (r.bookingId === b.id && r.status === "queued") r.sendAt = slotTime(b.dayKey, b.start) - 24 * HOUR;
      d.draft = null;
      log(d, now, "booking", `Rescheduled ${b.ref} from ${fmtDay(old.dayKey)} ${fmtTime(old.start)} to ${fmtDay(b.dayKey)} ${fmtTime(b.start)}.`);
      replies.push({
        from: "bot",
        text: "All done. Your deposit has moved with the booking.",
        card: {
          type: "confirmation",
          title: "Booking moved",
          ref: b.ref,
          serviceId: b.serviceId,
          dayKey: b.dayKey,
          start: b.start,
          deposit: b.depositPaid,
        },
        options: mainMenu(),
      });
      offerSlot(d, old, now, replies, { skipChatClient: true });
      return;
    }

    case "cxPick": {
      const b = d.bookings.find((x) => x.id === a.bookingId && x.status === "confirmed");
      if (!b) {
        replies.push({ from: "bot", text: "I couldn't find that booking. It may already be cancelled.", options: mainMenu() });
        return;
      }
      d.draft = { mode: "cancel", bookingId: b.id };
      const outcome = cancellationOutcome(b, now);
      replies.push({
        from: "bot",
        text:
          outcome === "refunded"
            ? `Your ${slotLabel(b.serviceId, b.dayKey, b.start)} is more than 24 hours away, so your R${b.depositPaid} deposit would be refunded. (Demo policy.) Cancel it?`
            : `Your ${slotLabel(b.serviceId, b.dayKey, b.start)} is less than 24 hours away, so the R${b.depositPaid} deposit is kept under our cancellation policy. (Demo policy.) Cancel anyway?`,
        options: [
          { label: "Yes, cancel it", action: { k: "cxConfirm" }, primary: true },
          { label: "Keep my booking", action: { k: "cxKeep" } },
          { label: "Reschedule instead", action: { k: "rsPick", bookingId: b.id } },
        ],
      });
      return;
    }

    case "cxConfirm": {
      const b = d.draft?.bookingId ? d.bookings.find((x) => x.id === d.draft?.bookingId) : undefined;
      d.draft = null;
      if (!b || b.status !== "confirmed") {
        replies.push({ from: "bot", text: "That booking is already cancelled.", options: mainMenu() });
        return;
      }
      const outcome = cancelBooking(d, b, now);
      replies.push({
        from: "bot",
        text:
          outcome === "refunded"
            ? `Cancelled. Your R${b.depositPaid} deposit will be refunded (pretend refund, no money moved). Reference ${b.ref}.`
            : `Cancelled. The R${b.depositPaid} deposit is kept because it was inside 24 hours. Reference ${b.ref}.`,
        options: mainMenu(),
      });
      offerSlot(d, b, now, replies, { skipChatClient: true });
      return;
    }

    case "cxKeep":
      d.draft = null;
      replies.push({ from: "bot", text: "Great, your booking stays as it is. See you soon!", options: mainMenu() });
      return;

    case "offerAccept":
    case "offerDecline":
      respondToOffer(d, a.offerId, a.k === "offerAccept", now, replies);
      return;

    case "preview":
      d.draft = null;
      replies.push({
        from: "bot",
        text: "Pick a style and a colour to see a simple illustration. Your stylist will advise what suits your hair.",
        card: { type: "preview" },
        options: [
          { label: "Book a hair appointment", action: { k: "book", serviceId: "hair" }, primary: true },
          backToMenu,
        ],
      });
      return;

    case "faq":
      replies.push({ from: "bot", text: "Here are the questions I can answer:", options: faqMenu() });
      return;

    case "faqTopic":
      if (a.topic === "prep") {
        replies.push({
          from: "bot",
          text: "Which service would you like the prep guide for?",
          options: [
            ...SERVICES.map<ChatOption>((s) => ({ label: s.name, action: { k: "prepFor", serviceId: s.id } })),
            { label: "Back to FAQs", action: { k: "faq" } },
          ],
        });
        return;
      }
      if (a.topic === "late") log(d, now, "chat", "Client said they are running late. Staff notified (demo).");
      replies.push({
        from: "bot",
        text: FAQ_TEXT[a.topic],
        options:
          a.topic === "late"
            ? [{ label: "Reschedule", action: { k: "reschedule" } }, { label: "Talk to a person", action: { k: "human" } }, backToMenu]
            : [{ label: "Book", action: { k: "book" }, primary: true }, { label: "Back to FAQs", action: { k: "faq" } }, backToMenu],
      });
      return;

    case "prepFor":
      replies.push({
        from: "bot",
        text: "",
        card: { type: "prep", serviceId: a.serviceId },
        options: [
          { label: `Book ${getService(a.serviceId).name}`, action: { k: "book", serviceId: a.serviceId }, primary: true },
          { label: "Back to FAQs", action: { k: "faq" } },
        ],
      });
      return;

    case "human":
      escalate(d, now, "Asked for a person", "Tapped “Talk to a person”", replies);
      return;
  }
}

/* ------------------------------------------------------------- public API */

function pushClient(d: DemoState, text: string, now: number) {
  d.seq += 1;
  d.messages.push({ id: `m${d.seq}`, from: "client", text, time: now });
  d.counters.messages += 1;
}

export function clientAction(s: DemoState, label: string, action: ChatAction, now: number): EngineResult {
  const d = clone(s);
  const replies: Reply[] = [];
  pushClient(d, label, now);
  runAction(d, action, now, replies);
  return { state: d, replies };
}

export function clientText(s: DemoState, text: string, now: number): EngineResult {
  const d = clone(s);
  const replies: Reply[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { state: s, replies };
  pushClient(d, trimmed, now);
  const intent = parseIntent(trimmed);
  switch (intent.k) {
    case "escalate":
      escalate(d, now, intent.reason, trimmed, replies);
      break;
    case "late":
      runAction(d, { k: "faqTopic", topic: "late" }, now, replies);
      break;
    case "reschedule":
      runAction(d, { k: "reschedule" }, now, replies);
      break;
    case "cancel":
      runAction(d, { k: "cancel" }, now, replies);
      break;
    case "book":
      runAction(d, intent.serviceId ? { k: "book", serviceId: intent.serviceId } : { k: "book" }, now, replies);
      break;
    case "preview":
      runAction(d, { k: "preview" }, now, replies);
      break;
    case "faqTopic":
      runAction(d, { k: "faqTopic", topic: intent.topic }, now, replies);
      break;
    case "faq":
      runAction(d, { k: "faq" }, now, replies);
      break;
    case "greet":
      runAction(d, { k: "menu" }, now, replies);
      break;
    case "unknown":
      d.counters.unrecognised += 1;
      log(d, now, "fallback", `Didn't understand: “${trimmed}”. Showed the menu.`);
      replies.push({
        from: "bot",
        text: "Sorry, I didn't understand that. I'm a scripted assistant, so I work best with the buttons below or short phrases like “book a lash appointment” or “opening hours”.",
        options: mainMenu(),
      });
      break;
  }
  return { state: d, replies };
}

/* ----------------------------------------------------------- staff actions */

export function simulateCancel(s: DemoState, bookingId: string, now: number): EngineResult {
  const d = clone(s);
  const replies: Reply[] = [];
  const b = d.bookings.find((x) => x.id === bookingId);
  if (!b || b.status !== "confirmed" || b.isChatClient) return { state: s, replies };
  cancelBooking(d, b, now);
  offerSlot(d, b, now, replies);
  return { state: d, replies };
}

export function simulateOfferReply(s: DemoState, offerId: string, yes: boolean, now: number): EngineResult {
  const d = clone(s);
  const replies: Reply[] = [];
  respondToOffer(d, offerId, yes, now, replies);
  return { state: d, replies };
}

const MANAGER_REPLIES: Record<string, string> = {
  Allergy:
    "Hi, this is Palesa, senior manager at Glow Beauty Lounge. Thank you for telling us about your allergy. I've read your summary and will call you to talk through products and a patch test before any service.",
  "Bridal party":
    "Hi, this is Palesa, senior manager. Congratulations! I've read your summary and will put together bridal party options with our team. I'll be in touch today.",
  "Group booking":
    "Hi, this is Palesa, senior manager. I've read your summary and will check which specialists can see your group together. I'll come back to you shortly.",
  "Refund request":
    "Hi, this is Palesa, senior manager. I've read your summary about the refund and I'm looking into it personally. I'll update you here today.",
  Complaint:
    "Hi, this is Palesa, senior manager. I'm sorry about your experience. I've read your summary and would like to call you to put this right.",
  "Medical question":
    "Hi, this is Palesa, senior manager. Thank you for letting us know. I've read your summary and will check with your specialist what's safe before your visit.",
};

export function replyToEscalation(s: DemoState, escalationId: string, now: number): EngineResult {
  const d = clone(s);
  const e = d.escalations.find((x) => x.id === escalationId);
  if (!e || e.status === "replied") return { state: s, replies: [] };
  e.status = "replied";
  log(d, now, "escalation", `Manager replied to escalation: ${e.reason}.`);
  return {
    state: d,
    replies: [
      {
        from: "manager",
        text:
          MANAGER_REPLIES[e.reason] ??
          "Hi, this is Palesa, senior manager at Glow Beauty Lounge. I've read the summary of your chat, so there's no need to repeat anything. How can I help?",
      },
    ],
  };
}

export function sendReminder(s: DemoState, reminderId: string, now: number): EngineResult {
  const d = clone(s);
  const r = d.reminders.find((x) => x.id === reminderId);
  const b = r ? d.bookings.find((x) => x.id === r.bookingId) : undefined;
  if (!r || !b || r.status !== "queued") return { state: s, replies: [] };
  r.status = "sent";
  log(d, now, "reminder", `Reminder sent to ${b.clientName} for ${slotLabel(b.serviceId, b.dayKey, b.start)} (demo, not delivered).`);
  const replies: Reply[] = [];
  if (b.isChatClient) {
    replies.push({
      from: "bot",
      text: `Reminder: your ${slotLabel(b.serviceId, b.dayKey, b.start)} is coming up (${b.ref}). If your plans have changed, you can reschedule or cancel here.`,
      card: { type: "prep", serviceId: b.serviceId },
      options: [
        { label: "Reschedule", action: { k: "reschedule" } },
        { label: "Cancel", action: { k: "cancel" } },
        backToMenu,
      ],
    });
  }
  return { state: d, replies };
}
