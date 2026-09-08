import React from 'react';
import { useSession } from '../SessionContext';

const Artifact = ({ decisionTitle, onRestart }) => {
  const { claims, assumptions, options, criteria } = useSession();

  return (
    <div className="artifact-screen">
      <div className="artifact-content">
        <h1>Your Decision Map</h1>
        {decisionTitle && (
          <div className="artifact-section">
            <h2>What you're deciding</h2>
            <p>{decisionTitle}</p>
          </div>
        )}
        <div className="artifact-section">
          <h2>Claims you made</h2>
          {claims.length === 0 ? (
            <p>No claims were made.</p>
          ) : (
            <ul>
              {claims.map((claim) => (
                <li key={claim.id}>
                  {claim.text} {claim.hasEvidence ? '' : '(no evidence given)'}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="artifact-section">
          <h2>Assumptions surfaced</h2>
          {assumptions.length === 0 ? (
            <p>No assumptions were surfaced.</p>
          ) : (
            <ul>
              {assumptions.map((assumption) => (
                <li key={assumption.id}>
                  {assumption.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="artifact-section">
          <h2>Options considered</h2>
          {options.length === 0 ? (
            <p>No options were considered.</p>
          ) : (
            <p>
              {options.length} {options.length === 1 ? 'option' : 'options'}
              considered.
            </p>
          )}
        </div>
        <div className="artifact-section">
          <h2>Criteria named</h2>
          {criteria.length === 0 ? (
            <p>No criteria were named.</p>
          ) : (
            <ul>
              {criteria.map((criterion) => (
                <li key={criterion.id}>
                  {criterion.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={onRestart} className="restart-button">
          Start a new session
        </button>
      </div>
    </div>
  );
};

export default Artifact;