import { useState, useRef } from "react";
import AvatarPlayer from "./components/avatar/AvatarPlayer";
import useChatAudio from "./hooks/useChatAudio";
import Header from "./components/layout/Header";
import InputArea from "./components/chat/InputArea";
import ChatOverlay from "./components/chat/ChatOverlay";

export default function App() {
  const [input, setInput] = useState<string>("");
  const { 
    sendMessage, 
    isTalking, 
    volumeRef, 
    replyText, 
    isLoading, 
    visemesRef, 
    audioStartTimeRef, 
    audioContextRef 
  } = useChatAudio();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSpeak = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#050505] overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <Header />

      {/* Main Avatar View */}
      <main className="flex-1 relative flex flex-col items-center justify-center">
        <div className="w-full h-full">
          <AvatarPlayer
            isTalking={isTalking}
            volumeRef={volumeRef}
            visemesRef={visemesRef}
            audioStartTimeRef={audioStartTimeRef}
            audioContextRef={audioContextRef}
          />
        </div>

        <ChatOverlay 
          replyText={replyText} 
          isLoading={isLoading} 
        />
      </main>

      <InputArea 
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSpeak}
        inputRef={inputRef}
      />
    </div>

  );
}
