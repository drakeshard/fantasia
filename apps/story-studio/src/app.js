const app = document.querySelector("#app");
const tree = document.querySelector("#story-tree");
const nodeHeader = document.querySelector("#node-header");
const workspaceContent = document.querySelector("#workspace-content");
const workspaceTabs = [...document.querySelectorAll(".workspace-tab")];
const beatTimeline = document.querySelector("#beat-timeline");
const timelineSummary = document.querySelector("#timeline-summary");
const inspector = document.querySelector("#inspector-content");
const selectionId = document.querySelector("#selection-id");
const status = document.querySelector("#story-status");
const densityButton = document.querySelector("#toggle-density");
const exportButton = document.querySelector("#export-json");
const playNodeButton = document.querySelector("#play-node");
const playerOverlay = document.querySelector("#player-overlay");
const closePlayerButton = document.querySelector("#close-player");
const playerStage = document.querySelector("#player-stage");
const playerCopy = document.querySelector("#player-copy");
const playerProgress = document.querySelector("#player-progress");
const playerPrev = document.querySelector("#player-prev");
const playerNext = document.querySelector("#player-next");
const playerTitle = document.querySelector("#player-title");

const state = {
  story: null,
  production: null,
  sagaId: null,
  chapterId: null,
  nodeId: null,
  beatId: null,
  workspace: "overview",
  compact: false,
  playerBeatIndex: 0,
  playerEventIndex: 0,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resolveTokens(value) {
  return String(value ?? "").replaceAll("{{MC_NAME}}", "[MC Name]");
}

function displayText(value) {
  return escapeHtml(resolveTokens(value));
}

function currentSaga() {
  return state.story?.sagas.find((saga) => saga.id === state.sagaId) ?? null;
}

function currentChapter() {
  return currentSaga()?.chapters.find((chapter) => chapter.id === state.chapterId) ?? null;
}

function currentNode() {
  return currentChapter()?.nodes.find((node) => node.id === state.nodeId) ?? null;
}

function currentBeat() {
  return currentNode()?.beats.find((beat) => beat.id === state.beatId) ?? null;
}

function productionForBeat(beat) {
  if (!beat) return null;
  return state.production?.beats?.[beat.id] ?? null;
}

function scriptForBeat(beat) {
  return Array.isArray(beat?.script) ? beat.script : [];
}

function spokenScriptForBeat(beat) {
  return scriptForBeat(beat).filter((event) => event.type === "dialogue" || event.type === "thought");
}

function statusLabel(value) {
  if (value === "approved-structure") return "Approved structure";
  if (value === "production-ready") return "Production ready";
  if (value === "draft") return "Draft";
  if (value === "proposed") return "Proposed";
  if (value === "approved") return "Approved";
  return value ?? "Unknown";
}

function formatSeconds(total) {
  const rounded = Math.max(0, Math.round(total));
  const minutes = Math.floor(rounded / 60);
  const seconds = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function timingLabel(beat) {
  const timing = productionForBeat(beat)?.timing;
  if (!timing) return "Timing TBD";
  if (timing.mode === "player") {
    const range = [timing.minSeconds, timing.maxSeconds].filter(Number.isFinite);
    return range.length === 2 ? `~${range[0]}–${range[1]}s player-controlled` : "Player-controlled";
  }
  if (Number.isFinite(timing.estimatedSeconds)) return `~${timing.estimatedSeconds}s`;
  return "Timing TBD";
}

function nodeTiming(node) {
  let min = 0;
  let max = 0;
  let hasTiming = false;
  let hasPlayerRange = false;
  for (const beat of node.beats) {
    const timing = productionForBeat(beat)?.timing;
    if (!timing) continue;
    hasTiming = true;
    if (timing.mode === "player") {
      hasPlayerRange = true;
      min += Number(timing.minSeconds ?? 0);
      max += Number(timing.maxSeconds ?? timing.minSeconds ?? 0);
    } else if (Number.isFinite(timing.estimatedSeconds)) {
      min += timing.estimatedSeconds;
      max += timing.estimatedSeconds;
    }
  }
  if (!hasTiming) return null;
  return { min, max, ranged: hasPlayerRange };
}

function nodeTimingLabel(node) {
  const timing = nodeTiming(node);
  if (!timing) return null;
  if (timing.ranged) return `Estimated ${formatSeconds(timing.min)}–${formatSeconds(timing.max)}`;
  return `Estimated ${formatSeconds(timing.max)}`;
}

function nodeCounts(node) {
  let events = 0;
  let spoken = 0;
  let staged = 0;
  for (const beat of node.beats) {
    const script = scriptForBeat(beat);
    events += script.length;
    spoken += spokenScriptForBeat(beat).length;
    if (productionForBeat(beat)?.staging) staged += 1;
  }
  return { events, spoken, staged };
}

function speakerDisplayForCharacter(beat, character) {
  const event = scriptForBeat(beat).find(
    (item) => item.speaker === character && typeof item.displayLabel === "string",
  );
  return event?.displayLabel ?? character;
}

function renderCharacterSlot(slotName, slot, beat = currentBeat()) {
  if (!slot) {
    return `<div class="character-slot empty"><span>${escapeHtml(slotName)}</span><small>Unassigned</small></div>`;
  }
  const label = speakerDisplayForCharacter(beat, slot.character);
  const shortLabel =
    slot.shortLabel && label === slot.character
      ? slot.shortLabel
      : label
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 3)
          .toUpperCase();
  return `
    <div class="character-slot">
      <div class="portrait-placeholder" aria-hidden="true">${escapeHtml(shortLabel || "??")}</div>
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(slot.pose ?? slot.expression ?? slotName)}</small>
    </div>
  `;
}

function productionStatus(kind, value, note) {
  const className = value === "ready" ? "ready" : value === "partial" ? "partial" : "missing";
  const label = value === "ready" ? "Ready" : value === "partial" ? "Partial" : "Not assigned";
  return `
    <article class="production-card">
      <div class="production-card-top">
        <span class="production-dot ${className}" aria-hidden="true"></span>
        <span>${escapeHtml(kind)}</span>
        <strong>${label}</strong>
      </div>
      <p>${escapeHtml(note)}</p>
    </article>
  `;
}

function renderTree() {
  tree.innerHTML = "";
  for (const saga of state.story.sagas) {
    const sagaBlock = document.createElement("section");
    sagaBlock.className = "tree-group";
    sagaBlock.innerHTML = `<div class="tree-title"><span class="mono">${escapeHtml(saga.id)}</span><strong>${escapeHtml(saga.title)}</strong></div>`;

    for (const chapter of saga.chapters) {
      const chapterBlock = document.createElement("div");
      chapterBlock.className = "chapter-block";
      chapterBlock.innerHTML = `<div class="chapter-title"><span>${escapeHtml(chapter.id)}</span><strong>${escapeHtml(chapter.title)}</strong></div>`;

      const nodeNav = document.createElement("nav");
      nodeNav.className = "node-nav";
      nodeNav.setAttribute("aria-label", `${chapter.title} nodes`);

      for (const node of chapter.nodes) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `node-link ${node.id === state.nodeId ? "active" : ""}`;
        const scriptState = node.scriptStatus ? `<span class="node-state">${escapeHtml(statusLabel(node.scriptStatus))}</span>` : "";
        button.innerHTML = `
          <span class="node-link-main">
            <span class="mono node-code">${escapeHtml(node.id.replace(`${chapter.id}-`, ""))}</span>
            <span class="node-link-copy"><strong>${escapeHtml(node.title)}</strong>${scriptState}</span>
          </span>
          <span class="type-chip ${escapeHtml(node.type)}">${escapeHtml(node.type)}</span>
        `;
        button.addEventListener("click", () => selectNode(saga.id, chapter.id, node.id));
        nodeNav.append(button);
      }

      chapterBlock.append(nodeNav);
      sagaBlock.append(chapterBlock);
    }

    tree.append(sagaBlock);
  }
}

