import { appConfig } from "./config/appConfig";
import { MODE_UI_CONFIG } from "./config/modeConfig";

import { useEffect, useMemo, useRef, useState } from "react";

import "./App.css";

import { analyzeDetectedPitch, type RagaConfig } from "./music/swaraMapper";

import { type SwaraId, SWARA_CENTRAL_RANGES, getSwaraCentralCenter } from "./music/swaras";

import { hindustaniRagas } from "./music/ragas";
import carnaticRagamsJson from "./data/carnatic_ragas.json";

import { buildDirectionalHindustaniSwaras } from "./music/ragaParsing";

import { c4ToA3Hz } from "./music/referencePitch";

import {
  TEMPERAMENT_OPTIONS,
  TEMPERAMENT_NOTE_MAP,
  type TemperamentId,
} from "./music/temperaments";

const mode = appConfig.mode;
const modeUi = MODE_UI_CONFIG[mode];

type RiChoice = "" | "Ri1" | "Ri2" | "Ri3";
type GaChoice = "" | "Ga1" | "Ga2" | "Ga3";
type MaChoice = "" | "Ma1" | "Ma2";
type PaChoice = "" | "Pa";
type DhaChoice = "" | "Dha1" | "Dha2" | "Dha3";
type NiChoice = "" | "Ni1" | "Ni2" | "Ni3";

interface OrderedScaleChoices {
  ri: RiChoice;
  ga: GaChoice;
  ma: MaChoice;
  pa: PaChoice;
  dha: DhaChoice;
  ni: NiChoice;
}

type DronePattern = "sa_pa" | "sa_ma" | "sa_ni";

const RI_OPTIONS: RiChoice[] = ["", "Ri1", "Ri2", "Ri3"];
const GA_OPTIONS: GaChoice[] = ["", "Ga1", "Ga2", "Ga3"];
const MA_OPTIONS: MaChoice[] = ["", "Ma1", "Ma2"];
const PA_OPTIONS: PaChoice[] = ["", "Pa"];
const DHA_OPTIONS: DhaChoice[] = ["", "Dha1", "Dha2", "Dha3"];
const NI_OPTIONS: NiChoice[] = ["", "Ni1", "Ni2", "Ni3"];

function chooseDronePatternForRaga(
  currentPattern: DronePattern,
  arohana: OrderedScaleChoices,
  avarohana: OrderedScaleChoices
): DronePattern {
  const hasPa = arohana.pa === "Pa" || avarohana.pa === "Pa";
  const hasMa1 = arohana.ma === "Ma1" || avarohana.ma === "Ma1";
  const hasMa2 = arohana.ma === "Ma2" || avarohana.ma === "Ma2";

  const hasNi1 = arohana.ni === "Ni1" || avarohana.ni === "Ni1";
  const hasNi2 = arohana.ni === "Ni2" || avarohana.ni === "Ni2";
  const hasNi3 = arohana.ni === "Ni3" || avarohana.ni === "Ni3";

  const shouldUseSaMa = !hasPa && !hasMa2 && hasMa1;
  const niIsValidForDrone = hasNi3 && !hasNi2 && !hasNi1;

  // 1) se siamo in Sa-Pa o Sa-Ni e manca Pa, manca Ma2 e c'è Ma1 -> Sa-Ma
  if ((currentPattern === "sa_pa" || currentPattern === "sa_ni") && shouldUseSaMa) {
    return "sa_ma";
  }

  // 2) se siamo in Sa-Ma e c'è Pa -> Sa-Pa
  if (currentPattern === "sa_ma" && !shouldUseSaMa) {
    return "sa_pa";
  }

  // 3) se siamo in Sa-Ni e Ni non è adatto
  if (currentPattern === "sa_ni" && !niIsValidForDrone) {
    // 3a) se manca Pa, manca Ma2 e c'è Ma1 -> Sa-Ma
    if (shouldUseSaMa) {
      return "sa_ma";
    }

    // 3b) altrimenti -> Sa-Pa
    return "sa_pa";
  }

  return currentPattern;
}

type Tradition = "hindustani" | "carnatic";

interface RagaPreset {
  id: string;
  name: string;
  iastName?: string;
  tradition: Tradition;
  arohana: OrderedScaleChoices;
  avarohana: OrderedScaleChoices;
  vadi?: SwaraId | null;
  samvadi?: SwaraId | null;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getVisibleOptions<T extends string>(options: T[], tradition: Tradition): T[] {
  return options.filter((option) => {
    if (option === "") return true;
    const label = getSwaraLabel(option, tradition);
    return label !== "";
  });
}

function getSwaraLabel(swara: string, tradition: Tradition): string {
  if (!swara) return "—";

  if (tradition === "carnatic") {
    const carnaticMap: Record<string, string> = {
      Sa:   "sa",
      Ri1:  "r1",
      Ri2:  "r2",
      Ri3:  "r3",
      Ga1:  "g1",
      Ga2:  "g2",
      Ga3:  "g3",
      Ma1:  "m1",
      Ma2:  "m2",
      Pa:   "pa",
      Dha1: "d1",
      Dha2: "d2",
      Dha3: "d3",
      Ni1:  "n1",
      Ni2:  "n2",
      Ni3:  "n3",
    };

    return carnaticMap[swara] ?? swara;
  }

  const hindustaniMap: Record<string, string> = {
    Sa:   "S",
    Ri1:  "r",
    Ri2:  "R",
    Ri3:  "",
    Ga1:  "",
    Ga2:  "g",
    Ga3:  "G",
    Ma1:  "M",
    Ma2:  "M'",
    Pa:   "P",
    Dha1: "d",
    Dha2: "D",
    Dha3:  "",
    Ni1:  "",
    Ni2:  "n",
    Ni3:  "N",
  };

  return hindustaniMap[swara] ?? "";
}

function ChoiceCycleButton<T extends string>({
  title,
  value,
  options,
  onChange,
  tradition,
  isFixed = false,
}: {
  title: string;
  value: T;
  options: T[];
  onChange?: (value: T) => void;
  tradition: Tradition;
  isFixed?: boolean;
}) {
  const display = value ? getSwaraLabel(value, tradition) : "—";

  const handleClick = () => {
    if (isFixed || !onChange || options.length === 0) return;
    const currentIndex = Math.max(0, options.indexOf(value));
    const nextIndex = (currentIndex + 1) % options.length;
    onChange(options[nextIndex]);
  };

  return (
    <button
      type="button"
      className={`swara-chip ${isFixed ? "fixed" : ""}`}
      onClick={handleClick}
      disabled={isFixed}
      title={isFixed ? title : `${title}: tap to change`}
    >
      <span className="swara-chip__title">{title}</span>
      <span className="swara-chip__value">{display}</span>
    </button>
  );
}

function parseSwaraToken(token: string, tradition: Tradition): SwaraId | null {
  const t = token.trim();

  if (tradition === "hindustani") {
    const map: Record<string, SwaraId | null> = {
      S: "Sa",
      r: "Ri1",
      R: "Ri2",
      g: "Ga2",
      G: "Ga3",
      M: "Ma1",
      m: "Ma2",
      P: "Pa",
      d: "Dha1",
      D: "Dha2",
      n: "Ni2",
      N: "Ni3",
    };
    return map[t] ?? null;
  }

  const lower = t.toLowerCase();

  const map: Record<string, SwaraId | null> = {
    s: "Sa",
    sa: "Sa",
    r1: "Ri1",
    r2: "Ri2",
    r3: "Ri3",
    g1: "Ga1",
    g2: "Ga2",
    g3: "Ga3",
    m1: "Ma1",
    m2: "Ma2",
    p: "Pa",
    pa: "Pa",
    d1: "Dha1",
    d2: "Dha2",
    d3: "Dha3",
    n1: "Ni1",
    n2: "Ni2",
    n3: "Ni3",
  };

  return map[lower] ?? null;
}

function swaraListToChoices(swaras: SwaraId[]): OrderedScaleChoices {
  const result: OrderedScaleChoices = {
    ri: "",
    ga: "",
    ma: "",
    pa: "",
    dha: "",
    ni: "",
  };

  for (const swara of swaras) {
    if (swara.startsWith("Ri")) result.ri = swara as RiChoice;
    else if (swara.startsWith("Ga")) result.ga = swara as GaChoice;
    else if (swara.startsWith("Ma")) result.ma = swara as MaChoice;
    else if (swara === "Pa") result.pa = "Pa";
    else if (swara.startsWith("Dha")) result.dha = swara as DhaChoice;
    else if (swara.startsWith("Ni")) result.ni = swara as NiChoice;
  }

  return result;
}

function extractStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }

  if (typeof value === "string") {
    return value
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeRagaRecord(
  item: any,
  tradition: Tradition
): RagaPreset | null {
  const name =
    item.name ??
    item.raga ??
    item.raag ??
    item.ragam ??
    item.title ??
    null;

  if (!name || typeof name !== "string") {
    return null;
  }

  const arohanaText =
    item.arohana ?? item.aroha ?? item.aroganam ?? item.arohanam ?? "";

  const avarohanaText =
    item.avarohana ?? item.avaroha ?? item.avaroganam ?? item.avarohanam ?? "";

  let arohanaParsed: SwaraId[] = [];
  let avarohanaParsed: SwaraId[] = [];

  if (tradition === "hindustani") {
    if (Array.isArray(item.arohanaSwaras) && Array.isArray(item.avarohanaSwaras)) {
      arohanaParsed = item.arohanaSwaras as SwaraId[];
      avarohanaParsed = item.avarohanaSwaras as SwaraId[];
    } else {
      const directional = buildDirectionalHindustaniSwaras(item);
      arohanaParsed = directional.arohana;
      avarohanaParsed = directional.avarohana;
    }
  } else {
    const arohanaRaw = extractStringArray(arohanaText);
    const avarohanaRaw = extractStringArray(avarohanaText);

    arohanaParsed = arohanaRaw
      .map((token) => parseSwaraToken(token, tradition))
      .filter((x): x is SwaraId => x !== null);

    avarohanaParsed = avarohanaRaw
      .map((token) => parseSwaraToken(token, tradition))
      .filter((x): x is SwaraId => x !== null);
  }

  const vadi = parseSwaraToken(String(item.vadi ?? ""), tradition);
  const samvadi = parseSwaraToken(String(item.samvadi ?? ""), tradition);

  return {
    vadi,
    samvadi,
    id: String(item.id ?? name).toLowerCase().replace(/\s+/g, "-"),
    name,
    iastName: typeof item.iastName === "string" ? item.iastName : undefined,
    tradition,
    arohana: swaraListToChoices(arohanaParsed),
    avarohana: swaraListToChoices(avarohanaParsed),
  };
}

function loadRagasFromJson(data: any, tradition: Tradition): RagaPreset[] {
  const arr: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.ragas)
      ? data.ragas
      : Array.isArray(data?.raags)
        ? data.raags
        : Array.isArray(data?.ragams)
          ? data.ragams
          : [];

  return arr
    .map((item: any) => normalizeRagaRecord(item, tradition))
    .filter((x: RagaPreset | null): x is RagaPreset => x !== null);
}

function normalizeRagaName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(raag|raga|ragam)\s+/i, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function getRagaSearchScore(name: string, search: string): number {
  const n = normalizeRagaName(name);
  const s = normalizeRagaName(search);

  if (!s) return 1000;

  if (n === s) return 0;
  if (n.startsWith(s)) return 1;

  const wordIndex = n.split(/\s+/).findIndex((word) => word.startsWith(s));
  if (wordIndex >= 0) return 10 + wordIndex;

  const includesIndex = n.indexOf(s);
  if (includesIndex >= 0) return 100 + includesIndex;

  return Number.POSITIVE_INFINITY;
}

const ALL_RAGAS: RagaPreset[] = [
  ...loadRagasFromJson(hindustaniRagas, "hindustani"),
  ...loadRagasFromJson(carnaticRagamsJson, "carnatic"),
];

