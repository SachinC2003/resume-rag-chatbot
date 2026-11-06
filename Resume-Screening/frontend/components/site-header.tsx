"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UsersRound } from "lucide-react";
import { ThemeSelector } from "@/components/theme-selector";
import { clearAccessToken } from "@/lib/api";

export function SiteHeader({ authenticated = false }: { authenticated?: boolean }) {
  const router = useRouter();

  function signOut() {
    clearAccessToken();
    router.replace("/");
  }

  return (
    <header className="flex items-center justify-between border-b border-line pb-5">
      <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="TalentDesk home">
        <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
          <UsersRound size={20} strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-base font-semibold tracking-tight">talentdesk</span>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-muted sm:block">
            recruiter workspace
          </span>
        </span>
      </Link>
      <nav className="flex shrink-0 items-center gap-2 text-sm sm:gap-5">
        {authenticated ? (
          <>
            <Link className="whitespace-nowrap font-semibold text-muted hover:text-ink" href="/events">
              Workspace
            </Link>
            <ThemeSelector />
            <button
              type="button"
              onClick={signOut}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-semibold text-muted hover:text-ink sm:px-3"
            >
              <LogOut size={14} /> Log out
            </button>
          </>
        ) : (
          <>
            <Link className="whitespace-nowrap font-semibold text-muted hover:text-ink" href="/login">
              Log in
            </Link>
            <Link
              className="whitespace-nowrap rounded-xl bg-ink px-3 py-2.5 font-semibold text-white hover:bg-accent sm:px-4"
              href="/register"
            >
              Create account
            </Link>
            <ThemeSelector />
          </>
        )}
      </nav>
    </header>
  );
}
