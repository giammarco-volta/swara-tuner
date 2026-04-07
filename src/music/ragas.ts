// src/music/ragas.ts
import rawRagas from "../data/hindustani_ragas.json";
import { getUniqueHindustaniSwaras } from "./swaraMapper";
import type { SwaraId } from "./swaras";

type RawHindustaniRaga = {
  name: string;
  arohana?: string;
  avarohana?: string;
  pakad?: string;
  chalan?: string;
  [key: string]: unknown;
};

export type ParsedHindustaniRaga = RawHindustaniRaga & {
  swaras: SwaraId[];
};

export const hindustaniRagas: ParsedHindustaniRaga[] =
  (rawRagas as RawHindustaniRaga[]).map((r) => ({
    ...r,
    swaras: getUniqueHindustaniSwaras(
      r.arohana,
      r.avarohana,
      r.pakad,
      r.chalan
    ),
  }));