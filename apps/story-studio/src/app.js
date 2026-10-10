const app = document.querySelector("#app");
const tree = document.querySelector("#story-tree");
const nodeHeader = document.querySelector("#node-header");
const scenePreview = document.querySelector("#scene-preview");
const beatTimeline = document.querySelector("#beat-timeline");
const eventList = document.querySelector("#event-list");
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

function statusLabel(value) {
  if (value === "approved-structure") return "Approved structure";
  if (value === "draft") return "Draft";
  return value;
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

function nodeTimingLabel(node) {
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
  if (hasPlayerRange) return `Estimated ${formatSeconds(min)}–${formatSeconds(max)}`;
  return `Estimated ${formatSeconds(max)}`;
}

function formatSeconds(total) {
  const rounded = Math.max(0, Math.round(total));
  const minutes = Math.floor(rounded / 60);
  const seconds = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
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
        button.innerHTML = `
          <span class="node-link-main">
            <span class="mono node-code">${escapeHtml(node.id.replace(`${chapter.id}-`, ""))}</span>
            <span>${escapeHtml(node.title)}</span>
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

function renderNode() {
  const saga = currentSaga();
  const chapter = currentChapter();
  const node = currentNode();
  if (!saga || !chapter || !node) return;

  const metadata = [node.location, node.time, nodeTimingLabel(node)].filter(Boolean);
  const scriptBadge = node.scriptStatus
    ? `<span class="status-pill">${escapeHtml(statusLabel(node.scriptStatus))} script</span>`
    : "";
  nodeHeader.innerHTML = `
    <div class="node-title-row">
      <div>
        <p class="eyebrow">${escapeHtml(saga.id)} · ${escapeHtml(chapter.id)} · ${escapeHtml(node.type)}</p>
        <h2>${escapeHtml(node.title)}</h2>
      </div>
      <div class="tag-list">
        <span class="status-pill">${escapeHtml(statusLabel(node.status))}</span>
        ${scriptBadge}
      </div>
    </div>
    <div class="node-meta mono">${metadata.map(escapeHtml).join(" · ")}</div>
    <p class="node-summary">${escapeHtml(node.summary)}</p>
  `;

  playNodeButton.disabled = node.beats.length === 0;
  renderScenePreview();
  renderTimeline();
  renderEvents();
}

function renderTimeline() {
  const node = currentNode();
  beatTimeline.innerHTML = "";
  if (!node || node.beats.length === 0) {
    beatTimeline.innerHTML = `<div class="empty-node"><span class="section-label">Structure only</span><strong>Detailed beats have not been authored for this node yet.</strong><p>The Studio shows approved structure without inventing scene content.</p></div>`;
    return;
  }

  for (const beat of node.beats) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `timeline-beat ${beat.id === state.beatId ? "active" : ""}`;
    const lineCount = scriptForBeat(beat).length;
    button.innerHTML = `
      <span class="timeline-order mono">${String(beat.order).padStart(2, "0")}</span>
      <span class="timeline-copy">
        <strong>${escapeHtml(beat.title)}</strong>
        <small>${escapeHtml(timingLabel(beat))}${lineCount ? ` · ${lineCount} script events` : ""}</small>
      </span>
    `;
    button.addEventListener("click", () => selectBeat(beat.id));
    beatTimeline.append(button);
  }
}

function speakerDisplayForCharacter(beat, character) {
  const event = scriptForBeat(beat).find(
    (item) => item.speaker === character && typeof item.displayLabel === "string",
  );
  return event?.displayLabel ?? character;
}

function renderCharacterSlot(slotName, slot, beat = currentBeat()) {
  if (!slot) {
    return `<div class="character-slot empty"><span>${escapeHtml(slotName)}</span><small>Empty</small></div>`;
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

function renderScenePreview() {
  const beat = currentBeat();
  if (!beat) {
    scenePreview.innerHTML = `<div class="scene-empty"><span class="section-label">Scene preview</span><p>Select a detailed beat to preview staging.</p></div>`;
    return;
  }

  const production = productionForBeat(beat);
  const staging = production?.staging ?? {};
  const slots = staging.slots ?? {};
  scenePreview.innerHTML = `
    <div class="scene-preview-head">
      <div>
        <span class="section-label">Scene preview</span>
        <strong>${escapeHtml(beat.title)}</strong>
      </div>
      <div class="tag-list">
        <span class="presentation-chip">${escapeHtml(beat.presentation)}</span>
        ${beat.scriptStatus ? `<span class="status-pill">${escapeHtml(statusLabel(beat.scriptStatus))} script</span>` : ""}
      </div>
    </div>
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

function eventIcon(type) {
  return (
    {
      action: "⚡",
      dialogue: "💬",
      thought: "◌",
      reaction: "🙂",
      camera: "🎬",
      control: "🎮",
      transition: "➡",
      narration: "◆",
    }[type] ?? "•"
  );
}

function renderEvents() {
  const beat = currentBeat();
  eventList.innerHTML = "";
  if (!beat) return;
  const script = scriptForBeat(beat);
  const fallbackEvents = productionForBeat(beat)?.events ?? [];
  const events = script.length ? script : fallbackEvents;
  const isScript = script.length > 0;

  if (events.length === 0) {
    eventList.innerHTML = `<div class="event-empty"><span class="section-label">Event sequence</span><p>No ordered sub-events authored yet. Beat-level action and dialogue intent remain available in the inspector.</p></div>`;
    return;
  }

  const heading = document.createElement("div");
  heading.className = "event-heading";
  heading.innerHTML = `<span class="section-label">${isScript ? "Playable script" : "Production event sequence"}</span><span class="mono muted">${events.length} events</span>`;
  eventList.append(heading);

  for (const [index, event] of events.entries()) {
    const row = document.createElement("article");
    row.className = `event-row ${event.type ?? "action"}`;
    const speaker = event.displayLabel ?? event.speaker;
    row.innerHTML = `
      <div class="event-index mono">${String(index + 1).padStart(2, "0")}</div>
      <div class="event-icon" aria-hidden="true">${eventIcon(event.type)}</div>
      <div class="event-copy">
        <div class="event-meta">
          <span>${escapeHtml(event.type ?? "action")}</span>
          ${speaker ? `<strong>${escapeHtml(speaker)}</strong>` : ""}
          ${event.id ? `<span class="mono muted">${escapeHtml(event.id)}</span>` : ""}
        </div>
        <p>${displayText(event.text)}</p>
        ${event.note ? `<small>${displayText(event.note)}</small>` : ""}
      </div>
    `;
    eventList.append(row);
  }
}

function renderInspector() {
  const beat = currentBeat();
  if (!beat) {
    clearInspector();
    return;
  }

  const script = scriptForBeat(beat);
  const dialogueCount = script.filter((event) => event.type === "dialogue").length;
  selectionId.textContent = beat.id;
  inspector.classList.remove("empty-state");
  inspector.innerHTML = `
    <section class="inspector-section primary-detail"><span class="section-label">Player sees</span><p>${displayText(beat.screenAction)}</p></section>
    <section class="inspector-section"><span class="section-label">Timing</span><p>${escapeHtml(timingLabel(beat))}</p></section>
    <section class="inspector-section"><span class="section-label">Characters present</span><div class="tag-list">${beat.characters.map((character) => `<span class="tag">${escapeHtml(character)}</span>`).join("")}</div></section>
    <section class="inspector-section"><span class="section-label">Script</span><p>${script.length ? `${escapeHtml(statusLabel(beat.scriptStatus ?? "draft"))} · ${script.length} events · ${dialogueCount} spoken lines` : "No exact script authored yet."}</p></section>
    <section class="inspector-section"><span class="section-label">Dialogue intent</span><p>${displayText(beat.dialogueIntent)}</p></section>
    <div class="detail-grid">
      <section class="inspector-section"><span class="section-label">Player control</span><p>${displayText(beat.playerControl)}</p></section>
      <section class="inspector-section"><span class="section-label">Trigger</span><p class="mono">${escapeHtml(beat.trigger)}</p></section>
    </div>
    <section class="inspector-section result-panel"><span class="section-label">Resulting state</span><p>${displayText(beat.result)}</p></section>
    <section class="inspector-section next-panel"><span class="section-label">Next</span><p class="mono">${escapeHtml(beat.next ?? "—")}</p></section>
  `;
}

function clearInspector() {
  selectionId.textContent = "No beat selected";
  inspector.className = "inspector-content empty-state";
  inspector.textContent = "Select a beat to inspect its game-facing details.";
}

function selectNode(sagaId, chapterId, nodeId) {
  state.sagaId = sagaId;
  state.chapterId = chapterId;
  state.nodeId = nodeId;
  const node = currentNode();
  state.beatId = node?.beats[0]?.id ?? null;
  renderTree();
  renderNode();
  renderInspector();
}

function selectBeat(beatId) {
  state.beatId = beatId;
  renderTimeline();
  renderScenePreview();
  renderEvents();
  renderInspector();
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
  const production = productionForBeat(beat);
  const staging = production?.staging ?? {};
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
  renderScenePreview();
  renderEvents();
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
    if (!storyResponse.ok) {
      throw new Error(`Story data request failed: ${storyResponse.status}`);
    }
    if (!productionResponse.ok) {
      throw new Error(`Production data request failed: ${productionResponse.status}`);
    }
    state.story = await storyResponse.json();
    state.production = await productionResponse.json();

    const firstSaga = state.story.sagas[0];
    const firstChapter = firstSaga?.chapters[0];
    const firstNode = firstChapter?.nodes[0];
    if (!firstSaga || !firstChapter || !firstNode) {
      throw new Error("Story data has no readable nodes.");
    }

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
    nodeHeader.innerHTML = `<div class="load-error"><strong>Unable to load story data.</strong><p>${escapeHtml(error instanceof Error ? error.message : error)}</p></div>`;
  }
}

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
