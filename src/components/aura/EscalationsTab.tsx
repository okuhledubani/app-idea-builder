import { ShieldAlert } from "lucide-react";

import { useAura } from "@/lib/aura/store";
import { fmtStamp } from "@/lib/aura/time";

export function EscalationsTab() {
  const { state, replyEscalation } = useAura();
  if (state.escalations.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        Nothing escalated yet. In the chat, try “I have a latex allergy”, “bridal party for 5” or tap “Talk to a person”.
      </p>
    );
  return (
    <ul className="space-y-3">
      {state.escalations.map((e) => (
        <li key={e.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="size-4 text-rose" aria-hidden />
            <span className="font-display text-xl font-semibold">{e.reason}</span>
            <span className="text-sm text-muted-foreground">at {fmtStamp(e.time)}</span>
            <span className={e.status === "replied" ? "ml-auto rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success" : "ml-auto rounded-full bg-rose-soft px-2.5 py-0.5 text-xs font-semibold"}>
              {e.status === "replied" ? "Replied" : "Open"}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Client said: </span>“{e.trigger}”
          </p>
          <div className="mt-2 rounded-xl bg-muted p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chat summary</p>
            <ul className="space-y-1 text-sm">
              {e.summary.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            disabled={e.status === "replied"}
            onClick={() => replyEscalation(e.id)}
            className="mt-3 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {e.status === "replied" ? "Reply sent" : "Reply to client (demo)"}
          </button>
        </li>
      ))}
    </ul>
  );
}
