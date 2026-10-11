declare module "virtual:fantasia-story-content" {
  const content: Readonly<
    Record<
      string,
      Readonly<{
        chapterTitle: string;
        nodeTitle: string;
        location?: string;
        time?: string;
        summary?: string;
        events: readonly Readonly<{
          id: string;
          type: "action" | "dialogue" | "thought" | "narration";
          text: string;
          displayLabel?: string;
        }>[];
      }>
    >
  >;
  export default content;
}
