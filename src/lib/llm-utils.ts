/**
 * Repairs JSON truncated by LLM token limits.
 * Closes open strings, arrays, and objects in the correct order.
 */
export function repairTruncatedJson(jsonStr: string): string {
  let s = jsonStr.trim();

  while (s.endsWith(",")) s = s.slice(0, -1).trimEnd();

  const stack: ("{" | "[")[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("{");
    else if (ch === "[") stack.push("[");
    else if (ch === "}") stack.pop();
    else if (ch === "]") stack.pop();
  }

  if (inString) s += '"';

  while (stack.length > 0) {
    const top = stack.pop();
    s = s.trimEnd();
    if (s.endsWith(",")) s = s.slice(0, -1);
    s += top === "{" ? "}" : "]";
  }

  return s;
}
