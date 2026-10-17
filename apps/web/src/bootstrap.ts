const devMode = new URLSearchParams(window.location.search).get("dev");

if (devMode === "map-b01") {
  void import("./map-review-entry.js");
} else {
  void import("./main.js");
}
