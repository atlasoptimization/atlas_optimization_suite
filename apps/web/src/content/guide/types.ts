export type GuideBlock = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type GuideSectionContent = {
  id: string;
  title: string;
  intro?: string;
  blocks: GuideBlock[];
};
