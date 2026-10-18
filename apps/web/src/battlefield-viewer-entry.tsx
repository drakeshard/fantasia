import { render } from "preact";
import "./environment-scenes.css";
import { BattlefieldViewerApp } from "./battlefield-viewer.js";
import { installMapReviewStyles } from "./map-review-style.js";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");

installMapReviewStyles();
render(<BattlefieldViewerApp />, root);
