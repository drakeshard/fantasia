import { render } from "preact";
import { MapStressReviewApp } from "./map-stress-review.js";
import "./styles.css";
import "./map-review.css";
import "./map-review-stability.css";

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<MapStressReviewApp />, root);
