import "./App.css";
import SwaraLanding from "./SwaraLanding";
import MicroLanding from "./MicroLanding";
import { appConfig } from "./config/appConfig";

import TunerApp from "./TunerApp";

export default function App() {
  return (
    <div className="app-shell">
      {appConfig.mode === "micro" ? (
        <>
          <TunerApp />
          <MicroLanding />
        </>
      ) : (
        <>
          <SwaraLanding />
          <TunerApp />
        </>
      )}
    </div>
  );
}