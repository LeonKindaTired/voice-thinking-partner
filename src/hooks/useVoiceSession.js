import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from '../SessionContext';
import { AssemblyAI } from 'assemblyai';

// Enhanced voice session hook with AssemblyAI Voice Agent API integration
const useVoiceSession = () => {
  const { logClaim, logAssumption, logOption, logCriterion, options } = useSession();
  const [transcript, setTranscript] = useState([]); // array of { speaker: 'user'|'agent', text }
  const [agentQuestion, setAgentQuestion] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [lastLogged, setLastLogged] = useState(null); // { type: string, text: string }
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [error, setError] = useState(null);

  const assemblyAIRef = useRef(null);
  const voiceAgentRef = useRef(null);

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

  // Initialize AssemblyAI connection
  useEffect(() => {
    // Get API key from environment variable or config
    // In a real app, this would come from a secure config
    const apiKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY || '';

    if (!apiKey) {
      console.warn('AssemblyAI API key not found. Using enhanced mock implementation.');
      return;
    }

    try {
      // Initialize AssemblyAI client
      assemblyAIRef.current = new AssemblyAI({ apiKey });
    } catch (err) {
      console.error('Failed to initialize AssemblyAI:', err);
      setError('Failed to initialize AssemblyAI');
      setConnectionStatus('error');
    }
  }, []);

  // Start listening with AssemblyAI Voice Agent API (or enhanced mock)
  const startListening = useCallback(async () => {
    if (!assemblyAIRef.current) {
      console.warn('AssemblyAI not initialized. Using enhanced mock implementation.');
      setIsListening(true);
      addTranscriptLine('agent', 'Go ahead, I\'m listening. (Enhanced mock mode - ready for AssemblyAI integration)');
      setConnectionStatus('connected');
      return;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Get agent ID from env
      const agentId = import.meta.env.VITE_ASSEMBLYAI_AGENT_ID || 'voice-thinking-partner-agent';

      // Define the tools for the Voice Agent API
      const tools = [
        {
          type: 'function',
          function: {
            name: 'log_claim',
            description: 'Log a claim made by the user',
            parameters: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The claim text'
                },
                has_evidence: {
                  type: 'boolean',
                  description: 'Whether the claim was supported by evidence'
                }
              },
              required: ['text', 'has_evidence']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'log_assumption',
            description: 'Log an assumption made by the user',
            parameters: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The assumption text'
                }
              },
              required: ['text']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'log_option',
            description: 'Log an option mentioned by the user',
            parameters: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The option text'
                }
              },
              required: ['text']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'log_criterion',
            description: 'Log a criterion mentioned by the user',
            parameters: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The criterion text'
                }
              },
              required: ['text']
            }
          }
        }
      ];

      try {
        voiceAgentRef.current = assemblyAIRef.current.voiceAgent.create({
          agentId,
          tools: tools,

          // Connection lifecycle events
          onOpen: () => {
            setConnectionStatus('connected');
            setIsListening(true);
            addTranscriptLine('agent', 'Go ahead, I\'m listening.');
          },
          onClose: () => {
            setConnectionStatus('disconnected');
            setIsListening(false);
          },
          onError: (error) => {
            console.error('Voice Agent connection error:', error);
            setConnectionStatus('error');
            setError(error.message || 'Connection failed');
            setIsListening(false);
          },

          // Real-time transcription from user
          onTranscript: (transcriptEvent) => {
            if (transcriptEvent.user_transcript?.trim()) {
              addTranscriptLine('user', transcriptEvent.user_transcript);
              // Process for trigger detection locally (optional, as agent will also invoke tools)
              // We keep local processing for fallback and to ensure we capture utterances even if tool invocation fails
              processUserUtteranceLocally(transcriptEvent.user_transcript);
            }
          },

          // Handle when the agent invokes our logging tools
          onToolInvocation: (toolInvocation) => {
            const { tool_name: toolName, tool_use: toolUse } = toolInvocation;

            switch (toolName) {
              case 'log_claim':
                logClaim(toolUse.text, toolUse.has_evidence);
                setLastLogged({ type: 'claim', text: toolUse.text, hasEvidence: toolUse.has_evidence });
                break;
              case 'log_assumption':
                logAssumption(toolUse.text);
                setLastLogged({ type: 'assumption', text: toolUse.text });
                break;
              case 'log_option':
                logOption(toolUse.text);
                setLastLogged({ type: 'option', text: toolUse.text });
                // "Only one option" trigger would be handled based on current options state
                break;
              case 'log_criterion':
                logCriterion(toolUse.text);
                setLastLogged({ type: 'criterion', text: toolUse.text });
                break;
            }
          },

          // Handle agent's speech responses
          onAgentResponse: (agentResponse) => {
            if (agentResponse?.trim()) {
              setAgentQuestion(agentResponse);
              addTranscriptLine('agent', agentResponse);
            }
          }
        });
      } catch (err) {
        console.error('Failed to create voice agent:', err);
        throw err;
      }
    } catch (err) {
      console.error('Failed to start voice session:', err);
      setError(err.message || 'Failed to start voice session');
      setConnectionStatus('error');
      setIsListening(false);

      // Fallback to enhanced mock implementation
      setIsListening(true);
      addTranscriptLine('agent', 'Go ahead, I\'m listening. (Fallback enhanced mock mode)');
      setConnectionStatus('connected');
    }
  }, [assemblyAIRef.current, logClaim, logAssumption, logOption, logCriterion, addTranscriptLine, setLastLogged, options, processUserUtteranceLocally]);

  // Stop listening
  const stopListening = useCallback(() => {
    // Close the voice agent connection if it exists
    if (voiceAgentRef.current) {
      try {
        voiceAgentRef.current.close();
        voiceAgentRef.current = null;
      } catch (err) {
        console.error('Error closing voice agent:', err);
      }
    }

    setIsListening(false);
    setConnectionStatus('disconnected');
    setAgentQuestion(null);
    setError(null);
  }, []);

  // Reset session
  const reset = useCallback(() => {
    setTranscript([]);
    setAgentQuestion(null);
    setIsListening(false);
    setLastLogged(null);
    setConnectionStatus('disconnected');
    setError(null);

    // Close voice agent connection if open
    if (voiceAgentRef.current) {
      try {
        voiceAgentRef.current.close();
        voiceAgentRef.current = null;
      } catch (err) {
        console.error('Error closing voice agent during reset:', err);
      }
    }
  }, []);

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
    error
  };
};

export default useVoiceSession;