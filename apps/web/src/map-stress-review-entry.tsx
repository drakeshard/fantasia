import { render } from "preact";
import { MapStressReviewApp } from "./map-stress-review.js";
import "./styles.css";
import "./map-review.css";
import "./map-review-stability.css";

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
const appRoot: HTMLElement = root;

function lockReviewViewport(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  for (const element of [document.documentElement, document.body, appRoot]) {
    element.style.position = "fixed";
    element.style.inset = "0";
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.maxWidth = `${width}px`;
    element.style.maxHeight = `${height}px`;
    element.style.margin = "0";
    element.style.overflow = "hidden";
  }
  const review = appRoot.querySelector<HTMLElement>(".map-review");
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

render(<MapStressReviewApp />, appRoot);
lockReviewViewport();
window.addEventListener("resize", lockReviewViewport);
