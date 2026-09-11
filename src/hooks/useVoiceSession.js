import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from '../SessionContext';

// Voice session hook using AssemblyAI Voice Agent API via token endpoint
// For production: set up a token service (see voice-agent-starter-js/deployment/browser/)
// For development: falls back to mock implementation if no token service available
const useVoiceSession = () => {
  const { logClaim, logAssumption, logOption, logCriterion, options } = useSession();
  const [transcript, setTranscript] = useState([]); // array of { speaker: 'user'|'agent', text }
  const [agentQuestion, setAgentQuestion] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [lastLogged, setLastLogged] = useState(null); // { type: string, text: string }
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const isUsingMockRef = useRef(false);

  // Add a line to the transcript
  const addTranscriptLine = useCallback((speaker, text) => {
    setTranscript(prev => [
      ...prev,
      { speaker, text: text.trim() },
    ]);
    // Auto-scroll would be handled in component
  }, []);

  // Process user utterance for triggers (fallback/local processing)
  const processUserUtteranceLocally = useCallback((text) => {
    const lowerText = text.toLowerCase();
    let triggered = false;

    // Check for claim pattern: statements of fact without evidentiary markers
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

  // Initialize connection
  useEffect(() => {
    // Get configuration from environment
    const apiKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY || '';
    const agentId = import.meta.env.VITE_ASSEMBLYAI_AGENT_ID || '';
    const tokenEndpoint = import.meta.env.VITE_TOKEN_ENDPOINT || '/token';
    const useMock = import.meta.env.VITE_USE_MOCK_VOICE === 'true';

    // If explicitly set to use mock, or missing required config, use mock implementation
    if (useMock || !apiKey || !agentId) {
      if (useMock) {
        console.info('Using mock voice implementation (VITE_USE_MOCK_VOICE=true)');
      } else if (!apiKey) {
        console.warn('AssemblyAI API key not found. Using mock implementation.');
      } else if (!agentId) {
        console.warn('AssemblyAI Agent ID not found. Using mock implementation.');
      }

      setIsListening(true);
      addTranscriptLine('agent', 'Go ahead, I\'m listening. (Mock mode - configure VITE_ASSEMBLYAI_API_KEY and VITE_ASSEMBLYAI_AGENT_ID for real voice)');
      setConnectionStatus('connected');
      isUsingMockRef.current = true;
      return;
    }

    // Try to establish real connection
    const initializeConnection = async () => {
      try {
        setConnectionStatus('connecting');
        setError(null);
        isUsingMockRef.current = false;

        // Fetch token from endpoint
        let token;
        try {
          const tokenResponse = await fetch(tokenEndpoint);
          if (!tokenResponse.ok) {
            throw new Error(`Failed to fetch token: ${tokenResponse.status}`);
          }
          const tokenData = await tokenResponse.json();
          token = tokenData.token || tokenData.access_token;
          if (!token) {
            throw new Error('No token received from token endpoint');
          }
        } catch (tokenError) {
          console.warn('Token fetch failed, falling back to mock:', tokenError.message);
          throw tokenError; // Will be caught below to trigger fallback
        }

        // Create WebSocket connection to AssemblyAI
        const ws = new WebSocket('wss://agents.assemblyai.com/v1/ws');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected to AssemblyAI');
          // Send session.update to specify which agent to use
          ws.send(JSON.stringify({
            type: 'session.update',
            session: { agent_id: agentId }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleAssemblyAIMessage(msg);
          } catch (parseError) {
            console.error('Failed to parse WebSocket message:', parseError);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('error');
          setError(error.message || 'WebSocket connection error');
          setIsListening(false);
          // Fallback to mock on connection error
          activateMockFallback('WebSocket connection error');
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          setConnectionStatus('disconnected');
          setIsListening(false);
          setAgentQuestion(null);
          // Clean up media recorder if active
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          // Only fallback to mock if we weren't already using mock and weren't stopped intentionally
          if (!isUsingMockRef.current && isListening) {
            activateMockFallback('Connection closed unexpectedly');
          }
        };

      } catch (err) {
        console.warn('Failed to initialize voice session, falling back to mock:', err.message);
        activateMockFallback('Initialization failed: ' + err.message);
      }
    };

    // Activate mock fallback
    const activateMockFallback = (reason) => {
      console.info(`Activating mock fallback: ${reason}`);
      setIsListening(true);
      addTranscriptLine('agent', 'Go ahead, I\'m listening. (Fallback to mock mode - ' + reason + ')');
      setConnectionStatus('connected');
      isUsingMockRef.current = true;
    };

    initializeConnection();

    // Cleanup function
    return () => {
      isUsingMockRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    };
  }, []);

  // Handle incoming messages from AssemblyAI
  const handleAssemblyAIMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'session.ready':
        setConnectionStatus('connected');
        setIsListening(true);
        setError(null);
        addTranscriptLine('agent', 'Go ahead, I\'m listening.');
        break;

      case 'agent.error':
        console.error('Agent error:', msg.error);
        setConnectionStatus('error');
        setError(msg.error.message || 'Agent error occurred');
        setIsListening(false);
        break;

      case 'turn.is_formatted':
        // Handle intermediate transcript (user is speaking)
        if (msg.transcript?.trim()) {
          addTranscriptLine('user', msg.transcript);
          // Process locally for immediate feedback (agent will also process via tool invocation)
          processUserUtteranceLocally(msg.transcript);
        }
        break;

      case 'turn.is_complete':
        // Handle finalized user transcript
        if (msg.transcript?.trim()) {
          addTranscriptLine('user', msg.transcript);
          // Process locally for immediate feedback (agent will also process via tool invocation)
          processUserUtteranceLocally(msg.transcript);
        }
        break;

      case 'agent.turn':
        // Handle agent's response/question
        if (msg?.text?.trim()) {
          setAgentQuestion(msg.text);
          addTranscriptLine('agent', msg.text);
        }
        break;

      case 'agent.invoke':
        // Handle when agent invokes our logging tools
        const { invocation_id, name: toolName, parameters: toolUse } = msg;
        switch (toolName) {
          case 'log_claim':
            logClaim(toolUse.text, toolUse.has_evidence);
            setLastLogged({ type: 'claim', text: toolUse.text, hasEvidence: toolUse.has_evidence });
            // Acknowledge the invocation
            wsRef.current?.send(JSON.stringify({
              type: 'agent.invoke.completed',
              invocation_id,
              status: 'success'
            }));
            break;
          case 'log_assumption':
            logAssumption(toolUse.text);
            setLastLogged({ type: 'assumption', text: toolUse.text });
            wsRef.current?.send(JSON.stringify({
              type: 'agent.invoke.completed',
              invocation_id,
              status: 'success'
            }));
            break;
          case 'log_option':
            logOption(toolUse.text);
            setLastLogged({ type: 'option', text: toolUse.text });
            wsRef.current?.send(JSON.stringify({
              type: 'agent.invoke.completed',
              invocation_id,
              status: 'success'
            }));
            break;
          case 'log_criterion':
            logCriterion(toolUse.text);
            setLastLogged({ type: 'criterion', text: toolUse.text });
            wsRef.current?.send(JSON.stringify({
              type: 'agent.invoke.completed',
              invocation_id,
              status: 'success'
            }));
            break;
        }
        break;
    }
  }, [logClaim, logAssumption, logOption, logCriterion, addTranscriptLine, processUserUtteranceLocally, setLastLogged]);

  // Start listening (initialize audio capture)
  const startListening = useCallback(async () => {
    // If using mock, just set state and return
    if (isUsingMockRef.current) {
      setIsListening(true);
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // AssemblyAI expects 16kHz or 24kHz, 16kHz is widely supported
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      // Create MediaRecorder to capture audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        timeslice: 100 // Send chunks every 100ms
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert to base64 and send via WebSocket
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = btoa(reader.result);
            wsRef.current.send(JSON.stringify({
              type: 'input.audio',
              audio: base64Audio
            }));
          };
          reader.readAsBinaryString(event.data);
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        setConnectionStatus('error');
        setError('Microphone recording error: ' + error.message);
        setIsListening(false);
        // Fallback to mock on media error
        activateMockFallback('Microphone error');
      };

      mediaRecorder.start();
      setIsListening(true);

    } catch (err) {
      console.error('Failed to access microphone:', err);
      setConnectionStatus('error');
      setError('Failed to access microphone: ' + err.message);
      setIsListening(false);

      // Fallback to enhanced mock implementation
      setIsListening(true);
      addTranscriptLine('agent', 'Go ahead, I\'m listening. (Fallback to mock mode - mic access failed)');
      setConnectionStatus('connected');
      isUsingMockRef.current = true;
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsListening(false);
    setConnectionStatus('disconnected');
    setAgentQuestion(null);
    setError(null);
    isUsingMockRef.current = false;
  }, []);

  // Reset session
  const reset = useCallback(() => {
    setTranscript([]);
    setAgentQuestion(null);
    setIsListening(false);
    setLastLogged(null);
    setConnectionStatus('disconnected');
    setError(null);
    isUsingMockRef.current = false;

    // Stop listening if active
    stopListening();
  }, [stopListening]);

  // Return the voice session hook values
  return {
    transcript,
    agentQuestion,
    isListening,
    startListening,
    stopListening,
    processUserUtterance: processUserUtteranceLocally, // For manual input fallback
    reset,
    addTranscriptLine,
    lastLogged,
    connectionStatus,
    error,
    isUsingMock: isUsingMockRef.current
  };
};

export default useVoiceSession;