function renderNodeHeader() {
  const saga = currentSaga();
  const chapter = currentChapter();
  const node = currentNode();
  if (!saga || !chapter || !node) return;

  const metadata = [node.location, node.time, nodeTimingLabel(node)].filter(Boolean);
  const scriptBadge = node.scriptStatus
    ? `<span class="status-pill script-status">${escapeHtml(statusLabel(node.scriptStatus))} script</span>`
    : "";
  nodeHeader.innerHTML = `
    <div class="breadcrumb mono">${escapeHtml(saga.id)} / ${escapeHtml(chapter.id)} / ${escapeHtml(node.id)}</div>
    <div class="node-title-row">
      <div>
        <p class="eyebrow">${escapeHtml(node.type)} node</p>
        <h2>${escapeHtml(node.title)}</h2>
      </div>
      <div class="tag-list status-stack">
        <span class="status-pill">${escapeHtml(statusLabel(node.status))}</span>
        ${scriptBadge}
      </div>
    </div>
    <div class="node-meta mono">${metadata.map(escapeHtml).join(" · ")}</div>
    <p class="node-summary">${escapeHtml(node.summary)}</p>
  `;

  playNodeButton.disabled = node.beats.length === 0;
}

function renderTimeline() {
  const node = currentNode();
  beatTimeline.innerHTML = "";
  if (!node || node.beats.length === 0) {
    timelineSummary.textContent = "Structure only";
    beatTimeline.innerHTML = `<div class="empty-node"><strong>No detailed beats authored.</strong><p>The Studio will not invent production detail for this node.</p></div>`;
    return;
  }

  timelineSummary.textContent = `${node.beats.length} beats · ${nodeCounts(node).events} exact events`;
  for (const beat of node.beats) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `timeline-beat ${beat.id === state.beatId ? "active" : ""}`;
    const lineCount = scriptForBeat(beat).length;
    button.innerHTML = `
      <span class="timeline-order mono">${String(beat.order).padStart(2, "0")}</span>
      <span class="timeline-copy">
        <strong>${escapeHtml(beat.title)}</strong>
        <small>${escapeHtml(timingLabel(beat))}${lineCount ? ` · ${lineCount} events` : ""}</small>
      </span>
    `;
    button.addEventListener("click", () => selectBeat(beat.id));
    beatTimeline.append(button);
  }
}

