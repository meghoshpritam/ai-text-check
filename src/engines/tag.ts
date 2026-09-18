import type { EngineName, Issue } from "../types.js";

export function tagEngine(issues: Issue[], engine: EngineName): Issue[] {
  return issues.map((issue) => ({ ...issue, engine }));
}

export function uniqueEngines(engines: EngineName[]): EngineName[] {
  return [...new Set(engines)];
}
