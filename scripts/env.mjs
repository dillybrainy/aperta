import { readFileSync } from "node:fs";
import path from "node:path";

/** Read web/.env.local into an object (scripts only; Next.js loads it by itself). */
export function loadEnv() {
  const file = path.join(import.meta.dirname, "..", "web", ".env.local");
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    console.error("web/.env.local not found. Run: node scripts/setup-accounts.mjs <name>");
    process.exit(1);
  }
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
