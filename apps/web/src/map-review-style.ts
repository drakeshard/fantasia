import reviewCss from "./map-review.css?inline";
import stabilityCss from "./map-review-stability.css?inline";

const STYLE_ID = "fantasia-map-review-styles";

export function installMapReviewStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `${reviewCss}\n${stabilityCss}`;
  document.head.append(style);
}
