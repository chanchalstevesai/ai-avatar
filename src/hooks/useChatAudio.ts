// hooks/useChatAudio.ts
import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = "https://undenunciatory-stratous-tandra.ngrok-free.dev";
const SESSION_ID = "avatar-demo-user-1";

interface ChatResponse {
  audioUrl: string | null;
  replyText: string;
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
}

export default function useChatAudio(): ChatResponse {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Cleanup old audio URLs to prevent memory leaks
  const cleanupAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    cleanupAudio();

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

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error("Chat Error:", error);
      setReplyText("Oops, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return { audioUrl, replyText, isLoading, sendMessage };
}