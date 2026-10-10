const workspace = document.querySelector(".workspace");
const tree = document.querySelector("#story-tree");
const inspector = document.querySelector(".inspector");
const inspectorHeading = document.querySelector(".inspector-heading");
const timelineDock = document.querySelector(".timeline-dock");
const timelineHead = document.querySelector(".timeline-dock-head");

const uiState = {
  inspectorCollapsed: false,
  timelineCollapsed: false,
  collapsedChapters: new Set(),
};

function makePanelToggle(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "panel-toggle";
  button.setAttribute("aria-label", label);
  button.innerHTML = '<span class="panel-chevron" aria-hidden="true">▾</span>';
  button.addEventListener("click", onClick);
  return button;
}

const inspectorToggle = makePanelToggle("Collapse inspector", () => {
  uiState.inspectorCollapsed = !uiState.inspectorCollapsed;
  inspector.classList.toggle("is-collapsed", uiState.inspectorCollapsed);
  workspace.classList.toggle("inspector-is-collapsed", uiState.inspectorCollapsed);
  inspectorToggle.setAttribute(
    "aria-label",
    uiState.inspectorCollapsed ? "Expand inspector" : "Collapse inspector",
  );
  inspectorToggle.setAttribute("aria-expanded", String(!uiState.inspectorCollapsed));
  inspectorToggle.querySelector(".panel-chevron").textContent = uiState.inspectorCollapsed
    ? "◂"
    : "▾";
});
inspectorHeading.append(inspectorToggle);

const timelineToggle = makePanelToggle("Collapse beat timeline", () => {
  uiState.timelineCollapsed = !uiState.timelineCollapsed;
  timelineDock.classList.toggle("is-collapsed", uiState.timelineCollapsed);
  timelineToggle.setAttribute(
    "aria-label",
    uiState.timelineCollapsed ? "Expand beat timeline" : "Collapse beat timeline",
  );
  timelineToggle.setAttribute("aria-expanded", String(!uiState.timelineCollapsed));
  timelineToggle.querySelector(".panel-chevron").textContent = uiState.timelineCollapsed
    ? "▸"
    : "▾";
});
timelineHead.append(timelineToggle);

function enhanceTree() {
  const selected = tree.querySelector(".node-link.active");
  const selectedBlock = selected?.closest(".chapter-block");
  const selectedId = selectedBlock?.querySelector(".chapter-title span")?.textContent?.trim();

  for (const block of tree.querySelectorAll(".chapter-block")) {
    const title = block.querySelector(":scope > .chapter-title");
    const nav = block.querySelector(":scope > .node-nav");
    if (!title || !nav || title.dataset.enhanced === "true") continue;
    const chapterId = title.querySelector("span")?.textContent?.trim() ?? "Chapter";
    const chapterName = title.querySelector("strong")?.textContent?.trim() ?? chapterId;
    const collapsed = selectedId
      ? chapterId !== selectedId
      : uiState.collapsedChapters.has(chapterId);
    if (collapsed) uiState.collapsedChapters.add(chapterId);
    else uiState.collapsedChapters.delete(chapterId);
    block.classList.toggle("is-collapsed", collapsed);
    title.dataset.enhanced = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-toggle";
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${chapterName}`);
    button.innerHTML = `<span class="chapter-toggle-copy">${title.innerHTML}</span><span class="chapter-chevron" aria-hidden="true">▾</span>`;
    button.addEventListener("click", () => {
      const nowCollapsed = !block.classList.contains("is-collapsed");
      block.classList.toggle("is-collapsed", nowCollapsed);
      button.setAttribute("aria-expanded", String(!nowCollapsed));
      button.setAttribute("aria-label", `${nowCollapsed ? "Expand" : "Collapse"} ${chapterName}`);
      if (nowCollapsed) uiState.collapsedChapters.add(chapterId);
      else uiState.collapsedChapters.delete(chapterId);
    });
    title.replaceChildren(button);
  }
}

const observer = new MutationObserver(() => queueMicrotask(enhanceTree));
observer.observe(tree, { childList: true, subtree: true });
enhanceTree();
