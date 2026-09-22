console.log("useVoiceSession module loaded");
import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "../SessionContext";

const VOICE_SAMPLE_RATE = 24000;
const CAPTURE_WORKLET = `
  class CaptureProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.ratio = sampleRate / ${VOICE_SAMPLE_RATE};
      this.position = 0;
      this.previous = 0;
      this.source = null;
      this.output = null;
    }
    toPcm(samples, length) {
      const pcm = new Int16Array(length);
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i]));
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      return pcm;
    }
    process(inputs) {
      const channel = inputs[0]?.[0];
      if (!channel) return true;
      if (this.ratio === 1) {
        const pcm = this.toPcm(channel, channel.length);
        this.port.postMessage(pcm.buffer, [pcm.buffer]);
        return true;
      }
      const length = channel.length;
      if (!this.source || this.source.length < length + 1) {
        this.source = new Float32Array(length + 1);
        this.output = new Float32Array(Math.ceil((length + 1) / this.ratio) + 2);
      }
      this.source[0] = this.previous;
      this.source.set(channel, 1);
      let outputLength = 0;
      let position = this.position;
      while (position < length) {
        const index = Math.floor(position);
        const fraction = position - index;
        this.output[outputLength++] = this.source[index] +
          (this.source[index + 1] - this.source[index]) * fraction;
        position += this.ratio;
      }
      this.position = position - length;
      this.previous = channel[length - 1];
      if (outputLength) {
        const pcm = this.toPcm(this.output, outputLength);
        this.port.postMessage(pcm.buffer, [pcm.buffer]);
      }
      return true;
    }
  }
  registerProcessor('capture', CaptureProcessor);
`;

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

