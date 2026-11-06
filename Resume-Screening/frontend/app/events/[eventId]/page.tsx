"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  LockKeyhole,
  Pencil,
  Play,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ResumeDashboard } from "@/components/resume-dashboard";
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
  deleteEvent,
  getCompany,
  getEvent,
  transitionEventStatus,
  updateEvent,
  type Event,
  type EventInput,
} from "@/lib/api";
import {
  addDayToDateString,
  getLocalDateString,
  validateEventForm,
  type FieldErrors,
} from "@/lib/validation";

function eventInput(event: Event): EventInput {
  return {
    title: event.title,
    job_role: event.job_role,
    department: event.department ?? "",
    job_description: event.job_description ?? "",
    location: event.location ?? "",
    employment_type: event.employment_type,
    min_exp_years: event.min_exp_years,
    openings: event.openings,
    start_date: event.start_date ?? "",
    end_date: event.end_date ?? "",
  };
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventInput | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [lifecycleAction, setLifecycleAction] = useState<"close" | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState("");
  const today = getLocalDateString();
  const eventExpired = Boolean(event?.end_date && event.end_date < today);
  const cancelEventDelete = () => {
    if (!deleting) {
      setConfirmDelete(false);
      setDeleteError("");
    }
  };

  useEffect(() => {
    getCompany()
      .then(() => getEvent(eventId))
      .then((current) => {
        setEvent(current);
        setForm(eventInput(current));
      })
      .catch((requestError: unknown) => {
        clearAccessToken();
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "Could not load this event.",
        );
        router.replace("/login");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load this event.",
        );
      });
  }, [eventId, router]);

  async function saveEvent(eventSubmit: React.FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!form) return;
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
      const updated = await updateEvent(eventId, form);
      setEvent(updated);
      setForm(eventInput(updated));
      setEditing(false);
      toast.success("Recruitment event updated successfully.");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not update event.";
      if (requestError instanceof ApiError) {
        setFieldErrors(requestError.fieldErrors);
      }
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent() {
    setDeleting(true);
    setDeleteError("");
    setError("");
    try {
      await deleteEvent(eventId);
      setConfirmDelete(false);
      toast.success("Recruitment event deleted successfully.");
      router.replace("/events");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not delete event.";
      setDeleteError(message);
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  async function transitionLifecycle(nextStatus: "open" | "closed") {
    if (!event) return;
    setTransitioning(true);
    setTransitionError("");
    try {
      const updated = await transitionEventStatus(event.id, nextStatus);
      setEvent(updated);
      setForm(eventInput(updated));
      setEditing(false);
      setLifecycleAction(null);
      toast.success(
        nextStatus === "open"
          ? "Recruitment event started successfully."
          : "Recruitment event closed successfully.",
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not update event status.";
      setTransitionError(message);
      toast.error(message);
    } finally {
      setTransitioning(false);
    }
  }

  if (!event) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-5 py-12 text-center text-sm text-muted">
        {error || "Loading event…"}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-12 pt-6 sm:px-8 lg:px-12">
      <SiteHeader authenticated />
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} /> All events
        </Link>
        <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold">
            <Settings size={14} /> Settings
        </Link>
      </div>

      <section className="mt-8 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                {event.job_role}
              </span>
              <span className="rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold capitalize text-muted">
                {event.status}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{event.title}</h1>
            <p className="mt-2 text-sm text-muted">
              {[event.department, event.location, event.employment_type?.replace("_", " ")]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {event.job_description && (
              <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-6 text-muted">
                {event.job_description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {event.status === "draft" && (
              <>
                <button
                  type="button"
                  disabled={eventExpired}
                  onClick={() => setEditing((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-xs font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                  title={eventExpired ? "Expired events cannot be edited." : undefined}
                >
                  <Pencil size={14} /> {editing ? "Cancel edit" : "Edit event"}
                </button>
                <button
                  type="button"
                  disabled={eventExpired || transitioning}
                  onClick={() => void transitionLifecycle("open")}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-xs font-semibold text-white hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
                  title={eventExpired ? "Expired events cannot be started." : undefined}
                >
                  <Play size={14} /> Start Event
                </button>
              </>
            )}
            {event.status === "open" && (
              <button
                type="button"
                disabled={transitioning}
                onClick={() => {
                  setTransitionError("");
                  setLifecycleAction("close");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-xs font-semibold hover:border-accent disabled:opacity-50"
              >
                <LockKeyhole size={14} /> Close Event
              </button>
            )}
            <button
              onClick={() => {
                setDeleteError("");
                setConfirmDelete(true);
              }}
              type="button"
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl border border-danger-border px-3 py-2.5 text-xs font-semibold text-danger hover:bg-danger-soft disabled:opacity-60"
            >
              <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>

        {editing && form && (
          <form onSubmit={saveEvent} noValidate className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold">Event title
              <input id="title" name="title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "title-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.title && <span id="title-error" className="text-xs font-normal text-danger">{fieldErrors.title}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Job role
              <input id="job_role" name="job_role" required maxLength={150} value={form.job_role} onChange={(e) => setForm({ ...form, job_role: e.target.value })} aria-invalid={Boolean(fieldErrors.job_role)} aria-describedby={fieldErrors.job_role ? "job_role-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.job_role && <span id="job_role-error" className="text-xs font-normal text-danger">{fieldErrors.job_role}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Department
              <input id="department" name="department" maxLength={100} value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} aria-invalid={Boolean(fieldErrors.department)} aria-describedby={fieldErrors.department ? "department-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.department && <span id="department-error" className="text-xs font-normal text-danger">{fieldErrors.department}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Location
              <input id="location" name="location" maxLength={150} value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} aria-invalid={Boolean(fieldErrors.location)} aria-describedby={fieldErrors.location ? "location-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.location && <span id="location-error" className="text-xs font-normal text-danger">{fieldErrors.location}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Employment type
              <Select
                value={form.employment_type ?? "full_time"}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    employment_type: value as EventInput["employment_type"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Minimum experience
              <input id="min_exp_years" name="min_exp_years" type="number" min={0} step={1} value={form.min_exp_years} onChange={(e) => setForm({ ...form, min_exp_years: Number(e.target.value) })} aria-invalid={Boolean(fieldErrors.min_exp_years)} aria-describedby={fieldErrors.min_exp_years ? "min_exp_years-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.min_exp_years && <span id="min_exp_years-error" className="text-xs font-normal text-danger">{fieldErrors.min_exp_years}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Openings
              <input id="openings" name="openings" type="number" min={1} step={1} value={form.openings} onChange={(e) => setForm({ ...form, openings: Number(e.target.value) })} aria-invalid={Boolean(fieldErrors.openings)} aria-describedby={fieldErrors.openings ? "openings-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.openings && <span id="openings-error" className="text-xs font-normal text-danger">{fieldErrors.openings}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Start date
              <input id="start_date" name="start_date" type="date" min={today || undefined} value={form.start_date ?? ""} onChange={(e) => {
                const startDate = e.target.value;
                setForm((current) => current ? {
                  ...current,
                  start_date: startDate,
                  end_date:
                    startDate && current.end_date && current.end_date <= startDate
                      ? ""
                      : current.end_date,
                } : current);
              }} aria-invalid={Boolean(fieldErrors.start_date)} aria-describedby={fieldErrors.start_date ? "start_date-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.start_date && <span id="start_date-error" className="text-xs font-normal text-danger">{fieldErrors.start_date}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">End date
              <input id="end_date" name="end_date" type="date" min={form.start_date ? addDayToDateString(form.start_date) : today || undefined} value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} aria-invalid={Boolean(fieldErrors.end_date)} aria-describedby={fieldErrors.end_date ? "end_date-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.end_date && <span id="end_date-error" className="text-xs font-normal text-danger">{fieldErrors.end_date}</span>}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2 lg:col-span-3">Job description
              <textarea id="job_description" name="job_description" maxLength={10000} rows={4} value={form.job_description ?? ""} onChange={(e) => setForm({ ...form, job_description: e.target.value })} aria-invalid={Boolean(fieldErrors.job_description)} aria-describedby={fieldErrors.job_description ? "job_description-error" : undefined} className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-normal" />
              {fieldErrors.job_description && <span id="job_description-error" className="text-xs font-normal text-danger">{fieldErrors.job_description}</span>}
            </label>
            <div className="flex justify-end sm:col-span-2 lg:col-span-3">
              <button disabled={saving} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>

      {event.status === "closed" ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          This event is closed. You can view the existing resumes and shortlist results, but no further recruitment operations are allowed.
        </p>
      ) : eventExpired ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          This event has passed its end date. Recruitment operations are no longer allowed.
        </p>
      ) : null}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-8">
        <ResumeDashboard
          eventId={event.id}
          operationsDisabled={event.status === "closed" || eventExpired}
          disabledMessage={
            event.status === "closed"
              ? "This event is closed. No further recruitment operations are allowed."
              : eventExpired
                ? "This event has passed its end date. Recruitment operations are no longer allowed."
                : "Recruitment operations are currently unavailable."
          }
          showHeader={false}
        />
      </div>
      <ConfirmationDialog
        open={lifecycleAction === "close"}
        title="Close this recruitment event?"
        description="Closing the event disables further recruitment operations. Existing resumes and shortlist results will remain available."
        confirmLabel="Close event"
        pendingLabel="Closing…"
        pending={transitioning}
        error={transitionError}
        onCancel={() => {
          if (!transitioning) {
            setLifecycleAction(null);
            setTransitionError("");
          }
        }}
        onConfirm={() => void transitionLifecycle("closed")}
      />
      <ConfirmationDialog
        open={confirmDelete}
        title="Delete this recruitment event?"
        description="This also removes the event’s indexed resumes and cannot be undone."
        confirmLabel="Delete event"
        pendingLabel="Deleting…"
        pending={deleting}
        error={deleteError}
        onCancel={cancelEventDelete}
        onConfirm={() => void removeEvent()}
      />
    </main>
  );
}
