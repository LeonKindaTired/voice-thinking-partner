import React from "react";
import "/src/styles/Processing.css";

const Processing = () => {
  return (
    <div className="processing-screen">
      <main className="processing-content">
        <div className="processing-indicator" aria-hidden="true">
          <div className="thought-network">
            <div className="node node--1" />
            <div className="node node--2" />
            <div className="node node--3" />
            <div className="node node--4" />
            <div className="node node--5" />
            <div className="node node--6" />
            <div className="connection connection--1" />
            <div className="connection connection--2" />
            <div className="connection connection--3" />
            <div className="connection connection--4" />
            <div className="connection connection--5" />
          </div>
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