function renderOverview() {
  const node = currentNode();
  if (!node) return;
  const counts = nodeCounts(node);
  const timing = nodeTimingLabel(node) ?? "Timing TBD";
  const hasScript = counts.events > 0;
  const hasStaging = counts.staged > 0;
  const allStaged = node.beats.length > 0 && counts.staged === node.beats.length;

  workspaceContent.innerHTML = `
    <section class="workspace-section overview-hero">
      <div>
        <span class="section-label">Production overview</span>
        <h3>Node readiness</h3>
        <p>Repository-backed status only. Voice, art, and other media are not assumed unless they are represented in source data.</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card"><span>Beats</span><strong>${node.beats.length}</strong></div>
        <div class="metric-card"><span>Exact events</span><strong>${counts.events}</strong></div>
        <div class="metric-card"><span>Spoken lines</span><strong>${counts.spoken}</strong></div>
        <div class="metric-card"><span>Duration</span><strong>${escapeHtml(timing.replace("Estimated ", ""))}</strong></div>
      </div>
    </section>

    <section class="workspace-section">
      <div class="section-heading">
        <div><span class="section-label">Pipeline</span><h3>Production layers</h3></div>
      </div>
      <div class="production-grid">
        ${productionStatus("Structure", node.status ? "ready" : "missing", node.status ? statusLabel(node.status) : "No structure status")}
        ${productionStatus("Script", hasScript ? "ready" : "missing", hasScript ? `${counts.events} exact events in repository story data` : "No exact script authored")}
        ${productionStatus("Scene staging", allStaged ? "ready" : hasStaging ? "partial" : "missing", hasStaging ? `${counts.staged}/${node.beats.length} beats have staging metadata` : "No staging metadata assigned")}
        ${productionStatus("Voice", "missing", "No voice-generation or approved audio data is represented in the current production schema")}
        ${productionStatus("Assets", hasStaging ? "partial" : "missing", hasStaging ? "Staging references exist; asset availability is not tracked by the current schema" : "No scene asset references available")}
      </div>
    </section>
  `;
}

