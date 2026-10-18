import layout from "../../../content/encounters/candidates/ch01-b01.layout-candidate.json";
import {
  type BattlefieldRenderScene,
  battlefieldUnitVisualId,
} from "./battlefield-scene.js";

function markerLabel(entry: (typeof layout.deployment.initial)[number]): string {
  if (entry.id === "mc") return "MC";
  if (entry.id === "julie") return "J";
  if (entry.id.startsWith("civilian")) return "C";
  if (entry.id.startsWith("local-escort")) return "E";
  if (entry.id.startsWith("forager")) return "F";
  return "•";
}

function reinforcementLabel(entry: (typeof layout.deployment.reinforcements)[number]): string {
  if (entry.id === "hangaku" || entry.id === "la-hire") return "?";
  if (entry.id.startsWith("forager-reinforcement")) return "R";
  return "+";
}

function cartClearanceFor(routeAnchors: readonly { readonly x: number; readonly y: number }[]) {
  return routeAnchors.flatMap((anchor) => [anchor, { x: anchor.x + 1, y: anchor.y }]);
}

function regionCells(ids: readonly string[]) {
  return layout.environmentIntent.functionalRegions
    .filter((region) => ids.includes(region.id))
    .flatMap((region) => region.cells);
}

export const B01_MAP_REVIEW_SCENE: BattlefieldRenderScene = {
  id: "CH01-B01",
  bounds: layout.bounds,
  blockedCells: layout.terrain.blockedCells,
  elevationCells: layout.terrain.elevationCells,
  terrainRegions: [
    { visualId: "terrain.road", cells: regionCells(["west-approach", "central-road", "east-bend"]) },
    { visualId: "terrain.ridge", cells: regionCells(["north-ridge"]) },
    { visualId: "terrain.track", cells: regionCells(["south-track"]) },
  ],
  blockedPropVisualId: "prop.woodland",
  routeAnchors: layout.cart.routeAnchors,
  routeClearanceCells: cartClearanceFor(layout.cart.routeAnchors),
  exitZone: layout.cart.exitZone,
  units: [
    ...layout.deployment.initial.map((entry) => ({
      cell: entry.cell,
      visualId: battlefieldUnitVisualId(entry.side, false),
      label: markerLabel(entry),
    })),
    ...layout.deployment.reinforcements.map((entry) => {
      const side = entry.id.startsWith("forager") ? "enemy" : "allied";
      return {
        cell: entry.entryCell,
        visualId: battlefieldUnitVisualId(side, true),
        label: reinforcementLabel(entry),
      };
    }),
  ],
  cartStart: layout.cart.startAnchor,
  testIdPrefix: "b01-map-2p5d",
  ariaLabel: "CH01-B01 interactive 2.5D candidate battlefield review",
};
