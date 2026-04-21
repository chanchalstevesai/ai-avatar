import { useState, useEffect, useRef, useCallback } from "react";
const API_BASE_URL = "https://undenunciatory-stratous-tandra.ngrok-free.dev";
const WS_BASE_URL = "wss://undenunciatory-stratous-tandra.ngrok-free.dev/ws/voice";
const SESSION_ID = Math.random().toString(36).substring(7);

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

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false); 
  const visemesRef = useRef<Viseme[]>([]);
  const audioStartTimeRef = useRef<number>(0);
  const isFirstChunkRef = useRef<boolean>(true);

  // Initialize AudioContext on first use
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128; // Smaller for performance
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  // Process the audio queue
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current) return;

    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // Only stop talking if we are actually at the end of the queue
      setIsTalking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsTalking(true); // Ensure we are in talking state

    const chunk = audioQueueRef.current.shift()!;

    try {
      const audioBuffer = await audioContextRef.current!.decodeAudioData(chunk);
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current!);

      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk(); // Keep playing until empty
      };

      if (isFirstChunkRef.current) {
        audioStartTimeRef.current = audioContextRef.current!.currentTime;
        isFirstChunkRef.current = false;
        console.log("⏱️ Audio Playback Started at:", audioStartTimeRef.current);
      }

      source.start(0);
    } catch (e) {
      console.error("Error decoding audio chunk:", e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  // Real-time volume analysis (Updated to use refs)
  useEffect(() => {
    let animationFrameId: number;
    const dataArray = new Uint8Array(64); // Matches fftSize/2

    const updateVolume = () => {
      // Check both state and ref to be sure
      if (analyserRef.current && isTalking) {
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        volumeRef.current = (sum / dataArray.length) / 128;
      } else {
        volumeRef.current = 0;
      }
      animationFrameId = requestAnimationFrame(updateVolume);
    };

    updateVolume();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isTalking]);

  useEffect(() => {
    console.log("Connecting to WS...");
    let socket: WebSocket;

    try {
      socket = new WebSocket(`${WS_BASE_URL}/${SESSION_ID}`);
      socket.binaryType = "arraybuffer";
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
      return;
    }

    socket.onopen = () => {
      console.log("✅ [WS] Connected to", WS_BASE_URL);
      // Try to "subscribe" or "init" the session
      const initMsg = JSON.stringify({ type: "init", session_id: SESSION_ID });
      console.log("[WS] Sending init:", initMsg);
      socket.send(initMsg);
    };

    socket.onerror = (error) => {
      console.error("[WS] Connection error:", error);
    };

    socket.onmessage = (event) => {
      // Extremely aggressive logging to catch anything
      console.info("[WS] MESSAGE RECEIVED!", typeof event.data);

      const debugData = {
        type: typeof event.data,
        isString: typeof event.data === "string",
        preview: typeof event.data === "string" ? event.data.substring(0, 100) : `Binary: ${event.data.byteLength}`
      };
      console.log("[WS] Message details:", debugData);

      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          console.log("[WS] JSON Message parsed:", msg);

          if (msg.type === "audio_start") {
            console.log("[WS] audio_start matched!");
            if (msg.visemes) {
              visemesRef.current = msg.visemes;
            } else {
              visemesRef.current = [];
            }

            audioStartTimeRef.current = 0;
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
          console.log("[WS] Non-JSON string received:", event.data);
          if (event.data.trim().toUpperCase() === "END") {
            setIsLoading(false);
          }
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        console.log(" [WS] Binary audio chunk:", event.data.byteLength);
        audioQueueRef.current.push(event.data);
        if (audioContextRef.current) {
          playNextChunk();
        }
      }
    };

    socket.onclose = (event) => {
      console.log(" [WS] Closed:", event.code, event.reason);
      setIsLoading(false);
    };

    socketRef.current = socket;
    (window as any).debugSocket = socket;
    return () => {
      socket.close();
      delete (window as any).debugSocket;
    };
  }, [initAudio, playNextChunk]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    console.log("[Hybrid] Sending via HTTP:", message);
    setIsLoading(true);
    setReplyText("");
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    visemesRef.current = [];
    isFirstChunkRef.current = true;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID, message }),
      });

      if (!response.ok) throw new Error("Fetch failed");

      // Stop loading immediately so the user isn't stuck
      setIsLoading(false);
      initAudio();

      const encodedText = response.headers.get("x-reply-text");
      if (encodedText) {
        setReplyText(decodeURIComponent(encodedText));
      }

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            audioQueueRef.current.push(value.buffer);
            if (audioContextRef.current) playNextChunk();
          }
        }
      }
    } catch (err) {
      console.error("[Hybrid] Send Error:", err);
      setIsLoading(false);
      setIsTalking(false);
    }
  };

  return { sendMessage, replyText, isLoading, isTalking, volumeRef, visemesRef, audioStartTimeRef, audioContextRef };
}