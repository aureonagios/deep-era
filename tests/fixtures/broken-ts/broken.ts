// Intentionally broken TypeScript: every file here must be reported by deep-era.
// These are the shapes an AI produces when it truncates or mis-generates code, and
// they used to pass `check` silently because TypeScript was never parsed.
export const broken: number = ;
export function missingParen( {
  return 1;
}
