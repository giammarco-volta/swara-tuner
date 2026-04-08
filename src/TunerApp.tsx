import { useEffect, useMemo, useRef, useState } from "react";

import "./App.css";

import { analyzeDetectedPitch, type RagaConfig } from "./music/swaraMapper";
import { getUniqueHindustaniSwarasFromText } from "./music/swaraMapper";

import { type SwaraId, SWARA_CENTRAL_RANGES, getSwaraCentralCenter } from "./music/swaras";

import { hindustaniRagas } from "./music/ragas";
import carnaticRagamsJson from "./data/carnatic_ragas.json";

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

const RI_OPTIONS: RiChoice[] = ["", "Ri1", "Ri2", "Ri3"];
const GA_OPTIONS: GaChoice[] = ["", "Ga1", "Ga2", "Ga3"];
const MA_OPTIONS: MaChoice[] = ["", "Ma1", "Ma2"];
const PA_OPTIONS: PaChoice[] = ["", "Pa"];
const DHA_OPTIONS: DhaChoice[] = ["", "Dha1", "Dha2", "Dha3"];
const NI_OPTIONS: NiChoice[] = ["", "Ni1", "Ni2", "Ni3"];

type Tradition = "hindustani" | "carnatic";

interface RagaPreset {
  id: string;
  name: string;
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
      Sa: "sa",
      Ri1: "r1",
      Ri2: "r2",
      Ri3: "r3",
      Ga1: "g1",
      Ga2: "g2",
      Ga3: "g3",
      Ma1: "m1",
      Ma2: "m2",
      Pa: "pa",
      Dha1: "d1",
      Dha2: "d2",
      Dha3: "d3",
      Ni1: "n1",
      Ni2: "n2",
      Ni3: "n3",
    };

    return carnaticMap[swara] ?? swara;
  }

  const hindustaniMap: Record<string, string> = {
    Sa: "S",
    Ri1: "r",
    Ri2: "R",
    Ri3: "",
    Ga1: "",
    Ga2: "g",
    Ga3: "G",
    Ma1: "M",
    Ma2: "M'",
    Pa: "P",
    Dha1: "d",
    Dha2: "D",
    Dha3: "",
    Ni1: "",
    Ni2: "n",
    Ni3: "N",
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
    sa: "Sa",
    r1: "Ri1",
    r2: "Ri2",
    r3: "Ri3",
    g1: "Ga1",
    g2: "Ga2",
    g3: "Ga3",
    m1: "Ma1",
    m2: "Ma2",
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
    if (Array.isArray(item.swaras) && item.swaras.length > 0) {
      arohanaParsed =
        typeof arohanaText === "string" && arohanaText.trim()
          ? getUniqueHindustaniSwarasFromText(String(arohanaText))
          : (item.swaras as SwaraId[]);

      avarohanaParsed =
        typeof avarohanaText === "string" && avarohanaText.trim()
          ? getUniqueHindustaniSwarasFromText(String(avarohanaText))
          : (item.swaras as SwaraId[]);
    } else {
      arohanaParsed = getUniqueHindustaniSwarasFromText(String(arohanaText));
      avarohanaParsed = getUniqueHindustaniSwarasFromText(String(avarohanaText));
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
type TunerViewMode = "meter" | "circle";

export default function TunerApp() {
  const [saHz, setSaHz] = useState(midiToFrequency(61)); // C#4
  const [toleranceCents, setToleranceCents] = useState(20);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [micStatus, setMicStatus] = useState("Idle");

  const [isSaCalibrated, setIsSaCalibrated] = useState(false);
  const [smoothedDetectedPitch, setSmoothedDetectedPitch] = useState<number | null>(null);

  const [tradition, setTradition] = useState<Tradition>("hindustani");
  const [selectedRagaId, setSelectedRagaId] = useState("");
  const [ragaSearch, setRagaSearch] = useState("");

  const [pitchDetectorMode] = useState<PitchDetectorMode>("mpm");
  const [tunerViewMode, setTunerViewMode] = useState<TunerViewMode>("circle");

  const [inputGain, setInputGain] = useState(2.5);
  const [useCompression, setUseCompression] = useState(true);

  const [inputLevel, setInputLevel] = useState(0);

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

  useEffect(() => {
    if (availableRagas.length > 0 && !selectedRagaId) {
      setSelectedRagaId(availableRagas[0].id);
    }
  }, [availableRagas, selectedRagaId]);

  const selectedRaga = useMemo(
    () => ALL_RAGAS.find((raga) => raga.id === selectedRagaId) ?? null,
    [selectedRagaId]
  );

  const currentRagaName = selectedRaga?.name ?? "";

  useEffect(() => {
    if (!selectedRagaId) return;

    const selected = ALL_RAGAS.find((raga) => raga.id === selectedRagaId);
    if (!selected) return;

    setArohanaChoices(selected.arohana);
    setAvarohanaChoices(selected.avarohana);
  }, [selectedRagaId]);

  useEffect(() => {
    if (ragaSearch.trim() !== "") return;
    if (availableRagas.length > 0 && !selectedRagaId) {
      setSelectedRagaId(availableRagas[0].id);
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

  const swaraColorClass =
    isCalibrating || !result
      ? ""
      : result.allowed === false
        ? "swara-out"
        : result.tuningZone === "perfect"
          ? "swara-perfect"
          : result.tuningZone === "tolerated"
            ? "swara-tolerated"
            : "swara-out";

  const circleSwaraColor =
    isCalibrating || !result
      ? "white"
      : result.allowed === false
        ? "#ff453a"
        : result.tuningZone === "perfect"
          ? "#32d74b"
          : result.tuningZone === "tolerated"
            ? "#ffd60a"
            : "#ff453a";

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

  function frequencyToMidiFloat(frequencyHz: number): number {
    return 69 + 12 * Math.log2(frequencyHz / 440);
  }

  function formatWesternNoteWithCents(frequencyHz: number): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const midiFloat = frequencyToMidiFloat(frequencyHz);
    const midiRounded = Math.round(midiFloat);

    const pitchClass = ((midiRounded % 12) + 12) % 12;
    const cents = Math.round((midiFloat - midiRounded) * 100);

    const note = noteNames[pitchClass];

    if (Math.abs(cents) <= 1) {
      return note;
    }

    const sign = cents >= 0 ? "+" : "";
    return `${note} ${sign}${cents} cents`;
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
    if (micStatus !== "Microphone ready" && micStatus !== "Listening...") return "Microphone not enabled";
    if (isCalibrating) return `Calibrating ${getSwaraLabel("Sa", tradition)}`;
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

  const allowedSwaraIds = useMemo(() => getAllowedSwaraIds(), [config]);

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

  interface CircleSlot {
    key: string;
    cents: number;
    aliases: SwaraId[];
  }

  const CIRCLE_SLOTS: CircleSlot[] = [
    { key: "Sa", cents: 0, aliases: ["Sa"] },
    { key: "Ri1", cents: 112, aliases: ["Ri1"] },
    { key: "Ri2Ga1", cents: 204, aliases: ["Ri2", "Ga1"] },
    { key: "Ri3Ga2", cents: 294, aliases: ["Ri3", "Ga2"] },
    { key: "Ga3", cents: 386, aliases: ["Ga3"] },
    { key: "Ma1", cents: 498, aliases: ["Ma1"] },
    { key: "Ma2", cents: 590, aliases: ["Ma2"] },
    { key: "Pa", cents: 702, aliases: ["Pa"] },
    { key: "Dha1", cents: 792, aliases: ["Dha1"] },
    { key: "Dha2Ni1", cents: 884, aliases: ["Dha2", "Ni1"] },
    { key: "Dha3Ni2", cents: 996, aliases: ["Dha3", "Ni2"] },
    { key: "Ni3", cents: 1110, aliases: ["Ni3"] },
  ];

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

  const circleSwaraLabels = useMemo(() => {
    return CIRCLE_SLOTS
      .filter((slot) => getFirstVisibleSlotSwara(slot, tradition) !== null)
      .map((slot) => {
        const displaySwara = getSlotDisplaySwara(slot, tradition);
        if (!displaySwara) return null;

        const membership = getSwaraMembership(displaySwara);

        const angle = centsToCircleAngle(slot.cents);
        const labelPos = polarToCartesian(
          circleCenter,
          circleCenter,
          circleRadius + 26,
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
          x: labelPos.x,
          y: labelPos.y,
          text,
          fill,
          fontWeight,
          fontSize,
          centerCents: slot.cents,
        };
      })
      .filter((label): label is NonNullable<typeof label> => label !== null);
  }, [tradition, selectedRaga, config]);

  const circlePitchTicks = useMemo(() => {
    return circleSwaraLabels.map((label) => {
      const angle = centsToCircleAngle(label.centerCents);

      const inner = polarToCartesian(circleCenter, circleCenter, circleRadius - circleStrokeWidth / 2, angle);
      const outer = polarToCartesian(circleCenter, circleCenter, circleRadius + circleStrokeWidth / 2, angle);

      return {
        key: `tick-${label.key}`,
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
      };
    });
  }, [circleSwaraLabels]);

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

  return (
    <main id="tuner" className="app">
      <h2>Swara Tuner</h2>

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
              Meter
            </button>
            <button
              type="button"
              onClick={() => setTunerViewMode("circle")}
              className={tunerViewMode === "circle" ? "active" : ""}
            >
              Circle
            </button>
          </div>

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
        </div>

        {tunerViewMode === "meter" ? (
          <>
            <div className={`current-swara ${swaraColorClass}`}>
              {isCalibrating
                ? `Calibrating ${getSwaraLabel("Sa", tradition)}...`
                : result?.displayedSwara
                  ? getSwaraLabel(result.displayedSwara, tradition)
                  : "--"}
            </div>
            <div className="current-cents">
              {isCalibrating
                ? ""
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
              <div className="led-text">
                {micStatus !== "Microphone ready" && micStatus !== "Listening..."
                  ? "Enable the microphone to start tuning"
                  : isCalibrating
                    ? "Calibrating Sa"
                    : result?.allowed === null || result?.allowed === undefined
                      ? "No note detected"
                      : result.allowed === false
                        ? "Not allowed"
                        : result.tuningZone === "perfect"
                          ? "Perfectly in tune"
                          : result.tuningZone === "tolerated"
                            ? "Tolerated"
                            : "Out of tune"}
              </div>
            </div>
            <div className="debug">
              <div>
                Cents from Sa: {isCalibrating || !result || result.centsFromSa === null ? "--" : Math.round(result.centsFromSa)}
              </div>
            </div>
          </>
        ) : (
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
                <text
                  key={label.key}
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
        )}

        <div className="tuner-controls">
          <div className="tuner-control-card">
            <div className={`readout ${isSaCalibrated ? "calibrated" : ""}`}>
              Sa = {saHz.toFixed(2)} Hz ({formatWesternNoteWithCents(saHz)})
            </div>

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

            <div className="hint">
              {isCalibrating
                ? "Keep holding the button and sing steadily."
                : "Press and hold to calibrate Sa from your voice."}
            </div>
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
            <div className="hint">
              Current pitch: {smoothedDetectedPitch ? `${smoothedDetectedPitch.toFixed(2)} Hz` : "--"}
            </div>
          </div>
        </div>
      </section>

      <div className="top-controls-grid">
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

          <div className="subsection-label">
            {tradition === "hindustani" ? "Rāg" : "Ragam"}
          </div>

          <input
            type="text"
            placeholder={tradition === "hindustani" ? "Search rāg..." : "Search ragam..."}
            value={ragaSearch}
            onChange={(e) => setRagaSearch(e.target.value)}
          />

          <div className="hint">
            {availableRagas.length}{" "}
            {tradition === "hindustani"
              ? availableRagas.length === 1
                ? "rāg found"
                : "rāgs found"
              : availableRagas.length === 1
                ? "ragam found"
                : "ragams found"}
          </div>

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
            <div className="hint">No matches found</div>
          )}

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
      </div>
    </main>
  );
}
