"use client";

import type {
  CompanyProfileFieldDefinition,
  CompanyProfileFieldName,
} from "@/lib/company-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyProfileFieldProps {
  field: CompanyProfileFieldDefinition;
  value: string;
  error?: string;
  className: string;
  inputClassName: string;
  onChange: (name: CompanyProfileFieldName, value: string) => void;
}

export function CompanyProfileField({
  field,
  value,
  error,
  className,
  inputClassName,
  onChange,
}: CompanyProfileFieldProps) {
  const fieldId = `company-${field.name}`;
  const describedBy = error ? `${fieldId}-error` : undefined;

  return (
    <label htmlFor={fieldId} className={className}>
      {field.label}
      {field.type === "select" ? (
        <Select
          name={field.name}
          required={field.required}
          value={value || undefined}
          onValueChange={(selectedValue) =>
            onChange(field.name, selectedValue)
          }
        >
          <SelectTrigger
            id={fieldId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={inputClassName}
          >
            <SelectValue placeholder="Select company size" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <input
          id={fieldId}
          name={field.name}
          type={field.type}
          required={field.required}
          maxLength={field.maxLength}
          autoComplete={field.autoComplete}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={inputClassName}
        />
      )}
      {error && (
        <span id={`${fieldId}-error`} className="text-xs font-normal text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
