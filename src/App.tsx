import { useMemo, useRef, useState } from "react";
import "./App.css";

import { type SwaraId } from "./music/swaras";
import { analyzeDetectedPitch, type RagaConfig } from "./music/swaraMapper";

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

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

  function ChoiceSelect<T extends string>({
    value,
    options,
    onChange,
  }: {
    value: T;
    options: T[];
    onChange: (value: T) => void;
  }) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option || "none"} value={option}>
            {option === "" ? "— none —" : option}
          </option>
        ))}
      </select>
    );
  }

function App() {
  const [saHz, setSaHz] = useState(midiToFrequency(61)); // C#4
  const [toleranceCents, setToleranceCents] = useState(20);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [micStatus, setMicStatus] = useState("Idle");

  const [isSaCalibrated, setIsSaCalibrated] = useState(false);
  const [smoothedDetectedPitch, setSmoothedDetectedPitch] = useState<number | null>(null);

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

  const config: RagaConfig = useMemo(
    () => ({
      arohana: buildArohana(arohanaChoices),
      avarohana: buildAvarohana(avarohanaChoices),
    }),
    [arohanaChoices, avarohanaChoices]
  );

  const tunerFrequencyHz = smoothedDetectedPitch;

  const result = useMemo(
    () => (isCalibrating ? null : analyzeDetectedPitch(tunerFrequencyHz, saHz, config)),
    [isCalibrating, tunerFrequencyHz, saHz, config]
  );

  const meterOffset =
    isCalibrating || !result || result.deviationCents === null
      ? 0
      : Math.max(-50, Math.min(50, result.deviationCents));
  const needleLeftPercent = ((meterOffset + 50) / 100) * 100;
  const toleranceLeftPercent = ((-toleranceCents + 50) / 100) * 100;
  const toleranceRightPercent = ((toleranceCents + 50) / 100) * 100;
  const toleranceWidthPercent = toleranceRightPercent - toleranceLeftPercent;
  const inTune =
    !isCalibrating &&
    result?.deviationCents !== null &&
    result?.deviationCents !== undefined &&
    Math.abs(result.deviationCents) <= toleranceCents;

  const greenLedOn = !isCalibrating && result?.allowed === true && inTune;
  const redLedOn =
    !isCalibrating &&
    (result?.allowed === false || (result?.allowed === true && !inTune));

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

        const estimatedPitch = estimatePitchAutocorrelation(data, audioContext.sampleRate);
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
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;
      return null;
    }

    const newCents = 1200 * Math.log2(newPitch / saHz);
    const previousCents = smoothedCentsRef.current;

    if (previousCents === null) {
      smoothedCentsRef.current = newCents;
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;
      return newPitch;
    }

    let delta = newCents - previousCents;

    while (delta > 600) delta -= 1200;
    while (delta < -600) delta += 1200;

    const absDelta = Math.abs(delta);

    // caso normale: piccoli spostamenti
    if (absDelta <= 40) {
      largeJumpCandidateRef.current = null;
      largeJumpCountRef.current = 0;

      const alpha = 0.22;
      const smoothedCents = previousCents + alpha * delta;
      smoothedCentsRef.current = smoothedCents;
      return saHz * Math.pow(2, smoothedCents / 1200);
    }

    // caso salto ampio: lo accettiamo solo se persiste in modo coerente
    const candidate = largeJumpCandidateRef.current;

    if (candidate !== null) {
      let candidateDelta = newCents - candidate;
      while (candidateDelta > 600) candidateDelta -= 1200;
      while (candidateDelta < -600) candidateDelta += 1200;

      if (Math.abs(candidateDelta) <= 25) {
        largeJumpCountRef.current += 1;
      } else {
        largeJumpCandidateRef.current = newCents;
        largeJumpCountRef.current = 1;
      }
    } else {
      largeJumpCandidateRef.current = newCents;
      largeJumpCountRef.current = 1;
    }

    // se il salto grande si ripete per abbastanza frame, aggancia rapidamente
    if (largeJumpCountRef.current >= 2) {
      const alpha = 0.55;
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

  return (
    <div className="app">
      <h1>Swara Tuner by NaadaLab</h1>

      <div className="grid">
        <section className="panel">
          <h2>Sa</h2>

          {/* Enable microphone */}
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

          {/* spazio */}
          <div style={{ height: 16 }} />

          <div className={`readout ${isSaCalibrated ? "calibrated" : ""}`}>
            Sa = {saHz.toFixed(2)} Hz ({formatWesternNoteWithCents(saHz)})
          </div>

          {/* Hold and sing */}
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
        </section>

        <section className="panel">
          <h2>Arohana</h2>
          <div className="ordered-scale">
            <div className="fixed-swara">Sa</div>

            <ChoiceSelect
              value={arohanaChoices.ri}
              options={RI_OPTIONS}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ri: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.ga}
              options={GA_OPTIONS}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ga: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.ma}
              options={MA_OPTIONS}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ma: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.pa}
              options={PA_OPTIONS}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, pa: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.dha}
              options={DHA_OPTIONS}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, dha: newValue }))
              }
            />

            <ChoiceSelect
              value={arohanaChoices.ni}
              options={NI_OPTIONS}
              onChange={(newValue) =>
                setArohanaChoices((prev) => ({ ...prev, ni: newValue }))
              }
            />
          </div>

          <h2 style={{ marginTop: 20 }}>Avarohana</h2>
          <div className="ordered-scale">
            <ChoiceSelect
              value={avarohanaChoices.ni}
              options={NI_OPTIONS}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ni: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.dha}
              options={DHA_OPTIONS}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, dha: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.pa}
              options={PA_OPTIONS}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, pa: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.ma}
              options={MA_OPTIONS}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ma: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.ga}
              options={GA_OPTIONS}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ga: newValue }))
              }
            />

            <ChoiceSelect
              value={avarohanaChoices.ri}
              options={RI_OPTIONS}
              onChange={(newValue) =>
                setAvarohanaChoices((prev) => ({ ...prev, ri: newValue }))
              }
            />

            <div className="fixed-swara">Sa</div>
          </div>
        </section>

        <section className="panel">
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
      </div>

      <section className="panel tuner-panel">
        <div className="current-swara">
          {isCalibrating ? "Calibrating Sa..." : result?.displayedSwara ?? "--"}
        </div>
        <div className="current-cents">
          {isCalibrating
            ? ""
            : result?.deviationCents === null || result?.deviationCents === undefined
            ? "--"
            : `${result.deviationCents >= 0 ? "+" : ""}${Math.round(result.deviationCents)} cents`}
        </div>

        <div className="meter">
          <div
            className="meter-tolerance-band"
            style={{
              left: `${toleranceLeftPercent}%`,
              width: `${toleranceWidthPercent}%`,
            }}
          />
          <div className="meter-center-line" />
          <div className="meter-tolerance-mark" style={{ left: `${toleranceLeftPercent}%` }} />
          <div className="meter-tolerance-mark" style={{ left: `${toleranceRightPercent}%` }} />
          <div className="meter-needle" style={{ left: `${needleLeftPercent}%` }} />
          <div className="meter-label meter-left">-50</div>
          <div className="meter-label meter-center">0</div>
          <div className="meter-label meter-right">+50</div>
        </div>

        <div className="led-row">
          <div className={`led ${greenLedOn ? "green" : "off"}`} />

          <div className="led-text">
            {isCalibrating
              ? "Calibrating Sa"
              : result?.allowed === null || result?.allowed === undefined
              ? "No note detected"
              : greenLedOn
              ? "Allowed and in tune"
              : result.allowed
              ? "Allowed but out of tune"
              : "Not allowed"}
          </div>

          <div className={`led ${redLedOn ? "red" : "off"}`} />
        </div>

        <div className="debug">
          <div>
            Cents from Sa: {isCalibrating || !result || result.centsFromSa === null ? "--" : Math.round(result.centsFromSa)}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;