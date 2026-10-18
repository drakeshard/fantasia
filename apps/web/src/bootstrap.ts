const devMode = new URLSearchParams(window.location.search).get("dev");

if (devMode === "battlefield" || devMode === "environment-scenes") {
  // environment-scenes remains a compatibility alias while existing links migrate.
  void import("./battlefield-viewer-entry.js");
} else {
  void import("./main.js");
}