function eventIcon(type) {
  return (
    {
      action: "ACT",
      dialogue: "DIA",
      thought: "THO",
      narration: "NAR",
      control: "CTL",
      transition: "TRN",
    }[type] ?? "EVT"
  );
}

function renderScript() {
  const beat = currentBeat();
  if (!beat) {
    workspaceContent.innerHTML = `<div class="empty-workspace">Select a detailed beat to review its script.</div>`;
    return;
  }
  const script = scriptForBeat(beat);
  if (script.length === 0) {
    workspaceContent.innerHTML = `<div class="empty-workspace"><span class="section-label">Script</span><h3>${escapeHtml(beat.title)}</h3><p>No exact script has been authored for this beat.</p></div>`;
    return;
  }

  const rows = script
    .map((event) => {
      const speaker = event.displayLabel ?? event.speaker;
      const speakerBlock = speaker
        ? `<div class="script-speaker"><strong>${escapeHtml(speaker)}</strong>${event.speaker && event.displayLabel !== event.speaker ? `<small>Canonical: ${escapeHtml(event.speaker)}</small>` : ""}</div>`
        : `<div class="script-speaker non-dialogue"><strong>${escapeHtml(event.type)}</strong></div>`;
      return `
        <article class="script-row ${escapeHtml(event.type)}">
          <div class="script-kind mono">${eventIcon(event.type)}</div>
          ${speakerBlock}
          <div class="script-copy"><p>${displayText(event.text)}</p>${event.note ? `<small>${displayText(event.note)}</small>` : ""}</div>
          <div class="script-id mono">${escapeHtml(event.id)}</div>
        </article>
      `;
    })
    .join("");

  workspaceContent.innerHTML = `
    <section class="workspace-section script-sheet">
      <div class="section-heading sticky-section-heading">
        <div><span class="section-label">Script</span><h3>${escapeHtml(beat.title)}</h3></div>
        <div class="tag-list"><span class="status-pill">${escapeHtml(statusLabel(beat.scriptStatus ?? "draft"))}</span><span class="status-pill">${script.length} events</span></div>
      </div>
      <div class="script-list">${rows}</div>
    </section>
  `;
}

function renderStageCanvas(beat) {
  const production = productionForBeat(beat);
  const staging = production?.staging ?? {};
  const slots = staging.slots ?? {};
  return `
    <div class="stage-canvas">
      <div class="stage-background">
        <span class="mono muted">BACKGROUND</span>
        <strong>${escapeHtml(staging.background ?? "Background not assigned")}</strong>
        <small>${escapeHtml(staging.camera ?? "Camera framing not assigned")}</small>
      </div>
      <div class="character-row">
        ${renderCharacterSlot("Left", slots.left, beat)}
        ${renderCharacterSlot("Center", slots.center, beat)}
        ${renderCharacterSlot("Right", slots.right, beat)}
      </div>
      <div class="stage-caption">${displayText(beat.screenAction)}</div>
    </div>
  `;
}

