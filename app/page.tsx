import Frontispiece from './frontispiece';

export default function Home() {
  return (
    <main>
      <Frontispiece />

      <section className="section" id="lab">
        <div className="section-label mono">§ The lab</div>
        <div className="prose">
          <p>
            A sundial has three parts: a plate, a gnomon, and the sun. It tells you nothing on its
            own. Someone has to stand in front of it and read.
          </p>
          <p className="pull">The agents are here. The instruments for working with them are not.</p>
          <p>
            Long Horizon Research is a small lab in San Francisco. We study how humans and agents do
            meaningful work together, and we build the instruments we wish existed — workspaces where
            every hand is visible, memory that compounds, ways of seeing what a machine did and why.
          </p>
        </div>
      </section>

      <section className="section" id="instruments">
        <div className="section-label mono">§ Instruments</div>
        <div className="ledger">
          <a className="ledger-row linked" href="https://sundialhub.com" target="_blank" rel="noreferrer">
            <span className="ledger-num">No. I</span>
            <span>
              <span className="ledger-name">Sundial</span>
              <span className="ledger-desc" style={{ display: 'block' }}>
                A shared workspace where humans and agents write together. Every edit attributed to
                its author; every change reviewable.
              </span>
            </span>
            <span className="ledger-dest">sundialhub.com ↗</span>
          </a>
          <div className="ledger-row empty">
            <span className="ledger-num">No. II</span>
            <span className="ledger-rule" />
            <span className="ledger-note">in the workshop</span>
          </div>
          <div className="ledger-row empty">
            <span className="ledger-num">No. III</span>
            <span className="ledger-rule" />
            <span className="ledger-note" />
          </div>
        </div>
      </section>

      <footer className="colophon">
        <p className="contact">
          <a href="mailto:team@longhorizonresearch.com">team@longhorizonresearch.com</a>
        </p>
        <p className="colophon-meta mono">
          Long Horizon Research · San Francisco
          <br />
          Set in Instrument Serif &amp; Newsreader. Fig. I computed, not drawn.
          <br />© MMXXVI
        </p>
      </footer>
    </main>
  );
}
