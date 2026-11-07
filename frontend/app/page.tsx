import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";

const steps = [
  {
    number: "01",
    title: "Create a hiring event",
    description: "Set up a role, add its details, and keep each search organized.",
  },
  {
    number: "02",
    title: "Add resume PDFs",
    description: "Upload candidate resumes to the event you are hiring for.",
  },
  {
    number: "03",
    title: "Ask and shortlist",
    description: "Search in plain language and review the resume evidence behind matches.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-12 pt-6 sm:px-8 lg:px-12">
      <SiteHeader />

      <section className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Resume screening, made clearer
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-6xl">
            Find the right people with evidence, not guesswork.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted">
            Organize hiring events, upload resumes, and ask natural-language
            questions. Review relevant resume evidence alongside every shortlist.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent"
            >
              Get started <ArrowRight size={17} />
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-xl border border-line bg-surface px-5 py-3.5 text-sm font-semibold hover:border-accent hover:text-accent"
            >
              How it works
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-accent" /> Private company workspace
            </span>
            <span className="inline-flex items-center gap-2">
              <FileText size={16} className="text-accent" /> PDF resume intake
            </span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-line bg-surface p-5 shadow-card sm:p-8">
          <div className="flex items-center justify-between border-b border-line pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                TalentDesk workflow
              </p>
              <h2 className="mt-1 text-xl font-semibold">Hiring, in context</h2>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Sparkles size={21} />
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4 rounded-2xl bg-canvas p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-xs font-bold text-accent">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-accent-soft px-4 py-3">
            <Search size={17} className="shrink-0 text-accent" />
            <p className="text-xs leading-5 text-ink">
              Candidate data stays scoped to your company and hiring event.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 border-y border-line py-6 sm:grid-cols-3">
        {[
          ["03", "steps to a shortlist"],
          ["PDF", "resume upload format"],
          ["1 event", "isolated candidate workspace"],
        ].map(([value, label]) => (
          <div key={label} className="flex items-center gap-3 px-2">
            <span className="text-2xl font-semibold tracking-tight text-accent">{value}</span>
            <span className="text-xs text-muted">{label}</span>
          </div>
        ))}
      </section>

      <section id="how-it-works" className="border-t border-line py-14">
        <div className="mb-8 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Simple by design
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            From opening to shortlist in three steps.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="rounded-2xl border border-line bg-surface p-6">
              <span className="text-xs font-bold tracking-widest text-accent">{step.number}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-between gap-5 rounded-3xl bg-ink px-6 py-9 text-white sm:flex-row sm:items-center sm:px-9">
        <div>
          <h2 className="text-2xl font-semibold">Make your next shortlist count.</h2>
          <p className="mt-2 text-sm text-white/70">
            Create a company workspace and start with your next open role.
          </p>
        </div>
        <Link
          href="/register"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-accent-soft"
        >
          Create account <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="mt-16 rounded-3xl border border-line bg-surface px-6 py-9 sm:px-10 sm:py-11">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="TalentDesk home">
              <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
                <UsersRound size={20} strokeWidth={1.8} />
              </span>
              <span className="text-base font-semibold tracking-tight">talentdesk</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-muted">
              A clearer way to organize resumes, search with context, and build
              confident shortlists.
            </p>
          </div>

          <nav aria-label="Product links">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Product
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link className="text-ink hover:text-accent" href="#how-it-works">How it works</Link></li>
              <li><Link className="text-ink hover:text-accent" href="/register">Create a workspace</Link></li>
            </ul>
          </nav>

          <nav aria-label="Workspace links">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Workspace
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link className="text-ink hover:text-accent" href="/login">Log in</Link></li>
              <li><Link className="text-ink hover:text-accent" href="/register">Get started</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Built for recruiters
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Keep every hiring event focused, and every shortlist grounded in
              candidate resumes.
            </p>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© TalentDesk. All rights reserved.</span>
          <span>Thoughtful hiring starts with better context.</span>
        </div>
      </footer>
    </main>
  );
}
