import type { AppMode } from "./appConfig";

export interface ModeUIConfig {
  appTitle: string;

  showSaSingButton: boolean;
  showDroneControls: boolean;
  showDroneSettings: boolean;
  showRagaRef: boolean;
  showRagaPanel: boolean;
  showTemperamentSelector: boolean;

  showSrutiView: boolean;
  showSwaraView: boolean;
  showOctaveView: boolean;

  landingBeforeApp: boolean;
  landingAfterApp: boolean;

  calibrationTitle: string;
  referenceLabel: string;
  tapHint: string;

  viewLabels: {
    meter: string;
    secondary: string;
  };
}

export const MODE_UI_CONFIG: Record<AppMode, ModeUIConfig> = {
  swara: {
    appTitle: "Swara Tuner",

    showSaSingButton: true,
    showDroneControls: true,
    showDroneSettings: true,
    showRagaRef: true,
    showRagaPanel: true,
    showTemperamentSelector: false,

    showSrutiView: true,
    showSwaraView: true,
    showOctaveView: false,

    landingBeforeApp: true,
    landingAfterApp: false,

    calibrationTitle: "Sa calibration",
    referenceLabel: "Sa",
    tapHint: "Tap a swara to hear it",

    viewLabels: {
      meter: "Meter",
      secondary: "Circle",
    },
  },

  micro: {
    appTitle: "Microtonal Tuner",
    
    showSaSingButton: false,
    showDroneControls: false,
    showDroneSettings: false,
    showRagaRef: false,
    showRagaPanel: false,
    showTemperamentSelector: true,

    showSrutiView: false,
    showSwaraView: false,
    showOctaveView: true,

    landingBeforeApp: false,
    landingAfterApp: true,

    calibrationTitle: "Reference calibration",
    referenceLabel: "A3",
    tapHint: "Tap a note to hear it",

    viewLabels: {
      meter: "Meter view",
      secondary: "Octave view",
    },
  },
};