

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE_URL = "https://undenunciatory-stratous-tandra.ngrok-free.dev";
const WS_BASE_URL = "wss://undenunciatory-stratous-tandra.ngrok-free.dev/ws/voice";

// Generate SESSION_ID inside a function so StrictMode double-invoke doesn't conflict
function makeSessionId() {
  return Math.random().toString(36).substring(7);
}

interface Viseme {
  time: number;
  viseme: string;
  value: number;
}

export default function useChatAudio() {
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Use a ref for volume to prevent 60fps re-renders of the entire App
  const volumeRef = useRef(0);

  const sessionIdRef = useRef<string>("");
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const visemesRef = useRef<Viseme[]>([]);
  const audioStartTimeRef = useRef<number>(0);
  const isFirstChunkRef = useRef<boolean>(true);

  // FIX #3: Track next scheduled start time for gapless playback
  const nextStartTimeRef = useRef<number>(0);

  // FIX #4: Track whether viseme times are in ms or seconds
  const visemeTimeUnitRef = useRef<"ms" | "s">("s");

  // Initialize AudioContext on first use
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  // FIX #3 + #1: Gapless scheduled playback — no gaps between chunks, accurate start time
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current) return;
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsTalking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsTalking(true);

    const chunk = audioQueueRef.current.shift()!;

    try {
      // Clone the buffer before decoding — decodeAudioData detaches the original
      const cloned = chunk.slice(0);
      const audioBuffer = await audioContextRef.current!.decodeAudioData(cloned);
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current!);

      const ctx = audioContextRef.current!;

      // FIX #3: Schedule gaplessly using next available slot
      const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
      nextStartTimeRef.current = startAt + audioBuffer.duration;

      // FIX #1: audioStartTimeRef is now the exact scheduled start time of first chunk
      if (isFirstChunkRef.current) {
        audioStartTimeRef.current = startAt;
        isFirstChunkRef.current = false;
        console.log("⏱️ Audio scheduled to start at:", startAt, "currentTime:", ctx.currentTime);
      }

      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };

      // FIX #1: start at the scheduled time, NOT start(0) which has variable delay
      source.start(startAt);
    } catch (e) {
      console.error("Error decoding audio chunk:", e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  // Real-time volume analysis
  useEffect(() => {
    let animationFrameId: number;
    const dataArray = new Uint8Array(64);

    const updateVolume = () => {
      if (analyserRef.current && isTalking) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        volumeRef.current = sum / dataArray.length / 128;
      } else {
        volumeRef.current = 0;
      }
      animationFrameId = requestAnimationFrame(updateVolume);
    };

    updateVolume();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isTalking]);

  useEffect(() => {
    // FIX: Session ID created per effect run, not module-level
    const sessionId = makeSessionId();
    sessionIdRef.current = sessionId;

    console.log("Connecting to WS with session:", sessionId);
    let socket: WebSocket;

    try {
      socket = new WebSocket(`${WS_BASE_URL}/${sessionId}`);
      socket.binaryType = "arraybuffer";
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
      return;
    }

    socket.onopen = () => {
      console.log("✅ [WS] Connected");
      socket.send(JSON.stringify({ type: "init", session_id: sessionId }));
    };

    socket.onerror = (error) => {
      console.error("[WS] Connection error:", error);
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "audio_start") {
            console.log("[WS] audio_start received");

            if (msg.visemes && Array.isArray(msg.visemes) && msg.visemes.length > 0) {
              // FIX #4: Auto-detect viseme time unit
              // If the first viseme time > 5, it's almost certainly milliseconds
              const firstTime = msg.visemes[0].time;
              visemeTimeUnitRef.current = firstTime > 5 ? "ms" : "s";
              console.log(`[WS] Viseme time unit detected: ${visemeTimeUnitRef.current} (first time: ${firstTime})`);
              visemesRef.current = msg.visemes;
            } else {
              visemesRef.current = [];
            }

            // Reset playback state
            audioStartTimeRef.current = 0;
            nextStartTimeRef.current = 0;
            isFirstChunkRef.current = true;
            setIsLoading(false);
            if (msg.text) setReplyText(msg.text);
            initAudio();
          }

          if (msg.type === "audio_end") {
            console.log("[WS] audio_end");
            setIsLoading(false);
          }
        } catch (e) {
          console.log("[WS] Non-JSON string:", event.data);
          if (event.data.trim().toUpperCase() === "END") setIsLoading(false);
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        console.log("[WS] Binary audio chunk:", event.data.byteLength, "bytes");
        audioQueueRef.current.push(event.data);
        if (audioContextRef.current) playNextChunk();
      }
    };

    socket.onclose = (event) => {
      console.log("[WS] Closed:", event.code, event.reason);
      setIsLoading(false);
    };

    socketRef.current = socket;

    return () => {
      socket.close();
      // FIX: Clean up AudioContext on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [initAudio, playNextChunk]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    console.log("[Chat] Sending:", message);
    setIsLoading(true);
    setReplyText("");

    // Reset all playback state
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    visemesRef.current = [];
    isFirstChunkRef.current = true;
    nextStartTimeRef.current = 0;
    audioStartTimeRef.current = 0;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionIdRef.current, message }),
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      setIsLoading(false);
      initAudio();

      const encodedText = response.headers.get("x-reply-text");
      if (encodedText) setReplyText(decodeURIComponent(encodedText));

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            audioQueueRef.current.push(value.buffer.slice(0));
            if (audioContextRef.current) playNextChunk();
          }
        }
      }
    } catch (err) {
      console.error("[Chat] Send Error:", err);
      setIsLoading(false);
      setIsTalking(false);
    }
  };

  return {
    sendMessage,
    replyText,
    isLoading,
    isTalking,
    volumeRef,
    visemesRef,
    audioStartTimeRef,
    audioContextRef,
    visemeTimeUnitRef,
  };
}