type PitchDetectorMode = "autocorrelation" | "mpm";
type TunerViewMode = "meter" | "swara" | "sruti" | "octave";

export default function TunerApp() {
  const DRONE_REFERENCE_MIN_HZ = 110; // A2
  const DRONE_REFERENCE_MAX_HZ = 220; // A3

  const initialSaHz = mode === "micro" ? 440 * Math.pow(2, 300 / 1200) : midiToFrequency(61);

  const [saHz, setSaHz] = useState(initialSaHz);
  const [toleranceCents, setToleranceCents] = useState(5);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [micStatus, setMicStatus] = useState("Idle");

  const [isSaCalibrated, setIsSaCalibrated] = useState(false);
  const [smoothedDetectedPitch, setSmoothedDetectedPitch] = useState<number | null>(null);

  const [tradition, setTradition] = useState<Tradition>("hindustani");
  const [selectedRagaId, setSelectedRagaId] = useState("");
  const [ragaSearch, setRagaSearch] = useState("");

  const [pitchDetectorMode] = useState<PitchDetectorMode>("mpm");
  const [tunerViewMode, setTunerViewMode] = useState<TunerViewMode>("octave");

  const [inputGain, setInputGain] = useState(2.5);
  const [useCompression, setUseCompression] = useState(true);

  const [inputLevel, setInputLevel] = useState(0);
  //const [saCents, setSaCents] = useState(100);

  const [droneEnabled, setDroneEnabled] = useState(false);
  const [dronePattern, setDronePattern] = useState<"sa_pa" | "sa_ma" | "sa_ni">("sa_pa");
  const [droneVolume, setDroneVolume] = useState(0.2);
  const [showDroneSettings, setShowDroneSettings] = useState(false);

  const [droneBpm, setDroneBpm] = useState(60);

  const [selectedTemperament, setSelectedTemperament] = useState<TemperamentId>("31tet");

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isCalibratingRef = useRef(false);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeDomainDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const calibrationPitchesRef = useRef<number[]>([]);
  const smoothedCentsRef = useRef<number | null>(null);
  const largeJumpCandidateRef = useRef<number | null>(null);
  const largeJumpCountRef = useRef(0);
  const emaCentsRef = useRef<number | null>(null);

  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  const inputLevelRef = useRef(0);

  const droneGainNodeRef = useRef<GainNode | null>(null);

  const srutiPreviewOscRef = useRef<OscillatorNode | null>(null);
  const srutiPreviewGainRef = useRef<GainNode | null>(null);

  //const droneIntervalRef = useRef<number | null>(null);
  const droneStepRef = useRef(0);
  const droneStepTimeoutRef = useRef<number | null>(null);

  const droneBpmRef = useRef(droneBpm);

  const [arohanaChoices, setArohanaChoices] = useState<OrderedScaleChoices>({
    ri: "Ri2",
    ga: "Ga2",
    ma: "Ma1",
    pa: "Pa",
    dha: "Dha2",
    ni: "Ni2",
  });

  const [avarohanaChoices, setAvarohanaChoices] = useState<OrderedScaleChoices>({
    ri: "Ri2",
    ga: "Ga2",
    ma: "Ma2",
    pa: "Pa",
    dha: "Dha2",
    ni: "Ni2",
  });

  const availableRagas = useMemo(() => {
    const search = normalizeRagaName(ragaSearch);

    return ALL_RAGAS
      .filter((raga) => raga.tradition === tradition)
      .map((raga) => ({
        raga,
        score: getRagaSearchScore(raga.name, search),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;

        return normalizeRagaName(a.raga.name).localeCompare(
          normalizeRagaName(b.raga.name),
          undefined,
          { sensitivity: "base" }
        );
      })
      .map(({ raga }) => raga);
  }, [tradition, ragaSearch]);

    const droneSaHz = useMemo(() => {
      let wrapped = saHz;
      while (wrapped < DRONE_REFERENCE_MIN_HZ) wrapped *= 2;
      while (wrapped >= DRONE_REFERENCE_MAX_HZ) wrapped /= 2;
      return wrapped;
    }, [saHz]);

    const selectedRaga = useMemo(
      () => ALL_RAGAS.find((raga) => raga.id === selectedRagaId) ?? null,
      [selectedRagaId]
    );

  const droneSaHzRef = useRef(droneSaHz);
  const dronePatternRef = useRef<DronePattern>(dronePattern);
  const droneVolumeRef = useRef(droneVolume);
  const activeDroneSourcesRef = useRef<(OscillatorNode | AudioBufferSourceNode)[]>([]);
  const activeDroneNodesRef = useRef<AudioNode[]>([]);

  useEffect(() => {
    droneSaHzRef.current = droneSaHz;
  }, [droneSaHz]);

  useEffect(() => {
    dronePatternRef.current = dronePattern;
  }, [dronePattern]);

  useEffect(() => {
    droneVolumeRef.current = droneVolume;

    if (droneGainNodeRef.current && audioContextRef.current) {
      droneGainNodeRef.current.gain.setValueAtTime(
        droneVolume,
        audioContextRef.current.currentTime
      );
    }
  }, [droneVolume]);

  interface CircleSlot {
    key: string;
    aliases: SwaraId[];
  }
  
  interface SrutiMarker {
    key: string;
    swara: SwaraId;
    cents: number;
    isDefault: boolean;
    label: string;
  }

  const currentRagaName = selectedRaga?.iastName ?? selectedRaga?.name ?? "";

  useEffect(() => {
    if (!selectedRagaId) return;

    const selected = ALL_RAGAS.find((raga) => raga.id === selectedRagaId);
    if (!selected) return;

    setArohanaChoices(selected.arohana);
    setAvarohanaChoices(selected.avarohana);

    setDronePattern((prev) =>
      chooseDronePatternForRaga(prev, selected.arohana, selected.avarohana)
    );
  }, [selectedRagaId]);

  useEffect(() => {
    if (ragaSearch.trim() !== "") return;
    if (availableRagas.length > 0 && !selectedRagaId) {
      const defaultIndex = 16;

      const raga =
        availableRagas.length > defaultIndex
          ? availableRagas[defaultIndex]
          : availableRagas[0];

      setSelectedRagaId(raga.id);
    }
  }, [availableRagas, selectedRagaId, ragaSearch]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = inputGain;
    }
  }, [inputGain]);

  useEffect(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      rebuildAudioGraph();
    }
  }, [useCompression]);

  useEffect(() => {
    async function run() {
      if (!droneEnabled) {
        stopDroneGenerator();
        return;
      }

      const ctx = await ensureDroneAudioContext();
      const gainNode = ensureDroneGainNode(ctx);
      gainNode.gain.value = droneVolumeRef.current;

      startDroneGenerator(ctx, gainNode);
    }

    void run();
  }, [droneEnabled]);

  useEffect(() => {
    droneBpmRef.current = droneBpm;
  }, [droneBpm]);

  useEffect(() => {
    if (tunerViewMode !== "octave") {
      setSelectedSwaraId(null);
      setSelectedSrutiKey(null);
      setSelectedOctaveNoteKey(null);
    }
  }, [tunerViewMode]);

  useEffect(() => {
    droneSaHzRef.current = droneSaHz;
  }, [droneSaHz]);

  useEffect(() => {
    dronePatternRef.current = dronePattern;
  }, [dronePattern]);

  useEffect(() => {
    droneVolumeRef.current = droneVolume;
    if (droneGainNodeRef.current && audioContextRef.current) {
      droneGainNodeRef.current.gain.setValueAtTime(
        droneVolume,
        audioContextRef.current.currentTime
      );
    }
  }, [droneVolume]);

  const config: RagaConfig = useMemo(
    () => ({
      arohana: buildArohana(arohanaChoices),
      avarohana: buildAvarohana(avarohanaChoices),
    }),
    [arohanaChoices, avarohanaChoices]
  );

  const tunerFrequencyHz = smoothedDetectedPitch;
  const levelNormalized = Math.min(inputLevel / 0.05, 1);

  const result = useMemo(
    () =>
      isCalibrating
        ? null
        : analyzeDetectedPitch(tunerFrequencyHz, saHz, config, toleranceCents),
    [isCalibrating, tunerFrequencyHz, saHz, config, toleranceCents]
  );

  const meterOffset =
    isCalibrating || !result || result.deviationCents === null
      ? 0
      : Math.max(-50, Math.min(50, result.deviationCents));
  const needleLeftPercent = ((meterOffset + 50) / 100) * 100;

  const displayedSwara = result?.displayedSwara ?? null;
  const displayedRange =
    displayedSwara !== null ? SWARA_CENTRAL_RANGES[displayedSwara] : null;

  const centralCenter =
    displayedSwara !== null ? getSwaraCentralCenter(displayedSwara) : null;

  const centralLeftOffset =
    displayedRange && centralCenter !== null ? displayedRange.min - centralCenter : null;
  const centralRightOffset =
    displayedRange && centralCenter !== null ? displayedRange.max - centralCenter : null;

  const outerLeftOffset =
    centralLeftOffset !== null ? centralLeftOffset - toleranceCents : null;
  const outerRightOffset =
    centralRightOffset !== null ? centralRightOffset + toleranceCents : null;

  function offsetToPercent(offset: number): number {
    return ((offset + 50) / 100) * 100;
  }

  const centralLeftPercent =
    centralLeftOffset !== null ? offsetToPercent(centralLeftOffset) : 50;
  const centralRightPercent =
    centralRightOffset !== null ? offsetToPercent(centralRightOffset) : 50;
  const centralWidthPercent = centralRightPercent - centralLeftPercent;

  const outerLeftPercent =
    outerLeftOffset !== null ? offsetToPercent(outerLeftOffset) : 50;
  const outerRightPercent =
    outerRightOffset !== null ? offsetToPercent(outerRightOffset) : 50;
  const outerWidthPercent = outerRightPercent - outerLeftPercent;

  const displayedSaCents = hzToCentsWithinOctave(saHz);

  const displayedReferenceHz = c4ToA3Hz(saHz);
  const displayedReferenceText =
    mode === "micro"
      ? `A3 = ${displayedReferenceHz.toFixed(2)} Hz`
      : formatWesternNoteWithCentsFromCents(displayedSaCents);

  const octaveLegendText =
    mode === "swara"
    ? null
    : selectedTemperament === "31tet"
        ? "⅕ tone up and down"
        : selectedTemperament === "quarter"
          ? "¼ tone up and down"
          : null;

  const hasDirectionalSwaras = config.arohana.some(
    (swara) => !config.avarohana.includes(swara)
  ) || config.avarohana.some(
    (swara) => !config.arohana.includes(swara)
  );

  const swaraLegendText =
    mode === "swara" && hasDirectionalSwaras
      ? "Arrows ↑ and ↓ indicate swaras used only in arohana or only in avarohana"
      : null;          

  function getStepDurationMs(stepIndex: number, bpm: number): number {
    const unitMs = (60 / bpm) * 1000;
    return stepIndex === 3 ? unitMs * 2 : unitMs;
  }

  function scheduleNextDroneStep(ctx: AudioContext, gainNode: GainNode) {
    const bpm = droneBpmRef.current;
    const pattern = dronePatternRef.current;
    const saHz = droneSaHzRef.current;

    const freqs = getDroneFrequencies(pattern, saHz);
    const step = droneStepRef.current % 4;

    playPluck(ctx, freqs[step], ctx.currentTime + 0.005, gainNode);

    const delay = getStepDurationMs(step, bpm);

    droneStepRef.current = (droneStepRef.current + 1) % 4;

    droneStepTimeoutRef.current = window.setTimeout(() => {
      scheduleNextDroneStep(ctx, gainNode);
    }, delay);
  }

  function formatWesternNoteWithCentsFromCents(cents: number): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const normalized = ((cents % 1200) + 1200) % 1200;

    const semitoneFloat = normalized / 100;
    const nearestSemitone = Math.round(semitoneFloat);

    const noteIndex = ((nearestSemitone % 12) + 12) % 12;
    const offsetRounded = Math.round(normalized - nearestSemitone * 100);

    if (offsetRounded === 0) {
      return `Sa = ${noteNames[noteIndex]}`;
    }

    const sign = offsetRounded > 0 ? "+" : "";
    return `Sa = ${noteNames[noteIndex]} ${sign}${offsetRounded}`;
  }

  function registerDroneSource(source: OscillatorNode | AudioBufferSourceNode) {
    activeDroneSourcesRef.current.push(source);

    source.onended = () => {
      activeDroneSourcesRef.current = activeDroneSourcesRef.current.filter((s) => s !== source);
    };
  }

  function registerDroneNode(node: AudioNode) {
    activeDroneNodesRef.current.push(node);
  }

  async function startSaCalibration() {
    setMicStatus("Requesting microphone...");
    const ok = await ensureMicrophoneReady();
    if (!ok) {
      setIsCalibrating(false);
      isCalibratingRef.current = false;
      return;
    }

    calibrationPitchesRef.current = [];

    setIsCalibrating(true);
    isCalibratingRef.current = true;
    setMicStatus("Listening...");
    startAudioMonitoring();

    smoothedCentsRef.current = null;
    largeJumpCandidateRef.current = null;
    largeJumpCountRef.current = 0;
  }

  function nudgeSaUp() {
    setSaHz((prevHz) => {
      const currentCents = hzToCentsWithinOctave(prevHz);
      const mod = ((currentCents % 10) + 10) % 10;
      const delta = mod === 0 ? 10 : (10 - mod);
      return prevHz * Math.pow(2, delta / 1200);
    });
  }

  async function playSrutiPreview(cents: number, octaveShift: number = 0) {
    const ctx = await ensureDroneAudioContext();

    if (srutiPreviewOscRef.current) {
      try {
        srutiPreviewOscRef.current.stop();
      } catch {}
      try {
        srutiPreviewOscRef.current.disconnect();
      } catch {}
      srutiPreviewOscRef.current = null;
    }

    if (srutiPreviewGainRef.current) {
      try {
        srutiPreviewGainRef.current.disconnect();
      } catch {}
      srutiPreviewGainRef.current = null;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = saHz * Math.pow(2, (cents + 1200 * octaveShift) / 1200);

    osc.type = "triangle";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.30, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.30, ctx.currentTime + 0.75);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.22);

    srutiPreviewOscRef.current = osc;
    srutiPreviewGainRef.current = gain;
  }

  function nudgeSaDown() {
    setSaHz((prevHz) => {
      const currentCents = hzToCentsWithinOctave(prevHz);
      const mod = ((currentCents % 10) + 10) % 10;
      const delta = mod === 0 ? -10 : -mod;
      return prevHz * Math.pow(2, delta / 1200);
    });
  }

  function hzToCentsWithinOctave(freq: number): number {
    const midi = 69 + 12 * Math.log2(freq / 440);
    const cents = midi * 100;

    // porta il valore tra 0 e 1200
    const normalized = ((cents % 1200) + 1200) % 1200;

    return normalized;
  }

  function stopSaCalibration() {
    setIsCalibrating(false);
    isCalibratingRef.current = false;
    setMicStatus("Microphone ready");

    const detectedSa = median(calibrationPitchesRef.current);
    if (detectedSa) {
      setSaHz(detectedSa);
      setIsSaCalibrated(true);
    }

    calibrationPitchesRef.current = [];
  }

  async function ensureMicrophoneReady(): Promise<boolean> {
    try {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        mediaStreamRef.current = stream;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      if (!sourceNodeRef.current && mediaStreamRef.current) {
        sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(
          mediaStreamRef.current
        );
      }

      if (!analyserRef.current) {
        rebuildAudioGraph();
      }

      setMicStatus("Microphone ready");
      return true;
    } catch (err) {
      console.error(err);
      setMicStatus("Microphone access denied or unavailable");
      return false;
    }
  }

  async function handleMicButtonClick() {
    if (micStatus === "Microphone ready" || micStatus === "Listening..." || micStatus === "Requesting microphone...") {
      return;
    }

    setMicStatus("Requesting microphone...");
    const ok = await ensureMicrophoneReady();
    if (!ok) return;

    smoothedCentsRef.current = null;
    largeJumpCandidateRef.current = null;
    largeJumpCountRef.current = 0;

    startAudioMonitoring();
    setMicStatus("Microphone ready");
  }

  function getMicButtonLabel(): string {
    if (micStatus === "Requesting microphone...") return "Requesting microphone...";
    if (micStatus === "Listening...") return "Listening…";
    if (micStatus === "Microphone ready") return "Microphone ready";
    if (micStatus === "Microphone access denied or unavailable") return "Microphone unavailable";
    return "Enable microphone";
  }

  function startAudioMonitoring() {
    function update() {
      const analyser = analyserRef.current;
      const data = timeDomainDataRef.current;
      const audioContext = audioContextRef.current;

      if (analyser && data && audioContext) {
        analyser.getFloatTimeDomainData(data as Float32Array<ArrayBuffer>);

        const rms = computeRms(data);
        const prev = inputLevelRef.current;
        const smoothed = prev * 0.8 + rms * 0.2;

        inputLevelRef.current = smoothed;
        setInputLevel(smoothed);

        const estimatedPitch =
          pitchDetectorMode === "mpm"
            ? estimatePitchMpm(data, audioContext.sampleRate)
            : estimatePitchAutocorrelation(data, audioContext.sampleRate);
        const smoothedPitch = smoothPitchMusically(estimatedPitch, saHz);
        setSmoothedDetectedPitch(smoothedPitch);

        if (isCalibratingRef.current && smoothedPitch !== null && rms >= 0.015) {
          calibrationPitchesRef.current.push(smoothedPitch);
        }
      }

      animationFrameRef.current = requestAnimationFrame(update);
    }

    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(update);
    }
  }

  function rebuildAudioGraph() {
    const audioContext = audioContextRef.current;
    const sourceNode = sourceNodeRef.current;

    if (!audioContext || !sourceNode) return;

    try {
      sourceNode.disconnect();
    } catch {}

    try {
      gainNodeRef.current?.disconnect();
    } catch {}

    try {
      compressorRef.current?.disconnect();
    } catch {}

    try {
      analyserRef.current?.disconnect();
    } catch {}

    const gainNode = audioContext.createGain();
    gainNode.gain.value = inputGain;

    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.85;

    if (useCompression) {
      sourceNode.connect(compressor);
      compressor.connect(gainNode);
    } else {
      sourceNode.connect(gainNode);
    }

    gainNode.connect(analyser);

    gainNodeRef.current = gainNode;
    compressorRef.current = compressor;
    analyserRef.current = analyser;
    timeDomainDataRef.current = new Float32Array(analyser.fftSize);
  }

  async function ensureDroneAudioContext(): Promise<AudioContext> {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function ensureDroneGainNode(ctx: AudioContext): GainNode {
    if (!droneGainNodeRef.current) {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      droneGainNodeRef.current = gain;
    }
    return droneGainNodeRef.current;
  }

  function playPluck(
    ctx: AudioContext,
    frequency: number,
    time: number,
    masterGain: GainNode
  ) {
    const duration = 6.5;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.8, time + 0.012);
    env.gain.linearRampToValueAtTime(0.45, time + 0.18);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.frequency.setValueAtTime(4200, time);
    toneFilter.Q.setValueAtTime(0.7, time);

    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = "bandpass";
    buzzFilter.frequency.setValueAtTime(1800, time);
    buzzFilter.Q.setValueAtTime(1.2, time);

    env.connect(toneFilter);
    toneFilter.connect(masterGain);

    const partials = [
      { mult: 1.0, gain: 1.0, detune: 0 },
      { mult: 2.0, gain: 0.45, detune: 2 },
      { mult: 3.0, gain: 0.22, detune: -3 },
      { mult: 4.15, gain: 0.12, detune: 4 },
      { mult: 5.35, gain: 0.08, detune: -5 },
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(frequency * p.mult, time);
      osc.detune.setValueAtTime(p.detune, time);

      oscGain.gain.setValueAtTime(p.gain, time);

      osc.connect(oscGain);
      oscGain.connect(env);

      osc.start(time);
      osc.stop(time + duration);

      registerDroneSource(osc);
    }

    const noiseBuffer = ctx.createBuffer(1, 2048, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.20, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

    noise.connect(noiseGain);
    noiseGain.connect(buzzFilter);
    buzzFilter.connect(masterGain);

    noise.start(time);
    noise.stop(time + 0.07);

    registerDroneNode(env);
    registerDroneNode(toneFilter);
    registerDroneSource(noise);
    registerDroneNode(noiseGain);
    registerDroneNode(buzzFilter);
  }

  function getDroneFrequencies(pattern: DronePattern, saHz: number): number[] {
    switch (pattern) {
      case "sa_pa":
        return [saHz * 1.5, saHz * 2, saHz * 2, saHz];
      case "sa_ma":
        return [saHz * (4 / 3), saHz * 2, saHz * 2, saHz];
      case "sa_ni":
        return [saHz * 1.5, saHz * (15 / 8), saHz * 2, saHz];
    }
  }

  function stopDroneGenerator() {
    if (droneStepTimeoutRef.current !== null) {
      clearTimeout(droneStepTimeoutRef.current);
      droneStepTimeoutRef.current = null;
    }

    for (const source of activeDroneSourcesRef.current) {
      try {
        source.stop();
      } catch {}
      try {
        source.disconnect();
      } catch {}
    }
    activeDroneSourcesRef.current = [];

    for (const node of activeDroneNodesRef.current) {
      try {
        node.disconnect();
      } catch {}
    }
    activeDroneNodesRef.current = [];
  }

  function startDroneGenerator(ctx: AudioContext, gainNode: GainNode) {
    stopDroneGenerator();
    droneStepRef.current = 0;
    scheduleNextDroneStep(ctx, gainNode);
  }

  function computeRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  function median(values: number[]): number | null {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  function estimatePitchAutocorrelation(
    buffer: Float32Array,
    sampleRate: number
  ): number | null {
    const size = buffer.length;

    let rms = 0;
    for (let i = 0; i < size; i++) {
      const v = buffer[i];
      rms += v * v;
    }
    rms = Math.sqrt(rms / size);

    if (rms < 0.01) {
      return null;
    }

    let mean = 0;
    for (let i = 0; i < size; i++) {
      mean += buffer[i];
    }
    mean /= size;

    const centered = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      centered[i] = buffer[i] - mean;
    }

    const minFreq = 80;
    const maxFreq = 500;

    const minLag = Math.floor(sampleRate / maxFreq);
    const maxLag = Math.floor(sampleRate / minFreq);

    if (maxLag >= size) {
      return null;
    }

    let bestLag = -1;
    let bestCorr = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < size - lag; i++) {
        const x1 = centered[i];
        const x2 = centered[i + lag];
        sum += x1 * x2;
        norm1 += x1 * x1;
        norm2 += x2 * x2;
      }

      const denom = Math.sqrt(norm1 * norm2);
      if (denom <= 0) {
        continue;
      }

      const corr = sum / denom;

      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag < 0 || bestCorr < 0.65) {
      return null;
    }

    const corrAt = (lag: number): number => {
      let sum = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < size - lag; i++) {
        const x1 = centered[i];
        const x2 = centered[i + lag];
        sum += x1 * x2;
        norm1 += x1 * x1;
        norm2 += x2 * x2;
      }

      const denom = Math.sqrt(norm1 * norm2);
      return denom > 0 ? sum / denom : 0;
    };

    let refinedLag = bestLag;

    if (bestLag > minLag && bestLag < maxLag) {
      const y1 = corrAt(bestLag - 1);
      const y2 = corrAt(bestLag);
      const y3 = corrAt(bestLag + 1);

      const a = (y1 + y3 - 2 * y2) / 2;
      const b = (y3 - y1) / 2;

      if (a !== 0) {
        refinedLag = bestLag - b / (2 * a);
      }
    }

    if (refinedLag <= 0) {
      return null;
    }

    const frequency = sampleRate / refinedLag;

    if (frequency < minFreq || frequency > maxFreq) {
      return null;
    }

    return frequency;
  }

  function estimatePitchMpm(
    buffer: Float32Array,
    sampleRate: number
  ): number | null {
    const size = buffer.length;

    let rms = 0;
    for (let i = 0; i < size; i++) {
      const v = buffer[i];
      rms += v * v;
    }
    rms = Math.sqrt(rms / size);

    if (rms < 0.01) {
      return null;
    }

    let mean = 0;
    for (let i = 0; i < size; i++) {
      mean += buffer[i];
    }
    mean /= size;

    const x = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      x[i] = buffer[i] - mean;
    }

    const minFreq = 80;
    const maxFreq = 500;

    const minLag = Math.floor(sampleRate / maxFreq);
    const maxLag = Math.floor(sampleRate / minFreq);

    if (maxLag >= size) {
      return null;
    }

    const nsdf = new Float32Array(maxLag + 1);

    for (let tau = minLag; tau <= maxLag; tau++) {
      let acf = 0;
      let divisor = 0;

      for (let i = 0; i < size - tau; i++) {
        const x1 = x[i];
        const x2 = x[i + tau];
        acf += x1 * x2;
        divisor += x1 * x1 + x2 * x2;
      }

      nsdf[tau] = divisor > 0 ? (2 * acf) / divisor : 0;
    }

    let bestLag = -1;
    let bestValue = -1;

    for (let tau = minLag + 1; tau < maxLag - 1; tau++) {
      const prev = nsdf[tau - 1];
      const curr = nsdf[tau];
      const next = nsdf[tau + 1];

      const isLocalPeak = curr > prev && curr >= next;
      if (!isLocalPeak) continue;
      if (curr < 0.75) continue;

      if (curr > bestValue) {
        bestValue = curr;
        bestLag = tau;
      }
    }

    if (bestLag < 0) {
      return null;
    }

    let refinedLag = bestLag;
    {
      const y1 = nsdf[bestLag - 1];
      const y2 = nsdf[bestLag];
      const y3 = nsdf[bestLag + 1];

      const a = (y1 + y3 - 2 * y2) / 2;
      const b = (y3 - y1) / 2;

      if (a !== 0) {
        refinedLag = bestLag - b / (2 * a);
      }
    }

    if (refinedLag <= 0) {
      return null;
    }

    const frequency = sampleRate / refinedLag;

    if (frequency < minFreq || frequency > maxFreq) {
      return null;
    }

    return frequency;
  }

  function buildArohana(choices: OrderedScaleChoices): SwaraId[] {
    const result: SwaraId[] = ["Sa"];

    if (choices.ri) result.push(choices.ri);
    if (choices.ga) result.push(choices.ga);
    if (choices.ma) result.push(choices.ma);
    if (choices.pa) result.push(choices.pa);
    if (choices.dha) result.push(choices.dha);
    if (choices.ni) result.push(choices.ni);

    return result;
  }

  function buildAvarohana(choices: OrderedScaleChoices): SwaraId[] {
    const result: SwaraId[] = [];

    if (choices.ni) result.push(choices.ni);
    if (choices.dha) result.push(choices.dha);
    if (choices.pa) result.push(choices.pa);
    if (choices.ma) result.push(choices.ma);
    if (choices.ga) result.push(choices.ga);
    if (choices.ri) result.push(choices.ri);

    result.push("Sa");

    return result;
  }

  function smoothPitchMusically(newPitch: number | null, saHz: number): number | null {
    if (newPitch === null) {
      smoothedCentsRef.current = null;
      emaCentsRef.current = null;
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;
      return null;
    }

    const newCents = 1200 * Math.log2(newPitch / saHz);
    let emaCents = newCents;

    if (emaCentsRef.current === null) {
      emaCentsRef.current = newCents;
    } else {
      let deltaEma = newCents - emaCentsRef.current;
      while (deltaEma > 600) deltaEma -= 1200;
      while (deltaEma < -600) deltaEma += 1200;

      const emaAlpha = 0.18;
      emaCentsRef.current = emaCentsRef.current + emaAlpha * deltaEma;
    }

    emaCents = emaCentsRef.current;
    const previousCents = smoothedCentsRef.current;

    if (previousCents === null) {
      smoothedCentsRef.current = newCents;
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;
      return newPitch;
    }

    let delta = emaCents - previousCents;

    while (delta > 600) delta -= 1200;
    while (delta < -600) delta += 1200;

    const absDelta = Math.abs(delta);

    if (absDelta <= 35) {
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;

      const alpha = 0.14;
      const smoothedCents = previousCents + alpha * delta;
      smoothedCentsRef.current = smoothedCents;
      return saHz * Math.pow(2, smoothedCents / 1200);
    }

    const candidate = largeJumpCandidateRef.current;

    if (candidate !== null) {
      let candidateDelta = emaCents - candidate;
      while (candidateDelta > 600) candidateDelta -= 1200;
      while (candidateDelta < -600) candidateDelta += 1200;

      if (Math.abs(candidateDelta) <= 35) {
        largeJumpCountRef.current += 1;
      } else {
        largeJumpCandidateRef.current = emaCents;
        largeJumpCountRef.current = 1;
      }
    } else {
      largeJumpCandidateRef.current = emaCents;
      largeJumpCountRef.current = 1;
    }

    if (largeJumpCountRef.current >= 2) {
      const alpha = 0.38;
      const smoothedCents = previousCents + alpha * delta;
      smoothedCentsRef.current = smoothedCents;

      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;

      return saHz * Math.pow(2, smoothedCents / 1200);
    }

    return saHz * Math.pow(2, previousCents / 1200);
  }

  function normalizeCentsToOctave(cents: number): number {
    let wrapped = cents % 1200;
    if (wrapped < 0) wrapped += 1200;
    return wrapped;
  }

  function centsToCircleAngle(cents: number): number {
    return (normalizeCentsToOctave(cents) / 1200) * Math.PI * 2 - Math.PI / 2;
  }

  function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  function describeArcPath(
    cx: number,
    cy: number,
    radius: number,
    startCents: number,
    endCents: number
  ): string {
    const startAngle = centsToCircleAngle(startCents);
    const endAngle = centsToCircleAngle(endCents);

    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);

    let delta = normalizeCentsToOctave(endCents - startCents);
    if (delta === 0) delta = 1200;

    const largeArcFlag = delta > 600 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  function splitOctaveArc(startCents: number, endCents: number): Array<{ start: number; end: number }> {
    const start = normalizeCentsToOctave(startCents);
    const spanRaw = endCents - startCents;
    const span = Math.max(0, Math.min(1200, spanRaw));

    if (span <= 0) return [];

    const end = start + span;
    if (end <= 1200) {
      return [{ start, end }];
    }

    return [
      { start, end: 1200 },
      { start: 0, end: end - 1200 },
    ];
  }

  function getAllowedSwaraIds(): SwaraId[] {
    const ordered = [...config.arohana, ...config.avarohana];
    const seen = new Set<SwaraId>();
    const resultIds: SwaraId[] = [];

    for (const swara of ordered) {
      if (!seen.has(swara)) {
        seen.add(swara);
        resultIds.push(swara);
      }
    }

    return resultIds;
  }

  function getSwaraMembership(swara: SwaraId) {
    const inAro = config.arohana.includes(swara);
    const inAva = config.avarohana.includes(swara);

    return {
      inAro,
      inAva,
      inRaga: inAro || inAva,
      arrow: inAro && !inAva ? "↑" : !inAro && inAva ? "↓" : "",
    };
  }