function renderScene() {
  const beat = currentBeat();
  if (!beat) {
    workspaceContent.innerHTML = `<div class="empty-workspace">Select a detailed beat to review scene staging.</div>`;
    return;
  }
  const staging = productionForBeat(beat)?.staging ?? {};
  const slots = staging.slots ?? {};
  const slotRows = ["left", "center", "right"]
    .map((slotName) => {
      const slot = slots[slotName];
      return `<div class="property-row"><span>${slotName}</span><strong>${escapeHtml(slot?.character ?? "Unassigned")}</strong><small>${escapeHtml(slot?.pose ?? slot?.expression ?? "—")}</small></div>`;
    })
    .join("");

  workspaceContent.innerHTML = `
    <section class="workspace-section scene-workspace">
      <div class="section-heading">
        <div><span class="section-label">Scene</span><h3>${escapeHtml(beat.title)}</h3></div>
        <span class="presentation-chip">${escapeHtml(beat.presentation)}</span>
      </div>
      ${renderStageCanvas(beat)}
      <div class="scene-properties">
        <div class="property-panel">
          <span class="section-label">Framing</span>
          <div class="property-row"><span>Background</span><strong>${escapeHtml(staging.background ?? "Unassigned")}</strong></div>
          <div class="property-row"><span>Camera</span><strong>${escapeHtml(staging.camera ?? "Unassigned")}</strong></div>
          <div class="property-row"><span>Timing</span><strong>${escapeHtml(timingLabel(beat))}</strong></div>
        </div>
        <div class="property-panel">
          <span class="section-label">Character slots</span>
          ${slotRows}
        </div>
      </div>
    </section>
  `;
}

function speakerInventory(node) {
  const speakers = new Map();
  for (const beat of node.beats) {
    for (const event of spokenScriptForBeat(beat)) {
      const canonical = event.speaker;
      const existing = speakers.get(canonical) ?? { canonical, labels: new Set(), lines: 0 };
      if (event.displayLabel) existing.labels.add(event.displayLabel);
      existing.lines += 1;
      speakers.set(canonical, existing);
    }
  }
  return [...speakers.values()];
}

function renderVoice() {
  const node = currentNode();
  const beat = currentBeat();
  if (!node) return;
  const speakers = speakerInventory(node);
  const beatLines = beat ? spokenScriptForBeat(beat) : [];
  const cast = speakers.length
    ? speakers
        .map(
          (speaker) => `
            <article class="voice-cast-card">
              <div class="voice-avatar">${escapeHtml(speaker.canonical.slice(0, 2).toUpperCase())}</div>
              <div><strong>${escapeHtml(speaker.canonical)}</strong><small>${escapeHtml([...speaker.labels].join(" / ") || speaker.canonical)} · ${speaker.lines} lines</small></div>
              <span class="status-pill">Not configured</span>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-inline">No spoken script is available for this node.</div>`;

  const lines = beatLines.length
    ? beatLines
        .map(
          (event) => `
            <div class="voice-line">
              <div><strong>${escapeHtml(event.displayLabel ?? event.speaker)}</strong><span>${displayText(event.text)}</span></div>
              <span class="mono muted">${escapeHtml(event.id)}</span>
              <span class="status-pill">No audio</span>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-inline">The selected beat has no spoken lines.</div>`;

  workspaceContent.innerHTML = `
    <section class="workspace-section">
      <div class="section-heading">
        <div><span class="section-label">Voice</span><h3>Cast and line inventory</h3></div>
        <span class="status-pill warning">Provider not connected</span>
      </div>
      <p class="workspace-note">This workspace is production-ready UI scaffolding only. No provider credentials, generated takes, or audio completion state are stored in the current repository schema.</p>
      <div class="voice-cast-grid">${cast}</div>
    </section>
    <section class="workspace-section">
      <div class="section-heading"><div><span class="section-label">Selected beat</span><h3>${escapeHtml(beat?.title ?? "No beat selected")}</h3></div></div>
      <div class="voice-lines">${lines}</div>
    </section>
  `;
}

function renderAssets() {
  const node = currentNode();
  if (!node) return;
  const backgrounds = new Set();
  const characters = new Set();
  let missingBackgrounds = 0;
  let missingSlots = 0;

  for (const beat of node.beats) {
    const staging = productionForBeat(beat)?.staging ?? {};
    if (staging.background) backgrounds.add(staging.background);
    else missingBackgrounds += 1;
    const slots = staging.slots ?? {};
    for (const slotName of ["left", "center", "right"]) {
      const slot = slots[slotName];
      if (slot?.character) characters.add(slot.character);
      else missingSlots += 1;
    }
  }

  const renderReferenceList = (items, emptyText) => {
    if (items.length === 0) return `<div class="empty-inline">${escapeHtml(emptyText)}</div>`;
    return items.map((item) => `<div class="asset-reference"><strong>${escapeHtml(item)}</strong><span class="status-pill">Referenced</span></div>`).join("");
  };

  workspaceContent.innerHTML = `
    <section class="workspace-section">
      <div class="section-heading"><div><span class="section-label">Assets</span><h3>Referenced production data</h3></div></div>
      <p class="workspace-note">The current schema records staging references, not asset-library availability. “Referenced” means the identifier appears in production metadata; it does not claim a finished file exists.</p>
      <div class="asset-grid">
        <div class="asset-panel"><span class="section-label">Background references</span>${renderReferenceList([...backgrounds], "No background references assigned")}</div>
        <div class="asset-panel"><span class="section-label">Character references</span>${renderReferenceList([...characters], "No character references assigned")}</div>
        <div class="asset-panel"><span class="section-label">Unassigned production fields</span><div class="asset-stat"><strong>${missingBackgrounds}</strong><span>beats without background</span></div><div class="asset-stat"><strong>${missingSlots}</strong><span>empty character slots across beats</span></div></div>
      </div>
    </section>
  `;
}

function renderWorkspace() {
  workspaceTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.workspace === state.workspace));
  if (state.workspace === "overview") renderOverview();
  else if (state.workspace === "script") renderScript();
  else if (state.workspace === "scene") renderScene();
  else if (state.workspace === "voice") renderVoice();
  else if (state.workspace === "assets") renderAssets();
}

