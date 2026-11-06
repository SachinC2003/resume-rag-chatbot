"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { CompanyProfileField } from "@/components/company-profile-field";
import { SiteHeader } from "@/components/site-header";
import {
  ApiError,
  clearAccessToken,
  getCompany,
  updateCompany,
} from "@/lib/api";
import {
  COMPANY_DETAILS_FIELDS,
  type CompanyProfileFieldName,
} from "@/lib/company-fields";
import { validateProfileForm, type FieldErrors } from "@/lib/validation";

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    industry: "",
    company_size: "",
    website: "",
    city: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCompany()
      .then((profile) => {
        setForm({
          name: profile.name,
          contact_person: profile.contact_person ?? "",
          phone: profile.phone ?? "",
          industry: profile.industry ?? "",
          company_size: profile.company_size ?? "",
          website: profile.website ?? "",
          city: profile.city ?? "",
        });
      })
      .catch((requestError: unknown) => {
        clearAccessToken();
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "Could not load your profile.",
        );
        router.replace("/login");
      });
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateProfileForm(form);
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
      await updateCompany(form);
      toast.success("Profile updated successfully.");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not update profile.";
      if (requestError instanceof ApiError) {
        setFieldErrors(requestError.fieldErrors);
      }
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-12 pt-6 sm:px-8 lg:px-12">
      <SiteHeader authenticated />
      <div className="mx-auto mt-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft size={16} /> Workspace
          </Link>
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Company settings</h1>
        <p className="mt-2 text-sm text-muted">Update your account and company details.</p>
        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
            {error}
          </p>
        )}
        <form onSubmit={submit} noValidate className="mt-6 grid gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card sm:grid-cols-2 sm:p-8">
          {COMPANY_DETAILS_FIELDS.map((field) => (
            <CompanyProfileField
              key={field.name}
              field={field}
              value={form[field.name]}
              error={fieldErrors[field.name]}
              className="grid gap-1.5 text-xs font-semibold"
              inputClassName="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal"
              onChange={(name: CompanyProfileFieldName, value) => {
                if (name === "email") return;
                setForm((current) => ({ ...current, [name]: value }));
                setFieldErrors((current) => ({ ...current, [name]: "" }));
              }}
            />
          ))}
          <div className="flex justify-end sm:col-span-2">
            <button disabled={saving} className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-accent disabled:opacity-60">
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
