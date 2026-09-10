import React from "react";
import "../styles/Processing.css";

const Processing = () => {
  return (
    <div className="processing-screen">
      <main className="processing-content">
        <div className="processing-indicator" aria-hidden="true">
          <span className="processing-indicator__pulse" />
        </div>

        <p className="processing-eyebrow">Decision map</p>

        <h1 className="processing-title">Putting your thoughts together...</h1>

        <p className="processing-description">
          This should take just a moment.
        </p>
      </main>
    </div>
  );
};

export default Processing;
