import { render } from "preact";
import { useState } from "preact/hooks";
import { BattleApp } from "./battle.js";
import { CampaignApp } from "./campaign.js";
import "./styles.css";
import "./production.css";

type AppScreen = "campaign" | "battle";

function App() {
  const [screen, setScreen] = useState<AppScreen>("campaign");

  return screen === "battle" ? (
    <BattleApp onReturnCampaign={() => setScreen("campaign")} />
  ) : (
    <CampaignApp onOpenBattle={() => setScreen("battle")} />
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<App />, root);
