import { useState, useRef } from "react";
import AvatarPlayer from "./components/AvatarPlayer";
import useChatAudio from "./hooks/useChatAudio";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";

export default function App() {
  const [input, setInput] = useState<string>("");
  const { sendMessage, audioUrl, replyText, isLoading } = useChatAudio();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSpeak = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSpeak();
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#050505] overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-6 px-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white/90">Aria AI</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-bold font-mono">Online</span>
            </div>
          </div>
        </div>
        <div className="glass-card px-4 py-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-white/60 font-medium font-mono">Visage Engine</span>
        </div>
      </header>

      {/* Main Avatar View */}
      <main className="flex-1 relative flex flex-col items-center justify-center">
        <div className="w-full h-full max-w-4xl mx-auto">
          <AvatarPlayer audioUrl={audioUrl} />
        </div>

        {/* AI Response Overlay */}
        {replyText && !isLoading && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-30">
            <div className="ai-bubble mx-auto backdrop-blur-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold font-mono">Aria Companion</span>
              </div>
              <p className="text-sm leading-relaxed text-white/90 font-medium">
                {replyText}
              </p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs text-white/60 font-bold tracking-widest uppercase font-mono">Synthesizing...</p>
          </div>
        )}
      </main>

      {/* Footer / Input Area */}
      <footer className="relative z-20 w-full max-w-3xl mx-auto p-8 mb-4">
        <div className="input-area backdrop-blur-3xl group">
          <User className="w-5 h-5 text-white/20 group-focus-within:text-emerald-500/50 transition-colors" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none py-4 text-sm text-white placeholder:text-white/20"
            placeholder="Type a message to Aria..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            onClick={handleSpeak}
            disabled={isLoading || !input.trim()}
            className="glow-button w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-white" />}
          </button>
        </div>
      </footer>
    </div>
  );
}