import { getService } from "@/lib/aura/data";
import { useAura } from "@/lib/aura/store";
import { fmtDateTime, fmtDay, fmtStamp, fmtTime } from "@/lib/aura/time";
import type { LogKind } from "@/lib/aura/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<LogKind, string> = {
  chat: "Chat",
  booking: "Booking",
  cancel: "Cancel",
  waitlist: "Waitlist",
  escalation: "Escalation",
  reminder: "Reminder",
  fallback: "Not understood",
  system: "System",
};

export function ActivityTab() {
  const { state, sendReminderNow } = useAura();
  const now = Date.now();
  const reminders = state.reminders
    .filter((r) => r.status !== "cancelled")
    .map((r) => ({ r, b: state.bookings.find((b) => b.id === r.bookingId) }))
    .filter((x) => x.b && x.b.status === "confirmed")
    .sort((a, b) => a.r.sendAt - b.r.sendAt);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-1 text-2xl font-semibold">Reminders queued</h3>
        <p className="mb-2 text-sm text-muted-foreground">Each booking gets a reminder 24 hours before. Not really sent: this is a demo.</p>
        <ul className="space-y-2">
          {reminders.map(({ r, b }) =>
            b ? (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {b.clientName} · {getService(b.serviceId).name} {fmtDay(b.dayKey)} {fmtTime(b.start)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.status === "sent" ? "Sent (demo)" : r.sendAt <= now ? "Due now" : `Scheduled for ${fmtDateTime(r.sendAt)}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={r.status !== "queued"}
                  onClick={() => sendReminderNow(r.id)}
                  className="min-h-11 rounded-full border border-border bg-card px-4 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  {r.status === "sent" ? "Sent" : "Send now (demo)"}
                </button>
              </li>
            ) : null,
          )}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-2xl font-semibold">Bot activity log</h3>
        <ol className="space-y-1.5">
          {state.log.map((l) => (
            <li key={l.id} className="flex gap-3 rounded-lg px-1 py-1 text-sm">
              <span className="w-11 shrink-0 font-mono text-xs leading-5 text-muted-foreground">{fmtStamp(l.time)}</span>
              <span
                className={cn(
                  "h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  l.kind === "escalation" || l.kind === "fallback" ? "bg-rose-soft" : l.kind === "booking" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {KIND_LABEL[l.kind]}
              </span>
              <span className="min-w-0">{l.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
