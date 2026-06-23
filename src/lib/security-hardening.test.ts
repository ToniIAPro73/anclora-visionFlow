import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Scans the src/ directory recursively for TS/TSX files
function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && entry !== "node_modules" && entry !== ".next") {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("Security hardening", () => {
  const srcDir = join(process.cwd(), "src");
  const sourceFiles = collectSourceFiles(srcDir);

  it("no source file references NEXT_PUBLIC_ secrets (keys, tokens, passwords)", () => {
    const secretPattern = /NEXT_PUBLIC_(?:OPENROUTER|API_KEY|SECRET|TOKEN|PASSWORD)/gi;
    const violations: string[] = [];
    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8");
      const matches = content.match(secretPattern);
      if (matches) {
        violations.push(`${file}: found ${matches.join(", ")}`);
      }
    }
    expect(violations, `NEXT_PUBLIC_ secrets found:\n${violations.join("\n")}`).toHaveLength(0);
  });

  it("blob uploads use private access only", () => {
    const uploadFile = join(
      process.cwd(),
      "src/app/api/vision/maps/[id]/exports/upload/route.ts"
    );
    const content = readFileSync(uploadFile, "utf8");
    expect(content).not.toContain('access: "public"');
    expect(content).toContain('access: "private"');
  });
});
