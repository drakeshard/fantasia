import type { ComponentProps } from "preact";

type PasswordFieldProps = Omit<ComponentProps<"input">, "id" | "type" | "class"> & {
  id: string;
  label: string;
};

export function PasswordField({ id, label, required = false, ...props }: PasswordFieldProps) {
  return (
    <label class="ui-field" for={id}>
      <span class="ui-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input {...props} class="ui-control" id={id} type="password" required={required} />
    </label>
  );
}
