import { getService } from "@/lib/aura/data";
import { slotLabel } from "@/lib/aura/engine";
import { useAura } from "@/lib/aura/store";
import { fmtDay, fmtStamp } from "@/lib/aura/time";
import { cn } from "@/lib/utils";

const ENTRY_STATUS: Record<string, string> = {
  waiting: "Waiting",
  offered: "Offer sent",
  booked: "Booked",
  declined: "Declined",
};

const OFFER_STATUS: Record<string, string> = {
  pending: "Waiting for reply",
  accepted: "Accepted",
  declined: "Declined",
  taken: "No longer free",
};

function Pill({ tone, children }: { tone: "rose" | "gold" | "success" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "rose" && "bg-rose-soft",
        tone === "gold" && "bg-gold-soft",
        tone === "success" && "bg-success-soft text-success",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function WaitlistTab() {
  const { state, offerReply } = useAura();
  const entries = [...state.waitlist].sort((a, b) => a.joinedAt - b.joinedAt);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-2xl font-semibold">Who is waiting</h3>
        <ul className="space-y-2">
          {entries.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-3 py-2.5">
              <span className="font-semibold">{w.clientName}</span>
              {!w.isChatClient && <Pill tone="muted">Example</Pill>}
              <span className="text-sm text-muted-foreground">
                {getService(w.serviceId).name} · {w.dayKey ? fmtDay(w.dayKey) : "Any day"} · joined {fmtStamp(w.joinedAt)}
              </span>
              <span className="ml-auto">
                <Pill tone={w.status === "booked" ? "success" : w.status === "offered" ? "gold" : w.status === "declined" ? "muted" : "rose"}>
                  {ENTRY_STATUS[w.status]}
                </Pill>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-2xl font-semibold">Offers for freed slots</h3>
        <p className="mb-2 text-sm text-muted-foreground">
          When a booking is cancelled, the slot is offered to the next person waiting for that service. If they say no, it moves to the next.
        </p>
        {state.offers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            No offers yet. Try “Simulate this client cancelling” on a Hair booking on {state.days[0] ? fmtDay(state.days[0]) : "the first day"} in the Schedule tab.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.offers.map((o) => (
              <li key={o.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{o.clientName}</span>
                  <span className="text-sm text-muted-foreground">{slotLabel(o.serviceId, o.dayKey, o.start)}</span>
                  <span className="ml-auto">
                    <Pill tone={o.status === "accepted" ? "success" : o.status === "pending" ? "gold" : "muted"}>{OFFER_STATUS[o.status]}</Pill>
                  </span>
                </div>
                {o.status === "pending" &&
                  (o.isChatClient ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">Sent to you in the chat. Reply there.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => offerReply(o.id, true)}
                        className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        Simulate “yes”
                      </button>
                      <button
                        type="button"
                        onClick={() => offerReply(o.id, false)}
                        className="min-h-11 rounded-full border border-border bg-card px-4 text-sm font-semibold hover:bg-accent"
                      >
                        Simulate “no”
                      </button>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
