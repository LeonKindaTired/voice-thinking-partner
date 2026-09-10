import React, { useState, useEffect, useRef, useCallback } from "react";
import useVoiceSession from "../hooks/useVoiceSession";
import { useSession } from "../SessionContext";
import "../styles/ActiveSession.css";

const CHIP_LIFETIME_MS = 4000; // how long a chip stays before fading out
const MAX_CHIPS = 5;

const chipLabel = (entry) => {
  switch (entry.type) {
    case "claim":
      return entry.hasEvidence
        ? "Claim noted"
        : "Claim noted — no evidence given";
    case "assumption":
      return "Assumption noted";
    case "option":
      return "Option noted";
    case "criterion":
      return "Criterion noted";
    default:
      return `${entry.type} noted`;
  }
};

const ActiveSession = ({ decisionTitle, onEnd }) => {
  const {
    transcript,
    agentQuestion,
    isListening,
    startListening,
    stopListening,
    processUserUtterance,
    lastLogged,
  } = useVoiceSession();
  const { resetSession } = useSession();

  const [feedbackChips, setFeedbackChips] = useState([]);
  const [devInput, setDevInput] = useState("");
  const [showDevInput, setShowDevInput] = useState(false);

  const scrollRef = useRef(null);
  const chipTimers = useRef(new Map());

  // Add a chip when a new item is logged; each chip owns its own expiry timer
  // so chips fade independently instead of all resetting together.
  useEffect(() => {
    if (!lastLogged) return;

    const id = `${lastLogged.type}-${Date.now()}`;
    const chip = { id, type: lastLogged.type, text: chipLabel(lastLogged) };

    setFeedbackChips((prev) => [chip, ...prev].slice(0, MAX_CHIPS));

    const timer = setTimeout(() => {
      setFeedbackChips((prev) => prev.filter((c) => c.id !== id));
      chipTimers.current.delete(id);
    }, CHIP_LIFETIME_MS);

    chipTimers.current.set(id, timer);
  }, [lastLogged]);

  // Clean up any pending chip timers on unmount
  useEffect(() => {
    const timers = chipTimers.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleStartListening = useCallback(() => {
    startListening();
  }, [startListening]);

  const handleEndSession = useCallback(() => {
    stopListening();
    onEnd();
  }, [stopListening, onEnd]);

  const handleDevSubmit = (e) => {
    e.preventDefault();
    if (devInput.trim()) {
      processUserUtterance(devInput.trim());
      setDevInput("");
    }
  };

  return (
    <div className="session-screen">
      <header className="session-header">
        <h1 className="session-title">
          {decisionTitle || "What are you deciding?"}
        </h1>
        <button type="button" className="btn-end" onClick={handleEndSession}>
          End session
        </button>
      </header>

      <div
        className="transcript"
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation transcript"
      >
        {transcript.length === 0 && (
          <p className="transcript-empty">
            Your conversation will appear here as you talk.
          </p>
        )}
        {transcript.map((line, index) => (
          <p
            key={index}
            className={`transcript-line transcript-line--${line.speaker}`}
          >
            <span className="transcript-speaker">
              {line.speaker === "user" ? "You" : "Agent"}
            </span>
            {line.text}
          </p>
        ))}
        {agentQuestion && (
          <p className="transcript-line transcript-line--agent transcript-line--active">
            <span className="transcript-speaker">Agent</span>
            {agentQuestion}
          </p>
        )}
      </div>

      <div
        className="chip-tray"
        aria-live="polite"
        aria-label="Things noticed during the conversation"
      >
        {feedbackChips.map((chip) => (
          <span key={chip.id} className={`chip chip--${chip.type}`}>
            {chip.text}
          </span>
        ))}
      </div>

      <div className="session-controls">
        {!isListening ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleStartListening}
          >
            Start talking
          </button>
        ) : (
          <div className="listening-indicator" aria-live="polite">
            <span className="listening-indicator__pulse" aria-hidden="true" />
            <span className="listening-indicator__label">Listening</span>
          </div>
        )}
      </div>

      {/*
        Dev-only: lets you simulate a spoken turn by typing, for testing the
        session flow before the real AssemblyAI mic connection is wired in.
        Gate this out of production builds — e.g. render only when
        `import.meta.env.DEV` is true, or behind a feature flag.
      */}
      {import.meta.env.DEV && (
        <details
          className="dev-input"
          open={showDevInput}
          onToggle={(e) => setShowDevInput(e.target.open)}
        >
          <summary>Dev: simulate a spoken line</summary>
          <form onSubmit={handleDevSubmit} className="dev-input__form">
            <input
              type="text"
              value={devInput}
              onChange={(e) => setDevInput(e.target.value)}
              placeholder="Type what you'd say, then press Enter"
              disabled={!isListening}
              aria-label="Simulated spoken input"
            />
            <button type="submit" disabled={!isListening || !devInput.trim()}>
              Send
            </button>
          </form>
        </details>
      )}
    </div>
  );
};

export default ActiveSession;
