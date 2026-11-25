import { Link } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";

import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export function AccountButton() {
  const { session, ready } = useSession();
  if (!ready) return null;
  if (!session) {
    return (
      <Link to="/auth" className="flex min-h-11 items-center gap-2 rounded-full border border-current/30 px-4 text-sm font-semibold hover:bg-current/10">
        <LogIn className="size-4" aria-hidden /> Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm opacity-85 sm:inline">{session.user.email}</span>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut()}
        className="flex min-h-11 items-center gap-2 rounded-full border border-current/30 px-4 text-sm font-semibold hover:bg-current/10"
      >
        <LogOut className="size-4" aria-hidden /> Sign out
      </button>
    </div>
  );
}
