export default function SwaraLanding() {
  return (
    <section className="landing">
      <div className="landing__inner">
        <header className="landing__hero">
          <h1>Real-time Swara Tuner for Indian Classical Music</h1>
          <p className="landing__subtitle">
            A precision tool for tuning swaras in Carnatic and Hindustani practice.
            Designed for musicians who care about intonation, not just pitch.
          </p>
          <a href="#tuner" className="landing__button">
            Open Swara Tuner
          </a>
        </header>

        <section className="landing__block">
          <h2>Go beyond generic pitch detection</h2>
          <p>
            Standard tuners are built for equal temperament. Swara Tuner is built
            for raga-based music.
          </p>
          <p>
            Work directly with musically meaningful pitch references, and refine
            your intonation in context.
          </p>
        </section>

        <section className="landing__block">
          <h2>Key features</h2>
          <ul>
            <li>Real-time pitch tracking with stable visual feedback</li>
            <li>Swara-based reference system instead of fixed Western notes</li>
            <li>Deviation in cents for precise intonation control</li>
            <li>Raga-aware workflow based on arohana and avarohana</li>
            <li>Designed for voice and expressive instruments</li>
          </ul>
        </section>

        <section className="landing__block">
          <h2>Why not a standard tuner?</h2>
          <p>
            Generic tuners assume a fixed grid of notes. Indian classical music
            does not.
          </p>
          <p>
            Swara Tuner lets you work relative to Sa, navigate swaras as musical
            entities, and focus on the subtle pitch relationships that define a
            raga.
          </p>
        </section>

        <section className="landing__block">
          <h2>Who it’s for</h2>
          <ul>
            <li>Vocalists refining intonation in raga practice</li>
            <li>Instrumentalists working on microtonal precision</li>
            <li>Students developing ear training and pitch awareness</li>
            <li>Teachers demonstrating swara relationships in real time</li>
          </ul>
        </section>

        <section className="landing__block">
          <h2>Designed for practice, not just measurement</h2>
          <p>
            Swara Tuner is not just a visual meter. It is meant to be used during
            actual musical practice.
          </p>
          <p>
            Sustain a note, explore its intonation, adjust relative to Sa, and
            internalize pitch through repetition and feedback.
          </p>
        </section>

        <section className="landing__block">
          <h2>Example use</h2>
          <p>
            Tune Ri or Ga in relation to Sa and observe small deviations that
            define different interpretations of the same swara.
          </p>
        </section>

      </div>
    </section>
  )
}