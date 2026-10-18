import { render } from "preact";
import { MapReviewApp } from "./map-review.js";
import "./styles.css";
import "./map-review.css";
import "./map-review-stability.css";

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");

function lockReviewViewport(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  for (const element of [document.documentElement, document.body, root]) {
    element.style.position = "fixed";
    element.style.inset = "0";
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.maxWidth = `${width}px`;
    element.style.maxHeight = `${height}px`;
    element.style.margin = "0";
    element.style.overflow = "hidden";
  }
  const review = root.querySelector<HTMLElement>(".map-review");
  if (!review) return;
  review.style.position = "fixed";
  review.style.inset = "0";
  review.style.width = `${width}px`;
  review.style.height = `${height}px`;
  review.style.minWidth = "0";
  review.style.minHeight = "0";
  review.style.maxWidth = `${width}px`;
  review.style.maxHeight = `${height}px`;
  review.style.overflow = "hidden";
}

render(<MapReviewApp />, root);
lockReviewViewport();
window.addEventListener("resize", lockReviewViewport);
