// Types for the dynamic claim form system.
// A FormDefinition declares an ordered list of Sections; each Section
// contains Fields. The renderer walks this tree and produces the UI.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "email"
  | "tel"
  | "select"
  | "radio"
  | "checkbox" // single boolean
  | "checkbox_group" // multiple values
  | "rfc"
  | "curp"
  | "clabe"
  | "signature"
  | "image_upload"
  | "computed_age" // read-only, computed from a DOB field
  | "static_text"; // legal text, not editable

export interface Option {
  value: string;
  label: string;
}

export interface FieldDefinition {
  name: string; // path key in the form data
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  options?: Option[]; // for select / radio / checkbox_group
  // Compute visibility from current data (returns true to show)
  showWhen?: (data: Record<string, any>) => boolean;
  maxLength?: number;
  // For computed_age: the name of the DOB field
  dobField?: string;
  // For static_text: the text to display
  text?: string;
  // Half-width on grid (otherwise full-width)
  half?: boolean;
}

export type SectionKind = "fields" | "dynamic_table" | "dynamic_doctors";

export interface DynamicTableColumn {
  name: string;
  label: string;
  type: "text" | "number" | "money" | "select";
  options?: Option[];
}

export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  kind?: SectionKind; // default "fields"
  fields?: FieldDefinition[];
  // For dynamic_table:
  tableName?: string; // key in data, holds an array of rows
  columns?: DynamicTableColumn[];
  maxRows?: number;
  showTotal?: boolean; // total of "amount"-typed column
  // For dynamic_doctors (med interconsultantes):
  doctorsName?: string;
  maxDoctors?: number;
  // showWhen at section level
  showWhen?: (data: Record<string, any>) => boolean;
}

export interface FormDefinition {
  code: string; // A | B | C | D | E | F | G | H
  name: string; // human-readable name
  insurers: string[]; // applicable insurers (uppercase, matching ASEGURADORAS)
  sections: SectionDefinition[];
  // Map of {fieldName: profileFieldName | "policy.field"} used to
  // pre-fill fields from the user profile and policy when empty.
  autofill?: Record<string, string>;
}
