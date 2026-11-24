import { useState } from "react";

import { CLOSE, OPEN, SERVICES, getService } from "@/lib/aura/data";
import { cancellationOutcome, endOf } from "@/lib/aura/engine";
import { useAura } from "@/lib/aura/store";
import { fmtDay, fmtTime } from "@/lib/aura/time";
import type { Booking } from "@/lib/aura/types";
import { cn } from "@/lib/utils";

const SPAN = CLOSE - OPEN;
const HOURS = Array.from({ length: SPAN / 60 + 1 }, (_, i) => OPEN + i * 60);
const pct = (m: number) => `${((m - OPEN) / SPAN) * 100}%`;

function blockClass(b: Booking) {
  if (b.isChatClient) return "bg-slot-chat text-slot-chat-foreground ring-2 ring-primary/60";
  if (b.source === "refill") return "bg-slot-refill text-slot-refill-foreground";
  return "bg-slot-example text-slot-example-foreground";
}

export function ScheduleTab() {
  const { state, cancelExample } = useAura();
  const [day, setDay] = useState(state.days[0] ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const dayKey = state.days.includes(day) ? day : (state.days[0] ?? "");
  const selected = state.bookings.find((b) => b.id === selectedId) ?? null;
  const pendingOffers = state.offers.filter((o) => o.status === "pending" && o.dayKey === dayKey);

  const onCancel = (b: Booking) => {
    cancelExample(b.id);
    setSelectedId(null);
    setNotice(
      `${b.clientName}'s ${getService(b.serviceId).name} booking was cancelled (simulated). If anyone is waiting for ${getService(b.serviceId).name}, the slot has been offered to them. See the Waitlist tab.`,
    );
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Choose a day" className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {state.days.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === dayKey}
            onClick={() => {
              setDay(d);
              setSelectedId(null);
            }}
            className={cn(
              "min-h-11 rounded-xl border px-2 text-sm font-medium transition-colors",
              d === dayKey ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
            )}
          >
            {fmtDay(d)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-slot-example" /> Example client</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-slot-chat ring-2 ring-primary/60" /> Booked in chat</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-slot-refill" /> Refilled from waitlist</span>
        <span className="flex items-center gap-1.5"><span className="hatched size-3 rounded border border-dashed border-gold" /> Offered to waitlist</span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="grid grid-cols-[4.5rem_1fr] gap-2 sm:grid-cols-[7rem_1fr]">
          <div />
          <div className="relative h-5 text-[10px] text-muted-foreground sm:text-xs">
            {HOURS.map((h, i) => (
              <span
                key={h}
                className={cn("absolute top-0", i === 0 ? "" : i === HOURS.length - 1 ? "-translate-x-full" : "-translate-x-1/2")}
                style={{ left: pct(h) }}
              >
                {String(h / 60).padStart(2, "0")}
              </span>
            ))}
          </div>

          {SERVICES.map((svc) => {
            const rows = state.bookings.filter(
              (b) => b.status === "confirmed" && b.dayKey === dayKey && b.serviceId === svc.id,
            );
            const offers = pendingOffers.filter((o) => o.serviceId === svc.id);
            return (
              <div key={svc.id} className="contents">
                <div className="flex flex-col justify-center py-1">
                  <span className="truncate text-sm font-semibold">{svc.specialist}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{svc.name}</span>
                </div>
                <div className="relative h-14 overflow-hidden rounded-lg bg-track">
                  {HOURS.slice(1, -1).map((h) => (
                    <span key={h} className="absolute inset-y-0 w-px bg-border" style={{ left: pct(h) }} />
                  ))}
                  {offers.map((o) => (
                    <div
                      key={o.id}
                      className="hatched absolute inset-y-1 flex items-center overflow-hidden rounded-md border border-dashed border-gold px-1.5 text-[11px] font-medium"
                      style={{ left: pct(o.start), width: `calc(${(svc.duration / SPAN) * 100}% - 2px)` }}
                      title={`Offered to ${o.clientName}`}
                    >
                      <span className="truncate">Offered: {o.clientName}</span>
                    </div>
                  ))}
                  {rows.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(b.id);
                        setNotice("");
                      }}
                      aria-label={`${b.clientName}, ${svc.name} ${fmtTime(b.start)} to ${fmtTime(endOf(b))}`}
                      aria-pressed={selectedId === b.id}
                      className={cn(
                        "absolute inset-y-1 flex flex-col justify-center overflow-hidden rounded-md px-1.5 text-left shadow-soft transition-transform hover:-translate-y-px",
                        blockClass(b),
                        selectedId === b.id && "outline outline-2 outline-offset-1 outline-ring",
                      )}
                      style={{ left: pct(b.start), width: `calc(${(svc.duration / SPAN) * 100}% - 2px)` }}
                    >
                      <span className="truncate text-[11px] font-semibold leading-tight sm:text-xs">{b.clientName}</span>
                      <span className="truncate text-[10px] opacity-80">{fmtTime(b.start)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-gold bg-gold-soft px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      {selected ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-2xl font-semibold">{selected.clientName}</h3>
              <p className="text-sm text-muted-foreground">
                {selected.isChatClient ? "Booked in the chat" : selected.source === "refill" ? "Refilled from the waitlist (example client)" : "Example client"}
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{selected.ref}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Service</dt><dd className="font-medium">{getService(selected.serviceId).name}</dd></div>
            <div><dt className="text-muted-foreground">Specialist</dt><dd className="font-medium">{getService(selected.serviceId).specialist}</dd></div>
            <div><dt className="text-muted-foreground">When</dt><dd className="font-medium">{fmtDay(selected.dayKey)}, {fmtTime(selected.start)}–{fmtTime(endOf(selected))}</dd></div>
            <div><dt className="text-muted-foreground">Deposit</dt><dd className="font-medium">R{selected.depositPaid} paid</dd></div>
          </dl>
          <div className="mt-4">
            {selected.isChatClient ? (
              <p className="text-sm text-muted-foreground">This is your own chat booking. Use the chat to cancel or reschedule it.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onCancel(selected)}
                  className="min-h-11 rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
                >
                  Simulate this client cancelling
                </button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Deposit would be {cancellationOutcome(selected, Date.now()) === "refunded" ? "refunded (more than 24 hours ahead)" : "kept (inside 24 hours)"}. The freed slot goes to the waitlist.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a booking to see its details.</p>
      )}
    </div>
  );
}