function renderInspector() {
  const beat = currentBeat();
  if (!beat) {
    clearInspector();
    return;
  }

  const script = scriptForBeat(beat);
  const dialogueCount = spokenScriptForBeat(beat).length;
  const staging = productionForBeat(beat)?.staging;
  selectionId.textContent = beat.id;
  inspector.classList.remove("empty-state");
  inspector.innerHTML = `
    <section class="inspector-section primary-detail"><span class="section-label">Player sees</span><p>${displayText(beat.screenAction)}</p></section>
    <section class="inspector-section"><span class="section-label">Timing</span><p>${escapeHtml(timingLabel(beat))}</p></section>
    <section class="inspector-section"><span class="section-label">Characters</span><div class="tag-list">${beat.characters.map((character) => `<span class="tag">${escapeHtml(character)}</span>`).join("")}</div></section>
    <section class="inspector-section"><span class="section-label">Script</span><p>${script.length ? `${escapeHtml(statusLabel(beat.scriptStatus ?? "draft"))} · ${script.length} events · ${dialogueCount} spoken lines` : "No exact script authored yet."}</p></section>
    <section class="inspector-section"><span class="section-label">Scene metadata</span><p>${staging ? "Staging metadata assigned." : "No staging metadata assigned."}</p></section>
    <section class="inspector-section"><span class="section-label">Dialogue intent</span><p>${displayText(beat.dialogueIntent)}</p></section>
    <section class="inspector-section"><span class="section-label">Player control</span><p>${displayText(beat.playerControl)}</p></section>
    <section class="inspector-section"><span class="section-label">Trigger</span><p class="mono">${escapeHtml(beat.trigger)}</p></section>
    <section class="inspector-section result-panel"><span class="section-label">Resulting state</span><p>${displayText(beat.result)}</p></section>
    <section class="inspector-section next-panel"><span class="section-label">Next</span><p class="mono">${escapeHtml(beat.next ?? "—")}</p></section>
  `;
}

