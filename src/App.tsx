import "./App.css";
import SwaraLanding from "./SwaraLanding";
import MicroLanding from "./MicroLanding";
import { appConfig } from "./config/appConfig";

import TunerApp from "./TunerApp";

export default function App() {
  // useEffect(() => {
  //   document.title =
  //     appConfig.mode === "micro"
  //       ? "Microtonal Tuner"
  //       : "Indian Classical Music Tuner";
  // }, [appConfig.mode]);

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