import { render } from "preact";
import "../styles.css";
import "../game-controls.css";
import "./primitives-review.css";
import { PrimitivesReviewApp } from "./primitives-review.js";

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia primitive review root element was not found.");
render(<PrimitivesReviewApp />, root);
