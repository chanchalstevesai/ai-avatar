import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatAudioHook, Viseme } from "../types/chat";
import { WS_BASE_URL } from "../constants/config";

function makeSessionId() {
  return Math.random().toString(36).substring(7);
}

export default function useChatAudio(): ChatAudioHook {
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
        console.log("[AUDIO] First chunk starts at:", startAt);
      }

      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };

      source.start(startAt);
    } catch (e) {
      console.error("[AUDIO] Decode error:", e);
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
      console.error("[WS] Failed to create WebSocket:", e);
      return;
    }

    socket.onopen = () => {
      console.log("[WS] Connected");
      // init is handled in sendMessage
    };

    socket.onerror = (err) => console.error("[WS] Error:", err);

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case "audio_start":
            if (msg.visemes && Array.isArray(msg.visemes) && msg.visemes.length > 0) {
              const needsConversion = msg.visemes.some((v: Viseme) => v.time > 30);
              visemesRef.current = needsConversion
                ? msg.visemes.map((v: Viseme) => ({ ...v, time: v.time / 1000 }))
                : msg.visemes;
            } else {
              visemesRef.current = [];
            }

            audioStartTimeRef.current = 0;
            nextStartTimeRef.current = 0;
            isFirstChunkRef.current = true;

            if (msg.text) setReplyText(msg.text);
            setIsLoading(false);
            initAudio();
            break;

          case "audio_end":
            setIsLoading(false);
            break;

          case "error":
            console.error("[WS] Server error:", msg.detail);
            setIsLoading(false);
            setIsTalking(false);
            break;
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        audioQueueRef.current.push(event.data);
        if (audioContextRef.current) {
          playNextChunk();
        }
      }
    };

    socket.onclose = () => {
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

  // ── sendMessage ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("[WS] Socket not open");
      return;
    }

    setIsLoading(true);
    setReplyText("");
    setIsTalking(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    visemesRef.current = [];
    isFirstChunkRef.current = true;
    nextStartTimeRef.current = 0;
    audioStartTimeRef.current = 0;

    if (!isInitializedRef.current) {
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
