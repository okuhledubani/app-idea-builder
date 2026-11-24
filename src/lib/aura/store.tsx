import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  appendBot,
  clientAction,
  clientText,
  replyToEscalation,
  sendReminder,
  simulateCancel,
  simulateOfferReply,
} from "./engine";
import { createInitialState } from "./seed";
import type { ChatAction, DemoState, EngineResult, Reply } from "./types";

interface AuraStore {
  state: DemoState;
  typing: boolean;
  sendText: (text: string) => void;
  tap: (label: string, action: ChatAction) => void;
  cancelExample: (bookingId: string) => void;
  offerReply: (offerId: string, yes: boolean) => void;
  replyEscalation: (id: string) => void;
  sendReminderNow: (id: string) => void;
  reset: () => void;
  resetCount: number;
}

const Ctx = createContext<AuraStore | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createInitialState(Date.now()));
  const [typing, setTyping] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const ref = useRef(state);
  const queue = useRef<Reply[]>([]);
  const running = useRef(false);
  const gen = useRef(0);

  const commit = useCallback((next: DemoState) => {
    ref.current = next;
    setState(next);
  }, []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const g = gen.current;
    while (queue.current.length) {
      const next = queue.current[0];
      setTyping(true);
      const len = next?.text.length ?? 0;
      await sleep(550 + Math.min(len * 6, 650));
      if (g !== gen.current) return;
      const r = queue.current.shift();
      if (r) commit(appendBot(ref.current, r, Date.now()));
    }
    setTyping(false);
    running.current = false;
  }, [commit]);

  const run = useCallback(
    (fn: (s: DemoState, now: number) => EngineResult) => {
      const res = fn(ref.current, Date.now());
      commit(res.state);
      if (res.replies.length) {
        queue.current.push(...res.replies);
        void pump();
      }
    },
    [commit, pump],
  );

  const reset = useCallback(() => {
    gen.current += 1;
    queue.current = [];
    running.current = false;
    setTyping(false);
    commit(createInitialState(Date.now()));
    setResetCount((c) => c + 1);
  }, [commit]);

  useEffect(() => () => {
    gen.current += 1;
  }, []);

  const value = useMemo<AuraStore>(
    () => ({
      state,
      typing,
      resetCount,
      reset,
      sendText: (text) => run((s, now) => clientText(s, text, now)),
      tap: (label, action) => run((s, now) => clientAction(s, label, action, now)),
      cancelExample: (id) => run((s, now) => simulateCancel(s, id, now)),
      offerReply: (id, yes) => run((s, now) => simulateOfferReply(s, id, yes, now)),
      replyEscalation: (id) => run((s, now) => replyToEscalation(s, id, now)),
      sendReminderNow: (id) => run((s, now) => sendReminder(s, id, now)),
    }),
    [state, typing, resetCount, reset, run],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAura() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAura must be used inside AuraProvider");
  return v;
}
