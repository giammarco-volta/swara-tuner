import {
  DEFAULT_CHROMATIC_MAP,
  normalizePitchClass,
  SWARA_TO_SEMITONE,
  type SwaraId,
} from "./swaras";

export interface RagaConfig {
  arohana: SwaraId[];
  avarohana: SwaraId[];
}

export interface DetectionResult {
  frequencyHz: number | null;
  centsFromSa: number | null;
  nearestSemitone: number | null;
  pitchClass: number | null;
  deviationCents: number | null;
  displayedSwara: SwaraId | null;
  allowed: boolean | null;
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

export function analyzeDetectedPitch(
  frequencyHz: number | null,
  saHz: number,
  config: RagaConfig
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
    };
  }
  const rawCents = centsFromReference(frequencyHz, saHz);
  const wrappedCents = ((rawCents % 1200) + 1200) % 1200;

  const nearestSemitone = Math.round(rawCents / 100);
  const deviationCents = rawCents - nearestSemitone * 100;
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

  return {
    frequencyHz,
    centsFromSa: wrappedCents,
    nearestSemitone,
    pitchClass,
    deviationCents,
    displayedSwara,
    allowed,
  };
}