export type TemperamentId =
  | "12tet"
  | "19tet"
  | "31tet"
  | "quarter"
  | "meantone";

export interface TemperamentOption {
  id: TemperamentId;
  label: string;
}

export const TEMPERAMENT_OPTIONS: TemperamentOption[] = [
  { id: "12tet", label: "12-TET" },
  { id: "19tet", label: "19-TET" },
  { id: "quarter", label: "24-TET" },
  { id: "31tet", label: "31-TET" },
  { id: "meantone", label: "Meantone 1/4 comma" },
];

export interface OctaveNoteDef {
  key: string;
  label: string;
  alias: string;
  cents: number;
}

export const TEMPERAMENT_NOTE_MAP: Record<TemperamentId, OctaveNoteDef[]> = {
  "12tet": [
    { key: "c",  label: "C",  alias: "B♯",	cents: 0 },
    { key: "cs", label: "C♯", alias: "D♭",	cents: 100 },
    { key: "d",  label: "D",  alias: "",		cents: 200 },
    { key: "ds", label: "D♯", alias: "E♭",	cents: 300 },
    { key: "e",  label: "E",  alias: "F♭",	cents: 400 },
    { key: "f",  label: "F",  alias: "E♯",	cents: 500 },
    { key: "fs", label: "F♯", alias: "G♭",  cents: 600 },
    { key: "g",  label: "G",  alias: "",    cents: 700 },
    { key: "gs", label: "G♯", alias: "A♭",	cents: 800 },
    { key: "a",  label: "A",  alias: "",		cents: 900 },
    { key: "as", label: "A♯", alias: "B♭",	cents: 1000 },
    { key: "b",  label: "B",  alias: "C♭",	cents: 1100 },
  ],

  "19tet": [
    { key: "c",  label: "C",  alias: "", cents: 0 },
    { key: "cs", label: "C♯", alias: "", cents: 63.16 },
    { key: "db", label: "D♭", alias: "", cents: 126.32 },
    { key: "d",  label: "D",  alias: "", cents: 189.47 },
    { key: "ds", label: "D♯", alias: "", cents: 252.63 },
    { key: "eb", label: "E♭", alias: "", cents: 315.79 },
    { key: "e",  label: "E",  alias: "", cents: 378.95 },
    { key: "es", label: "E♯", alias: "", cents: 442.11 },
    { key: "f",  label: "F",  alias: "", cents: 505.26 },
    { key: "fs", label: "F♯", alias: "", cents: 568.42 },
    { key: "gb", label: "G♭", alias: "", cents: 631.58 },
    { key: "g",  label: "G",  alias: "", cents: 694.74 },
    { key: "gs", label: "G♯", alias: "", cents: 757.89 },
    { key: "ab", label: "A♭", alias: "", cents: 821.05 },
    { key: "a",  label: "A",  alias: "", cents: 884.21 },
    { key: "as", label: "A♯", alias: "", cents: 947.37 },
    { key: "bb", label: "B♭", alias: "", cents: 1010.53 },
    { key: "b",  label: "B",  alias: "", cents: 1073.68 },
    { key: "bs", label: "B♯", alias: "", cents: 1136.84 },
  ],

  "31tet": [
    { key: "c",  label: "C",	alias: "B♯+", cents: 0 },
    { key: "c+", label: "C+",	alias: "D♭♭", cents: 38.71 },
    { key: "cs", label: "C♯", alias: "D♭-", cents: 77.42 },
    { key: "db", label: "D♭", alias: "C♯+", cents: 116.13 },
    { key: "d-", label: "D-",	alias: "C♯♯", cents: 154.84 },
    { key: "d",  label: "D",  alias: "", 		cents: 193.55 },
    { key: "d+", label: "D+",	alias: "E♭♭", cents: 232.26 },
    { key: "ds", label: "D♯", alias: "E♭-", cents: 270.97 },
    { key: "eb", label: "E♭", alias: "D♯+", cents: 309.68 },
    { key: "e-", label: "E-",	alias: "D♯♯", cents: 348.39 },
    { key: "e",  label: "E",	alias: "F♭-", cents: 387.10 },
    { key: "e+", label: "E+", alias: "F♭",  cents: 425.81 },
    { key: "f-", label: "F-", alias: "E♯",  cents: 464.52},
    { key: "f",  label: "F",  alias: "E♯+", cents: 503.23 },
    { key: "f+", label: "F+",	alias: "G♭♭", cents: 541.94 },
    { key: "fs", label: "F♯", alias: "G♭-", cents: 580.65 },
    { key: "gb", label: "G♭",	alias: "F♯+", cents: 619.35 },
    { key: "g-", label: "G-",	alias: "F♯♯",	cents: 658.06 },
    { key: "g",  label: "G",  alias: "", 		cents: 696.77 },
    { key: "g+", label: "G+",	alias: "A♭♭",  cents: 735.48 },
    { key: "gs", label: "G♯",	alias: "A♭-", cents: 774.19 },
    { key: "ab", label: "A♭", alias: "G♯-", cents: 812.90 },
    { key: "a-", label: "A-",	alias: "G♯♯", cents: 851.61 },
    { key: "a",  label: "A",  alias: "", 		cents: 890.32 },
    { key: "a+", label: "A+",	alias: "B♭♭", cents: 929.03 },
    { key: "as", label: "A♯", alias: "B♭-", cents: 967.74 },
    { key: "bb", label: "B♭", alias: "A♯+", cents: 1006.45 },
    { key: "b-", label: "B-",	alias: "A♯♯", cents: 1045.16 },
    { key: "b",  label: "B",  alias: "C♭-", cents: 1083.87 },
    { key: "b+", label: "B+", alias: "C♭", 	cents: 1122.58 },
    { key: "c-", label: "C-", alias: "B♯", 	cents: 1161.29 },
  ],

  "quarter": [
    { key: "c",  label: "C",  alias: "",  cents: 0 },
    { key: "c+", label: "C+", alias: "",  cents: 50 },
    { key: "cs", label: "C♯", alias: "D♭",cents: 100 },
    { key: "d-", label: "D-", alias: "",  cents: 150 },
    { key: "d",  label: "D",  alias: "",  cents: 200 },
    { key: "d+", label: "D+", alias: "",  cents: 250 },
    { key: "ds", label: "D♯", alias: "E♭",cents: 300 },
    { key: "e-", label: "E-", alias: "",  cents: 350 },
    { key: "e",  label: "E",  alias: "",  cents: 400 },
    { key: "e+", label: "E+", alias: "",  cents: 450 },
    { key: "f",  label: "F",  alias: "",  cents: 500 },
    { key: "f+", label: "F+", alias: "",  cents: 550 },
    { key: "fs", label: "F♯", alias: "G♭",cents: 600 },
    { key: "g-", label: "G-", alias: "",  cents: 650 },
    { key: "g",  label: "G",  alias: "",  cents: 700 },
    { key: "g+", label: "G+", alias: "",  cents: 750 },
    { key: "gs", label: "G♯", alias: "A♭",cents: 800 },
    { key: "a-", label: "A-", alias: "",  cents: 850 },
    { key: "a",  label: "A",  alias: "",  cents: 900 },
    { key: "a+", label: "A+", alias: "",  cents: 950 },
    { key: "as", label: "A♯", alias: "B♭",cents: 1000 },
    { key: "b-", label: "B-", alias: "",  cents: 1050 },
    { key: "b",  label: "B",  alias: "",  cents: 1100 },
    { key: "b+", label: "B+", alias: "",  cents: 1150 },
  ],

  "meantone": [
    { key: "c",  label: "C",  alias: "",	cents: 0 },
    { key: "cs", label: "C♯",	alias: "",	cents: 76.05 },
    { key: "db", label: "D♭",	alias: "",	cents: 117.11 },
    { key: "d",  label: "D",  alias: "",	cents: 193.16 },
    { key: "ds", label: "D♯",	alias: "",	cents: 269.21 },
    { key: "eb", label: "E♭",	alias: "",	cents: 310.26 },
    { key: "e",  label: "E",  alias: "",	cents: 386.31 },
    { key: "es", label: "E♯",	alias: "",	cents: 462.36 },
    { key: "f",  label: "F",  alias: "",	cents: 503.42 },
    { key: "fs", label: "F♯",	alias: "",	cents: 579.47 },
    { key: "gb", label: "G♭",	alias: "",	cents: 620.53 },
    { key: "g",  label: "G",	alias: "",	cents: 696.58 },
    { key: "gs", label: "G♯",	alias: "",	cents: 772.63 },
    { key: "ab", label: "A♭",	alias: "",	cents: 813.69 },
    { key: "a",  label: "A",  alias: "",	cents: 889.74 },
    { key: "as", label: "A♯",	alias: "",	cents: 965.79 },
    { key: "bb", label: "B♭",	alias: "",	cents: 1006.84 },
    { key: "b",  label: "B",  alias: "",	cents: 1082.89 },
    { key: "bs", label: "B♯",	alias: "",	cents: 1158.94 },
  ],
};
