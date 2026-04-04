import { useEffect, useMemo, useRef, useState } from "react";

import "./App.css";

import { analyzeDetectedPitch, type RagaConfig } from "./music/swaraMapper";

import { type SwaraId, SWARA_CENTRAL_RANGES, getSwaraCentralCenter } from "./music/swaras";

import hindustaniRagasJson from "./data/hindustani_ragas.json";
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

interface RagaPreset  {
  id: string;
  name: string;
  tradition: Tradition;
  arohana: OrderedScaleChoices;
  avarohana: OrderedScaleChoices;
}

  function midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function ChoiceSelect<T extends string>({
    value,
    options,
    onChange,
    tradition,
  }: {
    value: T;
    options: T[];
    onChange: (value: T) => void;
    tradition: Tradition;
  }) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option || "none"} value={option}>
            {option === "" ? "— none —" : getSwaraLabel(option, tradition)}
          </option>
        ))}
      </select>
    );
  }

  function getVisibleOptions<T extends string>(options: T[], tradition: Tradition): T[] {
    return options.filter((option) => {
      if (option === "") return true;
      const label = getSwaraLabel(option, tradition);
      return label !== "";
    });
  }

  function getSwaraLabel(swara: string, tradition: Tradition): string {
  if (!swara) return "— none —";

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
    Ma2: "m",
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

  const arohanaRaw = extractStringArray(
    item.arohana ?? item.aroha ?? item.aroganam ?? item.arohanam
  );

  const avarohanaRaw = extractStringArray(
    item.avarohana ?? item.avaroha ?? item.avaroganam ?? item.avarohanam
  );

  const arohanaParsed = arohanaRaw
    .map((token) => parseSwaraToken(token, tradition))
    .filter((x): x is SwaraId => x !== null);

  const avarohanaParsed = avarohanaRaw
    .map((token) => parseSwaraToken(token, tradition))
    .filter((x): x is SwaraId => x !== null);

  return {
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
  ...loadRagasFromJson(hindustaniRagasJson, "hindustani"),
  ...loadRagasFromJson(carnaticRagamsJson, "carnatic"),
];

type PitchDetectorMode = "autocorrelation" | "mpm";
type TunerViewMode = "meter" | "circle";

function App() {
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
  const [tunerViewMode, setTunerViewMode] = useState<TunerViewMode>("meter");

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
    }, [availableRagas]);

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

  const config: RagaConfig = useMemo(
    () => ({
      arohana: buildArohana(arohanaChoices),
      avarohana: buildAvarohana(avarohanaChoices),
    }),
    [arohanaChoices, avarohanaChoices]
  );

  const tunerFrequencyHz = smoothedDetectedPitch;

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

  console.log(
    "Loaded ragas:",
    ALL_RAGAS.length,
    ALL_RAGAS.filter((r) => r.tradition === "hindustani").length,
    ALL_RAGAS.filter((r) => r.tradition === "carnatic").length
  );

  async function startSaCalibration() {
    setMicStatus("Requesting microphone...");
    const ok = await ensureMicrophoneReady();
    if (!ok) {
      setIsCalibrating(false);
      isCalibratingRef.current = false;
      return;
    }

    //smoothedCentsRef.current = null;
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

      if (!analyserRef.current && audioContextRef.current && sourceNodeRef.current) {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = 0.85;

        sourceNodeRef.current.connect(analyser);

        analyserRef.current = analyser;
        timeDomainDataRef.current = new Float32Array(analyser.fftSize);
      }

      setMicStatus("Microphone ready");
      return true;
    } catch (err) {
      console.error(err);
      setMicStatus("Microphone access denied or unavailable");
      return false;
    }
  }

  function startAudioMonitoring() {
    function update() {
      const analyser = analyserRef.current;
      const data = timeDomainDataRef.current;
      const audioContext = audioContextRef.current;

      if (analyser && data && audioContext) {
        analyser.getFloatTimeDomainData(data as Float32Array<ArrayBuffer>);

        const rms = computeRms(data);

        const estimatedPitch =
          pitchDetectorMode === "mpm"
            ? estimatePitchMpm(data, audioContext.sampleRate)
            : estimatePitchAutocorrelation(data, audioContext.sampleRate);
        const smoothedPitch = smoothPitchMusically(estimatedPitch, saHz);
        setSmoothedDetectedPitch(smoothedPitch);

        if (isCalibratingRef.current && smoothedPitch !== null && rms >= 0.03) {
          calibrationPitchesRef.current.push(smoothedPitch);
        }
      }

      animationFrameRef.current = requestAnimationFrame(update);
    }

    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(update);
    }
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

    // Rimuove l'offset DC
    let mean = 0;
    for (let i = 0; i < size; i++) {
      mean += buffer[i];
    }
    mean /= size;

    const centered = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      centered[i] = buffer[i] - mean;
    }

    // Range frequenze voce che ci interessa
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

      const corr = sum / denom; // correlazione normalizzata [-1..1]

      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    // soglia minima di affidabilità
    if (bestLag < 0 || bestCorr < 0.65) {
      return null;
    }

    // raffinamento parabolico attorno al massimo
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

    // rimozione offset DC
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

    // NSDF = 2 * acf / (energy1 + energy2)
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

    // cerchiamo il miglior picco positivo locale
    let bestLag = -1;
    let bestValue = -1;

    for (let tau = minLag + 1; tau < maxLag - 1; tau++) {
      const prev = nsdf[tau - 1];
      const curr = nsdf[tau];
      const next = nsdf[tau + 1];

      const isLocalPeak = curr > prev && curr >= next;
      if (!isLocalPeak) continue;

      // soglia minima di affidabilità
      if (curr < 0.75) continue;

      if (curr > bestValue) {
        bestValue = curr;
        bestLag = tau;
      }
    }

    if (bestLag < 0) {
      return null;
    }

    // raffinamento parabolico
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

    // caso normale: piccoli spostamenti
    if (absDelta <= 35) {
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;

      const alpha = 0.14;
      const smoothedCents = previousCents + alpha * delta;
      smoothedCentsRef.current = smoothedCents;
      return saHz * Math.pow(2, smoothedCents / 1200);
    }

    // caso salto ampio: lo accettiamo solo se persiste in modo coerente
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

    // se il salto grande si ripete per abbastanza frame, aggancia rapidamente
    if (largeJumpCountRef.current >= 2) {
      const alpha = 0.38;
      const smoothedCents = previousCents + alpha * delta;
      smoothedCentsRef.current = smoothedCents;

      // una volta agganciato, resettiamo il candidato
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;

      return saHz * Math.pow(2, smoothedCents / 1200);
    }

    // finché non siamo convinti, manteniamo il valore precedente
    return saHz * Math.pow(2, previousCents / 1200);
  }


  function normalizeCentsToOctave(cents: number): number {
    let wrapped = cents % 1200;
    if (wrapped < 0) wrapped += 1200;
    return wrapped;
  }

  function centsToCircleAngle(cents: number): number {
    return normalizeCentsToOctave(cents) / 1200 * Math.PI * 2 - Math.PI / 2;
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

  function getCircleStatusText(): string {
    if (isCalibrating) return `Calibrating ${getSwaraLabel("Sa", tradition)}`;
    if (result?.allowed === null || result?.allowed === undefined) return "No note detected";
    if (result.allowed === false) return "Not allowed";
    if (result.tuningZone === "perfect") return "Perfectly in tune";
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

  const circleSwaraLabels = useMemo(() => {
    return allowedSwaraIds.map((swara) => {
      const centerCents = normalizeCentsToOctave(getSwaraCentralCenter(swara));
      const angle = centsToCircleAngle(centerCents);

      const labelPos = polarToCartesian(
        circleCenter,
        circleCenter,
        circleRadius + 26,
        angle
      );

      return {
        key: `label-${swara}`,
        x: labelPos.x,
        y: labelPos.y,
        text: getSwaraLabel(swara, tradition),
      };
    });
  }, [allowedSwaraIds, tradition]);
  
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

  return (
    <div className="app">
      <h1>Swara Tuner by NaadaLab</h1>

      <div className="grid">
        <section className="panel">
          <div style={{ marginTop: 12 }}>
            <button
              onClick={async () => {
                setMicStatus("Requesting microphone...");
                const ok = await ensureMicrophoneReady();
                if (!ok) return;

                smoothedCentsRef.current = null;
                largeJumpCandidateRef.current = null;
                largeJumpCountRef.current = 0;

                startAudioMonitoring();
                setMicStatus("Microphone ready");
              }}
            >
              Enable microphone
            </button>
          </div>

          <div className="hint" style={{ marginTop: 8 }}>
            Mic status:{" "}
            <span style={{ color: micStatus === "Microphone ready" ? "#32d74b" : "#ccc" }}>
              {micStatus}
            </span>
          </div>

          <div style={{ height: 16 }} />

          <div className={`readout ${isSaCalibrated ? "calibrated" : ""}`}>
            Sa = {saHz.toFixed(2)} Hz ({formatWesternNoteWithCents(saHz)})
          </div>

          <div>
            <button
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
          </div>

          <div className="hint" style={{ marginTop: 8 }}>
            {isCalibrating
              ? "Keep holding the button and sing steadily."
              : "Press and hold to calibrate Sa from your voice."}
          </div>

          <div style={{ height: 20 }} />

          <h2>Tolerance</h2>

          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={toleranceCents}
            onChange={(e) => setToleranceCents(Number(e.target.value))}
            style={{ width: "100%" }}
          />

          <div className="readout">±{toleranceCents} cents</div>

          <div className="hint">
            The green LED turns on only if the note is allowed and within this tolerance.
          </div>
          <div className="hint">
            Current pitch: {smoothedDetectedPitch ? `${smoothedDetectedPitch.toFixed(2)} Hz` : "--"}
          </div>
        </section>

        <section className="panel">
          <h2>{tradition === "hindustani" ? "Arohana" : "Aroganam"}</h2>
          <div className="ordered-scale">
            <div className="fixed-swara">Sa</div>

            <ChoiceSelect
              value={arohanaChoices.ri}
              options={getVisibleOptions(RI_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ri: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.ga}
              options={getVisibleOptions(GA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ga: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.ma}
              options={getVisibleOptions(MA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ma: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.pa}
              options={getVisibleOptions(PA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, pa: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.dha}
              options={getVisibleOptions(DHA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, dha: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.ni}
              options={getVisibleOptions(NI_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ni: newValue }))
              }
            />
          </div>

          <h2 style={{ marginTop: 20 }}>
            {tradition === "hindustani" ? "Avarohana" : "Avaroganam"}
          </h2>
          <div className="ordered-scale">
            <ChoiceSelect
              value={avarohanaChoices.ni}
              options={getVisibleOptions(NI_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ni: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.dha}
              options={getVisibleOptions(DHA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, dha: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.pa}
              options={getVisibleOptions(PA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, pa: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.ma}
              options={getVisibleOptions(MA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ma: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.ga}
              options={getVisibleOptions(GA_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ga: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.ri}
              options={getVisibleOptions(RI_OPTIONS, tradition)}
              tradition={tradition}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ri: newValue }))
              }
            />

            <div className="fixed-swara">{getSwaraLabel("Sa", tradition)}</div>
          </div>
        </section>

        <section className="panel">
          <div className="subsection-label">Tradition</div>

          <div className="tradition-row">
            <label>
              <input
                type="radio"
                name="tradition"
                checked={tradition === "hindustani"}
                onChange={() => setTradition("hindustani")}
              />
              Hindustani
            </label>

            <label>
              <input
                type="radio"
                name="tradition"
                checked={tradition === "carnatic"}
                onChange={() => setTradition("carnatic")}
              />
              Carnatic
            </label>
          </div>

          <div style={{ height: 16 }} />

          <div className="subsection-label">
            {tradition === "hindustani" ? "Raag" : "Ragam"}
          </div>

          <input
            type="text"
            placeholder={tradition === "hindustani" ? "Search raag..." : "Search ragam..."}
            value={ragaSearch}
            onChange={(e) => setRagaSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <div className="hint" style={{ marginTop: 6, marginBottom: 8 }}>
            {availableRagas.length}{" "}
            {tradition === "hindustani"
              ? availableRagas.length === 1
                ? "raag found"
                : "raags found"
              : availableRagas.length === 1
              ? "ragam found"
              : "ragams found"}
          </div>

          {availableRagas.length > 0 ? (
            <select
              value={selectedRagaId}
              onChange={(e) => setSelectedRagaId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">— none —</option>
              {availableRagas.map((raga) => (
                <option key={raga.id} value={raga.id}>
                  {raga.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="hint" style={{ marginTop: 8 }}>
              No matches found
            </div>
          )}
        </section>
      </div>

      <section className="panel tuner-panel">
        <div className="view-toggle">
          <button
            type="button"
            onClick={() => setTunerViewMode("meter")}
            style={{
              opacity: tunerViewMode === "meter" ? 1 : 0.7,
              fontWeight: tunerViewMode === "meter" ? 700 : 400,
            }}
          >
            Meter
          </button>
          <button
            type="button"
            onClick={() => setTunerViewMode("circle")}
            style={{
              opacity: tunerViewMode === "circle" ? 1 : 0.7,
              fontWeight: tunerViewMode === "circle" ? 700 : 400,
            }}
          >
            Circle
          </button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
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
                {isCalibrating
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
          <div
            className="circle-container"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <svg
              width={circleSize}
              height={circleSize}
              viewBox={`0 0 ${circleSize} ${circleSize}`}
              role="img"
              aria-label="Pitch circle"
              style={{ overflow: "visible" }}
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
                  strokeLinecap="round"
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
                  fill="rgba(255,255,255,0.92)"
                  fontSize="14"
                  fontWeight="600"
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
      </section>
    </div>
  );
}

export default App;