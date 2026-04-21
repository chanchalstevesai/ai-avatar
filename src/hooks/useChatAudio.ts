import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE_URL = "https://undenunciatory-stratous-tandra.ngrok-free.dev";
const WS_BASE_URL = "wss://undenunciatory-stratous-tandra.ngrok-free.dev/ws/voice";
const SESSION_ID = "1";

export default function useChatAudio() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<ArrayBuffer[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const audioUrlRef = useRef<string | null>(null);


  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  
  const cleanupAudio = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
  }, []);


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
      console.log("WS Connected");
    };

    socket.onmessage = (event) => {
      console.log("WS Message Received:", typeof event.data);

   
      if (typeof event.data === "string") {
        const signal = event.data.trim().toUpperCase();

        if (signal === "END") {
          console.log("WS Received END signal");

          const blob = new Blob(audioChunksRef.current, {
            type: "audio/mpeg",
          });

          cleanupAudio();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          audioChunksRef.current = [];
          setIsLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        audioChunksRef.current.push(event.data);
      }
    };

    socket.onerror = (err) => {
      console.error("WS Error:", err);
    };

    socket.onclose = (event) => {
      console.log("WS Closed:", event.code, event.reason);
      setIsLoading((prev) => {
        if (prev) {
          console.log(" Socket closed while loading. Resetting loader.");
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          return false;
        }
        return prev;
      });
    };

    socketRef.current = socket;

    return () => {
      socket.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [cleanupAudio]);

  // Send message via REST
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    console.log("Sending message:", message);
    setIsLoading(true);
    setAudioUrl(null);
    audioChunksRef.current = [];

    // Safety timeout: stop loading after 20 seconds if nothing happens
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          console.warn(" Loading timeout reached. Resetting loader.");
          return false;
        }
        return prev;
      });
    }, 20000);

    try {
      const res = await fetch(`${API_BASE_URL}/chat/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          session_id: SESSION_ID,
          message,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      // Extract reply text from custom header
      const encodedText = res.headers.get("x-reply-text");
      if (encodedText) {
        setReplyText(decodeURIComponent(encodedText));
      }

      // Check if audio is already in the REST response body
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.toLowerCase().includes("audio/")) {
        console.log(" Audio detected in REST response. Downloading...");
        const blob = await res.blob();

        if (blob.size > 0) {
          cleanupAudio();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setIsLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          console.log("Audio loaded via REST");
          return;
        }
      }

      console.log(" No audio in REST, waiting for WebSocket stream...");

    } catch (err) {
      console.error(" Send Error:", err);
      setIsLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  return { audioUrl, replyText, isLoading, sendMessage };
}