import { ChevronDown, Info, MessageCircle, Moon, RotateCcw, Sun, LayoutDashboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SALON, SLOGAN } from "@/lib/aura/data";
import { AuraProvider, useAura } from "@/lib/aura/store";
import { cn } from "@/lib/utils";

import { AccountButton } from "./AccountButton";
import { ChatPanel } from "./ChatPanel";
import { Dashboard } from "./Dashboard";

const SCRIPT = [
  "In the chat, tap Book → Hair → the first day. It's fully booked, so tap “Join the waitlist”.",
  "In the dashboard Schedule, select a Hair booking on that first day and tap “Simulate this client cancelling”. The slot goes to Nomsa, who was waiting first.",
  "Open Waitlist and tap “Simulate no” for Nomsa. The offer moves to you in the chat. Tap “Yes, book it”.",
  "Type “I have a latex allergy”. It's escalated with a chat summary. In Escalations, tap “Reply to client (demo)” to see the manager reply.",
  "Type “book a lash appointment”, pay the pretend deposit, then send its reminder from Activity and cancel it in the chat to see the 24-hour deposit rule.",
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid size-11 place-items-center rounded-full border border-current/30 hover:bg-current/10"
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

function Shell() {
  const { reset, state, resetCount } = useAura();
  const [view, setView] = useState<"chat" | "dashboard">("chat");
  const [seen, setSeen] = useState(state.messages.length);
  const [scriptOpen, setScriptOpen] = useState(false);
  const lastReset = useRef(resetCount);

  useEffect(() => {
    if (view === "chat" || lastReset.current !== resetCount) {
      lastReset.current = resetCount;
      setSeen(state.messages.length);
    }
  }, [view, state.messages.length, resetCount]);

  const unread = view === "dashboard" ? Math.max(0, state.messages.length - seen) : 0;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="bg-header-gradient text-primary-foreground dark:text-foreground">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold leading-none sm:text-4xl">
              Aura<span className="text-rose">Bot</span> AI
            </h1>
            <p className="mt-1 text-sm opacity-85">
              Booking concierge for {SALON} · <em className="font-display text-base">{SLOGAN}</em>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
                setView("chat");
              }}
              className="flex min-h-11 items-center gap-2 rounded-full bg-rose px-4 text-sm font-semibold text-rose-foreground hover:opacity-90"
            >
              <RotateCcw className="size-4" aria-hidden /> Reset demo
            </button>
            <AccountButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 pt-3">
        <Collapsible open={scriptOpen} onOpenChange={setScriptOpen} className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <p className="flex min-w-0 flex-1 basis-64 items-start gap-2 text-xs sm:text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden />
              <span>
                <strong>Prototype with example data.</strong> AuraBot follows scripted rules and is not a language model. WhatsApp, Instagram, payments and real reminders are not connected. Refreshing resets the demo.
              </span>
            </p>
            <CollapsibleTrigger className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold hover:bg-accent">
              Demo script <ChevronDown className={cn("size-4 transition-transform", scriptOpen && "rotate-180")} aria-hidden />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ol className="grid gap-2 border-t border-border px-3 py-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
              {SCRIPT.map((s, i) => (
                <li key={s} className="flex gap-2 rounded-xl bg-muted p-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>

        <div role="tablist" aria-label="Choose panel" className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1 lg:hidden">
          {([
            { v: "chat", l: "Client chat", icon: MessageCircle },
            { v: "dashboard", l: "Salon dashboard", icon: LayoutDashboard },
          ] as const).map((t) => (
            <button
              key={t.v}
              role="tab"
              aria-selected={view === t.v}
              type="button"
              onClick={() => setView(t.v)}
              className={cn(
                "relative flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors",
                view === t.v ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <t.icon className="size-4" aria-hidden /> {t.l}
              {t.v === "chat" && unread > 0 && (
                <span className="absolute right-3 top-1.5 grid min-w-5 place-items-center rounded-full bg-rose px-1 text-[11px] font-bold text-rose-foreground" aria-label={`${unread} new messages`}>
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-[1500px] min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(360px,440px)_1fr]">
        <div className={cn("h-[calc(100dvh-8rem)] min-h-[520px] lg:h-auto lg:min-h-0", view !== "chat" && "hidden lg:block")}>
          <ChatPanel />
        </div>
        <div className={cn("min-h-[520px] lg:min-h-0", view !== "dashboard" && "hidden lg:block")}>
          <Dashboard />
        </div>
      </main>
    </div>
  );
}

export function AuraApp() {
  return (
    <AuraProvider>
      <Shell />
    </AuraProvider>
  );
}
