import { render } from "preact";
import { useState } from "preact/hooks";
import {
  FilePicker,
  FilterBar,
  KeyValue,
  KeyValueList,
  MasterDetailLayout,
  Section,
  SelectableCollection,
  SelectableRow,
  StatusGroup,
} from "./ui/components";
import { Button, Chip, SelectField, StateMessage, TextField } from "./ui/primitives";
import "./ui/components.css";

function ComponentInventory() {
  const [selected, setSelected] = useState("alpha");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  return (
    <section class="foundation-preview" aria-labelledby="production-components-title" data-testid="production-component-inventory">
      <section class="preview-section" aria-labelledby="production-components-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="production-components-title">Production component inventory</h2>
            <p>Reusable controls and compositions consumed by Assets, Characters, and future entity workspaces. Feature pages place these components; they do not repaint them.</p>
          </div>
          <Chip accent>Shared production layer</Chip>
        </div>

        <Section title="Collection and filters" description="Search, primary filters, expansion state and selectable rows share one production contract.">
          <FilterBar
            expanded={filtersOpen}
            primary={
              <>
                <TextField id="inventory-search" label="Search" type="search" placeholder="Semantic ID or title" />
                <SelectField id="inventory-type" label="Type" defaultValue="all" options={[{ value: "all", label: "All types" }, { value: "asset", label: "Asset" }]} />
              </>
            }
            actions={
              <>
                <Button variant="quiet" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? "Hide filters" : "More filters"}</Button>
                <span>2 results</span>
              </>
            }
            secondary={<SelectField id="inventory-status" label="Lifecycle" defaultValue="working" options={[{ value: "working", label: "Working" }, { value: "approved", label: "Approved" }]} />}
          />
          <MasterDetailLayout
            master={
              <SelectableCollection label="Inventory examples">
                <SelectableRow selected={selected === "alpha"} onSelect={() => setSelected("alpha")} label="Alpha asset"><strong>Alpha asset</strong><span>asset.example.alpha</span></SelectableRow>
                <SelectableRow selected={selected === "beta"} onSelect={() => setSelected("beta")} label="Beta character"><strong>Beta character</strong><span>character.example.beta</span></SelectableRow>
              </SelectableCollection>
            }
            detail={
              <Section title={selected === "alpha" ? "Alpha asset" : "Beta character"} description="Selection is distinct from keyboard focus.">
                <KeyValueList label="Selected record facts">
                  <KeyValue label="Semantic ID">{selected === "alpha" ? "asset.example.alpha" : "character.example.beta"}</KeyValue>
                  <KeyValue label="Lifecycle">WORKING</KeyValue>
                  <KeyValue label="Authority">Git definition</KeyValue>
                  <KeyValue label="Source">Drive master</KeyValue>
                </KeyValueList>
                <StatusGroup><Chip accent>Current</Chip><Chip>Validation pending</Chip></StatusGroup>
              </Section>
            }
          />
        </Section>

        <Section title="Source file and feedback" description="Native file input is encapsulated by the shared FilePicker; page features never implement their own picker.">
          <FilePicker id="inventory-file" label="Source/master file" file={file} onFileChange={setFile} />
          <div class="feedback-grid">
            <StateMessage title="Empty state">No records match the current scope.</StateMessage>
            <StateMessage title="Unavailable state" tone="unavailable">The provider is not available to the current role.</StateMessage>
            <StateMessage title="Error state" tone="error">The read failed. Existing authoritative data is unchanged.</StateMessage>
            <Button variant="primary" pending>Pending action</Button>
            <Button disabled>Disabled action</Button>
          </div>
        </Section>
      </section>
    </section>
  );
}

const root = document.querySelector<HTMLElement>("#component-inventory");
if (!root) throw new Error("Content Studio component inventory root element not found");
render(<ComponentInventory />, root);
