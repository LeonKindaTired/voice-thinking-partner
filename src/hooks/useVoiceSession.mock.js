import { useState, useCallback } from 'react';
import { useSession } from '../SessionContext';

// Simple keyword-based trigger logic for mock
const useVoiceSession = () => {
  const { logClaim, logAssumption, logOption, logCriterion, options } = useSession();
  const [transcript, setTranscript] = useState([]); // array of { speaker: 'user'|'agent', text }
  const [agentQuestion, setAgentQuestion] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [lastLogged, setLastLogged] = useState(null); // { type: string, text: string }

  // Add a line to the transcript
  const addTranscriptLine = useCallback((speaker, text) => {
    setTranscript(prev => [
      ...prev,
      { speaker, text: text.trim() },
    ]);
    // Auto-scroll would be handled in component
  }, []);

  // Process user utterance for triggers
  const processUserUtterance = useCallback((text) => {
    const lowerText = text.toLowerCase();
    let triggered = false;

    // Check for claim pattern: statements of fact without evidentiary markers
    // Simple: if the sentence starts with "I know", "It is true that", "The fact is that", etc.
    const claimPatterns = [
      'i know', 'it is true that', 'the fact is that', 'studies show', 'research shows',
      'data shows', 'according to', 'in fact', 'actually', 'in reality'
    ];
    const hasClaimPattern = claimPatterns.some(pattern => lowerText.includes(pattern));
    // If we detect a claim pattern, we log as a claim with hasEvidence=false (unless we see evidence markers)
    const evidenceMarkers = ['because', 'since', 'due to', 'as evidenced by', 'according to'];
    const hasEvidence = evidenceMarkers.some(marker => lowerText.includes(marker));
    if (hasClaimPattern) {
      logClaim(text, hasEvidence);
      setLastLogged({ type: 'claim', text });
      addTranscriptLine('agent', hasEvidence ? 'Got it, that claim has evidence.' : 'How do you know that?');
      setAgentQuestion(hasEvidence ? 'Got it, that claim has evidence.' : 'How do you know that?');
      triggered = true;
    }

    // Check for assumption pattern: "I think", "I believe", "I feel", "in my opinion"
    const assumptionPatterns = [
      'i think', 'i believe', 'i feel', 'in my opinion', 'i assume', 'i suppose',
      'it seems', 'apparently', 'perhaps', 'maybe'
    ];
    const hasAssumptionPattern = assumptionPatterns.some(pattern => lowerText.includes(pattern));
    if (hasAssumptionPattern && !triggered) {
      logAssumption(text);
      setLastLogged({ type: 'assumption', text });
      addTranscriptLine('agent', 'What makes you believe that?');
      setAgentQuestion('What makes you believe that?');
      triggered = true;
    }

    // Check for option pattern: "option", "alternative", "choice", "another way"
    const optionPatterns = [
      'option', 'alternative', 'choice', 'another way', 'different approach',
      'else', 'instead', 'rather than'
    ];
    const hasOptionPattern = optionPatterns.some(pattern => lowerText.includes(pattern));
    if (hasOptionPattern && !triggered) {
      // We'll log every option mention as an option
      logOption(text);
      setLastLogged({ type: 'option', text });
      // Only ask about alternatives if this is the first (and so far only) option
      if (options.length === 0) {
        addTranscriptLine('agent', 'What\'s the alternative you\'re not considering?');
        setAgentQuestion('What\'s the alternative you\'re not considering?');
      }
      triggered = true;
    }

    // Check for criterion pattern: "important", "must have", "need", "criteria", "what I want"
    const criterionPatterns = [
      'important', 'must have', 'need', 'criteria', 'what i want', 'what matters',
      'key factor', 'deal breaker', 'essential', 'requirement'
    ];
    const hasCriterionPattern = criterionPatterns.some(pattern => lowerText.includes(pattern));
    if (hasCriterionPattern && !triggered) {
      logCriterion(text);
      setLastLogged({ type: 'criterion', text });
      // We don't have access to criteria count, so we'll always ask the question for now
      addTranscriptLine('agent', 'What would make this a win for you?');
      setAgentQuestion('What would make this a win for you?');
      triggered = true;
    }

    // If no trigger matched, we just log the utterance as a regular transcript line
    if (!triggered) {
      addTranscriptLine('user', text);
    }
  }, [logClaim, logAssumption, logOption, logCriterion, addTranscriptLine, setLastLogged, options]);

  // Start listening (mock)
  const startListening = useCallback(() => {
    setIsListening(true);
    addTranscriptLine('agent', 'Go ahead, I\'m listening.');
  }, [addTranscriptLine]);

  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  // Reset session
  const reset = useCallback(() => {
    setTranscript([]);
    setAgentQuestion(null);
    setIsListening(false);
    setLastLogged(null);
  }, []);

  return {
    transcript,
    agentQuestion,
    isListening,
    startListening,
    stopListening,
    processUserUtterance,
    reset,
    addTranscriptLine, // for direct user input in mock
    lastLogged,
  };
};

export default useVoiceSession;