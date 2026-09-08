import React, { useState, useEffect } from 'react';
import './App.css';
import { useSession } from './SessionContext';
import Landing from './components/Landing';
import Framing from './components/Framing';
import ActiveSession from './components/ActiveSession';
import Processing from './components/Processing';
import Artifact from './components/Artifact';
import History from './components/History';

function App() {
  const [screen, setScreen] = useState('landing');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [history, setHistory] = useState(() => {
    // Load history from localStorage on startup
    const savedHistory = localStorage.getItem('voiceThinkingHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const { resetSession, claims, assumptions, options, criteria } = useSession();

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('voiceThinkingHistory', JSON.stringify(history));
  }, [history]);

  const handleStart = () => {
    setScreen('framing');
  };

  const handleSkipFraming = () => {
    setScreen('active');
  };

  const handleFramingComplete = (title) => {
    setDecisionTitle(title);
    setScreen('active');
  };

  const handleEndSession = () => {
    // Save session to history before processing
    const sessionData = {
      id: Date.now(),
      title: decisionTitle || 'Untitled decision',
      timestamp: new Date().toISOString(),
      claims: [...claims],
      assumptions: [...assumptions],
      options: [...options],
      criteria: [...criteria]
    };
    setHistory(prev => [sessionData, ...prev]); // Newest first

    setScreen('processing');
    // Simulate processing delay
    setTimeout(() => {
      setScreen('artifact');
    }, 1500);
  };

  const handleRestart = () => {
    resetSession();
    setDecisionTitle('');
    setScreen('landing');
  };

  const handleViewHistory = () => {
    setScreen('history');
  };

  const handleHistoryBack = () => {
    setScreen('landing');
  };

  const handleHistoryItemSelect = (session) => {
    // For now, we'll just show the artifact with this session's data
    // In a full implementation, we might want to restore the session state
    setDecisionTitle(session.title);
    // Note: We're not restoring the full session state here for simplicity
    // In a production app, we would restore claims, assumptions, options, criteria
    setScreen('artifact');
  };

  return (
    <div className="App">
      {screen === 'landing' && <Landing
        onStart={handleStart}
        onViewHistory={handleViewHistory}
      />}
      {screen === 'framing' && <Framing
        onSkip={handleSkipFraming}
        onComplete={handleFramingComplete}
      />}
      {screen === 'active' && <ActiveSession
        decisionTitle={decisionTitle}
        onEnd={handleEndSession}
      />}
      {screen === 'processing' && <Processing />}
      {screen === 'artifact' && <Artifact
        decisionTitle={decisionTitle}
        onRestart={handleRestart}
      />}
      {screen === 'history' && <History
        history={history}
        onBack={handleHistoryBack}
        onSelect={handleHistoryItemSelect}
      />}
    </div>
  );
}

export default App;