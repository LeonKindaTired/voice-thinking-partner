import React, { useState, useEffect, useRef } from 'react';
import useVoiceSession from '../hooks/useVoiceSession';
import { useSession } from '../SessionContext';

const ActiveSession = ({ decisionTitle, onEnd }) => {
  const {
    transcript,
    agentQuestion,
    isListening,
    startListening,
    stopListening,
    processUserUtterance,
    reset,
    addTranscriptLine,
    lastLogged,
  } = useVoiceSession();
  const { resetSession } = useSession();
  const [userInput, setUserInput] = useState('');
  const [feedbackChips, setFeedbackChips] = useState([]); // chips to display
  const scrollRef = useRef(null);

  // Add a chip when lastLogged changes with animation
  useEffect(() => {
    if (lastLogged) {
      const chip = {
        id: Date.now(), // simple unique id
        type: lastLogged.type,
        text: lastLogged.text,
        animated: true // for animation
      };
      setFeedbackChips(prev => [chip, ...prev.slice(0, 4)]); // keep max 5 chips
    }
  }, [lastLogged]);

  // Remove animation class after animation ends
  useEffect(() => {
    const timer = setTimeout(() => {
      setFeedbackChips(prev => prev.map(chip => ({ ...chip, animated: false })));
    }, 500); // match CSS animation duration
    return () => clearTimeout(timer);
  }, [feedbackChips]);

  const handleStartListening = () => {
    startListening();
    // In a real implementation, we would start the microphone and AssemblyAI connection
  };

  const handleStopListening = () => {
    stopListening();
    onEnd(); // end the session when user stops listening
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim()) {
      // Process the user input as if it was transcribed speech
      processUserUtterance(userInput);
      setUserInput('');
    }
  };

  // Scroll to bottom of transcript when it changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="active-session-screen">
      <div className="header">
        <h2>{decisionTitle || 'What are you deciding?'}</h2>
        <button className="end-button" onClick={handleStopListening}>
          End session
        </button>
      </div>
      <div className="content">
        <div className="transcript-box" ref={scrollRef}>
          {transcript.map((line, index) => (
            <div key={index} className={`transcript-line ${line.speaker}`}>
              <strong>{line.speaker === 'user' ? 'You' : 'Agent'}:</strong> {line.text}
            </div>
          ))}
        </div>
        <div className="feedback-chip-tray">
          {feedbackChips.map((chip, index) => (
            <span
              key={chip.id}
              className={`chip chip-${chip.type} ${chip.animated ? 'animate-in' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {chip.type === 'claim' && !chip.text.toLowerCase().includes('evidence') && '(no evidence)'}
              {chip.text}
            </span>
          ))}
        </div>
        {!isListening && (
          <div className="input-area">
            <button onClick={handleStartListening} className="listen-button">
              Start Listening
            </button>
          </div>
        )}
        {isListening && (
          <div className="listening-indicator">
            <div className="waveform">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
            <p>Listening...</p>
          </div>
        )}
        {agentQuestion && (
          <div className="agent-question">
            <p>Agent: {agentQuestion}</p>
          </div>
        )}
        {!isListening && userInput && (
          <div className="user-input-preview">
            <p>You said: {userInput}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="user-input-form">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type what you would say and press Enter"
            disabled={!isListening}
          />
          <button type="submit" disabled={!isListening || !userInput.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ActiveSession;