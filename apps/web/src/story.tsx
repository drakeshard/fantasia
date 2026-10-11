import { useEffect, useMemo, useState } from "preact/hooks";
import storySource from "../../../content/narrative/story.json";
import { GameButton } from "./game-controls.js";
import "./story.css";

type ScriptStatus = "draft" | "proposed" | "approved" | "production-ready";
type StoryEventType = "action" | "dialogue" | "thought" | "narration" | "control" | "transition";

type StoryScriptEvent = Readonly<{
  id: string;
  type: StoryEventType;
  text: string;
  speaker?: string;
  displayLabel?: string;
}>;

type StoryBeat = Readonly<{
  id: string;
  order: number;
  scriptStatus?: ScriptStatus;
  script?: readonly StoryScriptEvent[];
}>;

type StoryNode = Readonly<{
  id: string;
  title: string;
  type: "story" | "battle";
  scriptStatus?: ScriptStatus;
  location?: string;
  time?: string;
  summary?: string;
  beats: readonly StoryBeat[];
}>;

type StoryChapter = Readonly<{
  id: string;
  title: string;
  nodes: readonly StoryNode[];
}>;

type StoryDocument = Readonly<{
  sagas: readonly Readonly<{
    id: string;
    chapters: readonly StoryChapter[];
  }>[];
}>;

type PlaybackEvent = Readonly<{
  id: string;
  type: "action" | "dialogue" | "thought" | "narration";
  text: string;
  displayLabel?: string;
}>;

type ApprovedStoryPlayback = Readonly<{
  chapterTitle: string;
  nodeTitle: string;
  location?: string;
  time?: string;
  summary?: string;
  events: readonly PlaybackEvent[];
}>;

const story = storySource as unknown as StoryDocument;

function isApproved(status: ScriptStatus | undefined): boolean {
  return status === "approved" || status === "production-ready";
}

function playerFacingEvent(event: StoryScriptEvent): PlaybackEvent | undefined {
  if (event.type === "control" || event.type === "transition") return undefined;
  if (event.type === "dialogue" || event.type === "thought") {
    if (!event.displayLabel) return undefined;
    return {
      id: event.id,
      type: event.type,
      text: event.text,
      displayLabel: event.displayLabel,
    };
  }
  return { id: event.id, type: event.type, text: event.text };
}

export function approvedChapterOneStory(nodeId: string): ApprovedStoryPlayback | undefined {
  const saga = story.sagas.find((candidate) => candidate.id === "S01");
  const chapter = saga?.chapters.find((candidate) => candidate.id === "CH01");
  const node = chapter?.nodes.find((candidate) => candidate.id === nodeId);
  if (!chapter || !node || node.type !== "story" || !isApproved(node.scriptStatus)) return undefined;

  const orderedBeats = [...node.beats].sort((left, right) => left.order - right.order);
  if (orderedBeats.length === 0 || orderedBeats.some((beat) => !isApproved(beat.scriptStatus))) {
    return undefined;
  }

  const events = orderedBeats.flatMap((beat) =>
    (beat.script ?? []).flatMap((event) => {
      const visible = playerFacingEvent(event);
      return visible ? [visible] : [];
    }),
  );
  if (events.length === 0) return undefined;

  return {
    chapterTitle: chapter.title,
    nodeTitle: node.title,
    ...(node.location === undefined ? {} : { location: node.location }),
    ...(node.time === undefined ? {} : { time: node.time }),
    ...(node.summary === undefined ? {} : { summary: node.summary }),
    events,
  };
}

export function StoryApp({
  nodeId,
  onReturnCampaign,
  onSettings,
}: {
  readonly nodeId: string;
  readonly onReturnCampaign: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}) {
  const playback = useMemo(() => approvedChapterOneStory(nodeId), [nodeId]);
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => setEventIndex(0), [nodeId]);

  if (!playback) {
    return (
      <main class="story-screen story-unavailable" aria-label="Story playback">
        <section class="story-unavailable-card">
          <p class="hud-eyebrow">Story unavailable</p>
          <h1>This story stage is not approved for production playback.</h1>
          <GameButton icon="back" onClick={onReturnCampaign}>
            Return to Chapter
          </GameButton>
        </section>
      </main>
    );
  }

  const event = playback.events[eventIndex] ?? playback.events[0];
  if (!event) return null;
  const finalEvent = eventIndex === playback.events.length - 1;
  const speaker = event.displayLabel;

  return (
    <main class="story-screen" aria-label="Story playback">
      <header class="story-hud">
        <GameButton icon="back" compactLabel="Back" aria-label="Back" onClick={onReturnCampaign}>
          Back to Chapter
        </GameButton>
        <div class="story-title-block">
          <span>{playback.chapterTitle}</span>
          <h1>{playback.nodeTitle}</h1>
        </div>
        <GameButton
          icon="settings"
          compactLabel="Settings"
          aria-label="Settings"
          onClick={(clickEvent) => onSettings(clickEvent.currentTarget)}
        >
          Settings
        </GameButton>
      </header>

      <section class="story-stage" aria-label={`${playback.nodeTitle} scene`}>
        <div class="story-stage-ornament" aria-hidden="true" />
        <div class="story-scene-context">
          {playback.location ? <span>{playback.location}</span> : null}
          {playback.time ? <span>{playback.time}</span> : null}
        </div>

        <section class={`story-caption story-event-${event.type}`} aria-live="polite">
          {speaker ? <p class="story-speaker">{speaker}</p> : <p class="story-speaker">Scene</p>}
          <p class="story-line">{event.text}</p>
          <div class="story-progress" aria-label={`Story event ${eventIndex + 1} of ${playback.events.length}`}>
            <span>{String(eventIndex + 1).padStart(2, "0")}</span>
            <span aria-hidden="true">/</span>
            <span>{String(playback.events.length).padStart(2, "0")}</span>
          </div>
        </section>
      </section>

      <nav class="story-controls" aria-label="Story controls">
        <GameButton
          tone="utility"
          disabled={eventIndex === 0}
          onClick={() => setEventIndex((current) => Math.max(0, current - 1))}
        >
          Previous
        </GameButton>
        <GameButton
          tone="primary"
          icon={finalEvent ? "back" : "forward"}
          onClick={() => {
            if (finalEvent) {
              onReturnCampaign();
              return;
            }
            setEventIndex((current) => Math.min(playback.events.length - 1, current + 1));
          }}
        >
          {finalEvent ? "Return to Chapter" : "Next"}
        </GameButton>
      </nav>
    </main>
  );
}
