

import { useState, useEffect, useRef, useCallback } from "react";

const WS_BASE_URL = "wss://undenunciatory-stratous-tandra.ngrok-free.dev/ws/voice";

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
  const nextStartTimeRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  // ── Init AudioContext ─────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.connect(audioContextRef.current.destination);
      console.log("[AUDIO] ✅ AudioContext created");
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
      console.log("[AUDIO] ▶️ AudioContext resumed");
    }
  }, []);

  // ── Play next audio chunk from queue ──────────────────────────────────────
  const playNextChunk = useCallback(async () => {
    if (!audioContextRef.current) {
      console.warn("[AUDIO] ⚠️ AudioContext not ready yet");
      return;
    }
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
      const audioBuffer = await audioContextRef.current.decodeAudioData(chunk.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current!);

      const ctx = audioContextRef.current;

      // Gapless scheduling
      const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
      nextStartTimeRef.current = startAt + audioBuffer.duration;

      // Record start time of first chunk for viseme sync
      if (isFirstChunkRef.current) {
        audioStartTimeRef.current = startAt;
        isFirstChunkRef.current = false;
        console.log("[AUDIO] ⏱️ First chunk starts at:", startAt);
        console.log("[AUDIO] 🎯 Duration:", audioBuffer.duration.toFixed(3), "s");
        console.log("[AUDIO] 📊 Visemes:", visemesRef.current.length);
      }

      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };

      source.start(startAt);
    } catch (e) {
      console.error("[AUDIO] ❌ Decode error:", e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  // ── Volume analysis loop ──────────────────────────────────────────────────
  useEffect(() => {
    let rafId: number;
    const data = new Uint8Array(64);

    const tick = () => {
      if (analyserRef.current && isTalking) {
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        volumeRef.current = sum / data.length / 128;
      } else {
        volumeRef.current = 0;
      }
      rafId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(rafId);
  }, [isTalking]);

  // ── WebSocket lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    const sessionId = makeSessionId();
    sessionIdRef.current = sessionId;
    console.log("[WS] 🔌 Connecting, session:", sessionId);

    let socket: WebSocket;
    try {
      socket = new WebSocket(`${WS_BASE_URL}/${sessionId}`);
      socket.binaryType = "arraybuffer";
    } catch (e) {
      console.error("[WS] ❌ Failed to create WebSocket:", e);
      return;
    }

    socket.onopen = () => {
      console.log("[WS] ✅ Connected");
      // init is now handled in sendMessage to avoid auto-greeting on reloads
    };

    socket.onerror = (err) => console.error("[WS] ❌ Error:", err);

    socket.onmessage = (event) => {

      // ── JSON control frames ─────────
      if (typeof event.data === "string") {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          console.warn("[WS] ⚠️ Non-JSON:", event.data);
          return;
        }

        console.log("[WS] 📨 Type:", msg.type);

        switch (msg.type) {

          case "transcript_partial":
            console.log("[WS] 🔄 Partial:", msg.text);
            break;

          case "transcript_final":
            console.log("[WS] 📝 Final:", msg.text);
            break;

          case "llm_reply":
            console.log("[WS] 🤖 LLM:", msg.text);
            break;

          case "audio_start":
            // Visemes arrive here BEFORE binary audio chunks
            console.log("[WS] audio_start, visemes:", msg.visemes?.length);

            if (msg.visemes && Array.isArray(msg.visemes) && msg.visemes.length > 0) {
              // Backend sends seconds already — safety check for ms
              const needsConversion = msg.visemes.some((v: Viseme) => v.time > 30);
              visemesRef.current = needsConversion
                ? msg.visemes.map((v: Viseme) => ({ ...v, time: v.time / 1000 }))
                : msg.visemes;

              console.log("[WS] ✅ Visemes ready:",
                `${visemesRef.current[0]?.viseme}@${visemesRef.current[0]?.time}s`,
                "→",
                `${visemesRef.current[visemesRef.current.length - 1]?.viseme}@${visemesRef.current[visemesRef.current.length - 1]?.time}s`
              );
            } else {
              visemesRef.current = [];
              console.warn("[WS] ⚠️ No visemes received");
            }

            // Reset timing for this response
            audioStartTimeRef.current = 0;
            nextStartTimeRef.current = 0;
            isFirstChunkRef.current = true;

            if (msg.text) setReplyText(msg.text);
            setIsLoading(false);

            // Init AudioContext NOW so it's ready when binary chunks arrive
            initAudio();
            break;

          case "audio_end":
            console.log("[WS] 🔇 audio_end, chunks:", msg.chunk_count, "bytes:", msg.total_bytes);
            setIsLoading(false);
            break;

          case "error":
            console.error("[WS] ❌ Server error:", msg.detail);
            setIsLoading(false);
            setIsTalking(false);
            break;

          default:
            console.log("[WS] ❓ Unknown:", msg.type);
        }
        return;
      }

      // ── Binary audio chunks ──────────────────────────────────────────
      if (event.data instanceof ArrayBuffer) {
        console.log("[WS] 🎵 Chunk:", event.data.byteLength, "bytes");
        audioQueueRef.current.push(event.data);
        if (audioContextRef.current) {
          playNextChunk();
        } else {
          console.warn("[WS] ⚠️ Chunk received but AudioContext not ready");
        }
      }
    };

    socket.onclose = (e) => {
      console.log("[WS] 🔌 Closed:", e.code, e.reason);
      setIsLoading(false);
    };

    socketRef.current = socket;

    return () => {
      socket.close();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [initAudio, playNextChunk]);

  // ── sendMessage — WebSocket ONLY, no REST ────────────────────────────────
  const sendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("[WS] ❌ Socket not open — cannot send");
      return;
    }

    console.log("[WS] 📤 Sending text_input:", message);

    // Reset all state before new response
    setIsLoading(true);
    setReplyText("");
    setIsTalking(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    visemesRef.current = [];
    isFirstChunkRef.current = true;
    nextStartTimeRef.current = 0;
    audioStartTimeRef.current = 0;

    // Flows: text_input → backend queue → LLM → TTS → visemes → audio_start → binary → audio_end

    // Initialize session on first message if not already done
    if (!isInitializedRef.current) {
      console.log("[WS] 📤 Sending init for first message");
      socket.send(JSON.stringify({
        type: "init",
        session_id: sessionIdRef.current,
      }));
      isInitializedRef.current = true;
    }

    socket.send(JSON.stringify({
      type: "text_input",
      text: message,
    }));
  }, []);

  return {
    sendMessage,
    replyText,
    isLoading,
    isTalking,
    volumeRef,
    visemesRef,
    audioStartTimeRef,
    audioContextRef,
  };
}


