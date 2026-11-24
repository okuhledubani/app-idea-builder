import { CalendarClock, CalendarPlus, HelpCircle, MessagesSquare, RefreshCcw, ShieldAlert } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAura } from "@/lib/aura/store";

import { ActivityTab } from "./ActivityTab";
import { EscalationsTab } from "./EscalationsTab";
import { ScheduleTab } from "./ScheduleTab";
import { WaitlistTab } from "./WaitlistTab";

export function Dashboard() {
  const { state } = useAura();
  const c = state.counters;
  const stats = [
    { label: "Messages handled", value: c.messages, icon: MessagesSquare },
    { label: "Bookings made", value: c.bookings, icon: CalendarPlus },
    { label: "Slots refilled", value: c.refilled, icon: RefreshCcw },
    { label: "Escalated to staff", value: c.escalated, icon: ShieldAlert },
    { label: "Unrecognised", value: c.unrecognised, icon: HelpCircle },
  ];
  const openEsc = state.escalations.filter((e) => e.status === "open").length;
  const pendingOffers = state.offers.filter((o) => o.status === "pending").length;

  return (
    <section aria-label="Salon dashboard" className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-panel">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <CalendarClock className="size-5 text-rose" aria-hidden />
        <h2 className="text-2xl font-semibold leading-none">Salon dashboard</h2>
        <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Staff view · example data</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {stats.map((s) => (
            <li key={s.label} className="rounded-2xl border border-border bg-background p-3">
              <s.icon className="mb-1 size-4 text-muted-foreground" aria-hidden />
              <p className="text-2xl font-semibold leading-none tabular-nums sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </li>
          ))}
        </ul>

        <Tabs defaultValue="schedule" className="mt-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl p-1 sm:grid-cols-4">
            {[
              { v: "schedule", l: "Schedule", n: 0 },
              { v: "waitlist", l: "Waitlist", n: pendingOffers },
              { v: "escalations", l: "Escalations", n: openEsc },
              { v: "activity", l: "Activity", n: 0 },
            ].map((t) => (
              <TabsTrigger key={t.v} value={t.v} className="min-h-11 gap-1.5 rounded-xl text-sm">
                {t.l}
                {t.n > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-rose px-1.5 text-[11px] font-bold text-rose-foreground">{t.n}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="schedule" className="mt-4">
            <ScheduleTab />
          </TabsContent>
          <TabsContent value="waitlist" className="mt-4">
            <WaitlistTab />
          </TabsContent>
          <TabsContent value="escalations" className="mt-4">
            <EscalationsTab />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <ActivityTab />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
