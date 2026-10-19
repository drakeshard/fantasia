import { Button } from "../primitives";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

export function FilePicker({
  id,
  label,
  file,
  onFileChange,
  disabled = false,
  description = "Drop a production source here, or select a file from your device.",
}: {
  id: string;
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <div class="studio-component-file-picker">
      <span class="ui-field__label" id={`${id}-label`}>{label}</span>
      <input
        key={file ? `selected:${file.name}:${file.size}` : "empty"}
        id={id}
        class="studio-component-file-picker__native"
        type="file"
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onChange={(event) => onFileChange(event.currentTarget.files?.[0] ?? null)}
      />
      <label
        class={`studio-component-file-picker__dropzone${file ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
        for={id}
        onDragOver={(event) => { if (!disabled) event.preventDefault(); }}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled) onFileChange(event.dataTransfer?.files?.[0] ?? null);
        }}
      >
        <span class="studio-component-file-picker__mark" aria-hidden="true">⇧</span>
        <span class="studio-component-file-picker__copy">
          <strong>{file ? "Source selected" : "Choose a source/master"}</strong>
          <span>{file ? "Select again to replace this file before registration." : description}</span>
        </span>
        <span class="studio-component-file-picker__action">{file ? "Replace" : "Select file"}</span>
      </label>
      {file ? (
        <div class="studio-component-file-picker__summary" aria-live="polite">
          <div>
            <span aria-hidden="true">◆</span>
            <span><strong>{file.name}</strong><small>{file.type || "File type unavailable"} · {formatBytes(file.size)}</small></span>
          </div>
          <Button variant="quiet" disabled={disabled} onClick={() => onFileChange(null)}>Remove</Button>
        </div>
      ) : null}
    </div>
  );
}
