import { render } from "preact";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/primitives.css";
import "./ui/semantic.css";
import "./ui/workspace.css";
import "./styles/material-fidelity.css";
import "./styles/studio-auth.css";
import "./styles/production-dashboard.css";
import "./styles/production-characters.css";
import { ProductionStudio } from "./app/ProductionStudio";

const labMode = new URLSearchParams(window.location.search).get("lab") === "1";
const root = document.querySelector<HTMLElement>("#studio-app");
if (!root) throw new Error("Content Studio production root element not found");
if (!labMode) render(<ProductionStudio />, root);
