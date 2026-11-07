"use client";

import {
  ArrowUpRight,
  Check,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  ApiError,
  deleteResume,
  getResumes,
  getResumePdf,
  searchCandidates,
  uploadResumes,
  type CandidateSearchResult,
  type ResumeCandidate,
} from "@/lib/api";
import { validateSearchQuery } from "@/lib/validation";

const exampleQueries = [
  "Find candidates with Python and machine learning experience",
  "Shortlist candidates with backend development experience",
  "Find candidates who have worked with Node.js and MongoDB",
];

export function ResumeDashboard({
  eventId,
  operationsDisabled = false,
  disabledMessage = "Recruitment operations are currently unavailable.",
  showHeader = true,
}: {
  eventId: string;
  operationsDisabled?: boolean;
  disabledMessage?: string;
  showHeader?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [resumes, setResumes] = useState<ResumeCandidate[]>([]);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<CandidateSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [queryError, setQueryError] = useState("");
  const [fileError, setFileError] = useState("");
  const [confirmDeleteResume, setConfirmDeleteResume] = useState("");
  const [deletingResume, setDeletingResume] = useState(false);
  const [deleteResumeError, setDeleteResumeError] = useState("");
  const [previewCandidate, setPreviewCandidate] =
    useState<CandidateSearchResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreviewFor, setLoadingPreviewFor] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewCandidate(null);
        setPreviewUrl(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const refreshResumes = useCallback(async () => {
    try {
      setResumes(await getResumes(eventId));
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not load the candidate library.";
      setError(
        message,
      );
      toast.error(message);
    } finally {
      setIsLoadingResumes(false);
    }
  }, [eventId]);

  useEffect(() => {
    let active = true;
    getResumes(eventId)
      .then((candidates) => {
        if (active) setResumes(candidates);
      })
      .catch((requestError: unknown) => {
        if (active) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : "Could not load the candidate library.";
          setError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (active) setIsLoadingResumes(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  function addFiles(incoming: FileList | File[]) {
    const selected = Array.from(incoming);
    const pdfs = selected.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length !== selected.length) {
      const message = "Only PDF resumes can be uploaded.";
      setFileError(message);
      toast.error(message);
    }
    setFiles((current) => {
      const names = new Set(current.map((file) => file.name.toLowerCase()));
      const next = [...current];
      for (const file of pdfs) {
        const name = file.name.toLowerCase();
        if (!names.has(name)) {
          names.add(name);
          next.push(file);
        }
      }
      return next;
    });
    setError("");
    setUploadMessage("");
    if (pdfs.length === selected.length) setFileError("");
  }

  async function handleUpload() {
    if (operationsDisabled) {
      toast.error(disabledMessage);
      return;
    }
    if (files.length === 0) {
      const message = "Choose one or more PDF resumes to upload.";
      setError(message);
      toast.error(message);
      return;
    }
    setIsUploading(true);
    setError("");
    setFileError("");
    setUploadMessage("");
    setIsLoadingResumes(true);
    try {
      const response = await uploadResumes(eventId, files);
      setUploadMessage(
        `${response.results.length} ${response.results.length === 1 ? "resume" : "resumes"} indexed successfully.`,
      );
      toast.success(
        `${response.results.length} ${response.results.length === 1 ? "resume" : "resumes"} uploaded successfully.`,
      );
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
      await refreshResumes();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Resume upload failed. Please try again.";
      setError(message);
      setFileError(message);
      toast.error(message);
      await refreshResumes();
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operationsDisabled) {
      toast.error(disabledMessage);
      return;
    }
    const validationErrors = validateSearchQuery(searchText);
    setQueryError(validationErrors.query ?? "");
    if (validationErrors.query) {
      setError(validationErrors.query);
      toast.error(validationErrors.query);
      return;
    }
    setIsSearching(true);
    setHasSearched(false);
    setError("");
    setQueryError("");
    try {
      const response = await searchCandidates(eventId, searchText.trim());
      setResults(response.results);
      setHasSearched(true);
    } catch (requestError) {
      setResults([]);
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Candidate search failed. Please try again.";
      if (requestError instanceof ApiError) {
        setQueryError(requestError.fieldErrors.query ?? "");
      }
      setError(message);
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  }

  const cancelResumeDelete = () => {
    if (!deletingResume) {
      setConfirmDeleteResume("");
      setDeleteResumeError("");
    }
  };

  async function handleDeleteResume(candidateId: string) {
    setDeletingResume(true);
    setDeleteResumeError("");
    try {
      await deleteResume(eventId, candidateId);
      setResumes((current) =>
        current.filter((resume) => resume.candidate_id !== candidateId),
      );
      setResults((current) =>
        current.filter((result) => result.candidate_id !== candidateId),
      );
      if (previewCandidate?.candidate_id === candidateId) {
        setPreviewCandidate(null);
        setPreviewUrl(null);
      }
      setConfirmDeleteResume("");
      toast.success("Resume and indexed data deleted successfully.");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the resume.";
      setDeleteResumeError(message);
      setError(message);
      toast.error(message);
    } finally {
      setDeletingResume(false);
    }
  }

  async function handlePreviewResume(candidate: CandidateSearchResult) {
    setLoadingPreviewFor(candidate.candidate_id);
    try {
      const pdf = await getResumePdf(eventId, candidate.candidate_id);
      setPreviewCandidate(candidate);
      setPreviewUrl(URL.createObjectURL(pdf));
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not load this resume PDF.";
      toast.error(message);
    } finally {
      setLoadingPreviewFor(null);
    }
  }

  function closeResumePreview() {
    setPreviewCandidate(null);
    setPreviewUrl(null);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:px-12">
      {showHeader && (
        <header className="mb-12 flex items-center justify-between border-b border-line pb-5">
          <a href="#" className="flex items-center gap-3" aria-label="TalentDesk home">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
              <UsersRound size={20} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">talentdesk</span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                recruiter workspace
              </span>
            </span>
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted sm:flex">
            <span className="size-2 rounded-full bg-accent" />
            RAG workspace
          </div>
        </header>
      )}

      <section className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Candidate intelligence
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
            Find the right person
            <br className="hidden sm:block" /> for what&apos;s next.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted sm:text-base">
            Your resume library, ready to search. Upload profiles and shortlist
            candidates with a question in plain language.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3 shadow-card">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <UsersRound size={19} />
          </span>
          <span>
            <span className="block text-xl font-semibold leading-6">
              {isLoadingResumes ? "—" : resumes.length}
            </span>
            <span className="text-xs text-muted">indexed candidates</span>
          </span>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-foreground"
        >
          <X className="mt-0.5 shrink-0" size={17} />
          <span>{error}</span>
          <button
            type="button"
            className="ml-auto shrink-0 text-danger underline underline-offset-2"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="mb-10 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-8">
        {operationsDisabled && (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {disabledMessage}
          </p>
        )}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <span className="grid size-6 place-items-center rounded-lg bg-accent-soft">01</span>
              Resume intake
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Add resumes</h2>
            <p className="mt-1 text-sm text-muted">
              Upload PDF files to index them in your candidate library.
            </p>
          </div>
          <span className="hidden rounded-full bg-canvas px-3 py-1.5 text-xs font-medium text-muted sm:inline-flex">
            PDF only
          </span>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!operationsDisabled) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!operationsDisabled) addFiles(event.dataTransfer.files);
          }}
          aria-disabled={operationsDisabled}
          className={`rounded-2xl border border-dashed px-5 py-9 text-center transition-colors sm:py-11 ${
            isDragging
              ? "border-accent bg-accent-soft/70"
              : "border-line bg-canvas hover:border-accent/60"
          } ${operationsDisabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="sr-only"
            disabled={operationsDisabled}
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
            }}
          />
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
            <UploadCloud size={23} strokeWidth={1.8} />
          </span>
          <p className="text-sm font-semibold">Drop your resumes here</p>
          <p className="mt-1 text-xs text-muted">or choose PDF files from your device</p>
          <button
            type="button"
            disabled={operationsDisabled}
            onClick={() => fileInput.current?.click()}
            className="mt-4 rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Browse files
          </button>
        </div>
        {fileError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {fileError}
          </p>
        )}

        {files.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {files.map((file) => (
              <li
                key={`${file.name}-${file.lastModified}`}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-canvas text-muted">
                  <FileText size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  disabled={operationsDisabled}
                  onClick={() =>
                    setFiles((current) => current.filter((item) => item !== file))
                  }
                  className="rounded-md p-1 text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {uploadMessage || (files.length ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "Your files stay in your project data folder.")}
          </p>
          <button
            type="button"
            disabled={operationsDisabled || isUploading || files.length === 0}
            onClick={() => void handleUpload()}
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isUploading ? (
              <>
                <LoaderCircle className="animate-spin" size={16} />
                Uploading and indexing…
              </>
            ) : (
              <>
                {operationsDisabled ? "Operations unavailable" : "Upload resumes"}
                <ArrowUpRight size={16} />
              </>
            )}
          </button>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <span className="grid size-6 place-items-center rounded-lg bg-accent-soft">02</span>
              Your library
            </div>
            <h2 className="text-xl font-semibold tracking-tight">All resumes</h2>
          </div>
          <span className="text-xs text-muted">
            {isLoadingResumes ? "Refreshing…" : `${resumes.length} indexed`}
          </span>
        </div>

        {isLoadingResumes ? (
          <div className="flex items-center justify-center rounded-2xl border border-line bg-surface px-6 py-10 text-sm text-muted">
            <LoaderCircle className="mr-2 animate-spin" size={17} />
            Loading your candidate library…
          </div>
        ) : resumes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/70 px-6 py-9 text-center">
            <FileText className="mx-auto mb-2 text-muted" size={21} />
            <p className="text-sm font-medium">No resumes indexed yet</p>
            <p className="mt-1 text-xs text-muted">Upload a PDF above to get started.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <li
                key={resume.candidate_id}
                className="relative flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-muted">
                  <FileText size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{resume.candidate_name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{resume.filename}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent">
                  <Check size={12} />
                  Indexed
                </span>
                {!operationsDisabled && (
                  <button
                    type="button"
                    aria-label={`Delete ${resume.filename}`}
                    onClick={() =>
                      setConfirmDeleteResume((current) =>
                        current === resume.candidate_id ? "" : resume.candidate_id,
                      )
                    }
                    className="rounded-lg p-2 text-muted transition hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-8">
        {operationsDisabled && (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {disabledMessage}
          </p>
        )}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <span className="grid size-6 place-items-center rounded-lg bg-accent-soft">03</span>
              Search & shortlist
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Who are you looking for?</h2>
            <p className="mt-1 text-sm text-muted">
              Describe the skills, experience, or background that matter.
            </p>
          </div>
          <Sparkles className="mt-1 hidden text-accent sm:block" size={20} />
        </div>

        <form onSubmit={handleSearch}>
          <label htmlFor="candidate-query" className="sr-only">
            Search candidates
          </label>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-canvas p-2 sm:flex-row sm:items-center">
            <Search className="ml-3 hidden shrink-0 text-muted sm:block" size={19} />
            <input
              id="candidate-query"
              name="query"
              maxLength={2000}
              value={searchText}
              disabled={operationsDisabled}
              onChange={(event) => {
                setSearchText(event.target.value);
                setQueryError("");
              }}
              aria-invalid={Boolean(queryError)}
              aria-describedby={queryError ? "candidate-query-error" : undefined}
              placeholder="e.g. Find candidates with Python and machine learning experience"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 sm:px-1"
            />
            <button
              type="submit"
              disabled={operationsDisabled || isSearching}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:brightness-90 disabled:cursor-wait disabled:opacity-70"
            >
              {isSearching ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} />
                  Searching…
                </>
              ) : (
                <>
                  <Search size={16} />
                  Search candidates
                </>
              )}
            </button>
          </div>
          {queryError && (
            <p id="candidate-query-error" className="mt-2 text-xs text-danger">
              {queryError}
            </p>
          )}
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-muted">Try:</span>
          {exampleQueries.map((example) => (
            <button
              key={example}
              type="button"
              disabled={operationsDisabled}
              onClick={() => setSearchText(example)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-xs text-muted transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>

        {isSearching && (
          <div className="mt-7 flex items-center justify-center rounded-2xl bg-canvas px-6 py-10 text-sm text-muted">
            <LoaderCircle className="mr-2 animate-spin text-accent" size={18} />
            Analyzing your query and matching resume evidence…
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-line bg-canvas/60 px-6 py-10 text-center">
            <Search className="mx-auto mb-3 text-muted" size={22} />
            <p className="text-sm font-semibold">No candidates matched this search</p>
            <p className="mt-1 text-xs text-muted">
              Try broadening the skills or experience in your query.
            </p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Shortlisted candidates</h3>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                {results.length} match{results.length === 1 ? "" : "es"}
              </span>
            </div>
            <ul className="space-y-3">
              {results.map((result, index) => (
                <li
                  key={result.candidate_id}
                  className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-semibold text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h4 className="font-semibold">{result.candidate_name}</h4>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                          <FileText size={13} />
                          {result.filename}
                        </p>
                        {(result.email || result.phone || result.experience_years) && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                            {result.email && <span>Email: {result.email}</span>}
                            {result.phone && <span>Phone: {result.phone}</span>}
                            {result.experience_years && (
                              <span>Experience: {result.experience_years}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handlePreviewResume(result)}
                        disabled={loadingPreviewFor === result.candidate_id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-accent disabled:opacity-60"
                      >
                        {loadingPreviewFor === result.candidate_id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Eye size={14} />
                        )}
                        View resume
                      </button>
                      <span className="rounded-full border border-line bg-accent-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        Shortlisted
                      </span>
                    </div>
                  </div>
                  <div className="ml-12 mt-4 rounded-xl border border-line bg-accent-soft px-4 py-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                      Why this candidate
                    </p>
                    <p className="text-sm leading-6 text-ink">
                      {result.matching_explanation}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {previewUrl && previewCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeResumePreview();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-preview-title"
            className="flex h-[min(90vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id="resume-preview-title" className="truncate text-sm font-semibold">
                  {previewCandidate.candidate_name}
                </h2>
                <p className="truncate text-xs text-muted">{previewCandidate.filename}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={previewUrl}
                  download={previewCandidate.filename}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-accent"
                >
                  <Download size={14} />
                  Download
                </a>
                <button
                  type="button"
                  onClick={closeResumePreview}
                  aria-label="Close resume preview"
                  className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink"
                >
                  <X size={17} />
                </button>
              </div>
            </header>
            <iframe
              src={previewUrl}
              title={`Resume PDF for ${previewCandidate.candidate_name}`}
              className="min-h-0 flex-1"
            />
          </section>
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(confirmDeleteResume)}
        title="Delete this resume?"
        description="The original PDF, candidate record, and indexed data will be removed."
        confirmLabel="Delete resume"
        pendingLabel="Deleting…"
        pending={deletingResume}
        error={deleteResumeError}
        onCancel={cancelResumeDelete}
        onConfirm={() => void handleDeleteResume(confirmDeleteResume)}
      />

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted">
        <span>TalentDesk · Resume screening workspace</span>
        <span>Results are grounded in retrieved resume evidence.</span>
      </footer>
    </main>
  );
}
