import { render } from "preact";
import { MapReviewApp } from "./map-review.js";
import "./styles.css";
import "./map-review.css";
import "./map-review-stability.css";

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<MapReviewApp />, root);
