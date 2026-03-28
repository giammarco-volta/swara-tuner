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