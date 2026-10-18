import type { JSX } from "preact";
import { buildStudioDashboard, type DashboardTargetModule, type StudioReadModelsResponse } from "./dashboard-model";
import { Chip, SectionHeading, StateMessage, Surface } from "./ui/primitives";
import { DashboardTemplate } from "./ui/workspace";

function formatObserved(value: string | null): string {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toISOString().replace(".000Z", "Z");
}

function deepLink(module: DashboardTargetModule, semanticId: string | null): string {
  const params = new URLSearchParams({ module });
  if (semanticId) params.set("semanticId", semanticId);
  return `?${params.toString()}`;
}

export function ProductionDashboard({
  response,
  readOnly,
  onNavigate,
}: {
  response: StudioReadModelsResponse;
  readOnly: boolean;
  onNavigate: (module: DashboardTargetModule, semanticId: string | null) => void;
}) {
  const projection = buildStudioDashboard(response);
  const unavailableCount = projection.sections.filter((section) => section.state === "unavailable").length;

  return (
    <DashboardTemplate
      className="studio-production-dashboard"
      header={
        <Surface kind="inset" className="studio-dashboard-heading">
          <SectionHeading
            title="Production Dashboard"
            description="Operational projection of canonical Git content, registry workflow/validation facts, asset evidence and controlled Git proposals. Each status dimension remains independent."
            actions={<Chip accent>{projection.implementedAttentionCount} attention items</Chip>}
          />
        </Surface>
      }
    >
      {readOnly ? (
        <StateMessage title="Read-only access" tone="unavailable">
          Viewer access can inspect the same operational truth. No mutation action is exposed from this Dashboard.
        </StateMessage>
      ) : null}

      {projection.state === "partial" ? (
        <StateMessage title="Partial operational picture" tone="unavailable">
          One or more implemented sources are unavailable or canonical/registry integrity needs attention. Missing sources are not represented as zero.
        </StateMessage>
      ) : projection.state === "empty" ? (
        <StateMessage title="No implemented attention items">
          Implemented Dashboard sources returned zero attention items. Unimplemented Layer 5 records remain explicitly unavailable below.
        </StateMessage>
      ) : null}

      <section class="studio-dashboard-freshness" aria-label="Dashboard source freshness" data-testid="dashboard-freshness">
        <Surface kind="card">
          <span>Git revision</span>
          <strong title={response.freshness.gitRevision}>{response.freshness.gitRevision.slice(0, 12)}</strong>
          <small>{response.freshness.gitState}</small>
        </Surface>
        <Surface kind="card">
          <span>Registry observed</span>
          <strong>{formatObserved(response.freshness.registryObservedAt)}</strong>
          <small>workflow and validation metadata</small>
        </Surface>
        <Surface kind="card">
          <span>Provider state</span>
          <strong>{response.freshness.providerState}</strong>
          <small>provider references remain secondary metadata</small>
        </Surface>
        <Surface kind="card">
          <span>Unavailable sources</span>
          <strong>{unavailableCount}</strong>
          <small>shown explicitly; never folded into zero counts</small>
        </Surface>
      </section>

      <section class="studio-dashboard-sections" aria-label="Operational attention queues">
        {projection.sections.map((section) => (
          <Surface kind="card" className="studio-dashboard-section" key={section.id}>
            <SectionHeading
              title={section.label}
              description={section.state === "unavailable" ? "Source unavailable / not implemented" : "Implemented operational source"}
              actions={
                section.state === "unavailable" ? (
                  <Chip>Unavailable</Chip>
                ) : (
                  <Chip accent>{section.items.length}</Chip>
                )
              }
            />

            {section.state === "unavailable" ? (
              <StateMessage title="Unavailable" tone="unavailable">
                {section.unavailableReason ?? "This operational source is unavailable."}
              </StateMessage>
            ) : section.items.length === 0 ? (
              <p class="studio-dashboard-zero">No attention items returned by this implemented source.</p>
            ) : (
              <ul class="studio-dashboard-attention-list">
                {section.items.map((item) => (
                  <li class={`studio-dashboard-attention studio-dashboard-attention--${item.severity}`} key={item.id}>
                    <div class="studio-dashboard-attention__copy">
                      <span class="studio-dashboard-attention__severity">{item.severity}</span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <div class="studio-dashboard-attention__meta">
                        {item.semanticId ? <code>{item.semanticId}</code> : null}
                        {item.updatedAt ? <span>{formatObserved(item.updatedAt)}</span> : null}
                      </div>
                    </div>
                    <div class="studio-dashboard-attention__links">
                      {item.module && item.semanticId ? (
                        <a
                          href={deepLink(item.module, item.semanticId)}
                          onClick={(event: JSX.TargetedMouseEvent<HTMLAnchorElement>) => {
                            event.preventDefault();
                            onNavigate(item.module ?? "dashboard", item.semanticId);
                          }}
                        >
                          Open context
                        </a>
                      ) : null}
                      {item.externalUrl ? (
                        <a href={item.externalUrl} target="_blank" rel="noreferrer">
                          Open GitHub PR
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        ))}
      </section>
    </DashboardTemplate>
  );
}
