import type { GuideSectionContent } from "./types";

export const gameModesGuide: GuideSectionContent = {
  id: "game-modes",
  title: "Game Modes",
  intro: "Domain vector codes: A = absent, F = fixed, C = chosen, R = random.",
  blocks: [
    { heading: "Free", body: "Unrestricted exploration. Next cycles domains and draws one random card; all manual actions remain available." },
    { heading: "Standard", body: "Balanced modelling reflection. Cycle domains, draw five candidates, choose one, and discard the rest." },
    { heading: "True Tarot", body: "Blind placement for surprise. Draw cards hidden, arrange first, then reveal and interpret." },
    { heading: "Minimalism", body: "Initial architecture. Place the six domain master cards, then expand one layer deeper by drawing subdomain master cards in the normal domain cycle." },
    { heading: "True Bayes", body: "Fast brainstorm mode. Draw randomly through all domains, place freely, and keep the tempo high before interpreting the pattern." },
    { heading: "Source Review", body: "Source-focused reading mode. Use Source cards to structure source material, then draw Aspect modifier prompts." },
    { heading: "Abstraction", body: "Aspect-only topic mode. Draw Aspect modifier prompts x and apply them to a target y as x(y)." },
    { heading: "Shadows & Vacuum", body: "Absence and boundary mode. Place Source, choose supporting Source cards, then repeatedly draw five Void candidates and keep one." },
    { heading: "Everything Not", body: "Alternative-model mode. Place Structure and Chameleon masters, choose supporting Structure and Chameleon cards, then draw random Void cards." },
    { heading: "Void Cartography", body: "Spatial absence mapping. Alternate choose-1-from-5 rounds between restricted Void Geometry/Dynamics cards and Aspect modifier cards." },
    { heading: "Ablation Study", body: "Minimal-assumption mode. Place Source, review supporting Source cards, place Structure/Chameleon as model core, then mark cards as ablated until the model fails." },
    { heading: "Model Archaeology", body: "Past-project reconstruction. Fix Source as the project record, choose model layers chronologically, and use Aspect prompts to question the reconstruction." },
    { heading: "Model Lies", body: "Deception diagnosis. Fix Structure and Chameleon as the model, then draw challenges that test what it may conceal or over-claim." },
    { heading: "Model Dies", body: "Model stress test. Fix the Structure/Chameleon model core, choose destructive Source, Void, and Volition cards, then mark cards ablated/destroyed where failure begins." },
    { heading: "Inheritance", body: "Origins-and-influence mode. Focus on chosen Volition cards and ask what goal, pressure, habit, or institution was inherited." },
    { heading: "Entropy Auction", body: "Group plurality mode. Draw two candidates from each canonical domain, argue over the twelve-card pool, keep one, and discard the rest." },
    { heading: "Own Worst Enemy", body: "Adversarial self-dialogue. Fix Source, then alternate pro and anti stances while choosing Structure, Chameleon, and Volition cards." },
    { heading: "Midnight Calibration", body: "Fatigue-aware random mode. Draw two cards from each domain as a pair: one interpretation card and one background card." },
    { heading: "Exam Clock", body: "Pressured-decision mode. Fix Source and Volition, choose Structure/Chameleon/Void under a 10-minute timer, then grade the model." },
    { heading: "Painter's Trace", body: "Nonverbal trace mode. Choose Structure, Chameleon, and Void cards, then respond with a quick arrow, note, shape, or drawing. Works especially well with physical cards / physical surroundings." },
    { heading: "Bench and Forest", body: "Phenomenological grounding mode. Choose Source and Aspect cards and attach them to nearby objects, impressions, or phenomena. Works especially well with physical cards / physical surroundings." },
    { heading: "Landscape", body: "Topographic meaning mode. Draw randomly through all domains and interpret geography, distance, boundaries, clusters, and gaps. Works especially well with physical cards / physical surroundings." },
    { heading: "Walk in the Park", body: "Mobile outdoor mode. Draw random Source, Structure, and Chameleon cards while interpreting nearby environment through them. Works especially well with physical cards / physical surroundings." }
  ]
};