function getCircleStatusText(): string {
  if (micStatus !== "Microphone ready" && micStatus !== "Listening...") {
    return "Microphone not enabled";
  }

  if (isCalibrating) {
    return mode === "micro"
      ? "Listening for reference"
      : `Calibrating ${getSwaraLabel("Sa", tradition)}`;
  }

    if (mode === "micro") {
      if (octaveTuningZone === null) return "No note detected";
      if (octaveTuningZone === "perfect") return "In tune";
      if (octaveTuningZone === "tolerated") return "Tolerated";
      return "Out of tune";
    }

    if (result?.allowed === null || result?.allowed === undefined) return "No note detected";
    if (result.allowed === false) return "Not allowed";
    if (result.tuningZone === "perfect") return "In tune";
    if (result.tuningZone === "tolerated") return "Tolerated";
    return "Out of tune";
  }

  const circleSize = 280;
  const circleCenter = circleSize / 2;
  const circleRadius = 102;
  const circleStrokeWidth = 18;

  const ALL_SWARASTHANA: SwaraId[] = [
    "Sa",
    "Ri1",
    "Ri2",
    "Ga2",
    "Ga3",
    "Ma1",
    "Ma2",
    "Pa",
    "Dha1",
    "Dha2",
    "Ni2",
    "Ni3",
  ];

  const SRUTI_EXTENDED_NAMES: Record<Tradition, Record<string, string>> = {
    hindustani: {
      "Sa-only": "Kshobhini",
      "Ri1-min": "Tivra",
      "Ri1-max": "Kumdavati",
      "Ri2-min": "Manda",
      "Ri2-max": "Chandovati",
      "Ga2-min": "Dayavanti",
      "Ga2-max": "Ranjani",
      "Ga3-min": "Raktika",
      "Ga3-max": "Rudri",
      "Ma1-min": "Krodhi",
      "Ma1-max": "Vajrika",
      "Ma2-min": "Prasarini",
      "Ma2-max": "Priti",
      "Pa-only": "Marjani",
      "Dha1-min": "Kshiti",
      "Dha1-max": "Rakta",
      "Dha2-min": "Sandipini",
      "Dha2-max": "Alapini",
      "Ni2-min": "Madni",
      "Ni2-max": "Rohini",
      "Ni3-min": "Ramya",
      "Ni3-max": "Ugra",
    },
    carnatic: {
      "Sa-only": "Shadja",
      "Ri1-min": "Ekaśruti Rishabha",
      "Ri1-max": "Dviśruti Rishabha",
      "Ri2-min": "Triśruti Rishabha",
      "Ri2-max": "Chatuśśruti Rishabha",
      "Ga2-min": "Komal Sādhārana Gāndhāra",
      "Ga2-max": "Sādhārana Gāndhāra",
      "Ga3-min": "Antara Gāndhāra",
      "Ga3-max": "Chyuta Madhyama Gāndhāra",
      "Ma1-min": "Suddha Madhyama",
      "Ma1-max": "Tivra Suddha Madhyama",
      "Ma2-min": "Prati Madhyama",
      "Ma2-max": "Chyuta Panchama Madhyama",
      "Pa-only": "Panchama",
      "Dha1-min": "Ekaśruti Dhaivata",
      "Dha1-max": "Dviśruti Dhaivata",
      "Dha2-min": "Triśruti Dhaivata",
      "Dha2-max": "Chatuśśruti Dhaivata",
      "Ni2-min": "Komala Kaisiki Nishāda",
      "Ni2-max": "Kaisiki Nishāda",
      "Ni3-min": "Kākali Nishāda",
      "Ni3-max": "Tivra Kākali Nishāda",
    },
  };

  const SWARASTHANA_EXTENDED_NAMES: Record<Tradition, Record<SwaraId, string>> = {
    hindustani: {
      Sa: "Shadja",
      Ri1: "Komal Rishabh",
      Ri2: "Shuddha Rishabh",
      Ri3: "Tivra Rishabh",
      Ga1: "Komal Gandhar",
      Ga2: "Komal Gandhar",
      Ga3: "Shuddha Gandhar",
      Ma1: "Shuddha Madhyam",
      Ma2: "Tivra Madhyam",
      Pa: "Pancham",
      Dha1: "Komal Dhaivat",
      Dha2: "Shuddha Dhaivat",
      Dha3: "Tivra Dhaivat",
      Ni1: "Komal Nishad",
      Ni2: "Komal Nishad",
      Ni3: "Shuddha Nishad",
    },
    carnatic: {
      Sa: "Shadjam",
      Ri1: "Shuddha Rishabham",
      Ri2: "Chatuśruti Rishabham",
      Ri3: "Shatśruti Rishabham",
      Ga1: "Shuddha Gāndharam",
      Ga2: "Sādhārana Gāndharam",
      Ga3: "Antara Gāndharam",
      Ma1: "Shuddha Madhyamam",
      Ma2: "Prati Madhyamam",
      Pa: "Panchamam",
      Dha1: "Shuddha Dhaivatam",
      Dha2: "Chatuśruti Dhaivatam",
      Dha3: "Shatśruti Dhaivatam",
      Ni1: "Shuddha Nishadam",
      Ni2: "Kaisiki Nishādam",
      Ni3: "Kākali Nishādam",
    },
  };

  const [selectedSrutiKey, setSelectedSrutiKey] = useState<string | null>(null);
  const [selectedSwaraId, setSelectedSwaraId] = useState<SwaraId | null>(null);
  const [selectedOctaveNoteKey, setSelectedOctaveNoteKey] = useState<string | null>(null);

  const allowedSwaraIds = useMemo(() => getAllowedSwaraIds(), [config]);

  const srutiMarkers = useMemo((): SrutiMarker[] => {
    const markers: SrutiMarker[] = [];

    for (const swara of ALL_SWARASTHANA) {
      const range = SWARA_CENTRAL_RANGES[swara];
      const center = getSwaraCentralCenter(swara);

      const defaultAtMin = range.default === range.min;

      if (swara === "Sa" || swara === "Pa") {
        markers.push({
          key: `${swara}-only`,
          swara,
          cents: center,
          isDefault: true,
          label: SRUTI_EXTENDED_NAMES[tradition][`${swara}-only`],
        });
      } else {
        markers.push({
          key: `${swara}-min`,
          swara,
          cents: range.min,
          isDefault: defaultAtMin,
          label: SRUTI_EXTENDED_NAMES[tradition][`${swara}-min`],
        });

        markers.push({
          key: `${swara}-max`,
          swara,
          cents: range.max,
          isDefault: !defaultAtMin,
          label: SRUTI_EXTENDED_NAMES[tradition][`${swara}-max`],
        });
      }
    }

    return markers;
  }, [tradition]);

  const selectedSrutiMarker = useMemo(() => {
    if (!selectedSrutiKey) return null;
    return srutiMarkers.find((m) => m.key === selectedSrutiKey) ?? null;
  }, [selectedSrutiKey, srutiMarkers]);
  
  const circleSegments = useMemo(() => {
    const outerSegments: Array<{ key: string; start: number; end: number; color: string; swara: SwaraId }> = [];
    const centralSegments: Array<{ key: string; start: number; end: number; color: string; swara: SwaraId }> = [];

    for (const swara of allowedSwaraIds) {
      const range = SWARA_CENTRAL_RANGES[swara];
      const center = getSwaraCentralCenter(swara);

      const centralStart = range.min;
      const centralEnd = range.max;

      const outerStart = center + (range.min - center) - toleranceCents;
      const outerEnd = center + (range.max - center) + toleranceCents;

      for (const seg of splitOctaveArc(outerStart, outerEnd)) {
        outerSegments.push({
          key: `${swara}-outer-${seg.start}-${seg.end}`,
          start: seg.start,
          end: seg.end,
          color: "#d6c64b",
          swara,
        });
      }

      for (const seg of splitOctaveArc(centralStart, centralEnd)) {
        centralSegments.push({
          key: `${swara}-central-${seg.start}-${seg.end}`,
          start: seg.start,
          end: seg.end,
          color: "#32d74b",
          swara,
        });
      }
    }

    return { outerSegments, centralSegments };
  }, [allowedSwaraIds, toleranceCents]);

  const CIRCLE_SLOTS: CircleSlot[] = [
    { key: "Sa", aliases: ["Sa"] },
    { key: "Ri1", aliases: ["Ri1"] },
    { key: "Ri2Ga1", aliases: ["Ri2", "Ga1"] },
    { key: "Ri3Ga2", aliases: ["Ri3", "Ga2"] },
    { key: "Ga3", aliases: ["Ga3"] },
    { key: "Ma1", aliases: ["Ma1"] },
    { key: "Ma2", aliases: ["Ma2"] },
    { key: "Pa", aliases: ["Pa"] },
    { key: "Dha1", aliases: ["Dha1"] },
    { key: "Dha2Ni1", aliases: ["Dha2", "Ni1"] },
    { key: "Dha3Ni2", aliases: ["Dha3", "Ni2"] },
    { key: "Ni3", aliases: ["Ni3"] },
  ];

  const octaveNotes = useMemo(() => {
    return TEMPERAMENT_NOTE_MAP[selectedTemperament] ?? [];
  }, [selectedTemperament]);

  const octaveViewTicks = useMemo(() => {
    return octaveNotes.map((note) => {
      const angle = centsToCircleAngle(note.cents);

      const inner = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius - circleStrokeWidth / 2,
        angle
      );

      const outer = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius + circleStrokeWidth / 2,
        angle
      );

      return {
        key: `octave-tick-${note.key}`,
        cents: note.cents,
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
      };
    });
  }, [octaveNotes]);

  const selectedOctaveNote = useMemo(() => {
    if (!selectedOctaveNoteKey) return null;
    return octaveNotes.find((n) => n.key === selectedOctaveNoteKey) ?? null;
  }, [selectedOctaveNoteKey, octaveNotes]);

  const nearestOctaveNote = useMemo(() => {
    if (
      isCalibrating ||
      !result ||
      result.centsFromSa === null ||
      result.centsFromSa === undefined ||
      octaveNotes.length === 0
    ) {
      return null;
    }

    const target = normalizeCentsToOctave(result.centsFromSa);

    let best: (typeof octaveNotes)[number] | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const note of octaveNotes) {
      let delta = Math.abs(target - normalizeCentsToOctave(note.cents));
      if (delta > 600) delta = 1200 - delta;

      if (delta < bestDistance) {
        bestDistance = delta;
        best = note;
      }
    }

    return best;
  }, [isCalibrating, result, octaveNotes]);

  const displayedOctaveNote = nearestOctaveNote;

  const circleCenterOctaveText =
    isCalibrating || !displayedOctaveNote
      ? "--"
      : displayedOctaveNote.label;

  const octaveDeviationCents = useMemo(() => {
    if (
      isCalibrating ||
      !result ||
      result.centsFromSa === null ||
      result.centsFromSa === undefined ||
      !displayedOctaveNote
    ) {
      return null;
    }

    const target = normalizeCentsToOctave(result.centsFromSa);
    const noteCents = normalizeCentsToOctave(displayedOctaveNote.cents);

    let delta = target - noteCents;

    while (delta <= -600) delta += 1200;
    while (delta > 600) delta -= 1200;

    return delta;
  }, [isCalibrating, result, displayedOctaveNote]);

  const octaveTuningZone: "perfect" | "tolerated" | "out" | null =
    octaveDeviationCents === null
      ? null
      : Math.abs(octaveDeviationCents) <= 5
        ? "perfect"
        : Math.abs(octaveDeviationCents) <= toleranceCents
          ? "tolerated"
          : "out";

  const swaraColorClass =
    mode === "micro"
      ? isCalibrating || octaveTuningZone === null
        ? ""
        : octaveTuningZone === "perfect"
          ? "swara-perfect"
          : octaveTuningZone === "tolerated"
            ? "swara-tolerated"
            : "swara-out"
      : isCalibrating || !result
        ? ""
        : result.allowed === false
          ? "swara-out"
          : result.tuningZone === "perfect"
            ? "swara-perfect"
            : result.tuningZone === "tolerated"
              ? "swara-tolerated"
              : "swara-out";

  const circleSwaraColor =
    mode === "micro"
      ? isCalibrating || octaveTuningZone === null
        ? "white"
        : octaveTuningZone === "perfect"
          ? "#32d74b"
          : octaveTuningZone === "tolerated"
            ? "#ffd60a"
            : "#ff453a"
      : isCalibrating || !result
        ? "white"
        : result.allowed === false
          ? "#ff453a"
          : result.tuningZone === "perfect"
            ? "#32d74b"
            : result.tuningZone === "tolerated"
              ? "#ffd60a"
              : "#ff453a";

  const octaveViewLabels = useMemo(() => {
    return octaveNotes.map((note) => {
      const angle = centsToCircleAngle(note.cents);

      const pos = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius + 34,
        angle
      );

      return {
        key: `octave-label-${note.key}`,
        label: note.label,
        cents: note.cents,
        x: pos.x,
        y: pos.y,
      };
    });
  }, [octaveNotes]);

  const octaveViewAliasLabels = useMemo(() => {
    return octaveNotes
      .filter((note) => !!note.alias)
      .map((note) => {
        const angle = centsToCircleAngle(note.cents);

        const pos = polarToCartesian(
          circleCenter,
          circleCenter,
          circleRadius + 58,
          angle
        );

        return {
          key: `octave-alias-${note.key}`,
          alias: note.alias!,
          cents: note.cents,
          x: pos.x,
          y: pos.y,
        };
      });
  }, [octaveNotes]);

  type FifthConnection = {
    key: string;
    fromIndex: number;
    toIndex: number;
    stroke: string;
    strokeWidth?: number;
  };

  const octaveFifthConnections = useMemo<FifthConnection[]>(() => {
    if (mode !== "micro") return [];

    if (selectedTemperament === "12tet") {
      return Array.from({ length: 12 }, (_, x) => ({
        key: `fifth-12-${x}`,
        fromIndex: x,
        toIndex: (x + 7) % 12,
        stroke: "rgba(210,170,175,0.42)",
      }));
    }

    if (selectedTemperament === "19tet") {
      return Array.from({ length: 19 }, (_, x) => ({
        key: `fifth-19-${x}`,
        fromIndex: x,
        toIndex: (x + 11) % 19,
        stroke: "rgba(210,170,175,0.42)",
      }));
    }

    const AS_INDEX = 15;
    const GB_INDEX = 8;

    if (selectedTemperament === "pythagorean") {
      return Array.from({ length: 17 }, (_, x) => ({
        key: `fifth-17-${x}`,
        fromIndex: x,
        toIndex: (x + 10) % 17,
        stroke: "rgba(210,170,175,0.42)",
      })).filter(edge => !(edge.fromIndex === AS_INDEX && edge.toIndex === GB_INDEX));
    }

    const F2_INDEX = 10;
    const FS1_INDEX = 11;
    const FS2_INDEX = 12;
    const DB1_INDEX = 1;
    const DB2_INDEX = 2;
    const D1_INDEX = 3;

    const excludedEdges = [
      [F2_INDEX, DB1_INDEX],   // F' -> D♭
      [FS1_INDEX, DB2_INDEX],  // F♯ -> D♭'
      [FS2_INDEX, D1_INDEX],   // F♯' -> D
    ];

    if (selectedTemperament === "indian") {
      return Array.from({ length: 22 }, (_, x) => ({
        key: `fifth-22-${x}`,
        fromIndex: x,
        toIndex: (x + 13) % 22,
        stroke: "rgba(210,170,175,0.42)",
      })).filter(edge =>
        !excludedEdges.some(
          ([from, to]) => edge.fromIndex === from && edge.toIndex === to
        )
      );
    }

    if (selectedTemperament === "31tet") {
      return Array.from({ length: 31 }, (_, x) => ({
        key: `fifth-31-${x}`,
        fromIndex: x,
        toIndex: (x + 18) % 31,
        stroke: "rgba(210,170,175,0.42)",
      }));
    }

    if (selectedTemperament === "quarter") {
      return [
        ...Array.from({ length: 12 }, (_, k) => {
          const x = k * 2;
          return {
            key: `fifth-24-even-${x}`,
            fromIndex: x,
            toIndex: (x + 14) % 24,
            stroke: "rgba(210,170,175,0.42)",
          };
        }),
        ...Array.from({ length: 12 }, (_, k) => {
          const x = k * 2 + 1;
          return {
            key: `fifth-24-odd-${x}`,
            fromIndex: x,
            toIndex: (x + 14) % 24,
            stroke: "rgba(235,210,90,0.42)",
          };
        }),
      ];
    }

    if (selectedTemperament === "meantone") {
      return Array.from({ length: 19 }, (_, x) => {
        const to = (x + 11) % 19;

        return {
          key: `fifth-meantone-${x}`,
          fromIndex: x,
          toIndex: to,
          stroke: "rgba(210,170,175,0.42)",
        };
      }).filter(edge =>
        !(edge.fromIndex === 18 && edge.toIndex === 10)
      );
    }

    return [];
  }, [mode, selectedTemperament]);

  const octaveFifthLines = useMemo(() => {
    const innerConnectionRadius = circleRadius - 12;

    return octaveFifthConnections
      .map((connection) => {
        const from = octaveNotes[connection.fromIndex];
        const to = octaveNotes[connection.toIndex];

        if (!from || !to) return null;

        const fromAngle = centsToCircleAngle(from.cents);
        const toAngle = centsToCircleAngle(to.cents);

        const p1 = polarToCartesian(
          circleCenter,
          circleCenter,
          innerConnectionRadius,
          fromAngle
        );

        const p2 = polarToCartesian(
          circleCenter,
          circleCenter,
          innerConnectionRadius,
          toAngle
        );

        return {
          ...connection,
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
        };
      })
      .filter(Boolean) as Array<
        FifthConnection & {
          x1: number;
          y1: number;
          x2: number;
          y2: number;
        }
      >;
  }, [octaveFifthConnections, octaveNotes, circleCenter, circleRadius]);

  const octaveToleranceSegments = useMemo(() => {
    const segments: Array<{
      key: string;
      start: number;
      end: number;
      color: string;
    }> = [];

    for (const note of octaveNotes) {
      const start = note.cents - toleranceCents;
      const end = note.cents + toleranceCents;

      for (const seg of splitOctaveArc(start, end)) {
        segments.push({
          key: `${note.key}-${seg.start}-${seg.end}`,
          start: seg.start,
          end: seg.end,
          color: "#d6c64b",
        });
      }
    }

    return segments;
  }, [octaveNotes, toleranceCents]);

  function getFirstVisibleSlotSwara(slot: CircleSlot, currentTradition: Tradition): SwaraId | null {
    for (const swara of slot.aliases) {
      if (getSwaraLabel(swara, currentTradition) !== "") {
        return swara;
      }
    }
    return null;
  }

  function getSlotDisplaySwara(slot: CircleSlot, currentTradition: Tradition): SwaraId | null {
    const allowed = slot.aliases.filter((swara) =>
      config.arohana.includes(swara) || config.avarohana.includes(swara)
    );

    for (const swara of allowed) {
      if (getSwaraLabel(swara, currentTradition) !== "") {
        return swara;
      }
    }

    return getFirstVisibleSlotSwara(slot, currentTradition);
  }

  function getSlotDefaultCents(slot: CircleSlot): number {
    return SWARA_CENTRAL_RANGES[slot.aliases[0]].default;
  }

  function openDroneSettings() {
    setShowDroneSettings(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById("drone-panel");
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  const circleSwaraLabels = useMemo(() => {
    return CIRCLE_SLOTS
      .filter((slot) => getFirstVisibleSlotSwara(slot, tradition) !== null)
      .map((slot) => {
        const displaySwara = getSlotDisplaySwara(slot, tradition);
        if (!displaySwara) return null;

        const range = SWARA_CENTRAL_RANGES[displaySwara];
        const defaultCents = range.default;

        const membership = getSwaraMembership(displaySwara);
        const slotCents = getSlotDefaultCents(slot);

        const angle = centsToCircleAngle(slotCents);
        const labelPos = polarToCartesian(
          circleCenter,
          circleCenter,
          circleRadius + 52,
          angle
        );

        const isVadi = selectedRaga?.vadi === displaySwara;
        const isSamvadi = selectedRaga?.samvadi === displaySwara;

        let fill = "#444";
        let fontWeight: string | number = 500;
        let fontSize = 14;

        if (membership.inRaga) {
          if (isVadi) {
            fill = "#9EC5FF";
            fontWeight = 900;
            fontSize = 20;
          } else if (isSamvadi) {
            fill = "#6FA8FF";
            fontWeight = 700;
            fontSize = 17;
          } else {
            fill = "#4A7FD1";
            fontWeight = 500;
            fontSize = 14;
          }
        }

        const baseLabel = getSwaraLabel(displaySwara, tradition);
        const text = membership.arrow ? `${baseLabel} ${membership.arrow}` : baseLabel;

        return {
          key: `label-${slot.key}`,
          swara: displaySwara,
          x: labelPos.x,
          y: labelPos.y,
          text,
          fill,
          fontWeight,
          fontSize,
          centerCents: slotCents,
          defaultCents,
        };
      })
      .filter((label): label is NonNullable<typeof label> => label !== null);
  }, [tradition, selectedRaga, config]);

  const circlePitchTicks = useMemo(() => {
    return circleSwaraLabels.map((label) => {
      const angle = centsToCircleAngle(label.defaultCents);

      const inner = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius - circleStrokeWidth / 2,
        angle
      );
      const outer = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius + circleStrokeWidth / 2,
        angle
      );

      return {
        key: `tick-${label.key}`,
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
      };
    });
  }, [circleSwaraLabels]);

  const circleSecondaryTicks = useMemo(() => {
    return circleSwaraLabels.map((label) => {
      const range = SWARA_CENTRAL_RANGES[label.swara];
      const otherCents = label.defaultCents === range.min ? range.max : range.min;
      const angle = centsToCircleAngle(otherCents);

      const inner = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius - circleStrokeWidth / 2,
        angle
      );
      const outer = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius + circleStrokeWidth / 2,
        angle
      );

      return {
        key: `secondary-tick-${label.key}`,
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
      };
    });
  }, [circleSwaraLabels]);

  // const srutiViewTicks = useMemo(() => {
  //   return srutiMarkers.map((marker) => {
  //     const angle = centsToCircleAngle(marker.cents);

  //     const inner = polarToCartesian(
  //       circleCenter,
  //       circleCenter,
  //       circleRadius - circleStrokeWidth / 2,
  //       angle
  //     );

  //     const outer = polarToCartesian(
  //       circleCenter,
  //       circleCenter,
  //       circleRadius + circleStrokeWidth / 2,
  //       angle
  //     );

  //     return {
  //       key: `sruti-tick-${marker.key}`,
  //       swara: marker.swara,
  //       cents: marker.cents,
  //       isDefault: marker.isDefault,
  //       x1: inner.x,
  //       y1: inner.y,
  //       x2: outer.x,
  //       y2: outer.y,
  //     };
  //   });
  // }, [srutiMarkers]);

  const srutiViewLabels = useMemo(() => {
    return srutiMarkers.map((marker, index) => {
      const angle = centsToCircleAngle(marker.cents);

      const pos = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius + 26,
        angle
      );

      return {
        key: `sruti-label-${marker.key}`,
        index: index + 1,
        swara: marker.swara,
        cents: marker.cents,
        isDefault: marker.isDefault,
        x: pos.x,
        y: pos.y,
      };
    });
  }, [srutiMarkers]);

  const nearestSrutiMarker = useMemo(() => {
    if (
      isCalibrating ||
      !result ||
      result.centsFromSa === null ||
      result.centsFromSa === undefined ||
      srutiMarkers.length === 0
    ) {
      return null;
    }

    const target = normalizeCentsToOctave(result.centsFromSa);

    let best: SrutiMarker | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const marker of srutiMarkers) {
      let delta = Math.abs(target - normalizeCentsToOctave(marker.cents));
      if (delta > 600) delta = 1200 - delta;

      if (delta < bestDistance) {
        bestDistance = delta;
        best = marker;
      }
    }

    return best;
  }, [isCalibrating, result, srutiMarkers]);
  
  const displayedSrutiMarker = nearestSrutiMarker ?? selectedSrutiMarker;

  const displayedSrutiLabel = isCalibrating
    ? ""
    : displayedSrutiMarker?.label ?? "";

  const displayedSwaraLabel =
    tunerViewMode === "swara" && selectedSwaraId
      ? SWARASTHANA_EXTENDED_NAMES[tradition][selectedSwaraId] ?? ""
      : "";

  const displayedOctaveLabel =
    tunerViewMode === "octave" && selectedOctaveNote
      ? selectedOctaveNote.alias
        ? `${selectedOctaveNote.label} / ${selectedOctaveNote.alias}`
        : selectedOctaveNote.label
      : "";

  const displayedOctaveCents =
    tunerViewMode === "octave" && selectedOctaveNote
      ? selectedOctaveNote.cents
      : null;      

  const displayedSrutiNumber = useMemo(() => {
    if (!displayedSrutiMarker) return null;

    const match = srutiViewLabels.find(
      (label) => label.key === `sruti-label-${displayedSrutiMarker.key}`
    );

    return match ? match.index : null;
  }, [displayedSrutiMarker, srutiViewLabels]);

  const currentPitchText =
    mode === "micro"
      ? displayedOctaveNote && octaveDeviationCents !== null
        ? `${displayedOctaveNote.label}${
            Math.round(octaveDeviationCents) === 0
              ? ""
              : ` ${octaveDeviationCents > 0 ? "+" : ""}${Math.round(octaveDeviationCents)} cents`
          }`
        : "--"
      : result?.displayedSwara
        ? `${getSwaraLabel(result.displayedSwara, tradition)}${
            result.deviationCents !== null && result.deviationCents !== undefined
              ? Math.round(result.deviationCents) === 0
                ? ""
                : ` ${result.deviationCents > 0 ? "+" : ""}${Math.round(result.deviationCents)} cents`
              : ""
          }${
            displayedSrutiMarker && displayedSrutiNumber !== null
              ? ` (${displayedSrutiNumber}: ${displayedSrutiMarker.label})`
              : ""
          }`
        : selectedSrutiMarker && displayedSrutiNumber !== null
          ? `${getSwaraLabel(selectedSrutiMarker.swara, tradition)} (${displayedSrutiNumber}: ${selectedSrutiMarker.label})`
          : "--";

  const circleNeedleAngle =
    isCalibrating || !result || result.centsFromSa === null
      ? null
      : centsToCircleAngle(result.centsFromSa);

  const circleNeedleEnd =
    circleNeedleAngle === null
      ? null
      : polarToCartesian(circleCenter, circleCenter, circleRadius - 10, circleNeedleAngle);

  const circleCenterSwaraText = isCalibrating
    ? getSwaraLabel("Sa", tradition)
    : result?.displayedSwara
      ? getSwaraLabel(result.displayedSwara, tradition)
      : "--";

  const circleStatusText = getCircleStatusText();

  const visibleRiOptions = useMemo(() => getVisibleOptions(RI_OPTIONS, tradition), [tradition]);
  const visibleGaOptions = useMemo(() => getVisibleOptions(GA_OPTIONS, tradition), [tradition]);
  const visibleMaOptions = useMemo(() => getVisibleOptions(MA_OPTIONS, tradition), [tradition]);
  const visiblePaOptions = useMemo(() => getVisibleOptions(PA_OPTIONS, tradition), [tradition]);
  const visibleDhaOptions = useMemo(() => getVisibleOptions(DHA_OPTIONS, tradition), [tradition]);
  const visibleNiOptions = useMemo(() => getVisibleOptions(NI_OPTIONS, tradition), [tradition]);

  const micButtonClass =
    micStatus === "Microphone ready"
      ? "is-ready"
      : micStatus === "Microphone access denied or unavailable"
        ? "is-error"
        : "";

  function handleOctaveRingPointer(
    event: React.MouseEvent<SVGCircleElement, MouseEvent>
  ) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg || octaveViewLabels.length === 0) return;

    const rect = svg.getBoundingClientRect();

    const scaleX = circleSize / rect.width;
    const scaleY = circleSize / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const dx = x - circleCenter;
    const dy = y - circleCenter;
    const angle = Math.atan2(dy, dx);

    let best = octaveViewLabels[0];
    let bestDist = Number.POSITIVE_INFINITY;

    for (const label of octaveViewLabels) {
      const labelAngle = centsToCircleAngle(label.cents);
      const dist = angleDistance(angle, labelAngle);

      if (dist < bestDist) {
        bestDist = dist;
        best = label;
      }
    }

    const matchedNote = octaveNotes.find((n) => n.cents === best.cents);
    if (!matchedNote) return;

    setSelectedOctaveNoteKey(matchedNote.key);
    void playSrutiPreview(matchedNote.cents, -1);
  }

  function angleDistance(a: number, b: number): number {
    let d = Math.abs(a - b);
    while (d > Math.PI * 2) d -= Math.PI * 2;
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }

  // function handleSrutiRingPointer(
  //   event: React.MouseEvent<SVGCircleElement, MouseEvent>
  // ) {
  //   const svg = event.currentTarget.ownerSVGElement;
  //   if (!svg) return;

  //   const rect = svg.getBoundingClientRect();

  //   const scaleX = circleSize / rect.width;
  //   const scaleY = circleSize / rect.height;

  //   const x = (event.clientX - rect.left) * scaleX;
  //   const y = (event.clientY - rect.top) * scaleY;

  //   const dx = x - circleCenter;
  //   const dy = y - circleCenter;
  //   const angle = Math.atan2(dy, dx);

  //   let best = srutiViewLabels[0];
  //   let bestDist = Number.POSITIVE_INFINITY;

  //   for (const label of srutiViewLabels) {
  //     const labelAngle = centsToCircleAngle(label.cents);
  //     const dist = angleDistance(angle, labelAngle);

  //     if (dist < bestDist) {
  //       bestDist = dist;
  //       best = label;
  //     }
  //   }

  //   setSelectedSrutiKey(best.key.replace("sruti-label-", ""));
  //   void playSrutiPreview(best.cents);
  // }

  const swaraCircleSvg = (
    <div className="circle-container">
      <svg
        viewBox={`0 0 ${circleSize} ${circleSize}`}
        role="img"
        aria-label="Pitch circle"
        className="circle-svg"
      >
        <circle
          cx={circleCenter}
          cy={circleCenter}
          r={circleRadius}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={circleStrokeWidth}
        />

        {circleSegments.outerSegments.map((segment) => (
          <path
            key={segment.key}
            d={describeArcPath(circleCenter, circleCenter, circleRadius, segment.start, segment.end)}
            fill="none"
            stroke={segment.color}
            strokeWidth={circleStrokeWidth}
            strokeLinecap="butt"
            opacity={0.95}
          />
        ))}

        {circleSegments.centralSegments.map((segment) => (
          <path
            key={segment.key}
            d={describeArcPath(circleCenter, circleCenter, circleRadius, segment.start, segment.end)}
            fill="none"
            stroke={segment.color}
            strokeWidth={circleStrokeWidth}
            strokeLinecap="butt"
          />
        ))}

        {circlePitchTicks.map((tick) => (
          <line
            key={tick.key}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="#000"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}

        {circleSecondaryTicks.map((tick) => (
          <line
            key={tick.key}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        ))}

        {srutiViewLabels.map((label) => {
          const isInRaga =
            config.arohana.includes(label.swara) ||
            config.avarohana.includes(label.swara);

          return (
            <g
              key={`combined-${label.key}`}
              onClick={() => {
                setSelectedSrutiKey(label.key.replace("sruti-label-", ""));
                void playSrutiPreview(label.cents);
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={label.x}
                cy={label.y}
                r={10}
                fill="transparent"
              />

              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isInRaga ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.32)"}
                fontSize={label.isDefault ? 11 : 9}
                fontWeight={label.isDefault ? 700 : 500}
              >
                {label.index}
              </text>
            </g>
          );
        })}

        {circleNeedleEnd && (
          <>
            <line
              x1={circleCenter}
              y1={circleCenter}
              x2={circleNeedleEnd.x}
              y2={circleNeedleEnd.y}
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={circleCenter} cy={circleCenter} r={6} fill="white" />
          </>
        )}

        {circleSwaraLabels.map((label) => (
          <g
            key={label.key}
            onClick={() => {
              setSelectedSwaraId(label.swara);
              void playSrutiPreview(label.defaultCents);
            }}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={label.x}
              cy={label.y}
              r={16}
              fill="transparent"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={label.fill}
              fontSize={label.fontSize}
              fontWeight={label.fontWeight}
            >
              {label.text}
            </text>
          </g>
        ))}
        
        <text
          x={circleCenter}
          y={circleCenter - 8}
          textAnchor="middle"
          fill={circleSwaraColor}
          fontSize="36"
          fontWeight="700"
        >
          {circleCenterSwaraText}
        </text>

        <text
          x={circleCenter}
          y={circleCenter + 24}
          textAnchor="middle"
          fill="rgba(255,255,255,0.88)"
          fontSize="15"
        >
          {circleStatusText}
        </text>
      </svg>
    </div>
  );

const octaveCircleSvg = (
  <div className="circle-container">
    <svg
      viewBox={`0 0 ${circleSize} ${circleSize}`}
      role="img"
      aria-label="Octave circle"
      className="circle-svg"
    >
      <circle
        cx={circleCenter}
        cy={circleCenter}
        r={circleRadius}
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={circleStrokeWidth}
      />

      {octaveToleranceSegments.map((segment) => (
        <path
          key={`octave-tolerance-${segment.key}`}
          d={describeArcPath(
            circleCenter,
            circleCenter,
            circleRadius,
            segment.start,
            segment.end
          )}
          fill="none"
          stroke="#d6c64b"
          strokeWidth={circleStrokeWidth}
          strokeLinecap="butt"
          opacity={0.95}
        />
      ))}

      {mode === "micro" &&
        octaveFifthLines.map((line) => (
          <line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth ?? 1.5}
            strokeLinecap="round"
          />
        ))}

      {octaveViewTicks.map((tick) => (
        <line
          key={tick.key}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke="#000"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}

      {circleNeedleEnd && (
        <>
          <line
            x1={circleCenter}
            y1={circleCenter}
            x2={circleNeedleEnd.x}
            y2={circleNeedleEnd.y}
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={circleCenter} cy={circleCenter} r={6} fill="white" />
        </>
      )}

      {octaveViewLabels.map((label) => (
        <g
          key={label.key}
          onClick={() => {
            const matchedNote = octaveNotes.find((n) => n.cents === label.cents);
            if (!matchedNote) return;
            setSelectedOctaveNoteKey(matchedNote.key);
            void playSrutiPreview(label.cents, -1);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle
            cx={label.x}
            cy={label.y}
            r={16}
            fill="transparent"
          />
          <text
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#4A7FD1"
            fontSize={12}
            fontWeight={400}
          >
            {label.label}
          </text>
        </g>
      ))}

      {octaveViewAliasLabels.map((label) => (
          <g
            key={label.key}
            onClick={() => {
              const matchedNote = octaveNotes.find((n) => n.cents === label.cents);
              if (!matchedNote) return;
              setSelectedOctaveNoteKey(matchedNote.key);
              void playSrutiPreview(label.cents, -1);
            }}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={label.x}
              cy={label.y}
              r={14}
              fill="transparent"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#4A7FD1"
              fontSize={12}
              fontWeight={400}
            >
              {label.alias}
            </text>
          </g>
        ))}

        <text
          x={circleCenter}
          y={circleCenter - 8}
          textAnchor="middle"
          fill={circleSwaraColor}
          fontSize="36"
          fontWeight="700"
        >
          {circleCenterOctaveText}
        </text>

        <text
          x={circleCenter}
          y={circleCenter + 24}
          textAnchor="middle"
          fill="rgba(255,255,255,0.88)"
          fontSize="15"
        >
          {circleStatusText}
        </text>

        <circle
          cx={circleCenter}
          cy={circleCenter}
          r={circleRadius + 58}
          fill="none"
          stroke="transparent"
          strokeWidth={34}
          pointerEvents="stroke"
          onClick={handleOctaveRingPointer}
        />
      </svg>
    </div>
  );

  return (
    <main id="tuner" className="app">
      <h2>{modeUi.appTitle}</h2>

      <section className="panel tuner-panel">
        <div className="tuner-toolbar">
          <div className="mic-toolbar-group">
            <button
              type="button"
              onClick={handleMicButtonClick}
              disabled={
                micStatus === "Requesting microphone..." ||
                micStatus === "Listening..." ||
                micStatus === "Microphone ready"
              }
              className={`mic-toggle-button ${micButtonClass}`}
            >
              {getMicButtonLabel()}
            </button>

            <a href="#mic-panel" className="panel-link">
              Mic settings
            </a>
          </div>
            <div className="view-toggle">
              <button
                type="button"
                onClick={() => setTunerViewMode("meter")}
                className={tunerViewMode === "meter" ? "active" : ""}
              >
                Meter view
              </button>

              <button
                type="button"
                onClick={() => setTunerViewMode("octave")}
                className={tunerViewMode === "octave" ? "active" : ""}
              >
                {mode === "swara" ? "Sthāyi view" : "Octave view"}
              </button>
            </div>

          {modeUi.showRagaRef && (
            <div className="raga-toolbar">
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {currentRagaName}
              </div>

              <a href="#music-panel" className="panel-link">
                {tradition === "hindustani" ? "Change Rāg" : "Change Ragam"}
              </a>
            </div>
          )}
        </div>

        {tunerViewMode === "meter" ? (
          <>

            <div className={`current-swara ${swaraColorClass}`}>
              {isCalibrating
                ? mode === "micro"
                  ? "Listening..."
                  : `Calibrating ${getSwaraLabel("Sa", tradition)}...`
                : mode === "micro"
                  ? displayedOctaveNote?.label ?? "--"
                  : result?.displayedSwara
                    ? getSwaraLabel(result.displayedSwara, tradition)
                    : "--"}
            </div>

            <div className="current-cents">
              {isCalibrating
                ? ""
                : mode === "micro"
                  ? octaveDeviationCents === null
                    ? "--"
                    : `${octaveDeviationCents >= 0 ? "+" : ""}${Math.round(octaveDeviationCents)} cents`
                  : result?.deviationCents === null || result?.deviationCents === undefined
                    ? "--"
                    : `${result.deviationCents >= 0 ? "+" : ""}${Math.round(result.deviationCents)} cents`}
            </div>

            <div className="meter">
              {!isCalibrating && result && (
                <>
                  <div
                    className="meter-outer-band"
                    style={{
                      left: `${outerLeftPercent}%`,
                      width: `${outerWidthPercent}%`,
                    }}
                  />
                  <div
                    className="meter-central-band"
                    style={{
                      left: `${centralLeftPercent}%`,
                      width: `${centralWidthPercent}%`,
                    }}
                  />
                  <div className="meter-band-mark" style={{ left: `${outerLeftPercent}%` }} />
                  <div className="meter-band-mark" style={{ left: `${outerRightPercent}%` }} />
                  <div className="meter-band-mark central" style={{ left: `${centralLeftPercent}%` }} />
                  <div className="meter-band-mark central" style={{ left: `${centralRightPercent}%` }} />
                </>
              )}

              <div className="meter-center-line" />
              <div className="meter-needle" style={{ left: `${needleLeftPercent}%` }} />
              <div className="meter-label meter-left">-50</div>
              <div className="meter-label meter-center">0</div>
              <div className="meter-label meter-right">+50</div>
            </div>

            <div className="led-row">
              <div className="led-text">{circleStatusText}</div>
            </div>
          </>
        ) : mode === "swara" ? (
          swaraCircleSvg
        ) : (
          octaveCircleSvg
        )}

        {tunerViewMode === "octave" && (
          <div
            className="hint"
            style={{
              marginTop: mode === "swara" ? "32px" : "52px",
              textAlign: "center",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            {mode === "swara"
              ? "Tap a swara or sruti to hear it"
              : "Tap a note to hear it"}
          </div>
        )}

        {(octaveLegendText || swaraLegendText) && (
          <text
            x={24}
            y={circleSize - 34}
            textAnchor="start"
            fill="rgba(255,255,255,0.75)"
            style={{ fontSize: 16, fontWeight: 400 }}
          >
            <tspan x={24} dy="0">
              {mode === "swara"
                ? swaraLegendText
                : `Symbols + and - indicate ${octaveLegendText}`}
            </tspan>
          </text>
        )}

       <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
            gap: "16px",
          }}
        >
          {modeUi.showDroneControls && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <button
                type="button"
                className="panel-link"
                onClick={openDroneSettings}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                Drone settings
              </button>

              <button
                onClick={() => setDroneEnabled(prev => !prev)}
                style={{
                  fontSize: "1.2rem",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: droneEnabled ? "#444" : "#222",
                  color: "white",
                  border: "1px solid #666"
                }}
              >
                {droneEnabled ? "Drone ⏹" : "Drone ▶"}
              </button>
            </div>
          )}

          <div
            style={{
              textAlign: "right",
              minHeight: "2.6em",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              color: "rgba(255,255,255,0.88)",
              fontSize: "0.95rem",
            }}
          >
          {tunerViewMode === "sruti" && displayedSrutiLabel && (
            <>
              <div style={{ fontWeight: 600 }}>
                {displayedSrutiLabel}
              </div>
              {displayedSrutiNumber !== null && (
                <div style={{ fontSize: "0.8rem", color: "#aaa" }}>
                  Sruti {displayedSrutiNumber}
                </div>
              )}
            </>
          )}

          {tunerViewMode === "swara" && displayedSwaraLabel && (
            <div style={{ fontWeight: 600 }}>
              {displayedSwaraLabel}
            </div>
          )}

          {tunerViewMode === "octave" && displayedOctaveLabel && (
            <>
              <div style={{ fontWeight: 600 }}>
                {displayedOctaveLabel}
              </div>
              {displayedOctaveCents !== null && (
                <div style={{ fontSize: "0.8rem", color: "#aaa" }}>
                  {displayedOctaveCents.toFixed(2)} cents
                </div>
              )}
            </>
          )}

          </div>
        </div>

        <div className="tuner-controls">
            <div className={`tuner-control-card ${mode === "micro" ? "micro-reference-card" : ""}`}>
              {modeUi.showTemperamentSelector && (
                <div className={`control-group ${mode === "micro" ? "micro-temperament-group" : ""}`}>
                  <select
                    id="temperament-select"
                    className="select-input"
                    value={selectedTemperament}
                    onChange={(e) =>
                      setSelectedTemperament(e.target.value as TemperamentId)
                    }
                  >
                    {TEMPERAMENT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={`sa-readout-row ${mode === "micro" ? "micro-sa-readout-row" : ""}`}>
                <div className={`readout ${isSaCalibrated ? "calibrated" : ""}`}>
                  {displayedReferenceText}
                </div>

                <div className="sa-nudge-controls">
                  <button
                    type="button"
                    className="sa-nudge-button"
                    onClick={nudgeSaUp}
                    aria-label="Increase by 10 cents"
                    title="Increase 10 by cents"
                  >
                    ▲
                  </button>

                  <button
                    type="button"
                    className="sa-nudge-button"
                    onClick={nudgeSaDown}
                    aria-label="Decrease by 10 cents"
                    title="Decrease by 10 cents"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {modeUi.showSaSingButton && (
                <button
                  type="button"
                  className="primary-action"
                  onMouseDown={startSaCalibration}
                  onMouseUp={stopSaCalibration}
                  onMouseLeave={() => {
                    if (isCalibrating) stopSaCalibration();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    void startSaCalibration();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopSaCalibration();
                  }}
                >
                  Hold and sing your Sa
                </button>
              )}

              {modeUi.showSaSingButton && (
                <div className="hint">
                  {isCalibrating
                    ? "Keep holding the button and sing steadily."
                    : "Press and hold to calibrate Sa from your voice."}
                </div>
              )}
            </div>
          <div className="tuner-control-card">
            <div className="subsection-label">Tolerance</div>

            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={toleranceCents}
              onChange={(e) => setToleranceCents(Number(e.target.value))}
            />

            <div className="readout">±{toleranceCents} cents</div>
              <div className="hint current-pitch">
                {currentPitchText}
              </div>
          </div>
        </div>
      </section>

      <div className="top-controls-grid">
        {modeUi.showRagaPanel && (
          <section id="music-panel" className="panel music-panel">
            <div className="subsection-label">Tradition</div>

            <div className="tradition-toggle" role="radiogroup" aria-label="Tradition">
              <button
                type="button"
                className={tradition === "hindustani" ? "active" : ""}
                onClick={() => setTradition("hindustani")}
              >
                Hindustani
              </button>

              <button
                type="button"
                className={tradition === "carnatic" ? "active" : ""}
                onClick={() => setTradition("carnatic")}
              >
                Carnatic
              </button>
            </div>

            <div className="panel-spacer" />

            <div className="raga-header-row">
              <div className="subsection-label">
                {tradition === "hindustani" ? "Rāg" : "Ragam"}
              </div>

              <div className="hint raga-found-count">
                {availableRagas.length}{" "}
                {tradition === "hindustani"
                  ? availableRagas.length === 1
                    ? "rāg found"
                    : "rāgs found"
                  : availableRagas.length === 1
                    ? "ragam found"
                    : "ragams found"}
              </div>
            </div>

            <div className="raga-select-row">
              <input
                type="text"
                placeholder={tradition === "hindustani" ? "Search rāg..." : "Search ragam..."}
                value={ragaSearch}
                onChange={(e) => setRagaSearch(e.target.value)}
              />

              {availableRagas.length > 0 ? (
                <select
                  value={selectedRagaId}
                  onChange={(e) => setSelectedRagaId(e.target.value)}
                >
                  <option value="">— none —</option>
                  {availableRagas.map((raga) => (
                    <option key={raga.id} value={raga.id}>
                      {raga.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="hint raga-no-matches">No matches found</div>
              )}
            </div>

            <div className="panel-spacer" />

            <h2>{tradition === "hindustani" ? "Arohana" : "Aroganam"}</h2>
            <div className="scale-grid">
              <ChoiceCycleButton title="Sa" value={"Sa"} options={["Sa"]} tradition={tradition} isFixed />
              <ChoiceCycleButton title="Ri" value={arohanaChoices.ri} options={visibleRiOptions} tradition={tradition} onChange={(newValue) => setArohanaChoices((prev) => ({ ...prev, ri: newValue }))} />
              <ChoiceCycleButton title="Ga" value={arohanaChoices.ga} options={visibleGaOptions} tradition={tradition} onChange={(newValue) => setArohanaChoices((prev) => ({ ...prev, ga: newValue }))} />
              <ChoiceCycleButton title="Ma" value={arohanaChoices.ma} options={visibleMaOptions} tradition={tradition} onChange={(newValue) => setArohanaChoices((prev) => ({ ...prev, ma: newValue }))} />
              <ChoiceCycleButton title="Pa" value={arohanaChoices.pa} options={visiblePaOptions} tradition={tradition} onChange={(newValue) => setArohanaChoices((prev) => ({ ...prev, pa: newValue }))} />
              <ChoiceCycleButton title="Dha" value={arohanaChoices.dha} options={visibleDhaOptions} tradition={tradition} onChange={(newValue) => setArohanaChoices((prev) => ({ ...prev, dha: newValue }))} />
              <ChoiceCycleButton title="Ni" value={arohanaChoices.ni} options={visibleNiOptions} tradition={tradition} onChange={(newValue) => setArohanaChoices((prev) => ({ ...prev, ni: newValue }))} />
            </div>

            <h2 className="section-title-spaced">
              {tradition === "hindustani" ? "Avarohana" : "Avaroganam"}
            </h2>
            <div className="scale-grid">
              <ChoiceCycleButton title="Ni" value={avarohanaChoices.ni} options={visibleNiOptions} tradition={tradition} onChange={(newValue) => setAvarohanaChoices((prev) => ({ ...prev, ni: newValue }))} />
              <ChoiceCycleButton title="Dha" value={avarohanaChoices.dha} options={visibleDhaOptions} tradition={tradition} onChange={(newValue) => setAvarohanaChoices((prev) => ({ ...prev, dha: newValue }))} />
              <ChoiceCycleButton title="Pa" value={avarohanaChoices.pa} options={visiblePaOptions} tradition={tradition} onChange={(newValue) => setAvarohanaChoices((prev) => ({ ...prev, pa: newValue }))} />
              <ChoiceCycleButton title="Ma" value={avarohanaChoices.ma} options={visibleMaOptions} tradition={tradition} onChange={(newValue) => setAvarohanaChoices((prev) => ({ ...prev, ma: newValue }))} />
              <ChoiceCycleButton title="Ga" value={avarohanaChoices.ga} options={visibleGaOptions} tradition={tradition} onChange={(newValue) => setAvarohanaChoices((prev) => ({ ...prev, ga: newValue }))} />
              <ChoiceCycleButton title="Ri" value={avarohanaChoices.ri} options={visibleRiOptions} tradition={tradition} onChange={(newValue) => setAvarohanaChoices((prev) => ({ ...prev, ri: newValue }))} />
              <ChoiceCycleButton title="Sa" value={"Sa"} options={["Sa"]} tradition={tradition} isFixed />
            </div>
          </section>
        )}

        <section id="mic-panel" className="panel mic-panel">
          <h2>Microphone input</h2>

          <div className="subsection-label">Gain</div>
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={inputGain}
            onChange={(e) => setInputGain(Number(e.target.value))}
          />
          <div className="readout">Gain ×{inputGain.toFixed(1)}</div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={useCompression}
              onChange={(e) => setUseCompression(e.target.checked)}
            />
            Compression
          </label>

          <div className="panel-spacer" />

          <div className="subsection-label">Input level</div>
          <div className="level-meter">
            <div
              className="level-meter__fill"
              style={{
                width: `${levelNormalized * 100}%`,
                background:
                  levelNormalized < 0.3
                    ? "#ff453a"
                    : levelNormalized < 0.7
                      ? "#ffd60a"
                      : "#32d74b",
              }}
            />
          </div>
          <div className="hint">RMS: {inputLevel.toFixed(4)}</div>
        </section>

        {showDroneSettings && modeUi.showDroneSettings && (
        <section
          id="drone-panel"
          className="panel drone-panel"
          style={{
            padding: "10px",
            width: "180px",
            alignSelf: "end",
            marginTop: "12px",
          }}
        >
          <div className="subsection-label">Pattern</div>
          <select
            value={dronePattern}
            onChange={(e) => setDronePattern(e.target.value as "sa_pa" | "sa_ma" | "sa_ni")}
            style={{ width: "100%", marginBottom: "14px" }}
          >
            <option value="sa_pa">Sa + Pa</option>
            <option value="sa_ma">Sa + Ma</option>
            <option value="sa_ni">Sa + Ni</option>
          </select>

          <div className="subsection-label">Volume</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={droneVolume}
            onChange={(e) => setDroneVolume(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
          <div className="subsection-label" style={{ marginTop: "12px" }}>Speed</div>
          <input
            type="range"
            min={40}
            max={100}
            step={1}
            value={droneBpm}
            onChange={(e) => setDroneBpm(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div className="readout">{droneBpm} BPM</div>
        </section>
      )}
      </div>
    </main>
  );
}
