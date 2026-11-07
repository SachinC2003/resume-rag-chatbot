import type { EventInput } from "@/lib/api";
import {
  COMPANY_DETAILS_FIELDS,
  COMPANY_PROFILE_FIELDS,
  COMPANY_SIZE_OPTIONS,
  REGISTRATION_EMAIL_FIELD,
  type CompanyProfileFieldDefinition,
} from "@/lib/company-fields";

export type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9().\-\s]{7,30}$/;

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDayToDateString(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  return `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDate.getUTCDate()).padStart(2, "0")}`;
}

export function validateCompanyForm(
  values: Record<string, string>,
  isRegister: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  const password = values.password ?? "";

  const fieldsToValidate = isRegister
    ? COMPANY_PROFILE_FIELDS
    : [REGISTRATION_EMAIL_FIELD];
  validateCompanyFields(values, fieldsToValidate, errors);
  if (!password) errors.password = "Password is required.";
  else if (isRegister && password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (new TextEncoder().encode(password).length > 72) {
    errors.password = "Password must be at most 72 UTF-8 bytes.";
  }

  return errors;
}

export function validateProfileForm(values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};

  validateCompanyFields(values, COMPANY_DETAILS_FIELDS, errors);
  return errors;
}

function validateCompanyFields(
  values: Record<string, string>,
  fields: readonly CompanyProfileFieldDefinition[],
  errors: FieldErrors,
): void {
  for (const field of fields) {
    const value = values[field.name]?.trim() ?? "";
    if (field.required && !value) {
      errors[field.name] = `${field.label} is required.`;
      continue;
    }
    if (value.length > field.maxLength) {
      errors[field.name] =
        `${field.label} must be ${field.maxLength} characters or fewer.`;
      continue;
    }
    if (field.type === "email" && value && !EMAIL_PATTERN.test(value)) {
      errors[field.name] = "Enter a valid email address.";
    } else if (field.type === "tel" && value && !PHONE_PATTERN.test(value)) {
      errors[field.name] = "Enter a valid phone number.";
    } else if (field.type === "url" && value && !isHttpUrl(value)) {
      errors[field.name] =
        "Enter a valid website URL beginning with http:// or https://.";
    } else if (
      field.name === "company_size" &&
      value &&
      !COMPANY_SIZE_OPTIONS.some((option) => option.value === value)
    ) {
      errors[field.name] = "Select a valid company size.";
    }
  }
}

export function validateEventForm(values: EventInput): FieldErrors {
  const errors: FieldErrors = {};
  const title = values.title.trim();
  const jobRole = values.job_role.trim();
  if (!title) errors.title = "Event title is required.";
  else if (title.length > 200) errors.title = "Event title must be 200 characters or fewer.";
  if (!jobRole) errors.job_role = "Job role is required.";
  else if (jobRole.length > 150) errors.job_role = "Job role must be 150 characters or fewer.";
  if ((values.department?.trim().length ?? 0) > 100) {
    errors.department = "Department must be 100 characters or fewer.";
  }
  if ((values.location?.trim().length ?? 0) > 150) {
    errors.location = "Location must be 150 characters or fewer.";
  }
  if ((values.job_description?.length ?? 0) > 10000) {
    errors.job_description = "Job description must be 10,000 characters or fewer.";
  }
  if (!Number.isInteger(values.min_exp_years) || values.min_exp_years < 0) {
    errors.min_exp_years = "Minimum experience must be a whole number of 0 or more.";
  }
  if (!Number.isInteger(values.openings) || values.openings < 1) {
    errors.openings = "Enter at least one opening.";
  }
  if (values.start_date && values.start_date < getLocalDateString()) {
    errors.start_date = "Start date cannot be in the past.";
  }
  if (
    values.start_date &&
    values.end_date &&
    values.end_date <= values.start_date
  ) {
    errors.end_date = "End date must be at least one day after the start date.";
  } else if (values.end_date && values.end_date < getLocalDateString()) {
    errors.end_date = "End date cannot be in the past.";
  }
  return errors;
}

export function validateSearchQuery(query: string): FieldErrors {
  if (!query.trim()) return { query: "Enter a natural-language search query." };
  if (query.trim().length > 2000) {
    return { query: "Search query must be 2,000 characters or fewer." };
  }
  return {};
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
