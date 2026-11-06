"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiError,
  clearAccessToken,
  createEvent,
  getCompany,
  getEvents,
  type Company,
  type Event,
  type EventInput,
} from "@/lib/api";
import {
  addDayToDateString,
  getLocalDateString,
  validateEventForm,
  type FieldErrors,
} from "@/lib/validation";

const emptyEvent: EventInput = {
  title: "",
  job_role: "",
  department: "",
  job_description: "",
  location: "",
  employment_type: "full_time",
  min_exp_years: 0,
  openings: 1,
};

export default function EventsPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState<EventInput>(emptyEvent);
  const [showForm, setShowForm] = useState(false);
  const [eventFilter, setEventFilter] = useState<"all" | Event["status"]>("all");
  const [eventSearch, setEventSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const today = getLocalDateString();

  useEffect(() => {
    Promise.all([getCompany(), getEvents()])
      .then(([profile, eventList]) => {
        setCompany(profile);
        setEvents(eventList);
      })
      .catch((requestError: unknown) => {
        clearAccessToken();
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "Could not load workspace.",
        );
        router.replace("/login");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load workspace.",
        );
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateEventForm(form);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const message = "Please correct the highlighted fields.";
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const created = await createEvent(form);
      setEvents((current) => [created, ...current]);
      setForm(emptyEvent);
      setShowForm(false);
      toast.success("Recruitment event created successfully.");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not create event.";
      if (requestError instanceof ApiError) {
        setFieldErrors(requestError.fieldErrors);
      }
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const statusCounts = {
    open: events.filter((event) => event.status === "open").length,
    draft: events.filter((event) => event.status === "draft").length,
    closed: events.filter((event) => event.status === "closed").length,
  };
  const visibleEvents = events.filter((event) => {
    const matchesStatus = eventFilter === "all" || event.status === eventFilter;
    const search = eventSearch.trim().toLocaleLowerCase();
    const matchesSearch =
      !search ||
      `${event.title} ${event.job_role} ${event.department ?? ""}`
        .toLocaleLowerCase()
        .includes(search);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <main className="p-12 text-center text-sm text-muted">Loading your workspace…</main>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-12 pt-6 sm:px-8 lg:px-12">
      <SiteHeader authenticated />
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Building2 size={20} />
          </span>
          <div>
            <p className="text-xs text-muted">Company workspace</p>
            <h1 className="text-lg font-semibold">{company?.name ?? "Your company"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-semibold hover:border-accent"
          >
            <Settings size={15} /> Settings
          </Link>
        </div>
      </div>

      <section className="mt-12 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Hiring overview
          </p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight">Your hiring events</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Keep each role, its resumes, and candidate searches in a separate workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((visible) => !visible)}
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-accent"
        >
          <Plus size={17} /> Create event
        </button>
      </section>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submitEvent}
          noValidate
          className="mt-7 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Create a hiring event</h3>
            <p className="mt-1 text-xs text-muted">Add the role details before you invite resumes.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold">
              Event title *
              <input id="title" name="title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "title-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" placeholder="Senior engineer hiring" />
              {fieldErrors.title && <span id="title-error" className="text-xs font-normal text-danger">{fieldErrors.title}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Job role *
              <input id="job_role" name="job_role" required maxLength={150} value={form.job_role} onChange={(e) => setForm({ ...form, job_role: e.target.value })} aria-invalid={Boolean(fieldErrors.job_role)} aria-describedby={fieldErrors.job_role ? "job_role-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" placeholder="Software Engineer" />
              {fieldErrors.job_role && <span id="job_role-error" className="text-xs font-normal text-danger">{fieldErrors.job_role}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Department
              <input id="department" name="department" maxLength={100} value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} aria-invalid={Boolean(fieldErrors.department)} aria-describedby={fieldErrors.department ? "department-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" placeholder="Engineering" />
              {fieldErrors.department && <span id="department-error" className="text-xs font-normal text-danger">{fieldErrors.department}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Location
              <input id="location" name="location" maxLength={150} value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} aria-invalid={Boolean(fieldErrors.location)} aria-describedby={fieldErrors.location ? "location-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" placeholder="City or remote" />
              {fieldErrors.location && <span id="location-error" className="text-xs font-normal text-danger">{fieldErrors.location}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Employment type
              <Select
                value={form.employment_type ?? "full_time"}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    employment_type: value as EventInput["employment_type"],
                  })
                }
              >
                <SelectTrigger className="bg-canvas">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Minimum experience (years)
              <input id="min_exp_years" name="min_exp_years" type="number" min={0} step={1} value={form.min_exp_years} onChange={(e) => setForm({ ...form, min_exp_years: Number(e.target.value) })} aria-invalid={Boolean(fieldErrors.min_exp_years)} aria-describedby={fieldErrors.min_exp_years ? "min_exp_years-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" />
              {fieldErrors.min_exp_years && <span id="min_exp_years-error" className="text-xs font-normal text-danger">{fieldErrors.min_exp_years}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Openings
              <input id="openings" name="openings" required type="number" min={1} step={1} value={form.openings} onChange={(e) => setForm({ ...form, openings: Number(e.target.value) })} aria-invalid={Boolean(fieldErrors.openings)} aria-describedby={fieldErrors.openings ? "openings-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" />
              {fieldErrors.openings && <span id="openings-error" className="text-xs font-normal text-danger">{fieldErrors.openings}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Start date
              <input id="start_date" name="start_date" type="date" min={today || undefined} value={form.start_date ?? ""} onChange={(e) => {
                const startDate = e.target.value;
                setForm((current) => ({
                  ...current,
                  start_date: startDate,
                  end_date:
                    startDate && current.end_date && current.end_date <= startDate
                      ? ""
                      : current.end_date,
                }));
              }} aria-invalid={Boolean(fieldErrors.start_date)} aria-describedby={fieldErrors.start_date ? "start_date-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" />
              {fieldErrors.start_date && <span id="start_date-error" className="text-xs font-normal text-danger">{fieldErrors.start_date}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              End date
              <input id="end_date" name="end_date" type="date" min={form.start_date ? addDayToDateString(form.start_date) : today || undefined} value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} aria-invalid={Boolean(fieldErrors.end_date)} aria-describedby={fieldErrors.end_date ? "end_date-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" />
              {fieldErrors.end_date && <span id="end_date-error" className="text-xs font-normal text-danger">{fieldErrors.end_date}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2 lg:col-span-3">
              Job description
              <textarea id="job_description" name="job_description" maxLength={10000} rows={4} value={form.job_description ?? ""} onChange={(e) => setForm({ ...form, job_description: e.target.value })} aria-invalid={Boolean(fieldErrors.job_description)} aria-describedby={fieldErrors.job_description ? "job_description-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal" placeholder="Describe the role and requirements…" />
              {fieldErrors.job_description && <span id="job_description-error" className="text-xs font-normal text-danger">{fieldErrors.job_description}</span>}
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Cancel</button>
            <button disabled={saving} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Creating…" : "Create event"}
            </button>
          </div>
        </form>
      )}

      <section className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        {(["open", "draft", "closed"] as const).map((state) => (
          <div key={state} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-xs capitalize text-muted">{state} events</p>
            <p className="mt-1 text-2xl font-semibold">{statusCounts[state]}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">All events</h3>
          <span className="text-xs text-muted">{events.length} total</span>
        </div>
        <div className="mb-4 grid grid-cols-[80%_15%] items-center justify-between">
          <input
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            placeholder="Search events or job roles"
            className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
          />
          <Select
            value={eventFilter}
            onValueChange={(value) =>
              setEventFilter(value as typeof eventFilter)
            }
          >
            <SelectTrigger
              aria-label="Filter events by status"
              className="h-10 w-full min-w-0 bg-surface text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
            <BriefcaseBusiness className="mx-auto mb-3 text-muted" size={24} />
            <p className="text-sm font-semibold">No hiring events yet</p>
            <p className="mt-1 text-xs text-muted">Create an event to start collecting resumes.</p>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            No events match this search or status.
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {visibleEvents.map((event) => (
              <li key={event.id} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-accent">{event.job_role}</p>
                    <h4 className="mt-1 truncate text-lg font-semibold">{event.title}</h4>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarDays size={14} /> {event.location || "Location not set"} · {event.openings} opening{event.openings === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${event.status === "open" ? "bg-accent-soft text-accent" : event.status === "closed" ? "bg-canvas text-muted" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200"}`}>
                    {event.status}
                  </span>
                </div>
                <Link href={`/events/${event.id}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                  Open event <ArrowRight size={14} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer className="mt-12 border-t border-line pt-5 text-xs text-muted">
        TalentDesk · Company hiring workspace · <UsersRound className="inline" size={13} /> Private event data
      </footer>
    </main>
  );
}
