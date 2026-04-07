import { SWARA_CENTRAL_RANGES } from "./music/swaras";

function pct(cents: number): string {
  return `${(cents / 1200) * 100}%`;
}

function segmentStyle(min: number, max: number) {
  return {
    left: pct(min),
    width: pct(max - min),
  };
}

export default function SwaraLanding() {
  return (
    <section className="landing">
      <div className="landing__inner">
        <header className="landing__hero">
          <h1>Real-time Swara Tuner for Indian Classical Music</h1>
          <p className="landing__subtitle">
            A precision tool for tuning swaras in Carnatic and Hindustani practice,
            designed for musicians who care about intonation, not just pitch.
          </p>
          <a href="#tuner" className="landing__button">
            Go to Swara Tuner
          </a>
        </header>

        <section className="landing__block">
          <details>
            <summary>Go beyond generic pitch detection</summary>
            <p>
              Standard tuners are built for equal temperament. Swara Tuner is built
              for raga-based music.
            </p>
            <p>
              Work directly with musically meaningful pitch references, and refine
              your intonation in context.
            </p>
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>Key features</summary>
            <ul>
              <li>Real-time pitch tracking with stable visual feedback</li>
              <li>Swara-based reference system instead of fixed Western notes</li>
              <li>Deviation in cents for precise intonation control</li>
              <li>Raga-aware workflow based on arohana and avarohana</li>
              <li>Designed for voice and expressive instruments</li>
            </ul>
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>Why not a standard tuner?</summary>
            <p>
              Generic tuners assume a fixed grid of notes. Indian classical music
              does not.
            </p>
            <p>
              Swara Tuner lets you work relative to Sa, navigate swaras as musical
              entities, and focus on the subtle pitch relationships that define a
              raga.
            </p>
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>Who this is for</summary>
            <ul>
              <li>Vocalists refining intonation in raga practice</li>
              <li>Instrumentalists working on microtonal precision</li>
              <li>Students developing ear training and pitch awareness</li>
              <li>Teachers demonstrating swara relationships in real time</li>
            </ul>
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>Designed for practice, not just measurement</summary>
            <p>
              Swara Tuner is not just a visual meter. It is meant to be used during
              actual musical practice.
            </p>
            <p>
              Sustain a note, explore its intonation, adjust relative to Sa, and
              internalize pitch through repetition and feedback.
            </p>
          </details>
        </section>

        <p>
        To understand how tuning is handled in this app, it helps to briefly look at how pitch is described in Indian music theory.
        </p>

        <section className="landing__block">
          <details>
            <summary>The traditional view of 22 śruti</summary>

            <p>
            In Indian classical music theory, the octave is not divided into 12 equal semitones as in Western music, but into <strong>22 śruti</strong>, i.e. micro-intervals that are not equally spaced.
            </p>

            <p>
            Traditionally, these 22 śruti are distributed across the 7 swaras according to the pattern:
            </p>

            <p><strong>4, 3, 2, 4, 4, 3, 2 (Sa, Re, Ga, Ma, Pa, Dha, Ni)</strong></p>

            <p>
            This model has strong historical and theoretical value, but it does not directly reflect modern performance practice.
            </p>
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>From theory to practice: the approach used in this app</summary>

            <p>
            In contemporary practice (both Hindustani and Carnatic), śruti are often interpreted more flexibly:
            </p>

            <ul>
            <li><strong>Sa and Pa</strong> are treated as stable reference points (1 śruti each)</li>
            <li>The remaining 20 śruti are distributed across <strong>Re, Ga, Ma, Dha and Ni</strong></li>
            <li>This results in <strong>4 śruti per swara</strong></li>
            </ul>
            <p>
            Since each swara appears in multiple variants (e.g. komal/shuddha in Hindustani, or R1/R2/R3 in Carnatic), these are further divided into <strong>2 śruti per swarasthana (pitch position)</strong>
            </p>
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>How to interpret these values</summary>
            <p>
            This means that, except for Sa and Pa, a note is not a fixed point but a <strong>range of possible intonation</strong>.
            </p>
            <p>
            Within this range:
            </p>
            <ul>
            <li>different rāgas may favor different regions</li>
            <li>intonation shifts slightly depending on melodic context</li>
            <li>ornamentations (gamaka) continuously move through these areas</li>
            </ul>
            <p>
            In other words, śruti should be understood as <strong>intonation zones</strong>, not discrete keys.
            </p>
            <p>
            This is why intonation in Indian classical music is best understood as a <strong>continuous space shaped by musical context</strong>.
            </p>

            <div className="intonation-map">
              <div className="intonation-map">
                <div className="intonation-bar precise">

                  <div className="tick sa" style={{ left: pct(0) }}>S</div>

                  <div className="segment re" style={segmentStyle(SWARA_CENTRAL_RANGES.Ri1.min, SWARA_CENTRAL_RANGES.Ri1.max)}>r1</div>
                  <div className="segment re" style={segmentStyle(SWARA_CENTRAL_RANGES.Ri2.min, SWARA_CENTRAL_RANGES.Ri2.max)}>r2</div>

                  <div className="segment ga" style={segmentStyle(SWARA_CENTRAL_RANGES.Ga2.min, SWARA_CENTRAL_RANGES.Ga2.max)}>g2</div>
                  <div className="segment ga" style={segmentStyle(SWARA_CENTRAL_RANGES.Ga3.min, SWARA_CENTRAL_RANGES.Ga3.max)}>g3</div>

                  <div className="segment ma" style={segmentStyle(SWARA_CENTRAL_RANGES.Ma1.min, SWARA_CENTRAL_RANGES.Ma1.max)}>m1</div>
                  <div className="segment ma" style={segmentStyle(SWARA_CENTRAL_RANGES.Ma2.min, SWARA_CENTRAL_RANGES.Ma2.max)}>m2</div>

                  <div className="tick pa" style={{ left: pct(SWARA_CENTRAL_RANGES.Pa.default) }}>P</div>

                  <div className="segment dha" style={segmentStyle(SWARA_CENTRAL_RANGES.Dha1.min, SWARA_CENTRAL_RANGES.Dha1.max)}>d1</div>
                  <div className="segment dha" style={segmentStyle(SWARA_CENTRAL_RANGES.Dha2.min, SWARA_CENTRAL_RANGES.Dha2.max)}>d2</div>

                  <div className="segment ni" style={segmentStyle(SWARA_CENTRAL_RANGES.Ni2.min, SWARA_CENTRAL_RANGES.Ni2.max)}>n2</div>
                  <div className="segment ni" style={segmentStyle(SWARA_CENTRAL_RANGES.Ni3.min, SWARA_CENTRAL_RANGES.Ni3.max)}>n3</div>

                </div>

                <div className="intonation-scale">
                  <span className="scale-start">0</span>

                  {[200, 400, 600, 800, 1000].map((c) => (
                    <span key={c} style={{ left: pct(c) }}>
                      {c}
                    </span>
                  ))}

                  <span className="scale-end">1200</span>
                </div>              
              </div>
            </div>            
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>No single standard: how these values were chosen</summary>

            <p>
            There is no universal agreement on the exact values of the 22 śruti:
            </p>

            <ul>
            <li>different sources propose slightly different tunings</li>
            <li>some models are purely theoretical</li>
            <li>others attempt to reflect actual musical practice</li>
            </ul>

            <p>
            The model  used in this app:
            </p>

            <ul>
            <li>is based on simple harmonic ratios (just intonation)</li>
            <li>is consistent with several musicological sources</li>
            <li>is designed to be musically plausible in real performance</li>
            </ul>
          </details>
        </section>

        <section className="landing__block">
          <details>
            <summary>Reference table (22 śruti)</summary>
            <table>
              <thead>
                <tr>
                <th>Śruti</th>
                <th>Name</th>
                <th>Hindustani</th>
                <th>Carnatic</th>
                <th>Ratio</th>
                <th>Cents</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Shadja</td><td>S</td><td>s</td><td>1/1</td><td>0</td></tr>
                <tr><td>2</td><td>Ekaśruti Rishabha</td><td>r</td><td>r1</td><td>256/243</td><td>90</td></tr>
                <tr><td>3</td><td>Dviśruti Rishabha</td><td>r</td><td>r1</td><td>16/15</td><td>112</td></tr>
                <tr><td>4</td><td>Triśruti Rishabha</td><td>R</td><td>r2 (g1)</td><td>10/9</td><td>182</td></tr>
                <tr><td>5</td><td>Chatuśśruti Rishabha</td><td>R</td><td>r2 (g1)</td><td>9/8</td><td>204</td></tr>
                <tr><td>6</td><td>Komal Sādhārana Gāndhāra</td><td>g</td><td>g2 (d3)</td><td>32/27</td><td>294</td></tr>
                <tr><td>7</td><td>Sādhārana Gāndhāra</td><td>g</td><td>g2 (d3)</td><td>6/5</td><td>316</td></tr>
                <tr><td>8</td><td>Antara Gāndhāra</td><td>G</td><td>g3</td><td>5/4</td><td>386</td></tr>
                <tr><td>9</td><td>Chyuta Madhyama Gāndhāra</td><td>G</td><td>g3</td><td>81/64</td><td>408</td></tr>
                <tr><td>10</td><td>Suddha Madhyama</td><td>M</td><td>m1</td><td>4/3</td><td>498</td></tr>
                <tr><td>11</td><td>Tivra Suddha Madhyama</td><td>M</td><td>m1</td><td>27/20</td><td>520</td></tr>
                <tr><td>12</td><td>Prati Madhyama</td><td>m</td><td>m2</td><td>45/32</td><td>590</td></tr>
                <tr><td>13</td><td>Chyuta Panchama Madhyama</td><td>m</td><td>m2</td><td>64/45</td><td>610</td></tr>
                <tr><td>14</td><td>Panchama</td><td>P</td><td>p</td><td>3/2</td><td>702</td></tr>
                <tr><td>15</td><td>Ekaśruti Dhaivata</td><td>d</td><td>d1</td><td>128/81</td><td>792</td></tr>
                <tr><td>16</td><td>Dviśruti Dhaivata</td><td>d</td><td>d1</td><td>8/5</td><td>814</td></tr>
                <tr><td>17</td><td>Triśruti Dhaivata</td><td>D</td><td>d2 (n1)</td><td>5/3</td><td>884</td></tr>
                <tr><td>18</td><td>Chatuśśruti Dhaivata</td><td>D</td><td>d2 (n1)</td><td>27/16</td><td>906</td></tr>
                <tr><td>19</td><td>Komala Kaisiki Nishāda</td><td>n</td><td>n2 (d3)</td><td>16/9</td><td>996</td></tr>
                <tr><td>20</td><td>Kaisiki Nishāda</td><td>n</td><td>n2 (d3)</td><td>9/5</td><td>1018</td></tr>
                <tr><td>21</td><td>Kākali Nishāda</td><td>N</td><td>n3</td><td>15/8</td><td>1088</td></tr>
                <tr><td>22</td><td>Tivra Kākali Nishāda</td><td>N</td><td>n3</td><td>243/128</td><td>1110</td></tr>
                <tr><td>--</td><td>Tāra Shadja</td><td>S</td><td>s</td><td>2/1</td><td>1200</td></tr>
              </tbody>
            </table>
            <p>
            This table should not be interpreted as a fixed scale, but as a <strong>map of possible intonation positions</strong> from which each rāga selects and shapes its pitches.
            </p>
          </details>
        </section>
      </div>
    </section>
  )
}