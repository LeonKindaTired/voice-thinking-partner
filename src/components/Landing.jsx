import React from 'react';

const Landing = ({ onStart }) => {
  return (
    <div className="landing-screen">
      <div className="landing-content">
        <h1>You've had that moment where a decision was obvious in hindsight — you just needed to hear yourself think it through out loud.</h1>
        <p>We built the thing that listens for that moment, live.</p>
        <button onClick={onStart}>Start thinking</button>
      </div>
    </div>
  );
};

export default Landing;