function clearInspector() {
  selectionId.textContent = "No beat selected";
  inspector.className = "inspector-content empty-state";
  inspector.textContent = "Select a beat to inspect its production details.";
}

function renderNode() {
  renderNodeHeader();
  renderWorkspace();
  renderTimeline();
}

function selectNode(sagaId, chapterId, nodeId) {
  state.sagaId = sagaId;
  state.chapterId = chapterId;
  state.nodeId = nodeId;
  const node = currentNode();
  state.beatId = node?.beats[0]?.id ?? null;
  state.workspace = "overview";
  renderTree();
  renderNode();
  renderInspector();
}

function selectBeat(beatId) {
  state.beatId = beatId;
  renderTimeline();
  renderWorkspace();
  renderInspector();
}

function selectWorkspace(workspace) {
  state.workspace = workspace;
  renderWorkspace();
}

function toggleDensity() {
  state.compact = !state.compact;
  app.classList.toggle("compact", state.compact);
  densityButton.textContent = state.compact ? "Comfortable" : "Compact";
}

function exportStory() {
  const blob = new Blob([`${JSON.stringify(state.story, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fantasia-story.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function playerBeat() {
  return currentNode()?.beats[state.playerBeatIndex] ?? null;
}

function playerEvents() {
  const beat = playerBeat();
  if (!beat) return [];
  const script = scriptForBeat(beat);
  if (script.length) return script;
  return productionForBeat(beat)?.events ?? [];
}

function currentPlayerEvent() {
  return playerEvents()[state.playerEventIndex] ?? null;
}

function playerSpeaker(event, beat) {
  if (event?.displayLabel) return event.displayLabel;
  if (event?.speaker) return event.speaker;
  if (event?.type === "action") return "Action";
  if (event?.type === "control") return "Player";
  if (event?.type === "transition") return "Transition";
  return beat?.presentation ?? "Scene";
}

function renderPlayer() {
  const node = currentNode();
  const beat = playerBeat();
  if (!node || !beat) return;
  const staging = productionForBeat(beat)?.staging ?? {};
  const slots = staging.slots ?? {};
  const events = playerEvents();
  const event = currentPlayerEvent();

  playerTitle.textContent = `${node.title} — ${beat.title}`;
  playerStage.innerHTML = `
    <div class="player-background"><span>${escapeHtml(staging.background ?? node.location ?? "Scene")}</span></div>
    <div class="player-characters">
      ${renderCharacterSlot("Left", slots.left, beat)}
      ${renderCharacterSlot("Center", slots.center, beat)}
      ${renderCharacterSlot("Right", slots.right, beat)}
    </div>
  `;

  if (event) {
    const label = playerSpeaker(event, beat);
    playerCopy.innerHTML = `<span class="player-speaker">${escapeHtml(label)}</span><p>${displayText(event.text)}</p>`;
  } else {
    playerCopy.innerHTML = `<span class="player-speaker">${escapeHtml(beat.presentation)}</span><p>${displayText(beat.dialogueIntent || beat.screenAction)}</p>`;
  }

  const totalNodeEvents = node.beats.reduce((sum, item) => {
    const script = scriptForBeat(item);
    return sum + (script.length || (productionForBeat(item)?.events?.length ?? 1));
  }, 0);
  let absoluteIndex = 0;
  for (let index = 0; index < state.playerBeatIndex; index += 1) {
    const priorBeat = node.beats[index];
    absoluteIndex += scriptForBeat(priorBeat).length || (productionForBeat(priorBeat)?.events?.length ?? 1);
  }
  absoluteIndex += state.playerEventIndex + 1;

  playerProgress.textContent = `${absoluteIndex} / ${totalNodeEvents} · Beat ${state.playerBeatIndex + 1}/${node.beats.length}`;
  playerPrev.disabled = state.playerBeatIndex === 0 && state.playerEventIndex === 0;

  const lastBeat = state.playerBeatIndex === node.beats.length - 1;
  const lastEvent = state.playerEventIndex >= Math.max(0, events.length - 1);
  playerNext.textContent = lastBeat && lastEvent ? "Finish" : "Next →";
}

function openPlayer() {
  const node = currentNode();
  if (!node || node.beats.length === 0) return;
  const selectedIndex = node.beats.findIndex((beat) => beat.id === state.beatId);
  state.playerBeatIndex = selectedIndex >= 0 ? selectedIndex : 0;
  state.playerEventIndex = 0;
  playerOverlay.hidden = false;
  document.body.classList.add("player-open");
  renderPlayer();
  closePlayerButton.focus();
}

function closePlayer() {
  playerOverlay.hidden = true;
  document.body.classList.remove("player-open");
  playNodeButton.focus();
}

function syncPlayerSelection() {
  const beat = playerBeat();
  if (!beat) return;
  state.beatId = beat.id;
  renderTimeline();
  renderWorkspace();
  renderInspector();
}

function stepPlayer(delta) {
  const node = currentNode();
  if (!node) return;

  if (delta > 0) {
    const events = playerEvents();
    if (state.playerEventIndex < Math.max(0, events.length - 1)) {
      state.playerEventIndex += 1;
    } else if (state.playerBeatIndex < node.beats.length - 1) {
      state.playerBeatIndex += 1;
      state.playerEventIndex = 0;
      syncPlayerSelection();
    } else {
      closePlayer();
      return;
    }
  } else if (delta < 0) {
    if (state.playerEventIndex > 0) {
      state.playerEventIndex -= 1;
    } else if (state.playerBeatIndex > 0) {
      state.playerBeatIndex -= 1;
      const previousEvents = playerEvents();
      state.playerEventIndex = Math.max(0, previousEvents.length - 1);
      syncPlayerSelection();
    }
  }
  renderPlayer();
}

async function init() {
  try {
    const [storyResponse, productionResponse] = await Promise.all([
      fetch("./story.json", { cache: "no-store" }),
      fetch("./story-production.json", { cache: "no-store" }),
    ]);
    if (!storyResponse.ok) throw new Error(`Story data request failed: ${storyResponse.status}`);
    if (!productionResponse.ok) throw new Error(`Production data request failed: ${productionResponse.status}`);

    state.story = await storyResponse.json();
    state.production = await productionResponse.json();

    const firstSaga = state.story.sagas[0];
    const firstChapter = firstSaga?.chapters[0];
    const firstNode = firstChapter?.nodes[0];
    if (!firstSaga || !firstChapter || !firstNode) throw new Error("Story data has no readable nodes.");

    state.sagaId = firstSaga.id;
    state.chapterId = firstChapter.id;
    state.nodeId = firstNode.id;
    state.beatId = firstNode.beats[0]?.id ?? null;

    status.textContent = "Loaded";
    status.classList.add("ready");
    renderTree();
    renderNode();
    renderInspector();
  } catch (error) {
    status.textContent = "Load failed";
    status.classList.add("error");
    workspaceContent.innerHTML = `<div class="load-error"><strong>Unable to load story data.</strong><p>${escapeHtml(error instanceof Error ? error.message : error)}</p></div>`;
  }
}

workspaceTabs.forEach((tab) => tab.addEventListener("click", () => selectWorkspace(tab.dataset.workspace)));
densityButton.addEventListener("click", toggleDensity);
exportButton.addEventListener("click", exportStory);
playNodeButton.addEventListener("click", openPlayer);
closePlayerButton.addEventListener("click", closePlayer);
playerPrev.addEventListener("click", () => stepPlayer(-1));
playerNext.addEventListener("click", () => stepPlayer(1));
playerOverlay.addEventListener("click", (event) => {
  if (event.target === playerOverlay) closePlayer();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !playerOverlay.hidden) closePlayer();
  if (!playerOverlay.hidden && event.key === "ArrowRight") stepPlayer(1);
  if (!playerOverlay.hidden && event.key === "ArrowLeft") stepPlayer(-1);
});

init();
