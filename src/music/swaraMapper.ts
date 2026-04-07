import {
  DEFAULT_CHROMATIC_MAP,
  normalizePitchClass,
  SWARA_TO_SEMITONE,
  SWARA_CENTRAL_RANGES,
  getSwaraCentralCenter,
  type SwaraId,
} from "./swaras";

export interface RagaConfig {
  arohana: SwaraId[];
  avarohana: SwaraId[];
}

export type TuningZone = "perfect" | "tolerated" | "out";

export interface DetectionResult {
  frequencyHz: number | null;
  centsFromSa: number | null;
  nearestSemitone: number | null;
  pitchClass: number | null;
  deviationCents: number | null;
  displayedSwara: SwaraId | null;
  allowed: boolean | null;
  tuningZone: TuningZone | null;
}

export function centsFromReference(frequencyHz: number, referenceHz: number): number {
  return 1200 * Math.log2(frequencyHz / referenceHz);
}

export function buildAllowedPitchMap(config: RagaConfig): Map<number, SwaraId> {
  const result = new Map<number, SwaraId>();

  for (const swara of config.arohana) {
    const pc = normalizePitchClass(SWARA_TO_SEMITONE[swara]);
    if (!result.has(pc)) {
      result.set(pc, swara);
    }
  }

  for (const swara of config.avarohana) {
    const pc = normalizePitchClass(SWARA_TO_SEMITONE[swara]);
    if (!result.has(pc)) {
      result.set(pc, swara);
    }
  }

  return result;
}

function isWithinWrappedRange(value: number, min: number, max: number): boolean {
  const wrappedValue = ((value % 1200) + 1200) % 1200;
  const wrappedMin = ((min % 1200) + 1200) % 1200;
  const wrappedMax = ((max % 1200) + 1200) % 1200;

  if (wrappedMin <= wrappedMax) {
    return wrappedValue >= wrappedMin && wrappedValue <= wrappedMax;
  }

  return wrappedValue >= wrappedMin || wrappedValue <= wrappedMax;
}

export function analyzeDetectedPitch(
  frequencyHz: number | null,
  saHz: number,
  config: RagaConfig,
  toleranceCents: number
): DetectionResult {
  if (frequencyHz === null) {
    return {
      frequencyHz: null,
      centsFromSa: null,
      nearestSemitone: null,
      pitchClass: null,
      deviationCents: null,
      displayedSwara: null,
      allowed: null,
      tuningZone: null,
    };
  }

  const rawCents = centsFromReference(frequencyHz, saHz);
  const wrappedCents = ((rawCents % 1200) + 1200) % 1200;

  const nearestSemitone = Math.round(rawCents / 100);
  const pitchClass = normalizePitchClass(nearestSemitone);

  const allowedMap = buildAllowedPitchMap(config);

  let displayedSwara: SwaraId;
  let allowed: boolean;

  if (allowedMap.has(pitchClass)) {
    displayedSwara = allowedMap.get(pitchClass)!;
    allowed = true;
  } else {
    displayedSwara = DEFAULT_CHROMATIC_MAP[pitchClass];
    allowed = false;
  }

  const centralCenter = getSwaraCentralCenter(displayedSwara);
  let deviationCents = rawCents - centralCenter;

  while (deviationCents > 600) deviationCents -= 1200;
  while (deviationCents < -600) deviationCents += 1200;

  const centralRange = SWARA_CENTRAL_RANGES[displayedSwara];
  let tuningZone: TuningZone;

  if (isWithinWrappedRange(wrappedCents, centralRange.min, centralRange.max)) {
    tuningZone = "perfect";
  } else {
    const outerMin = centralRange.min - toleranceCents;
    const outerMax = centralRange.max + toleranceCents;

    if (isWithinWrappedRange(wrappedCents, outerMin, outerMax)) {
      tuningZone = "tolerated";
    } else {
      tuningZone = "out";
    }
  }

  return {
    frequencyHz,
    centsFromSa: wrappedCents,
    nearestSemitone,
    pitchClass,
    deviationCents,
    displayedSwara,
    allowed,
    tuningZone,
  };
}

function normalizeRagaText(input: string): string {
  return input
    .replace(/[’‘`´]/g, "'")     // normalizza apostrofi
    .replace(/[.,;:|()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hindustaniTokenToSwaraId(token: string): SwaraId | null {
  switch (token) {
    case "S": return "Sa";

    case "r": return "Ri1";
    case "R": return "Ri2";

    case "g": return "Ga2";
    case "G": return "Ga3";

    case "M": return "Ma1";
    case "M'": return "Ma2";

    case "P": return "Pa";

    case "d": return "Dha1";
    case "D": return "Dha2";

    case "n": return "Ni2";
    case "N": return "Ni3";

    default:
      return null;
  }
}

export function extractHindustaniSwaras(text: string): SwaraId[] {
  const s = normalizeRagaText(text);
  const result: SwaraId[] = [];

  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const next = i + 1 < s.length ? s[i + 1] : "";

    if (ch === "M" && next === "'") {
      result.push("Ma2");
      i += 2;
      continue;
    }

    const mapped = hindustaniTokenToSwaraId(ch);
    if (mapped) {
      result.push(mapped);
    }

    i += 1;
  }

  return result;
}

export function getUniqueHindustaniSwaras(
  arohana?: string,
  avarohana?: string,
  pakad?: string,
  chalan?: string
): SwaraId[] {
  const allText = [arohana, avarohana, pakad, chalan]
    .filter(Boolean)
    .join(" ");

  const found = extractHindustaniSwaras(allText);
  const set = new Set(found);

  const order: SwaraId[] = [
    "Sa",
    "Ri1", "Ri2", "Ri3",
    "Ga1", "Ga2", "Ga3",
    "Ma1", "Ma2",
    "Pa",
    "Dha1", "Dha2", "Dha3",
    "Ni1", "Ni2", "Ni3",
  ];

  return order.filter((sw) => set.has(sw));
}

export function getUniqueHindustaniSwarasFromText(text?: string): SwaraId[] {
  const found = extractHindustaniSwaras(text ?? "");
  const set = new Set(found);

  const order: SwaraId[] = [
    "Sa",
    "Ri1", "Ri2", "Ri3",
    "Ga1", "Ga2", "Ga3",
    "Ma1", "Ma2",
    "Pa",
    "Dha1", "Dha2", "Dha3",
    "Ni1", "Ni2", "Ni3",
  ];

  return order.filter((sw) => set.has(sw));
}