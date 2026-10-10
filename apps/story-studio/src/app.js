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
  playerIndex: 0,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function statusLabel(value) {
  return value === "approved-structure" ? "Approved structure" : value;
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
  let fixed = 0;
  let min = 0;
  let max = 0;
  let hasPlayerRange = false;
  for (const beat of node.beats) {
    const timing = productionForBeat(beat)?.timing;
    if (!timing) continue;
    if (timing.mode === "player") {
      hasPlayerRange = true;
      min += Number(timing.minSeconds ?? 0);
      max += Number(timing.maxSeconds ?? timing.minSeconds ?? 0);
    } else if (Number.isFinite(timing.estimatedSeconds)) {
      fixed += timing.estimatedSeconds;
      min += timing.estimatedSeconds;
      max += timing.estimatedSeconds;
    }
  }
  if (max === 0) return null;
  if (hasPlayerRange) return `Estimated ${formatSeconds(min)}–${formatSeconds(max)}`;
  return `Estimated ${formatSeconds(fixed)}`;
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
  nodeHeader.innerHTML = `
    <div class="node-title-row">
      <div>
        <p class="eyebrow">${escapeHtml(saga.id)} · ${escapeHtml(chapter.id)} · ${escapeHtml(node.type)}</p>
        <h2>${escapeHtml(node.title)}</h2>
      </div>
      <span class="status-pill">${escapeHtml(statusLabel(node.status))}</span>
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
    button.innerHTML = `
      <span class="timeline-order mono">${String(beat.order).padStart(2, "0")}</span>
      <span class="timeline-copy"><strong>${escapeHtml(beat.title)}</strong><small>${escapeHtml(timingLabel(beat))}</small></span>
    `;
    button.addEventListener("click", () => selectBeat(beat.id));
    beatTimeline.append(button);
  }
}

function renderCharacterSlot(slotName, slot) {
  if (!slot) {
    return `<div class="character-slot empty"><span>${escapeHtml(slotName)}</span><small>Empty</small></div>`;
  }
  return `
    <div class="character-slot">
      <div class="portrait-placeholder" aria-hidden="true">${escapeHtml(slot.shortLabel ?? slot.character?.slice(0, 2)?.toUpperCase() ?? "??")}</div>
      <strong>${escapeHtml(slot.character)}</strong>
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
      <div><span class="section-label">Scene preview</span><strong>${escapeHtml(beat.title)}</strong></div>
      <span class="presentation-chip">${escapeHtml(beat.presentation)}</span>
    </div>
    <div class="stage-canvas">
      <div class="stage-background">
        <span class="mono muted">BACKGROUND</span>
        <strong>${escapeHtml(staging.background ?? "Background not assigned")}</strong>
        <small>${escapeHtml(staging.camera ?? "Camera framing not assigned")}</small>
      </div>
      <div class="character-row">
        ${renderCharacterSlot("Left", slots.left)}
        ${renderCharacterSlot("Center", slots.center)}
        ${renderCharacterSlot("Right", slots.right)}
      </div>
      <div class="stage-caption">${escapeHtml(beat.screenAction)}</div>
    </div>
  `;
}

function eventIcon(type) {
  return (
    {
      action: "⚡",
      dialogue: "💬",
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
  const events = productionForBeat(beat)?.events ?? [];
  if (events.length === 0) {
    eventList.innerHTML = `<div class="event-empty"><span class="section-label">Event sequence</span><p>No ordered sub-events authored yet. Beat-level action and dialogue intent remain available in the inspector.</p></div>`;
    return;
  }

  const heading = document.createElement("div");
  heading.className = "event-heading";
  heading.innerHTML = `<span class="section-label">Event sequence</span><span class="mono muted">${events.length} events</span>`;
  eventList.append(heading);

  for (const [index, event] of events.entries()) {
    const row = document.createElement("article");
    row.className = `event-row ${event.type ?? "action"}`;
    row.innerHTML = `
      <div class="event-index mono">${String(index + 1).padStart(2, "0")}</div>
      <div class="event-icon" aria-hidden="true">${eventIcon(event.type)}</div>
      <div class="event-copy">
        <div class="event-meta"><span>${escapeHtml(event.type ?? "action")}</span>${event.speaker ? `<strong>${escapeHtml(event.speaker)}</strong>` : ""}</div>
        <p>${escapeHtml(event.text)}</p>
        ${event.note ? `<small>${escapeHtml(event.note)}</small>` : ""}
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

  selectionId.textContent = beat.id;
  inspector.classList.remove("empty-state");
  inspector.innerHTML = `
    <section class="inspector-section primary-detail"><span class="section-label">Player sees</span><p>${escapeHtml(beat.screenAction)}</p></section>
    <section class="inspector-section"><span class="section-label">Timing</span><p>${escapeHtml(timingLabel(beat))}</p></section>
    <section class="inspector-section"><span class="section-label">Characters present</span><div class="tag-list">${beat.characters.map((character) => `<span class="tag">${escapeHtml(character)}</span>`).join("")}</div></section>
    <section class="inspector-section"><span class="section-label">Dialogue intent</span><p>${escapeHtml(beat.dialogueIntent)}</p></section>
    <div class="detail-grid">
      <section class="inspector-section"><span class="section-label">Player control</span><p>${escapeHtml(beat.playerControl)}</p></section>
      <section class="inspector-section"><span class="section-label">Trigger</span><p class="mono">${escapeHtml(beat.trigger)}</p></section>
    </div>
    <section class="inspector-section result-panel"><span class="section-label">Resulting state</span><p>${escapeHtml(beat.result)}</p></section>
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

function renderPlayer() {
  const node = currentNode();
  if (!node || node.beats.length === 0) return;
  const beat = node.beats[state.playerIndex];
  const production = productionForBeat(beat);
  const staging = production?.staging ?? {};
  const slots = staging.slots ?? {};
  playerTitle.textContent = `${node.title} — ${beat.title}`;
  playerStage.innerHTML = `
    <div class="player-background"><span>${escapeHtml(staging.background ?? node.location ?? "Scene")}</span></div>
    <div class="player-characters">
      ${renderCharacterSlot("Left", slots.left)}
      ${renderCharacterSlot("Center", slots.center)}
      ${renderCharacterSlot("Right", slots.right)}
    </div>
  `;
  const firstDialogue = (production?.events ?? []).find((event) => event.type === "dialogue");
  playerCopy.innerHTML = firstDialogue
    ? `<span class="player-speaker">${escapeHtml(firstDialogue.speaker ?? "Dialogue")}</span><p>${escapeHtml(firstDialogue.text)}</p>`
    : `<span class="player-speaker">${escapeHtml(beat.presentation)}</span><p>${escapeHtml(beat.dialogueIntent || beat.screenAction)}</p>`;
  playerProgress.textContent = `${state.playerIndex + 1} / ${node.beats.length} · ${timingLabel(beat)}`;
  playerPrev.disabled = state.playerIndex === 0;
  playerNext.textContent = state.playerIndex === node.beats.length - 1 ? "Finish" : "Next →";
}

function openPlayer() {
  const node = currentNode();
  if (!node || node.beats.length === 0) return;
  const selectedIndex = node.beats.findIndex((beat) => beat.id === state.beatId);
  state.playerIndex = selectedIndex >= 0 ? selectedIndex : 0;
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

function stepPlayer(delta) {
  const node = currentNode();
  if (!node) return;
  if (delta > 0 && state.playerIndex === node.beats.length - 1) {
    closePlayer();
    return;
  }
  state.playerIndex = Math.max(0, Math.min(node.beats.length - 1, state.playerIndex + delta));
  state.beatId = node.beats[state.playerIndex].id;
  renderPlayer();
  renderTimeline();
  renderScenePreview();
  renderEvents();
  renderInspector();
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
