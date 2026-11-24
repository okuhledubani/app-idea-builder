import { describe, expect, it } from "vitest";

import { getService } from "@/lib/aura/data";
import {
  availableStarts,
  cancellationOutcome,
  clientAction,
  clientText,
  simulateCancel,
  simulateOfferReply,
} from "@/lib/aura/engine";
import { parseIntent } from "@/lib/aura/intent";
import { createInitialState } from "@/lib/aura/seed";
import { nextOpenDays, parseDayKey, slotTime } from "@/lib/aura/time";

// Monday 23 Nov 2026, 08:00 local
const NOW = new Date(2026, 10, 23, 8, 0).getTime();
const HOUR = 3600_000;

describe("opening days", () => {
  it("shows six open days and skips Sundays", () => {
    const days = nextOpenDays(NOW);
    expect(days).toHaveLength(6);
    expect(days.map((d) => parseDayKey(d).getDay())).not.toContain(0);
    expect(days[0]).toBe("2026-11-24");
    expect(days[5]).toBe("2026-11-30"); // skips Sun 29 Nov
  });
});

describe("available start times", () => {
  it("only offers hair starts where 120 minutes fit before 17:00", () => {
    const s = createInitialState(NOW);
    const day = s.days[3] ?? "";
    const starts = availableStarts(s, "hair", day, NOW);
    expect(starts[0]).toBe(9 * 60);
    expect(Math.max(...starts)).toBe(15 * 60);
  });

  it("first day's hair specialist is fully booked", () => {
    const s = createInitialState(NOW);
    expect(availableStarts(s, "hair", s.days[0] ?? "", NOW)).toEqual([]);
  });

  it("never offers a time that overlaps the specialist's existing booking", () => {
    const s = createInitialState(NOW);
    const day = s.days[1] ?? ""; // Thato L. has hair 10:00–12:00
    const starts = availableStarts(s, "hair", day, NOW);
    for (const t of [9 * 60, 9 * 60 + 30, 10 * 60, 11 * 60, 11 * 60 + 30]) expect(starts).not.toContain(t);
    expect(starts).toContain(12 * 60);
  });
});

describe("cancellation policy", () => {
  it("refunds the deposit more than 24 hours ahead", () => {
    const b = { dayKey: "2026-11-25", start: 10 * 60 };
    expect(cancellationOutcome(b, slotTime(b.dayKey, b.start) - 25 * HOUR)).toBe("refunded");
  });
  it("keeps the deposit inside 24 hours", () => {
    const b = { dayKey: "2026-11-25", start: 10 * 60 };
    expect(cancellationOutcome(b, slotTime(b.dayKey, b.start) - 23 * HOUR)).toBe("kept");
  });
});

describe("booking in chat", () => {
  it("creates a booking with the service deposit and blocks that slot", () => {
    let s = createInitialState(NOW);
    const day = s.days[3] ?? "";
    s = clientAction(s, "Lash", { k: "pickService", serviceId: "lash" }, NOW).state;
    s = clientAction(s, day, { k: "pickDay", dayKey: day }, NOW).state;
    s = clientAction(s, "09:00", { k: "pickTime", start: 540 }, NOW).state;
    s = clientAction(s, "Pay", { k: "pay" }, NOW).state;
    const mine = s.bookings.filter((b) => b.isChatClient);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.depositPaid).toBe(120);
    expect(availableStarts(s, "lash", day, NOW)).not.toContain(540);
    expect(s.counters.bookings).toBe(1);
  });
});

describe("waitlist refill", () => {
  it("offers a freed hair slot to the first waiting client, then the next on decline", () => {
    let s = createInitialState(NOW);
    const day = s.days[0] ?? "";
    // Chat client joins day-1 hair waitlist behind Nomsa K.
    s = clientAction(s, "Hair", { k: "pickService", serviceId: "hair" }, NOW).state;
    s = clientAction(s, day, { k: "pickDay", dayKey: day }, NOW).state;
    s = clientAction(s, "Join", { k: "joinWaitlist" }, NOW).state;

    const hair = s.bookings.find((b) => b.serviceId === "hair" && b.dayKey === day && b.start === 11 * 60);
    s = simulateCancel(s, hair?.id ?? "", NOW).state;
    const first = s.offers[0];
    expect(first?.clientName).toBe("Nomsa K.");

    const res = simulateOfferReply(s, first?.id ?? "", false, NOW);
    s = res.state;
    expect(s.offers[0]?.isChatClient).toBe(true);
    expect(res.replies.some((r) => r.options?.some((o) => o.action.k === "offerAccept"))).toBe(true);

    s = clientAction(s, "Yes", { k: "offerAccept", offerId: s.offers[0]?.id ?? "" }, NOW).state;
    expect(s.counters.refilled).toBe(1);
    expect(availableStarts(s, "hair", day, NOW)).toEqual([]);
  });
});

describe("keywords and escalation", () => {
  it("understands the example phrases", () => {
    expect(parseIntent("book a lash appointment")).toEqual({ k: "book", serviceId: "lash" });
    expect(parseIntent("can I reschedule").k).toBe("reschedule");
    expect(parseIntent("I'm running late").k).toBe("late");
    expect(parseIntent("opening hours")).toEqual({ k: "faqTopic", topic: "hours" });
  });

  it.each([
    ["I have a latex allergy", "Allergy"],
    ["bridal party for 6", "Bridal party"],
    ["group booking please", "Group booking"],
    ["I want a refund", "Refund request"],
    ["I want to make a complaint", "Complaint"],
    ["I'm pregnant, is a facial safe? medical question", "Medical question"],
    ["can I talk to a person", "Asked for a person"],
  ])("escalates “%s”", (text, reason) => {
    const s = clientText(createInitialState(NOW), text, NOW).state;
    expect(s.escalations[0]?.reason).toBe(reason);
    expect(s.counters.escalated).toBe(1);
  });

  it("counts unrecognised messages and shows the menu again", () => {
    const res = clientText(createInitialState(NOW), "purple elephants", NOW);
    expect(res.state.counters.unrecognised).toBe(1);
    expect(res.replies[0]?.options?.length).toBe(6);
  });

  it("uses only the deposits from the brief", () => {
    expect(["makeup", "hair", "skin", "nails", "lash"].map((id) => getService(id as never).deposit)).toEqual([200, 250, 150, 100, 120]);
  });
});
