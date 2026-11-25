import { ArrowLeft, Bot, CheckCheck, EllipsisVertical, Phone, Send, ShieldCheck, UserRound, Video } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAura } from "@/lib/aura/store";
import { fmtStamp } from "@/lib/aura/time";
import type { ChatMessage, ChatOption } from "@/lib/aura/types";
import { cn } from "@/lib/utils";

import { ChatCardView } from "./ChatCards";

const SUGGESTIONS = ["book a lash appointment", "can I reschedule", "I'm running late", "opening hours"];

function Options({ options, enabled, onTap }: { options: ChatOption[]; enabled: (o: ChatOption) => boolean; onTap: (o: ChatOption) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((o, i) => {
        const on = enabled(o);
        return (
          <button
            key={`${o.label}-${i}`}
            type="button"
            disabled={!on}
            onClick={() => onTap(o)}
            className={cn(
              "min-h-11 rounded-full border px-3.5 py-2 text-left text-sm font-medium leading-tight transition-colors",
              o.primary
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border bg-card text-foreground hover:bg-accent",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Bubble({ m, children }: { m: ChatMessage; children?: React.ReactNode }) {
  const isClient = m.from === "client";
  const isManager = m.from === "manager";
  const hasBody = m.text.length > 0;
  return (
    <li className={cn("bubble-in flex", isClient ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%] sm:max-w-[80%]", isClient ? "items-end" : "items-start")}>
        {isManager && (
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden /> Salon manager (demo)
          </p>
        )}
        {(hasBody || m.card) && (
          <div
            className={cn(
              "rounded-2xl px-3 py-2 shadow-soft",
              isClient && "rounded-br-md bg-bubble-client text-bubble-client-foreground",
              m.from === "bot" && "rounded-bl-md bg-bubble-bot",
              isManager && "rounded-bl-md border border-gold bg-bubble-manager",
            )}
          >
            {hasBody && <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.text}</p>}
            {m.card && <div className={cn(hasBody && "mt-2")}><ChatCardView card={m.card} /></div>}
            <p className={cn("mt-1 text-right text-[11px] text-muted-foreground", isClient && "text-bubble-client-foreground/70")}>
              {fmtStamp(m.time)}
              {isClient && <CheckCheck className="ml-1 inline size-3.5 text-sky-500" aria-label="Read" />}
            </p>
          </div>
        )}
        {children}
      </div>
    </li>
  );
}

export function ChatPanel() {
  const { state, typing, tap, sendText } = useAura();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state.messages.length, typing]);

  const lastClient = state.messages.reduce((acc, m, i) => (m.from === "client" ? i : acc), -1);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Type a message first, or tap one of the buttons above.");
      return;
    }
    setError("");
    sendText(text);
    setText("");
  };

  return (
    <section aria-label="Client chat" className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-panel">
      <header className="flex items-center gap-3 bg-chat-header px-3 py-2.5 text-chat-header-foreground">
        <ArrowLeft className="size-5 shrink-0" aria-hidden />
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-gradient text-rose-foreground">
          <Bot className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight">Glow Beauty Lounge</p>
          <p className="truncate text-xs opacity-80">{typing ? "typing…" : "online · mock WhatsApp chat"}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-4" aria-hidden>
          <Video className="size-5" />
          <Phone className="size-5" />
          <EllipsisVertical className="size-5" />
        </div>
      </header>

      <div ref={listRef} className="chat-wallpaper min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        <p className="mx-auto mb-4 flex w-fit max-w-full items-center gap-1.5 rounded-lg bg-card/90 px-3 py-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          Scripted assistant, not a language model. Example data only.
        </p>
        <ul className="space-y-3">
          {state.messages.map((m, i) => (
            <Bubble key={m.id} m={m}>
              {m.options && m.options.length > 0 && (
                <Options
                  options={m.options}
                  enabled={(o) => {
                    if (o.action.k === "offerAccept" || o.action.k === "offerDecline") {
                      const id = o.action.offerId;
                      return state.offers.some((x) => x.id === id && x.status === "pending");
                    }
                    return i > lastClient;
                  }}
                  onTap={(o) => tap(o.label, o.action)}
                />
              )}
            </Bubble>
          ))}
          {typing && (
            <li className="flex justify-start" aria-label="AuraBot is typing">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-bubble-bot px-4 py-3 shadow-soft">
                {[0, 1, 2].map((n) => (
                  <span key={n} className="typing-dot size-2 rounded-full bg-muted-foreground" style={{ animationDelay: `${n * 0.15}s` }} />
                ))}
              </div>
            </li>
          )}
        </ul>
      </div>

      <div className="border-t border-border bg-card px-3 pb-3 pt-2">
        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Try typing">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendText(s)}
              className="min-h-9 shrink-0 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              “{s}”
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message AuraBot
          </label>
          <input
            id="chat-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError("");
            }}
            placeholder="Type a message…"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "chat-error" : undefined}
            className="min-h-12 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-[15px] placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="size-5" aria-hidden />
          </button>
        </form>
        {error && (
          <p id="chat-error" role="alert" className="mt-1.5 px-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
