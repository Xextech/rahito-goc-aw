// Keeps src/locales/*.json in sync using Gemini, so a translation is never
// hand-written for both languages: edit the source language, run this
// script, review the diff.
//
// Usage:
//   npm run i18n:sync          translate whatever changed in src/locales/es.json into pl.json
//   npm run i18n:sync -- --source=pl   translate pl.json -> es.json instead
//   npm run i18n:check         report what's missing/stale, no API call, exits 1 if anything is pending (CI-friendly)
//
// How it decides what to (re)translate: src/locales/.i18n-state.json stores
// a hash of each source string the last time it was translated. A key is
// pending when it's new, or its source value's hash no longer matches.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

const LOCALES_DIR = path.join(process.cwd(), "src/locales");
const STATE_FILE = path.join(LOCALES_DIR, ".i18n-state.json");
const LANG_NAMES: Record<string, string> = { es: "Spanish", pl: "Polish" };

type LocaleData = Record<string, string | string[]>;

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file: string, data: unknown) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function hashValue(v: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const sourceArg = args.find((a) => a.startsWith("--source="));
  const source = (sourceArg ? sourceArg.split("=")[1] : "es") as "es" | "pl";
  if (source !== "es" && source !== "pl") {
    throw new Error(`--source must be "es" or "pl", got "${source}"`);
  }
  const target: "es" | "pl" = source === "es" ? "pl" : "es";
  return { checkOnly, source, target };
}

function buildPrompt(sourceLang: string, targetLang: string, payload: LocaleData): string {
  return `You are translating UI copy for "Rahito", an upscale, minimalist Spanish restaurant website based in Głogów, Poland. Translate the JSON object below from ${sourceLang} to ${targetLang}.

Rules:
- Keep the exact same JSON keys. Return ONLY a JSON object, no commentary, no markdown fences.
- Translate every string value. For array values, translate each element and return an array of the same length, in the same order.
- Keep the tone elegant, warm, and premium — this is restaurant copy, not literal machine translation.
- Do NOT translate: the brand name "Rahito", place names ("Głogów"), the product/feature name "TableFlow", or acronyms like "RGPD"/"RODO"/"UODO"/"UOKiK".
- Preserve placeholders exactly as they appear, e.g. "{time}" must stay "{time}" (do not translate or remove the braces or the word inside them).
- Preserve leading emoji/symbols (e.g. "🔑 ", "🛠️ ") exactly as given, translating only the text after them.
- Preserve capitalization style (ALL CAPS stays ALL CAPS, Title Case stays Title Case) where it carries design meaning (badges, tags, buttons).

Input JSON:
${JSON.stringify(payload, null, 2)}`;
}

async function main() {
  const { checkOnly, source, target } = parseArgs();
  const sourceFile = path.join(LOCALES_DIR, `${source}.json`);
  const targetFile = path.join(LOCALES_DIR, `${target}.json`);

  const sourceData = readJson<LocaleData>(sourceFile);
  const targetData = readJson<LocaleData>(targetFile);
  const state: Record<string, string> = fs.existsSync(STATE_FILE) ? readJson(STATE_FILE) : {};

  const pendingKeys: string[] = [];
  for (const key of Object.keys(sourceData)) {
    const currentHash = hashValue(sourceData[key]);
    if (!(key in targetData) || state[key] !== currentHash) {
      pendingKeys.push(key);
    }
  }

  const prunedKeys = Object.keys(targetData).filter((key) => !(key in sourceData));

  if (pendingKeys.length === 0 && prunedKeys.length === 0) {
    console.log(`[i18n] ${target}.json is already in sync with ${source}.json (${Object.keys(sourceData).length} keys).`);
    return;
  }

  console.log(
    `[i18n] ${pendingKeys.length} key(s) need translation into ${LANG_NAMES[target]}` +
      (prunedKeys.length ? `, ${prunedKeys.length} orphaned key(s) to remove from ${target}.json` : "") +
      ":"
  );
  pendingKeys.forEach((k) => console.log(`  + ${k}`));
  prunedKeys.forEach((k) => console.log(`  - ${k} (no longer in ${source}.json)`));

  if (checkOnly) {
    process.exitCode = 1;
    return;
  }

  for (const key of prunedKeys) {
    delete targetData[key];
    delete state[key];
  }

  if (pendingKeys.length > 0) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[i18n] GEMINI_API_KEY is not set — cannot call Gemini. Set it in .env.local or your shell environment.");
      process.exitCode = 1;
      return;
    }

    const payload: LocaleData = {};
    pendingKeys.forEach((k) => { payload[k] = sourceData[k]; });

    // `gemini-flash-latest` is a rolling alias that always resolves to a
    // current stable Flash model, so this script keeps working as Google
    // rotates specific model versions in and out. Override with the
    // GEMINI_MODEL env var if you ever need a specific pinned model.
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: buildPrompt(LANG_NAMES[source], LANG_NAMES[target], payload),
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty response from Gemini");

    let translated: LocaleData;
    try {
      translated = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Gemini did not return valid JSON: ${String(err)}\n\nRaw response:\n${raw}`);
    }

    const missing = pendingKeys.filter((k) => !(k in translated));
    if (missing.length > 0) {
      throw new Error(`Gemini response is missing key(s): ${missing.join(", ")}`);
    }

    for (const key of pendingKeys) {
      targetData[key] = translated[key];
      state[key] = hashValue(sourceData[key]);
    }
  }

  // Re-order target keys to match source, so diffs stay readable.
  const orderedTarget: LocaleData = {};
  for (const key of Object.keys(sourceData)) orderedTarget[key] = targetData[key];

  writeJson(targetFile, orderedTarget);
  writeJson(STATE_FILE, state);
  console.log(`[i18n] Updated ${target}.json — ${pendingKeys.length} translated, ${prunedKeys.length} pruned.`);
}

main().catch((err) => {
  console.error("[i18n] Failed:", err.message || err);
  process.exit(1);
});
