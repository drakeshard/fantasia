const devMode = new URLSearchParams(window.location.search).get("dev");

if (devMode === "environment-scenes") {
  void import("./environment-scenes-entry.js");
} else {
  void import("./main.js");
}
