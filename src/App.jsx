import React, { useState } from 'react';
import './App.css';
import { useSession } from './SessionContext';
import Landing from './components/Landing';
import Framing from './components/Framing';
import ActiveSession from './components/ActiveSession';
import Processing from './components/Processing';
import Artifact from './components/Artifact';

function App() {
  const [screen, setScreen] = useState('landing');
  const [decisionTitle, setDecisionTitle] = useState('');
  const { resetSession } = useSession();

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

  return (
    <div className="App">
      {screen === 'landing' && <Landing onStart={handleStart} />}
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
    </div>
  );
}

export default App;