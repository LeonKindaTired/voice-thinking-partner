import React from 'react';

const Landing = ({ onStart, onViewHistory }) => {
  return (
    <div className="landing-screen">
      <div className="landing-content">
        <h1>You've had that moment where a decision was obvious in hindsight — you just needed to hear yourself think it through out loud.</h1>
        <p>We built the thing that listens for that moment, live.</p>
        <button onClick={onStart}>Start thinking</button>
        <div className="history-link">
          <button type="button" onClick={onViewHistory}>
            View history
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;