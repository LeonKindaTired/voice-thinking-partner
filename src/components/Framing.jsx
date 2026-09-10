import React, { useState } from "react";
import "../styles/Framing.css";

const Framing = ({ onSkip, onComplete }) => {
  const [title, setTitle] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (title.trim() !== "") {
      onComplete(title.trim());
    }
  };

  return (
    <div className="framing-screen">
      <main className="framing-content">
        <div className="framing-header">
          <p className="framing-eyebrow">Decision session</p>
          <h1 className="framing-title">What are you deciding?</h1>
          <p className="framing-description">
            Start with the decision you want to think through. You can skip this
            if you would rather begin talking.
          </p>
        </div>

        <form className="framing-form" onSubmit={handleSubmit}>
          <label htmlFor="decision-title" className="framing-label">
            Your decision
          </label>

          <input
            id="decision-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Whether to take the job offer"
            className="framing-input"
            autoFocus
          />

          <div className="framing-actions">
            <button
              type="button"
              onClick={onSkip}
              className="framing-button framing-button--secondary"
            >
              Skip
            </button>

            <button
              type="submit"
              disabled={!title.trim()}
              className="framing-button framing-button--primary"
            >
              Start
            </button>
          </div>
        </form>

        <p className="framing-note">
          Optional. Your decision will appear in the final decision map.
        </p>
      </main>
    </div>
  );
};

export default Framing;
