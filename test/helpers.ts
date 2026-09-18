import type { EnginesConfig } from "../src/types.js";

export function onlyEngines(enabled: EnginesConfig = {}): EnginesConfig {
  return {
    polish: false,
    slopGate: false,
    writeGood: false,
    retext: false,
    isThisAiSlop: false,
    veldica: false,
    cleanWriting: false,
    vale: false,
    ...enabled,
  };
}

export const SLOP_TEXT =
  "In today's fast-paced world, we should delve into a rich tapestry of ideas. It's not just a tool, it's a game-changer.";

export const PASSIVE_TEXT =
  "The report was written by the team. The cake was eaten due to the fact that it was very important.";
