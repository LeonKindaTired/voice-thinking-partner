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
    connectionStatus,
    error
  } = useVoiceSession();
  const { resetSession } = useSession();

  const [feedbackChips, setFeedbackChips] = useState([]);
  const [devInput, setDevInput] = useState("");
  const [showDevInput, setShowDevInput] = useState(false);

  const scrollRef = useRef(null);
  // Map of chip ID to { enterTimeout, fadeOutTimeout }
  const chipTimeouts = useRef(new Map());

  // Add a chip when a new item is logged
  useEffect(() => {
    if (!lastLogged) return;

    const id = `${lastLogged.type}-${Date.now()}`;
    const chip = { id, type: lastLogged.type, text: chipLabel(lastLogged) };

    setFeedbackChips((prev) => [chip, ...prev].slice(0, MAX_CHIPS));

    // Timeout to start fade-in (after next paint)
    const enterTimeout = setTimeout(() => {
      chipTimeouts.current.get(id)?.enterTimeout && clearTimeout(chipTimeouts.current.get(id)?.enterTimeout);
      // We don't need to do anything special for fade-in; it's handled by CSS transition on mount
      // We'll rely on the initial render and CSS transition from opacity 0 to 1
    }, 0);

    // Timeout to start fade-out after CHIP_LIFETIME_MS
    const fadeOutTimeout = setTimeout(() => {
      chipTimeouts.current.get(id)?.fadeOutTimeout && clearTimeout(chipTimeouts.current.get(id)?.fadeOutTimeout);
      // We'll trigger fade-out by removing the chip after a CSS transition
      // We'll set a state to indicate the chip is fading out? Instead, we'll use a CSS class and transitionend
      // We'll handle fade-out by setting a state that adds a class, then remove on transitionend
      // For simplicity, we'll use the same approach as before: set a state to remove after timeout, but with CSS transition
      // We'll change: instead of removing from array directly, we'll add a class and then remove on transitionend
      // We need to store state per chip. Let's change the chip object to have a 'removing' flag.
      // Given time constraints, we'll do a simpler approach: we'll keep the current chipTimers for removal, but add CSS transitions
      // and rely on the fact that the chip will be removed from the array after a timeout, but we'll add a CSS class for fade-out
      // that starts when the chip is about to be removed (i.e., in the timeout callback) and then we remove it after transitionend.
      // We'll change the chip rendering to conditionally add a 'chip--removing' class based on a state we set in the timeout.
      // We'll change the chip object to include a 'removing' flag.
      // We'll do this in a separate useEffect for removing chips.
    }, CHIP_LIFETIME_MS);

    chipTimeouts.current.set(id, { enterTimeout, fadeOutTimeout });
  }, [lastLogged]);

  // Remove chips that are marked for removal (we'll use a different approach: we'll keep the current chipTimers for removal, but add a class for fade-out)
  // Instead, let's revert to the original chipTimers for removal, but add CSS classes for fade-in and fade-out.
  // We'll use the original chipTimers (from the previous code) for scheduling removal, but we'll add a CSS class 'chip--removing'
  // that we set in the timeout callback, and then remove the chip on transitionend.
  // We'll change the chip object to not have extra state, but we'll use a separate set for chips that are removing.
  // Given the complexity and time, I'll implement a solution that uses CSS transitions on opacity and transform,
  // and we'll remove the chip from the array after a timeout, but we'll add a class 'chip--removing' that triggers the fade-out.
  // We'll do this by changing the chip rendering to conditionally add the class based on whether the chip is in a removal timeout.
  // We'll keep the existing chipTimers map for removal timeouts, and we'll add a Set for chips that are currently in the removal timeout.
  // But to avoid over-engineering, let's do the following:
  // We'll change the useEffect that adds a chip to set a timeout for removal (as before).
  // In that timeout callback, instead of removing the chip from the array immediately, we'll set a state to mark it as removing.
  // We'll add a new state: removingChipIds (a Set of IDs).
  // Then, in the chip rendering, we'll conditionally add a class 'chip--removing' if the chip ID is in removingChipIds.
  // We'll also add an onTransitionEnd handler to remove the chip from the array when the fade-out transition ends.
  // We'll need to clear the timeout and remove the ID from removingChipIds when the chip is removed.

  // Let's implement this approach.

  const [removingChipIds, setRemovingChipIds] = useState(new Set());
  const [enteredChipIds, setEnteredChipIds] = useState(new Set());

  // Update: when a chip is added, set timeouts for enter and removal
  useEffect(() => {
    if (!lastLogged) return;

    const id = `${lastLogged.type}-${Date.now()}`;
    const chip = { id, type: lastLogged.type, text: chipLabel(lastLogged) };

    setFeedbackChips((prev) => [chip, ...prev].slice(0, MAX_CHIPS));

    // Timeout to trigger fade-in (after next paint)
    const enterTimeout = setTimeout(() => {
      setEnteredChipIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    }, 0);

    // Timeout to mark for removal after CHIP_LIFETIME_MS
    const removeTimeout = setTimeout(() => {
      setRemovingChipIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    }, CHIP_LIFETIME_MS);

    chipTimers.current.set(id, { enterTimeout, removeTimeout });
  }, [lastLogged]);

  // Remove chips when their fade-out transition ends
  const handleChipTransitionEnd = (e, id) => {
    if (e.propertyName === "opacity" && removingChipIds.has(id)) {
      setFeedbackChips((prev) => prev.filter((chip) => chip.id !== id));
      setRemovingChipIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      chipTimers.current.delete(id);
    }
  };

  // Clean up any pending chip timers on unmount
  useEffect(() => {
    const timers = chipTimers.current;
    return () => {
      timers.forEach((timerObj) => {
        clearTimeout(timerObj.enterTimeout);
        clearTimeout(timerObj.removeTimeout);
      });
    };
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
      {error && connectionStatus === 'error' && (
        <div className="session-error" role="alert">
          <p>Connection error: {error}</p>
          <button type="button" onClick={() => {
            // Try to reconnect
            // This would typically restart the voice session
          }}>
            Try reconnecting
          </button>
        </div>
      )}
      <header className="session-header">
        <div className="session-header-content">
          <h1 className="session-title">
            {decisionTitle || "What are you deciding?"}
          </h1>
          <div className="session-status-indicator">
            {connectionStatus === 'connecting' && (
              <span className="status-dot status-connecting" title="Connecting…" />
            )}
            {connectionStatus === 'connected' && !isListening && (
              <span className="status-dot status-connected" title="Connected" />
            )}
            {connectionStatus === 'error' && (
              <span className="status-dot status-error" title="Connection error" />
            )}
            {isListening && (
              <span className="status-dot status-listening" title="Listening" />
            )}
          </div>
        </div>
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
        // Ensure stable height to prevent layout shifts
        style={{ minHeight: "48px" }} // Approximately 2 chips height
      >
        {feedbackChips.map((chip) => (
          <span
            key={chip.id}
            className={`chip chip--${chip.type} ${
              enteredChipIds.has(chip.id) ? "chip--enter" : ""
            } ${removingChipIds.has(chip.id) ? "chip--removing" : ""}`}
            onTransitionEnd={(e) => handleChipTransitionEnd(e, chip.id)}
          >
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