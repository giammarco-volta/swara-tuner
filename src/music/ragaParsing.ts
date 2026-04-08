import type { SwaraId } from "./swaras";
import { ALL_SWARAS } from "./swaras";

type ParsedNote = {
  swara: SwaraId;
  octave: number;
};

type DirectionFlags = {
  up: boolean;
  down: boolean;
};

function normalizeRagaText(input: string): string {
  return input
    .replace(/[’‘`´]/g, "'")
    .replace(/[,;:|()[\]{}]/g, " ")
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

function getMelodicStep(sw: SwaraId): number {
  switch (sw) {
    case "Sa": return 0;

    case "Ri1": return 1;
    case "Ri2": return 2;
    case "Ri3": return 3;

    case "Ga1": return 2;
    case "Ga2": return 3;
    case "Ga3": return 4;

    case "Ma1": return 5;
    case "Ma2": return 6;

    case "Pa": return 7;

    case "Dha1": return 8;
    case "Dha2": return 9;
    case "Dha3": return 10;

    case "Ni1": return 9;
    case "Ni2": return 10;
    case "Ni3": return 11;
  }
}

function getAbsoluteStep(note: ParsedNote): number {
  return note.octave * 12 + getMelodicStep(note.swara);
}

export function extractHindustaniSequenceWithOctave(text: string): ParsedNote[] {
  const s = normalizeRagaText(text);
  const result: ParsedNote[] = [];

  let i = 0;

  while (i < s.length) {
    let octave = 0;

    // prefisso .  => ottava bassa
    while (i < s.length && s[i] === ".") {
      octave -= 1;
      i++;
    }

    if (i >= s.length) break;

    let token: string | null = null;

    // priorità a M'
    if (s[i] === "M" && i + 1 < s.length && s[i + 1] === "'") {
      token = "M'";
      i += 2;
    } else {
      const ch = s[i];
      if ("SrRgGMMPdDnN".includes(ch)) {
        token = ch;
        i += 1;
      } else {
        i += 1;
        continue;
      }
    }

    // suffisso . => ottava alta
    while (i < s.length && s[i] === ".") {
      octave += 1;
      i++;
    }

    const swara = hindustaniTokenToSwaraId(token);
    if (swara) {
      result.push({ swara, octave });
    }
  }

  return result;
}

export function extractHindustaniSwaras(text: string): SwaraId[] {
  return extractHindustaniSequenceWithOctave(text).map((n) => n.swara);
}

export function getUniqueHindustaniSwarasFromText(text?: string): SwaraId[] {
  const found = extractHindustaniSwaras(text ?? "");
  const set = new Set(found);

  const order: SwaraId[] = ALL_SWARAS;

  return order.filter((sw) => set.has(sw));
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

  return getUniqueHindustaniSwarasFromText(allText);
}

function analyzeDirection(sequence: ParsedNote[]): Map<SwaraId, DirectionFlags> {
  const map = new Map<SwaraId, DirectionFlags>();

  const ensure = (sw: SwaraId) => {
    if (!map.has(sw)) {
      map.set(sw, { up: false, down: false });
    }
    return map.get(sw)!;
  };

  for (let i = 0; i < sequence.length - 1; i++) {
    const a = sequence[i];
    const b = sequence[i + 1];

    const va = getAbsoluteStep(a);
    const vb = getAbsoluteStep(b);

    if (vb > va) {
      ensure(a.swara).up = true;
    } else if (vb < va) {
      ensure(a.swara).down = true;
    }
  }

  return map;
}

function mergeDirectionMaps(
  maps: Map<SwaraId, DirectionFlags>[]
): Map<SwaraId, DirectionFlags> {
  const result = new Map<SwaraId, DirectionFlags>();

  for (const m of maps) {
    for (const [sw, flags] of m.entries()) {
      if (!result.has(sw)) {
        result.set(sw, { up: false, down: false });
      }
      const r = result.get(sw)!;
      r.up = r.up || flags.up;
      r.down = r.down || flags.down;
    }
  }

  return result;
}

export function analyzeHindustaniRagaDirections(item: any): Map<SwaraId, DirectionFlags> {
  const texts = [
    item.arohana,
    item.avarohana,
    item.pakad,
    item.chalan,
  ].filter((x): x is string => typeof x === "string" && x.trim().length > 0);

  const sequences = texts.map(extractHindustaniSequenceWithOctave);
  const maps = sequences.map(analyzeDirection);

  return mergeDirectionMaps(maps);
}

export function buildDirectionalHindustaniSwaras(item: any): {
  arohana: SwaraId[];
  avarohana: SwaraId[];
  all: SwaraId[];
} {
  const dirMap = analyzeHindustaniRagaDirections(item);

  const arohana: SwaraId[] = [];
  const avarohana: SwaraId[] = [];

  for (const sw of ALL_SWARAS) {
    const flags = dirMap.get(sw);
    if (!flags) continue;

    if (flags.up) arohana.push(sw);
    if (flags.down) avarohana.push(sw);
  }

  const all = ALL_SWARAS.filter((sw) => {
    const flags = dirMap.get(sw);
    return !!flags && (flags.up || flags.down);
  });

  return { arohana, avarohana, all };
}