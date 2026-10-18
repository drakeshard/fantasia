import { render } from "preact";
import { MapStressApp } from "./map-stress.js";
import "./styles.css";
import "./map-review.css";
import "./map-stress.css";

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<MapStressApp />, root);
