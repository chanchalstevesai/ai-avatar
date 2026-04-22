// import { User, Loader2, Send } from "lucide-react";

// interface Props {
//   input: string;
//   setInput: (val: string) => void;
//   isLoading: boolean;
//   onSend: () => void;
//   inputRef: React.RefObject<HTMLInputElement>;
// }

// const InputArea = ({ input, setInput, isLoading, onSend, inputRef }: Props) => {
//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter") onSend();
//   };

//   return (
//     <footer className="relative z-20 w-full max-w-3xl mx-auto p-8 mb-4">
//       <div className="input-area backdrop-blur-3xl group">
//         <User className="w-5 h-5 text-white/20 group-focus-within:text-emerald-500/50 transition-colors" />
//         <input
//           ref={inputRef}
//           type="text"
//           className="flex-1 bg-transparent border-none outline-none py-4 text-sm text-white placeholder:text-white/20"
//           placeholder="Type a message to Aria..."
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={handleKeyPress}
//         />

//         <button
//           onClick={onSend}
//           disabled={isLoading || !input.trim()}
//           className="glow-button w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all cursor-pointer"
//         >
//           {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-white" />}
//         </button>
//       </div>
//     </footer>
//   );
// };

// export default InputArea;


import { User, Loader2, Send, Mic } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const InputArea = ({ input, setInput, isLoading, onSend, inputRef }: Props) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    } else {
      console.warn("Speech recognition not supported in this browser");
    }
  }, [setInput]);

  const startListening = () => {
    if (recognition && !isLoading) {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && input.trim()) {
      onSend();
    }
  };

  return (
    <footer className="relative z-20 w-full max-w-3xl mx-auto p-8 mb-4">
      <div className="input-area backdrop-blur-3xl group">
        <User className="w-5 h-5 text-white/20 group-focus-within:text-emerald-500/50 transition-colors" />
        
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent border-none outline-none py-4 text-sm text-white placeholder:text-white/20"
          placeholder={
            isListening 
              ? "🎙️ Listening... Speak now" 
              : "Type a message to Aria..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isListening}
        />

        {/* Microphone Button */}
        <button
          onClick={startListening}
          disabled={isLoading || isListening}
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer
            ${isListening 
              ? 'bg-red-500/50 text-white animate-pulse' 
              : 'text-white/60 hover:text-white hover:bg-white/10'
            }
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
          title="Speak your question"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={isLoading || (!input.trim() && !isListening)}
          className="glow-button w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Voice Status Indicator */}
      {isListening && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white/90 flex items-center gap-2 whitespace-nowrap">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          🎙️ Listening... Speak your question
        </div>
      )}
    </footer>
  );
};

export default InputArea;
