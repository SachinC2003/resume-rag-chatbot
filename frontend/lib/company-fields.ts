export type CompanyProfileFieldName =
  | "name"
  | "email"
  | "contact_person"
  | "phone"
  | "industry"
  | "company_size"
  | "website"
  | "city";

export type CompanyDetailsFieldName = Exclude<
  CompanyProfileFieldName,
  "email"
>;

export interface CompanyProfileFieldDefinition {
  name: CompanyProfileFieldName;
  label: string;
  type: "text" | "email" | "tel" | "url" | "select";
  required: boolean;
  maxLength: number;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
  autoComplete?: string;
}

export type CompanyDetailsFieldDefinition = Omit<
  CompanyProfileFieldDefinition,
  "name"
> & { name: CompanyDetailsFieldName };

export const COMPANY_DETAILS_FIELDS: readonly CompanyDetailsFieldDefinition[] = [
  {
    name: "name",
    label: "Company name",
    type: "text",
    required: true,
    maxLength: 200,
    autoComplete: "organization",
    placeholder: "Company name",
  },
  {
    name: "contact_person",
    label: "Contact person",
    type: "text",
    required: false,
    maxLength: 120,
    autoComplete: "name",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    required: false,
    maxLength: 30,
    autoComplete: "tel",
  },
  {
    name: "industry",
    label: "Industry",
    type: "text",
    required: false,
    maxLength: 100,
    placeholder: "Technology",
  },
  {
    name: "company_size",
    label: "Company size",
    type: "select",
    required: false,
    maxLength: 20,
    options: [
      { value: "1-10", label: "1-10" },
      { value: "11-50", label: "11-50" },
      { value: "51-200", label: "51-200" },
      { value: "200+", label: "200+" },
    ],
  },
  {
    name: "website",
    label: "Website",
    type: "url",
    required: false,
    maxLength: 255,
    autoComplete: "url",
    placeholder: "https://example.com",
  },
  {
    name: "city",
    label: "City",
    type: "text",
    required: false,
    maxLength: 100,
    autoComplete: "address-level2",
    placeholder: "City",
  },
];

export const REGISTRATION_EMAIL_FIELD: CompanyProfileFieldDefinition = {
  name: "email",
  label: "Work email",
  type: "email",
  required: true,
  maxLength: 255,
  autoComplete: "email",
  placeholder: "name@company.com",
};

export const COMPANY_PROFILE_FIELDS: readonly CompanyProfileFieldDefinition[] = [
  ...COMPANY_DETAILS_FIELDS.slice(0, 1),
  REGISTRATION_EMAIL_FIELD,
  ...COMPANY_DETAILS_FIELDS.slice(1),
];

export const COMPANY_SIZE_OPTIONS =
  COMPANY_PROFILE_FIELDS.find((field) => field.name === "company_size")?.options ??
  [];
