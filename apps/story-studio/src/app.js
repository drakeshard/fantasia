const app = document.querySelector("#app");
const tree = document.querySelector("#story-tree");
const nodeHeader = document.querySelector("#node-header");
const beatList = document.querySelector("#beat-list");
const inspector = document.querySelector("#inspector-content");
const selectionId = document.querySelector("#selection-id");
const status = document.querySelector("#story-status");
const densityButton = document.querySelector("#toggle-density");
const exportButton = document.querySelector("#export-json");

const state = {
  story: null,
  sagaId: null,
  chapterId: null,
  nodeId: null,
  beatId: null,
  compact: false,
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

function statusLabel(value) {
  return value === "approved-structure" ? "Approved structure" : value;
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
        button.dataset.saga = saga.id;
        button.dataset.chapter = chapter.id;
        button.dataset.node = node.id;
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

  const metadata = [node.location, node.time].filter(Boolean);
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

  beatList.innerHTML = "";

  if (node.beats.length === 0) {
    beatList.innerHTML = `
      <div class="empty-node">
        <span class="section-label">Structure only</span>
        <strong>Detailed beats have not been authored for this node yet.</strong>
        <p>The Story Studio shows the approved node summary without inventing scene-level content.</p>
      </div>
    `;
    clearInspector();
    return;
  }

  for (const beat of node.beats) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `beat-card ${beat.id === state.beatId ? "active" : ""}`;
    button.dataset.beat = beat.id;
    button.innerHTML = `
      <div class="beat-index mono">${String(beat.order).padStart(2, "0")}</div>
      <div class="beat-copy">
        <div class="beat-topline">
          <span class="presentation-chip">${escapeHtml(beat.presentation)}</span>
          <span class="mono muted">${escapeHtml(beat.id)}</span>
        </div>
        <h3>${escapeHtml(beat.title)}</h3>
        <p>${escapeHtml(beat.screenAction)}</p>
      </div>
      <span class="beat-arrow" aria-hidden="true">›</span>
    `;
    button.addEventListener("click", () => selectBeat(beat.id));
    beatList.append(button);
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
    <section class="inspector-section primary-detail">
      <span class="section-label">Player sees</span>
      <p>${escapeHtml(beat.screenAction)}</p>
    </section>

    <section class="inspector-section">
      <span class="section-label">Characters present</span>
      <div class="tag-list">${beat.characters
        .map((character) => `<span class="tag">${escapeHtml(character)}</span>`)
        .join("")}</div>
    </section>

    <section class="inspector-section">
      <span class="section-label">Dialogue intent</span>
      <p>${escapeHtml(beat.dialogueIntent)}</p>
    </section>

    <div class="detail-grid">
      <section class="inspector-section">
        <span class="section-label">Player control</span>
        <p>${escapeHtml(beat.playerControl)}</p>
      </section>
      <section class="inspector-section">
        <span class="section-label">Trigger</span>
        <p class="mono">${escapeHtml(beat.trigger)}</p>
      </section>
    </div>

    <section class="inspector-section result-panel">
      <span class="section-label">Resulting state</span>
      <p>${escapeHtml(beat.result)}</p>
    </section>

    <section class="inspector-section next-panel">
      <span class="section-label">Next</span>
      <p class="mono">${escapeHtml(beat.next ?? "—")}</p>
    </section>
  `;
}

function clearInspector() {
  state.beatId = null;
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
  renderNode();
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

async function init() {
  try {
    const response = await fetch("./story.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Story data request failed: ${response.status}`);
    state.story = await response.json();

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
    nodeHeader.innerHTML = `
      <div class="load-error">
        <strong>Unable to load story data.</strong>
        <p>${escapeHtml(error instanceof Error ? error.message : error)}</p>
      </div>
    `;
  }
}

densityButton.addEventListener("click", toggleDensity);
exportButton.addEventListener("click", exportStory);
init();
