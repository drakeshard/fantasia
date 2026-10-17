import type { ComponentChildren, JSX } from "preact";
import { UiButton } from "./ui/primitives.js";

const UI_ASSET_ROOT = "/assets/ui/core";

export type GameControlIcon = "back" | "campaign" | "forward" | "home" | "settings";
export type GameControlTone = "nav" | "primary" | "utility";

const iconAssets: Record<Exclude<GameControlIcon, "back">, string> = {
  campaign: "fantasia_ui_icon_campaign_default_v001.svg",
  forward: "fantasia_ui_icon_chevron_right_v001.svg",
  home: "fantasia_ui_icon_home_default_v001.svg",
  settings: "fantasia_ui_icon_settings_default_v001.svg",
};

function GameControlIconView({ icon }: { readonly icon: GameControlIcon }) {
  const asset = icon === "back" ? iconAssets.forward : iconAssets[icon];
  return (
    <span class={`game-control-icon${icon === "back" ? " is-back" : ""}`} aria-hidden="true">
      <img src={`${UI_ASSET_ROOT}/${asset}`} alt="" />
    </span>
  );
}

interface GameButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "class" | "className"> {
  readonly children: ComponentChildren;
  readonly class?: string;
  readonly icon?: GameControlIcon;
  readonly tone?: GameControlTone;
  readonly compactLabel?: string;
  readonly busy?: boolean;
  readonly selected?: boolean;
}

export function GameButton({
  children,
  class: className,
  icon,
  tone = "nav",
  compactLabel,
  busy,
  selected,
  ...buttonProps
}: GameButtonProps) {
  const classes = [
    "game-control",
    `game-control-${tone}`,
    compactLabel ? "has-compact-label" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <UiButton
      {...buttonProps}
      class={classes}
      tone={tone === "primary" ? "primary" : tone === "utility" ? "quiet" : "neutral"}
      {...(busy === undefined ? {} : { busy })}
      {...(selected === undefined ? {} : { selected })}
    >
      {icon ? <GameControlIconView icon={icon} /> : null}
      <span class="game-control-label">{children}</span>
      {compactLabel ? <span class="game-control-compact-label">{compactLabel}</span> : null}
    </UiButton>
  );
}

interface GameUtilityClusterProps {
  readonly onHome?: () => void;
  readonly onSettings?: (trigger: HTMLElement) => void;
  readonly homeLabel?: string;
  readonly class?: string;
}

export function GameUtilityCluster({
  onHome,
  onSettings,
  homeLabel = "Home",
  class: className,
}: GameUtilityClusterProps) {
  if (!onHome && !onSettings) return null;

  return (
    <div class={`game-global-utilities${className ? ` ${className}` : ""}`}>
      {onHome ? (
        <GameButton icon="home" compactLabel="Home" onClick={onHome} aria-label={homeLabel}>
          {homeLabel}
        </GameButton>
      ) : null}
      {onSettings ? (
        <GameButton
          icon="settings"
          compactLabel="Settings"
          onClick={(event) => onSettings(event.currentTarget)}
          aria-label="Settings"
        >
          Settings
        </GameButton>
      ) : null}
    </div>
  );
}

interface GameScreenHeaderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly backLabel?: string;
  readonly onBack?: () => void;
  readonly homeLabel?: string;
  readonly onHome?: () => void;
  readonly onSettings?: (trigger: HTMLElement) => void;
  readonly class?: string;
  readonly crest?: boolean;
}

export function GameScreenHeader({
  eyebrow,
  title,
  backLabel,
  onBack,
  homeLabel = "Home",
  onHome,
  onSettings,
  class: className,
  crest = false,
}: GameScreenHeaderProps) {
  return (
    <header class={`game-screen-header${className ? ` ${className}` : ""}`}>
      <div class="game-screen-header-start">
        {onBack ? (
          <GameButton icon="back" onClick={onBack} aria-label={backLabel ?? "Back"}>
            {backLabel ?? "Back"}
          </GameButton>
        ) : null}
      </div>

      <div class="game-screen-title-lockup">
        {crest ? (
          <span class="game-screen-title-crest" aria-hidden="true">
            <img src={`${UI_ASSET_ROOT}/fantasia_ui_brand_crest_v001.svg`} alt="" />
          </span>
        ) : null}
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>
      </div>

      <GameUtilityCluster
        {...(onHome ? { onHome } : {})}
        {...(onSettings ? { onSettings } : {})}
        homeLabel={homeLabel}
        class="game-screen-header-end"
      />
    </header>
  );
}
