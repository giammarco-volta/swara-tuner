export type SwaraId =
  | "Sa"
  | "Ri1" | "Ri2" | "Ri3"
  | "Ga1" | "Ga2" | "Ga3"
  | "Ma1" | "Ma2"
  | "Pa"
  | "Dha1" | "Dha2" | "Dha3"
  | "Ni1" | "Ni2" | "Ni3";

export const ALL_SWARAS: SwaraId[] = [
  "Sa",
  "Ri1", "Ri2", "Ri3",
  "Ga1", "Ga2", "Ga3",
  "Ma1", "Ma2",
  "Pa",
  "Dha1", "Dha2", "Dha3",
  "Ni1", "Ni2", "Ni3",
];

export const SWARA_TO_SEMITONE: Record<SwaraId, number> = {
  Sa: 0,

  Ri1: 1,
  Ri2: 2,
  Ri3: 3,

  Ga1: 2,
  Ga2: 3,
  Ga3: 4,

  Ma1: 5,
  Ma2: 6,

  Pa: 7,

  Dha1: 8,
  Dha2: 9,
  Dha3: 10,

  Ni1: 9,
  Ni2: 10,
  Ni3: 11,
};

export const DEFAULT_CHROMATIC_MAP: Record<number, SwaraId> = {
  0: "Sa",
  1: "Ri1",
  2: "Ri2",
  3: "Ga2",
  4: "Ga3",
  5: "Ma1",
  6: "Ma2",
  7: "Pa",
  8: "Dha1",
  9: "Dha2",
  10: "Ni2",
  11: "Ni3",
};

export function normalizePitchClass(semitone: number): number {
  return ((semitone % 12) + 12) % 12;
}

export interface SwaraCentralRange {
  min: number;
  max: number;
  default: number;
}

export const SWARA_CENTRAL_RANGES: Record<SwaraId, SwaraCentralRange> = {
  Sa:   { min: -2,  max: 2, default: 0 },

  Ri1:  { min: 90,  max: 112, default: 112 },
  Ri2:  { min: 182, max: 204, default: 204 },
  Ri3:  { min: 294, max: 316, default: 294 },

  Ga1:  { min: 182, max: 204, default: 204 },
  Ga2:  { min: 294, max: 316, default: 294 },
  Ga3:  { min: 386, max: 408, default: 386 },

  Ma1:  { min: 498, max: 520, default: 498 },
  Ma2:  { min: 590, max: 610, default: 590 },

  Pa:   { min: 700, max: 704, default: 702 },

  Dha1: { min: 792, max: 814, default: 792 },
  Dha2: { min: 884, max: 906, default: 884 },
  Dha3: { min: 996, max: 1018, default: 996 },

  Ni1:  { min: 884, max: 906, default: 884 },
  Ni2:  { min: 996, max: 1018, default: 996 },
  Ni3:  { min: 1088, max: 1110, default: 1088 },
};

export function getSwaraCentralCenter(swara: SwaraId): number {
  const range = SWARA_CENTRAL_RANGES[swara];
  return (range.min + range.max) / 2;
}


export function getSwaraDefaultCents(swara: SwaraId): number {
  const range = SWARA_CENTRAL_RANGES[swara];
  return range.default;
}