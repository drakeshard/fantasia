import { useState } from "preact/hooks";
import { Button, Chip, SelectField, TextField } from "./primitives";
import {
  EmptyState,
  FilePicker,
  FilterBar,
  KeyValueList,
  MasterDetailLayout,
  MetadataRow,
  Section,
  SelectableCollection,
  SelectableRow,
  StatusGroup,
} from "./production-components";

const selectableRecords = [
  { id: "alpha", title: "Alpha record", status: "APPROVED" },
  { id: "beta", title: "Beta record", status: "IN REVIEW" },
  { id: "gamma", title: "Gamma record", status: "WORKING" },
] as const;

export function ProductionComponentInventory() {
  const [selected, setSelected] = useState("alpha");
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <section class="studio-component-inventory" data-testid="production-component-inventory" aria-labelledby="production-component-inventory-title">
      <header class="preview-section__heading">
        <div>
          <h2 id="production-component-inventory-title">Reusable production components</h2>
          <p>One review surface for reusable controls and production compositions. Feature pages consume these contracts instead of rebuilding them.</p>
        </div>
        <Chip accent>GAME-STUDIO00K</Chip>
      </header>

      <div class="studio-component-inventory__grid">
        <Section title="Fields and actions" description="Shared primitive anatomy remains token/theme driven.">
          <div class="studio-component-inventory__stack">
            <TextField id="inventory-text" label="Text field" value={query} onInput={(event) => setQuery(event.currentTarget.value)} hint="Label, description and focus are shared behavior." />
            <SelectField id="inventory-select" label="Select field" defaultValue="working" options={[{ value: "working", label: "Working" }, { value: "approved", label: "Approved" }]} />
            <StatusGroup label="Button states">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="quiet">Quiet</Button>
              <Button disabled>Disabled</Button>
              <Button pending>Pending</Button>
            </StatusGroup>
          </div>
        </Section>

        <Section title="Facts and metadata">
          <KeyValueList label="Example canonical facts" items={[{ label: "Authority", value: "Git" }, { label: "Lifecycle", value: "APPROVED" }, { label: "Runtime", value: "Not ready" }]} />
          <MetadataRow label="Provider evidence" primary="Source/master registered" secondary="Opaque provider reference · checksum retained" trailing={<Chip>Observed</Chip>} />
        </Section>

        <Section title="Filter bar">
          <FilterBar label="Inventory filters" activeSummary={query ? `Filtering for “${query}”` : undefined} onClear={query ? () => setQuery("") : undefined}>
            <TextField id="inventory-filter" label="Search" value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
            <SelectField id="inventory-filter-state" label="Lifecycle" defaultValue="all" options={[{ value: "all", label: "All lifecycle states" }, { value: "approved", label: "Approved" }]} />
          </FilterBar>
        </Section>

        <Section title="Selectable collection" description="Selection and keyboard focus are separate visible states.">
          <SelectableCollection label="Inventory selectable records">
            {selectableRecords.map(({ id, title, status }) => (
              <SelectableRow key={id} selected={selected === id} title={title} metadata={<code>{`entity.${id}`}</code>} status={<Chip>{status}</Chip>} onClick={() => setSelected(id)} />
            ))}
          </SelectableCollection>
        </Section>

        <Section title="Master / detail">
          <MasterDetailLayout
            masterLabel="Example records"
            master={
              <SelectableCollection label="Example master list">
                <SelectableRow selected title="Selected record" metadata="entity.selected" />
                <SelectableRow selected={false} title="Another record" metadata="entity.other" />
              </SelectableCollection>
            }
            detail={
              <div class="studio-component-inventory__detail">
                <strong>Selected record</strong>
                <p>Feature-owned content is placed inside the shared responsive master/detail frame.</p>
              </div>
            }
          />
        </Section>

        <Section title="Source file field" description="Native file input remains encapsulated inside the shared FilePicker.">
          <FilePicker id="inventory-file" label="Source/master file" value={file} onChange={setFile} hint="Drop or select a local fixture file. No upload occurs in UI Lab." />
        </Section>

        <Section title="Common non-success states">
          <div class="studio-component-inventory__stack">
            <EmptyState tone="loading" title="Loading">Waiting for the selected read model.</EmptyState>
            <EmptyState title="No records">The authoritative source returned no records.</EmptyState>
            <EmptyState tone="unavailable" title="Unavailable">The current boundary did not expose this evidence.</EmptyState>
            <EmptyState tone="error" title="Read failed">Existing authoritative state remains unchanged.</EmptyState>
          </div>
        </Section>
      </div>
    </section>
  );
}
