export default function MicroLanding() {
  return (
    <section className="landing">
        <div className="landing-text">
          <h1>Train your pitch in microtonal music</h1>

          <p>
            Western music is deeply shaped by the familiar <strong>12-tone equal temperament (12-TET)</strong>, 
            where the octave is divided into twelve equal semitones. However, the idea of dividing the octave 
            into equal parts is much older and far more diverse than commonly assumed.
          </p>

          <p>
            Already in the second half of the 16th century, theorists such as Nicola Vicentino, 
            Scipione Stella, and Fabio Colonna explored alternative <em>temperament</em> systems 
            based on different equal divisions of the octave.
          </p>

          <p>
            In these systems, the octave is divided into equal parts:
          </p>

          <ul>
            <li>in <strong>12-TET</strong>, there are 12 equal semitones</li>
            <li>in <strong>19-TET</strong>, there are 19 equal third-tones</li>
            <li>in <strong>24-TET</strong>, there are 24 equal <em>quarter tones</em></li>
            <li>in <strong>31-TET</strong>, there are 31 equal fifth-tones</li>
          </ul>

          <p>
            All of these belong to the world of <strong>microtonal</strong> music, where intervals smaller 
            than the semitone — <em>microintervals</em> — play a central role.
          </p>

          <p>
            The fascination with such systems was not purely theoretical. Renaissance builders experimented 
            with keyboard instruments capable of producing these finer pitch distinctions. Notable examples 
            include the <em>archicembalo</em> of Nicola Vicentino, the <em>Sambuca Lincea</em> of Fabio Colonna, 
            and similar instruments by Scipione Stella. These instruments featured “split keys” or multiple 
            rows of keys, allowing performers to access pitches beyond the standard twelve-note <em>equal temperament</em>.
          </p>

          <p>
            A key concept behind these systems is that of a <strong>cyclic temperament</strong>. A temperament 
            is called <em>cyclic</em> when it forms a closed system: starting from a given note and repeatedly 
            applying a fixed interval (typically the fifth), one eventually returns exactly to the starting note 
            after a finite number of steps.
          </p>

          <p>
            In <strong>12-TET</strong>, this happens after 12 fifths. In <strong>19-TET</strong> and  
            <strong> 31-TET</strong>, it happens after 19 and 31 steps respectively. This closure is what defines 
            their cyclic nature.
          </p>

          <p>
            Not all temperaments behave this way. In <em>meantone temperament</em>, the chain of fifths does not 
            close perfectly. The final interval — the one that should bring the cycle back to the starting pitch — 
            is smaller than the regular meantone fifth (about <strong>696.58 cents</strong>). This discrepancy, 
            often visualized as a gap in the circle, means that meantone is not truly cyclic.
          </p>

          <p>
            Similarly, <strong>24-TET</strong>, despite dividing the octave into equal quarter tones, is not 
            cyclic in the same sense. If one proceeds by fifths, the cycle closes after 12 steps, returning to 
            the starting note without ever visiting the other 12 pitches. In effect, 24-TET behaves like 
            two interleaved 12-TET systems, offset by a quarter tone.
          </p>

          <h2>Listening Examples</h2>

            <p>
              To hear how these <strong>microtonal temperaments</strong> sound in practice, here are a few 
              examples in <strong>31-TET</strong>. These include excerpts from madrigals by Nicola Vicentino 
              and pieces written to demonstrate the <em>enharmonic genus</em> by Ascanio Mayone.
            </p>

            <p>
              All examples are performed using a digital <em>arciorgano</em> developed by <strong>NaadaLab</strong>, 
              inspired by historical instruments such as the archicembalo.
            </p>

            <ul>
              <li>
                <a href="https://www.youtube.com/watch?v=_Yjqnh2QMqc" target="_blank" rel="noopener noreferrer">
                  Vicentino – Madrigal "Dolce mio ben" excerpt" (31-TET)
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/watch?v=Y0wcddyXsbE" target="_blank" rel="noopener noreferrer">
                  Vicentino – Madrigal "Madonna il poco dolce" (31-TET)
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/watch?v=Xvb38UMWupc" target="_blank" rel="noopener noreferrer">
                  Vicentino – Madrigal "Musica prisca" (31-TET)
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/watch?v=Mx8vUPpzFnA" target="_blank" rel="noopener noreferrer">
                  Ascanio Mayone – "I 3 generi misti" (31-TET)
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/watch?v=BVRxzK6Pd5Q" target="_blank" rel="noopener noreferrer">
                  Ascanio Mayone – "Enarmonico intenso" (31-TET)
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/watch?v=w5yoaYfrhKE" target="_blank" rel="noopener noreferrer">
                  Ascanio Mayone – "Enarmonico molle" (31-TET)
                </a>
              </li>
            </ul>

            <p>
              These recordings offer a direct glimpse into a sound world shaped by <em>microintervals</em>, 
              where familiar harmonic relationships take on new expressive 
              possibilities beyond standard equal temperament.
            </p>


          <h2>How to Use This Tool</h2>

          <p>
            Using this tool is straightforward. First, set a reference pitch. In most cases, the default setting 
            of <strong>A = 440 Hz</strong> will work perfectly well. Then enable the microphone and begin to sing.
          </p>

          <p>
            As you produce a pitch, the interface shows how closely your intonation matches the target note 
            within the selected temperament system.
          </p>

          <p>
            If you are not yet familiar with <strong>microtonal intonation</strong> — which is quite common, since 
            most listeners are shaped by the standard 12-tone equal temperament — you can simply click on any 
            note name around the circle to hear it. This allows you to explore the sound of each interval and 
            gradually internalize these new pitch relationships.
          </p>
        </div>
      <p>
        Suggestions, corrections, or ideas are very welcome.
        <br />
        <a href="mailto:feedback@naadalab.com?subject=Swara Tuner Feedback">
          Send feedback
        </a>
      </p>
    </section>
  )
}