// Voice session hook using AssemblyAI Voice Agent API via token endpoint
// For production: set up a token service (see voice-agent-starter-js/deployment/browser/)
// For development: falls back to mock implementation if no token service available
const useVoiceSession = () => {
  console.log("useVoiceSession hook called");
  console.log("useVoiceSession: VITE_USE_MOCK_VOICE =", import.meta.env.VITE_USE_MOCK_VOICE);
  console.log("useVoiceSession: VITE_ASSEMBLYAI_API_KEY present =", !!import.meta.env.VITE_ASSEMBLYAI_API_KEY);
  console.log("useVoiceSession: VITE_ASSEMBLYAI_AGENT_ID present =", !!import.meta.env.VITE_ASSEMBLYAI_AGENT_ID);
  console.log("useVoiceSession: VITE_TOKEN_ENDPOINT =", import.meta.env.VITE_TOKEN_ENDPOINT);
  const { logClaim, logAssumption, logOption, logCriterion, options } =
    useSession();
  const [transcript, setTranscript] = useState([]); // array of { speaker: 'user'|'agent', text }
  const [agentQuestion, setAgentQuestion] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [lastLogged, setLastLogged] = useState(null); // { type: string, text: string }
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // 'disconnected', 'connecting', 'connected', 'error'
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const captureContextRef = useRef(null);
  const captureNodeRef = useRef(null);
  const captureSinkRef = useRef(null);
  const sentAudioPacketRef = useRef(false);
  const isUsingMockRef = useRef(false);
  const greetingShownRef = useRef(false);

  // Add a line to the transcript
  const addTranscriptLine = useCallback((speaker, text) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last?.speaker === speaker && last.text === normalizedText) return prev;
      return [...prev, { speaker, text: normalizedText }];
    });
    // Auto-scroll would be handled in component
  }, []);

  // Process user utterance for triggers (fallback/local processing)
  const processUserUtteranceLocally = useCallback(
    (text) => {
      addTranscriptLine("user", text);
      const lowerText = text.toLowerCase();
      let triggered = false;

      // Check for claim pattern: statements of fact without evidentiary markers
      const claimPatterns = [
        "i know",
        "it is true that",
        "the fact is that",
        "studies show",
        "research shows",
        "data shows",
        "according to",
        "in fact",
        "actually",
        "in reality",
      ];
      const hasClaimPattern = claimPatterns.some((pattern) =>
        lowerText.includes(pattern)
      );
      // If we detect a claim pattern, we log as a claim with hasEvidence=false (unless we see evidence markers)
      const evidenceMarkers = [
        "because",
        "since",
        "due to",
        "as evidenced by",
        "according to",
      ];
      const hasEvidence = evidenceMarkers.some((marker) =>
        lowerText.includes(marker)
      );
      if (hasClaimPattern) {
        logClaim(text, hasEvidence);
        setLastLogged({ type: "claim", text });
        addTranscriptLine(
          "agent",
          hasEvidence
            ? "Got it, that claim has evidence."
            : "How do you know that?"
        );
        setAgentQuestion(
          hasEvidence
            ? "Got it, that claim has evidence."
            : "How do you know that?"
        );
        triggered = true;
      }

      // Check for assumption pattern: "I think", "I believe", "I feel", "in my opinion"
      const assumptionPatterns = [
        "i think",
        "i believe",
        "i feel",
        "in my opinion",
        "i assume",
        "i suppose",
        "it seems",
        "apparently",
        "perhaps",
        "maybe",
      ];
      const hasAssumptionPattern = assumptionPatterns.some((pattern) =>
        lowerText.includes(pattern)
      );
      if (hasAssumptionPattern && !triggered) {
        logAssumption(text);
        setLastLogged({ type: "assumption", text });
        addTranscriptLine("agent", "What makes you believe that?");
        setAgentQuestion("What makes you believe that?");
        triggered = true;
      }

      // Check for option pattern: "option", "alternative", "choice", "another way"
      const optionPatterns = [
        "option",
        "alternative",
        "choice",
        "another way",
        "different approach",
        "else",
        "instead",
        "rather than",
      ];
      const hasOptionPattern = optionPatterns.some((pattern) =>
        lowerText.includes(pattern)
      );
      if (hasOptionPattern && !triggered) {
        // We'll log every option mention as an option
        logOption(text);
        setLastLogged({ type: "option", text });
        // Only ask about alternatives if this is the first (and so far only) option
        if (options.length === 0) {
          addTranscriptLine(
            "agent",
            "What's the alternative you're not considering?"
          );
          setAgentQuestion("What's the alternative you're not considering?");
        }
        triggered = true;
      }

      // Check for criterion pattern: "important", "must have", "need", "criteria", "what I want"
      const criterionPatterns = [
        "important",
        "must have",
        "need",
        "criteria",
        "what i want",
        "what matters",
        "key factor",
        "deal breaker",
        "essential",
        "requirement",
      ];
      const hasCriterionPattern = criterionPatterns.some((pattern) =>
        lowerText.includes(pattern)
      );
      if (hasCriterionPattern && !triggered) {
        logCriterion(text);
        setLastLogged({ type: "criterion", text });
        // We don't have access to criteria count, so we'll always ask the question for now
        addTranscriptLine("agent", "What would make this a win for you?");
        setAgentQuestion("What would make this a win for you?");
        triggered = true;
      }

    },
    [
      logClaim,
      logAssumption,
      logOption,
      logCriterion,
      addTranscriptLine,
      setLastLogged,
      options,
    ]
  );

  // Initialize connection
  useEffect(() => {
    // Get configuration from environment
    const apiKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY || "";
    const agentId = import.meta.env.VITE_ASSEMBLYAI_AGENT_ID || "";
    const tokenEndpoint = import.meta.env.VITE_TOKEN_ENDPOINT || "/token";
    const useMock = import.meta.env.VITE_USE_MOCK_VOICE === "true";

    // If explicitly set to use mock, or missing required config, use mock implementation
    if (useMock || !apiKey || !agentId) {
      if (useMock) {
        console.info(
          "Using mock voice implementation (VITE_USE_MOCK_VOICE=true)"
        );
      } else if (!apiKey) {
        console.warn(
          "AssemblyAI API key not found. Using mock implementation."
        );
      } else if (!agentId) {
        console.warn(
          "AssemblyAI Agent ID not found. Using mock implementation."
        );
      }

      setIsListening(true);
      addTranscriptLine(
        "agent",
        "Go ahead, I'm listening. (Mock mode - configure VITE_ASSEMBLYAI_API_KEY and VITE_ASSEMBLYAI_AGENT_ID for real voice)"
      );
      setConnectionStatus("connected");
      isUsingMockRef.current = true;
      return;
    }

    // Try to establish real connection
    const initializeConnection = async () => {
      try {
        setConnectionStatus("connecting");
        setError(null);
        isUsingMockRef.current = false;

        // Fetch token from endpoint
        console.log("useVoiceSession: Fetching token from", tokenEndpoint);
        let token;
        try {
          const tokenResponse = await fetch(tokenEndpoint);
          console.log("useVoiceSession: Token response status:", tokenResponse.status);
          if (!tokenResponse.ok) {
            throw new Error(`Failed to fetch token: ${tokenResponse.status}`);
          }
          const tokenData = await tokenResponse.json();
          console.log("useVoiceSession: Token data received:", tokenData);
          token = tokenData.token || tokenData.access_token;
          if (!token) {
            throw new Error("No token received from token endpoint");
          }
          console.log("useVoiceSession: Token extracted successfully");
        } catch (tokenError) {
          console.warn(
            "Token fetch failed, falling back to mock:",
            tokenError.message
          );
          throw tokenError; // Will be caught below to trigger fallback
        }

        // Create WebSocket connection to AssemblyAI
        console.log("useVoiceSession: Creating WebSocket connection to AssemblyAI");
        const wsUrl = new URL("wss://agents.assemblyai.com/v1/ws");
        wsUrl.searchParams.set("token", token);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("useVoiceSession: WebSocket connected to AssemblyAI");
          // Send session.update to specify which agent to use
          ws.send(
            JSON.stringify({
              type: "session.update",
              session: { agent_id: agentId },
            })
          );
        };

        ws.onmessage = (event) => {
          console.log("useVoiceSession: Received WebSocket message:", event.data);
          try {
            const msg = JSON.parse(event.data);
            handleAssemblyAIMessage(msg);
          } catch (parseError) {
            console.error("Failed to parse WebSocket message:", parseError);
          }
        };

        ws.onerror = (error) => {
          console.error("useVoiceSession: WebSocket error:", error);
          setConnectionStatus("error");
          setError(error.message || "WebSocket connection error");
          setIsListening(false);
          // Fallback to mock on connection error
          activateMockFallback("WebSocket connection error");
        };

        ws.onclose = () => {
          console.log("useVoiceSession: WebSocket closed");
          setConnectionStatus("disconnected");
          setIsListening(false);
          setAgentQuestion(null);
          // Clean up media recorder if active
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
          ) {
            mediaRecorderRef.current.stop();
          }
          // Only fallback to mock if we weren't already using mock and weren't stopped intentionally
          if (!isUsingMockRef.current && isListening) {
            activateMockFallback("Connection closed unexpectedly");
          }
        };
      } catch (err) {
        console.warn(
          "useVoiceSession: Failed to initialize voice session, falling back to mock:",
          err.message
        );
        activateMockFallback("Initialization failed: " + err.message);
      }
    };

    // Activate mock fallback
    const activateMockFallback = (reason) => {
      console.log("useVoiceSession: Activating mock fallback:", reason);
      setIsListening(true);
      addTranscriptLine(
        "agent",
        "Go ahead, I'm listening. (Fallback to mock mode - " + reason + ")"
      );
      setConnectionStatus("connected");
      isUsingMockRef.current = true;
    };

    initializeConnection();

    // Cleanup function
    return () => {
      console.log("useVoiceSession: Cleaning up voice session");
      isUsingMockRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    };
  }, []);

  // Handle incoming messages from AssemblyAI
  const handleAssemblyAIMessage = useCallback(
    (msg) => {
      console.log("useVoiceSession: Handling AssemblyAI message:", msg.type);
      switch (msg.type) {
        case "session.ready":
          console.log("useVoiceSession: Session ready");
          setConnectionStatus("connected");
          // The WebSocket being ready does not mean microphone capture has
          // started. Keep the start button visible until getUserMedia and the
          // AudioWorklet are initialized by the user's click.
          setIsListening(false);
          setError(null);
          if (!greetingShownRef.current) {
            addTranscriptLine("agent", "Go ahead, I'm listening.");
            greetingShownRef.current = true;
          }
          break;

        case "agent.error":
          console.error("Agent error:", msg.error);
          setConnectionStatus("error");
          setError(msg.error.message || "Agent error occurred");
          setIsListening(false);
          break;

        case "turn.is_formatted":
          // Handle intermediate transcript (user is speaking)
          if (msg.transcript?.trim()) {
            console.log("useVoiceSession: Received interim transcript:", msg.transcript);
            // Process locally for immediate feedback (agent will also process via tool invocation)
            processUserUtteranceLocally(msg.transcript);
          }
          break;

        case "turn.is_complete":
          // Handle finalized user transcript
          if (msg.transcript?.trim()) {
            console.log("useVoiceSession: Received complete transcript:", msg.transcript);
            // Process locally for immediate feedback (agent will also process via tool invocation)
            processUserUtteranceLocally(msg.transcript);
          }
          break;

        // Current AssemblyAI Voice Agent protocol events.
        // `transcript.user.delta` is interim text; `transcript.user` is final.
        case "transcript.user.delta":
          if (msg.text?.trim()) {
            console.log("useVoiceSession: Received interim user transcript:", msg.text);
          }
          break;

        case "transcript.user":
          if (msg.text?.trim()) {
            console.log("useVoiceSession: Received user transcript:", msg.text);
            processUserUtteranceLocally(msg.text);
          }
          break;

        case "transcript.agent":
          if (msg.text?.trim()) {
            setAgentQuestion(msg.text);
            addTranscriptLine("agent", msg.text);
          }
          break;

        case "agent.turn":
          // Handle agent's response/question
          if (msg?.text?.trim()) {
            console.log("useVoiceSession: Received agent text:", msg.text);
            setAgentQuestion(msg.text);
            addTranscriptLine("agent", msg.text);
          }
          break;

        case "agent.invoke":
          // Handle when agent invokes our logging tools
          console.log("useVoiceSession: Handling agent.invoke for tool:", msg.name);
          const { invocation_id, name: toolName, parameters: toolUse } = msg;
          switch (toolName) {
            case "log_claim":
              logClaim(toolUse.text, toolUse.has_evidence);
              setLastLogged({
                type: "claim",
                text: toolUse.text,
                hasEvidence: toolUse.has_evidence,
              });
              // Acknowledge the invocation
              wsRef.current?.send(
                JSON.stringify({
                  type: "agent.invoke.completed",
                  invocation_id,
                  status: "success",
                })
              );
              break;
            case "log_assumption":
              logAssumption(toolUse.text);
              setLastLogged({ type: "assumption", text: toolUse.text });
              wsRef.current?.send(
                JSON.stringify({
                  type: "agent.invoke.completed",
                  invocation_id,
                  status: "success",
                })
              );
              break;
            case "log_option":
              logOption(toolUse.text);
              setLastLogged({ type: "option", text: toolUse.text });
              wsRef.current?.send(
                JSON.stringify({
                  type: "agent.invoke.completed",
                  invocation_id,
                  status: "success",
                })
              );
              break;
            case "log_criterion":
              logCriterion(toolUse.text);
              setLastLogged({ type: "criterion", text: toolUse.text });
              wsRef.current?.send(
                JSON.stringify({
                  type: "agent.invoke.completed",
                  invocation_id,
                  status: "success",
                })
              );
              break;
          }
          break;
      }
    },
    [
      logClaim,
      logAssumption,
      logOption,
      logCriterion,
      addTranscriptLine,
      processUserUtteranceLocally,
      setLastLogged,
    ]
  );

  // Start listening (initialize audio capture)
  const startListening = useCallback(async () => {
    console.log("useVoiceSession: startListening called");
    console.log("useVoiceSession: isUsingMockRef.current =", isUsingMockRef.current);
    // If using mock, just set state and return
    if (isUsingMockRef.current) {
      console.log("useVoiceSession: Using mock, setting isListening to true");
      setIsListening(true);
      return;
    }

    try {
      console.log("useVoiceSession: Requesting microphone access");
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is unavailable. Use HTTPS or localhost.");
      }

      // AssemblyAI Voice Agent expects base64-encoded PCM16, not WebM/Opus.
      // Create the context from the user gesture so Safari will allow it.
      const captureContext = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE });
      await captureContext.resume();
      const workletUrl = URL.createObjectURL(
        new Blob([CAPTURE_WORKLET], { type: "application/javascript" })
      );
      try {
        await captureContext.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      microphoneStreamRef.current = stream;
      captureContextRef.current = captureContext;
      const captureNode = new AudioWorkletNode(captureContext, "capture");
      captureNodeRef.current = captureNode;
      captureNode.port.onmessage = ({ data }) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          if (!sentAudioPacketRef.current) {
            console.log("useVoiceSession: Sending microphone PCM audio");
            sentAudioPacketRef.current = true;
          }
          wsRef.current.send(JSON.stringify({ type: "input.audio", audio: toBase64(data) }));
        }
      };
      captureContext.createMediaStreamSource(stream).connect(captureNode);
      // Keep the worklet in the render graph. The zero-gain sink prevents
      // microphone feedback while ensuring browsers continue pulling audio.
      const captureSink = captureContext.createGain();
      captureSink.gain.value = 0;
      captureNode.connect(captureSink).connect(captureContext.destination);
      captureSinkRef.current = captureSink;
      setIsListening(true);
    } catch (err) {
      console.error("useVoiceSession: Failed to access microphone:", err);
      setConnectionStatus("error");
      setError("Failed to access microphone: " + err.message);
      setIsListening(false);

      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
      captureContextRef.current?.close();
      captureContextRef.current = null;
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    captureNodeRef.current?.disconnect();
    captureNodeRef.current = null;
    captureSinkRef.current?.disconnect();
    captureSinkRef.current = null;
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    captureContextRef.current?.close();
    captureContextRef.current = null;

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsListening(false);
    setConnectionStatus("disconnected");
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
    setConnectionStatus("disconnected");
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
    isUsingMock: isUsingMockRef.current,
  };
};

export default useVoiceSession;
