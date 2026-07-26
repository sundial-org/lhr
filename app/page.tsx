import Frontispiece from './frontispiece';

export default function Home() {
  return (
    <main>
      <Frontispiece />

      <section className="section" id="lab">
        <div className="section-label mono">§ The lab</div>
        <div className="prose">
          <p>
            Long Horizon Research is a small lab in San Francisco. We build the surface where
            people and agents work together, and we study what it records. Every edit, comment,
            acceptance and reversal is a trace of human judgment. We think the next models will
            learn from traces like these.
          </p>
          <p className="pull">The agents are here. The instruments are not.</p>
        </div>
      </section>

      <section className="section" id="questions">
        <div className="section-label mono">§ What we study</div>
        <div className="ledger">
          <div className="ledger-row">
            <span className="ledger-num">Q. I</span>
            <span>
              <span className="ledger-name">Surfaces for thinking</span>
              <span className="ledger-desc" style={{ display: 'block' }}>
                What does the best surface for thinking look like when machines do most of the
                drafting?
              </span>
            </span>
          </div>
          <div className="ledger-row">
            <span className="ledger-num">Q. II</span>
            <span>
              <span className="ledger-name">Learning from collaboration</span>
              <span className="ledger-desc" style={{ display: 'block' }}>
                Can a model learn your judgment from working with you? When to act, when to ask,
                when to leave things alone.
              </span>
            </span>
          </div>
          <div className="ledger-row">
            <span className="ledger-num">Q. III</span>
            <span>
              <span className="ledger-name">Many hands, one document</span>
              <span className="ledger-desc" style={{ display: 'block' }}>
                How do several people and several agents share a document without losing track of
                who did what, and why?
              </span>
            </span>
          </div>
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
                A shared workspace where people and agents write together. Every edit has an
                author, every change can be reviewed.
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

      <section className="section" id="join">
        <div className="section-label mono">§ Join us</div>
        <div className="prose">
          <p>
            We are a few people, hiring researchers and engineers in personalization,
            reinforcement learning and interfaces. You would work on a live instrument and the
            data it produces.
          </p>
          <p>
            Write to us: <a href="mailto:team@longhorizonresearch.com">team@longhorizonresearch.com</a>.
          </p>
        </div>
      </section>

      <footer className="colophon">
        <p className="contact">
          <a href="mailto:team@longhorizonresearch.com">team@longhorizonresearch.com</a>
        </p>
        <p className="colophon-meta mono">
          Long Horizon Research · San Francisco
          <br />
          Set in EB Garamond &amp; Newsreader. Fig. I computed, not drawn.
          <br />© MMXXVI
        </p>
      </footer>
    </main>
  );
}
