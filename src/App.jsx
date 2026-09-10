import React, { useState, useEffect } from "react";
import "./App.css";
import { useSession } from "./SessionContext";

import Landing from "./components/Landing";
import Framing from "./components/Framing";
import ActiveSession from "./components/ActiveSession";
import Processing from "./components/Processing";
import Artifact from "./components/Artifact";
import History from "./components/History";

function App() {
  const [screen, setScreen] = useState("landing");
  const [decisionTitle, setDecisionTitle] = useState("");

  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem("voiceThinkingHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [darkMode, setDarkMode] = useState(false);

  const { resetSession, claims, assumptions, options, criteria } = useSession();

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }

    return () => {
      document.body.classList.remove("dark-mode");
    };
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("voiceThinkingHistory", JSON.stringify(history));
  }, [history]);

  const handleStart = () => {
    setScreen("framing");
  };

  const handleSkipFraming = () => {
    setScreen("active");
  };

  const handleFramingComplete = (title) => {
    setDecisionTitle(title);
    setScreen("active");
  };

  const handleEndSession = () => {
    const sessionData = {
      id: Date.now(),
      title: decisionTitle || "Untitled decision",
      timestamp: new Date().toISOString(),
      claims: [...claims],
      assumptions: [...assumptions],
      options: [...options],
      criteria: [...criteria],
    };

    setHistory((prev) => [sessionData, ...prev]);

    setScreen("processing");

    setTimeout(() => {
      setScreen("artifact");
    }, 1500);
  };

  const handleRestart = () => {
    resetSession();
    setDecisionTitle("");
    setScreen("landing");
  };

  const handleViewHistory = () => {
    setScreen("history");
  };

  const handleHistoryBack = () => {
    setScreen("landing");
  };

  const handleHistoryItemSelect = (session) => {
    setDecisionTitle(session.title);
    setScreen("artifact");
  };

  return (
    <div className="App">
      <div className="theme-toggle-wrapper">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setDarkMode((current) => !current)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={darkMode}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {screen === "landing" && (
        <Landing onStart={handleStart} onViewHistory={handleViewHistory} />
      )}

      {screen === "framing" && (
        <Framing
          onSkip={handleSkipFraming}
          onComplete={handleFramingComplete}
        />
      )}

      {screen === "active" && (
        <ActiveSession decisionTitle={decisionTitle} onEnd={handleEndSession} />
      )}

      {screen === "processing" && <Processing />}

      {screen === "artifact" && (
        <Artifact decisionTitle={decisionTitle} onRestart={handleRestart} />
      )}

      {screen === "history" && (
        <History
          history={history}
          onBack={handleHistoryBack}
          onSelect={handleHistoryItemSelect}
        />
      )}
    </div>
  );
}

export default App;
