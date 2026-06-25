import type { GuideSectionContent } from "./types";

export const sessionLogGuide: GuideSectionContent = {
  id: "session-log",
  title: "Session Log",
  blocks: [
    { heading: "Question", body: "State the modelling question clearly enough that later notes can be judged against it." },
    { heading: "Domain vector", body: "Record which mode/domain procedure shaped the session." },
    { heading: "Tableau", body: "Preserve the card layout, notes, arrows, and meaningful placements." },
    { heading: "Synthesis", body: "Capture expected, surprising, noteworthy, and insightful findings." },
    { heading: "Conclusion and next move", body: "End with a provisional conclusion and a next empirical, analytical, or action step." }
  ]
};
