import React from "react";
import { useSession } from "../SessionContext";
import "../styles/Artifact.css";

const Artifact = ({ decisionTitle, onRestart }) => {
  const { claims, assumptions, options, criteria } = useSession();

  return (
    <div className="artifact-screen">
      <div className="artifact-content">
        <header className="artifact-header">
          <p className="artifact-eyebrow">Decision map</p>
          <h1 className="artifact-title">Your Decision Map</h1>
          {decisionTitle && (
            <p className="artifact-subtitle">{decisionTitle}</p>
          )}
        </header>

        <div className="artifact-sections">
          <section className="artifact-section">
            <div className="artifact-section__header">
              <h2>Claims you made</h2>
              <span className="artifact-count">{claims.length}</span>
            </div>

            {claims.length === 0 ? (
              <p className="artifact-empty">No claims were made.</p>
            ) : (
              <ul className="artifact-list">
                {claims.map((claim) => (
                  <li key={claim.id} className="artifact-item">
                    <span>{claim.text}</span>
                    {!claim.hasEvidence && (
                      <span className="artifact-tag artifact-tag--plum">
                        No evidence
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="artifact-section">
            <div className="artifact-section__header">
              <h2>Assumptions surfaced</h2>
              <span className="artifact-count">{assumptions.length}</span>
            </div>

            {assumptions.length === 0 ? (
              <p className="artifact-empty">No assumptions were surfaced.</p>
            ) : (
              <ul className="artifact-list">
                {assumptions.map((assumption) => (
                  <li key={assumption.id} className="artifact-item">
                    {assumption.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="artifact-section">
            <div className="artifact-section__header">
              <h2>Options considered</h2>
              <span className="artifact-count">{options.length}</span>
            </div>

            {options.length === 0 ? (
              <p className="artifact-empty">No options were considered.</p>
            ) : (
              <p className="artifact-summary">
                You considered{" "}
                <strong>
                  {options.length} {options.length === 1 ? "option" : "options"}
                </strong>{" "}
                during the conversation.
              </p>
            )}
          </section>

          <section className="artifact-section">
            <div className="artifact-section__header">
              <h2>Criteria named</h2>
              <span className="artifact-count">{criteria.length}</span>
            </div>

            {criteria.length === 0 ? (
              <p className="artifact-empty">No criteria were named.</p>
            ) : (
              <ul className="artifact-list">
                {criteria.map((criterion) => (
                  <li key={criterion.id} className="artifact-item">
                    {criterion.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="artifact-actions">
          <button
            type="button"
            onClick={onRestart}
            className="artifact-restart"
          >
            Start a new session
          </button>
        </div>
      </div>
    </div>
  );
};

export default Artifact;
