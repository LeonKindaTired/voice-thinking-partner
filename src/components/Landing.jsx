import React from "react";
import "../styles/Landing.css";

const Landing = ({ onStart, onViewHistory }) => {
  return (
    <div className="landing-screen">
      <main className="landing-content">
        <div className="landing-header">
          <p className="landing-eyebrow">Think it through</p>

          <h1 className="landing-title">
            You've had that moment where a decision was obvious in hindsight,
            you just needed to hear yourself think it through out loud.
          </h1>

          <p className="landing-description">
            We built the thing that listens for that moment, live.
          </p>
        </div>

        <div className="landing-actions">
          <button type="button" className="landing-primary" onClick={onStart}>
            Start thinking
          </button>

          <button
            type="button"
            className="landing-history"
            onClick={onViewHistory}
          >
            View history
          </button>
        </div>
      </main>
    </div>
  );
};

export default Landing;
