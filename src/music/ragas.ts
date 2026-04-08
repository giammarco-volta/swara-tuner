// src/music/ragas.ts
import rawRagas from "../data/hindustani_ragas.json";
import { buildDirectionalHindustaniSwaras } from "./ragaParsing";
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
  arohanaSwaras: SwaraId[];
  avarohanaSwaras: SwaraId[];
};

export const hindustaniRagas: ParsedHindustaniRaga[] =
  (rawRagas as RawHindustaniRaga[]).map((r) => {
    const directional = buildDirectionalHindustaniSwaras(r);

    return {
      ...r,
      swaras: directional.all,
      arohanaSwaras: directional.arohana,
      avarohanaSwaras: directional.avarohana,
    };
  });