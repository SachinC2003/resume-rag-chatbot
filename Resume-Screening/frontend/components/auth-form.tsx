"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { CompanyProfileField } from "@/components/company-profile-field";
import {
  ApiError,
  loginCompany,
  registerCompany,
  setAccessToken,
} from "@/lib/api";
import {
  COMPANY_DETAILS_FIELDS,
  REGISTRATION_EMAIL_FIELD,
  type CompanyProfileFieldName,
} from "@/lib/company-fields";
import { validateCompanyForm, type FieldErrors } from "@/lib/validation";

const registrationFields = [
  COMPANY_DETAILS_FIELDS[0],
  REGISTRATION_EMAIL_FIELD,
  { name: "password" as const, label: "Password", required: true },
  ...COMPANY_DETAILS_FIELDS.slice(1),
];

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateCompanyForm(values, isRegister);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const message = "Please correct the highlighted fields.";
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      const response = isRegister
        ? await registerCompany(
            Object.fromEntries(
              Object.entries(values).map(([key, value]) => [
                key,
                value.trim(),
              ]),
            ),
          )
        : await loginCompany(values.email ?? "", values.password ?? "");
      setAccessToken(response.access_token);
      toast.success(isRegister ? "Registration successful." : "Login successful.");
      router.replace("/events");
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Could not sign in.";
      if (requestError instanceof ApiError) {
        const serverErrors = { ...requestError.fieldErrors };
        if (
          requestError.status === 409 &&
          requestError.message.toLowerCase().includes("email")
        ) {
          serverErrors.email = requestError.message;
        }
        setFieldErrors(serverErrors);
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const visibleFields = isRegister
    ? registrationFields
    : [
        REGISTRATION_EMAIL_FIELD,
        { name: "password" as const, label: "Password", required: true },
      ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-12 pt-6 sm:px-8 lg:px-12">
      <SiteHeader />
      <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-card sm:mt-16 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {isRegister ? "Start recruiting" : "Welcome back"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isRegister ? "Create your company account" : "Log in to TalentDesk"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {isRegister
            ? "Set up a private workspace for your hiring events and candidate resumes."
            : "Access your company workspace and hiring events."}
        </p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
          {visibleFields.map((field) =>
            field.name === "password" ? (
              <label
                key={field.name}
                htmlFor="password"
                className={`grid gap-1.5 text-xs font-semibold text-ink ${
                  !isRegister ? "sm:col-span-2" : ""
                }`}
              >
                Password
                <span className="relative block">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={isRegister ? 8 : undefined}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    value={values.password ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password ? "password-error" : undefined
                    }
                    className="w-full rounded-xl border border-line bg-canvas px-3 py-3 pr-11 text-sm font-normal outline-none transition focus:border-accent"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
                {fieldErrors.password && (
                  <span id="password-error" className="text-xs font-normal text-danger">
                    {fieldErrors.password}
                  </span>
                )}
              </label>
            ) : (
              <CompanyProfileField
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                error={fieldErrors[field.name]}
                className={`grid gap-1.5 text-xs font-semibold text-ink ${
                  field.name === "name" || field.name === "email"
                    ? "sm:col-span-2"
                    : ""
                }`}
                inputClassName="rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-normal outline-none transition focus:border-accent"
                onChange={(name: CompanyProfileFieldName, value) => {
                  setValues((current) => ({ ...current, [name]: value }));
                  setFieldErrors((current) => ({ ...current, [name]: "" }));
                }}
              />
            ),
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 whitespace-nowrap rounded-xl bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-60 sm:col-span-2"
          >
            {submitting
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "Already registered?" : "New to TalentDesk?"}{" "}
          <Link
            className="font-semibold text-accent hover:underline"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
      </section>
      <footer className="mx-auto mt-8 max-w-xl text-center text-xs text-muted">
        Need help? <a href="mailto:hello@talentdesk.example" className="hover:text-accent">Contact us</a>
      </footer>
    </main>
  );
}
