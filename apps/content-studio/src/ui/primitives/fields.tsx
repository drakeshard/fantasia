import type { ComponentProps } from "preact";

type FieldBaseProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
};

function FieldMessage({ id, hint, error }: { id: string; hint: string | undefined; error: string | undefined }) {
  if (error) return <span class="ui-field__message ui-field__message--error" id={`${id}-error`}>{error}</span>;
  if (hint) return <span class="ui-field__message" id={`${id}-hint`}>{hint}</span>;
  return null;
}

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function invalidValue(invalid: boolean | undefined, error: string | undefined) {
  return invalid || error ? "true" : undefined;
}

type TextFieldProps = FieldBaseProps & Omit<ComponentProps<"input">, "id" | "type" | "disabled" | "required" | "class" | "className" | "aria-invalid"> & { type?: "text" | "search" | "email" };

export function TextField({ id, label, hint, error, invalid = false, required = false, disabled = false, type = "text", ...props }: TextFieldProps) {
  return <label class="ui-field" for={id}><span class="ui-field__label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span><input {...props} class="ui-control" id={id} type={type} required={required} disabled={disabled} aria-invalid={invalidValue(invalid, error)} aria-describedby={describedBy(id, hint, error)} /><FieldMessage id={id} hint={hint} error={error} /></label>;
}

type TextAreaProps = FieldBaseProps & Omit<ComponentProps<"textarea">, "id" | "disabled" | "required" | "class" | "className" | "aria-invalid">;
export function TextArea({ id, label, hint, error, invalid = false, required = false, disabled = false, ...props }: TextAreaProps) {
  return <label class="ui-field" for={id}><span class="ui-field__label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span><textarea {...props} class="ui-control ui-control--textarea" id={id} required={required} disabled={disabled} aria-invalid={invalidValue(invalid, error)} aria-describedby={describedBy(id, hint, error)} /><FieldMessage id={id} hint={hint} error={error} /></label>;
}

export type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectFieldProps = FieldBaseProps & Omit<ComponentProps<"select">, "id" | "disabled" | "required" | "class" | "className" | "children" | "aria-invalid"> & { options: readonly SelectOption[] };
export function SelectField({ id, label, hint, error, invalid = false, required = false, disabled = false, options, ...props }: SelectFieldProps) {
  return <label class="ui-field" for={id}><span class="ui-field__label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span><select {...props} class="ui-control ui-control--select" id={id} required={required} disabled={disabled} aria-invalid={invalidValue(invalid, error)} aria-describedby={describedBy(id, hint, error)}>{options.map((option) => <option value={option.value} disabled={option.disabled} key={option.value}>{option.label}</option>)}</select><FieldMessage id={id} hint={hint} error={error} /></label>;
}

type CheckboxProps = Omit<ComponentProps<"input">, "id" | "type" | "class" | "className"> & { id: string; label: string; description?: string };
export function Checkbox({ id, label, description, ...props }: CheckboxProps) {
  return <label class="ui-checkbox" for={id}><input {...props} class="ui-checkbox__input" id={id} type="checkbox" /><span class="ui-checkbox__copy"><span class="ui-checkbox__label">{label}</span>{description ? <span class="ui-checkbox__description">{description}</span> : null}</span></label>;
}
