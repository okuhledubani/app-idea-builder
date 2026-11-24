import { CalendarCheck, CreditCard, ShieldAlert, Sparkles } from "lucide-react";

import { getService } from "@/lib/aura/data";
import { fmtDay, fmtTime } from "@/lib/aura/time";
import type { ChatCard } from "@/lib/aura/types";

import { HairPreview } from "./HairPreview";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function ChatCardView({ card }: { card: ChatCard }) {
  switch (card.type) {
    case "summary": {
      const s = getService(card.serviceId);
      return (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-1 font-display text-lg font-semibold">
            {card.mode === "book" ? "Booking summary" : "New time"}
          </p>
          <dl className="divide-y divide-border">
            <Row label="Service" value={s.name} />
            <Row label="Specialist" value={s.specialist} />
            {card.from && <Row label="Was" value={`${fmtDay(card.from.dayKey)}, ${fmtTime(card.from.start)}`} />}
            <Row label={card.from ? "Now" : "Day"} value={fmtDay(card.dayKey)} />
            <Row label="Time" value={`${fmtTime(card.start)}–${fmtTime(card.start + s.duration)}`} />
            <Row label="Length" value={`${s.duration} min`} />
            <Row label="Deposit" value={card.mode === "book" ? `R${s.deposit}` : "Moves with booking"} />
          </dl>
        </div>
      );
    }
    case "payment":
      return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-success-soft p-3 text-sm">
          <CreditCard className="size-5 shrink-0 text-success" aria-hidden />
          <p>
            <span className="font-semibold">Deposit of R{card.amount} received.</span>{" "}
            <span className="text-muted-foreground">Pretend payment, no money moved.</span>
          </p>
        </div>
      );
    case "confirmation": {
      const s = getService(card.serviceId);
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 bg-brand-gradient px-3 py-2 text-rose-foreground">
            <CalendarCheck className="size-4" aria-hidden />
            <span className="text-sm font-semibold">{card.title}</span>
            <span className="ml-auto rounded-full bg-card/80 px-2 py-0.5 font-mono text-xs text-foreground">{card.ref}</span>
          </div>
          <dl className="divide-y divide-border px-3 py-1">
            <Row label="Service" value={`${s.name} with ${s.specialist}`} />
            <Row label="When" value={`${fmtDay(card.dayKey)}, ${fmtTime(card.start)}–${fmtTime(card.start + s.duration)}`} />
            <Row label="Deposit paid" value={`R${card.deposit}`} />
          </dl>
        </div>
      );
    }
    case "prep": {
      const s = getService(card.serviceId);
      return (
        <div className="rounded-xl border border-border bg-gold-soft p-3">
          <p className="mb-1.5 flex items-center gap-1.5 font-display text-lg font-semibold">
            <Sparkles className="size-4" aria-hidden /> {s.name} prep guide
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {s.prep.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      );
    }
    case "preview":
      return (
        <div className="rounded-xl border border-border bg-card p-3">
          <HairPreview />
        </div>
      );
    case "escalation":
      return (
        <div className="rounded-xl border border-border bg-rose-soft p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <ShieldAlert className="size-4" aria-hidden /> Sent to senior management
          </p>
          <ul className="space-y-1 text-sm">
            {card.summary.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      );
  }
}
