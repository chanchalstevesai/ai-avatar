

import { User, Loader2, Send, Mic, MicOff, Volume2, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

interface Props {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: (message?: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

interface VoiceState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
}

const InputArea = ({ input, setInput, isLoading, onSend, inputRef }: Props) => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    transcript: "",
    isSupported: true,
    error: null,
  });
  
  const recognitionRef = useRef<any>(null);

  // Check browser support
  useEffect(() => {
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if (!isSupported) {
      setVoiceState(prev => ({ ...prev, isSupported: false, error: "Speech recognition not supported in this browser" }));
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!voiceState.isSupported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';
    recognitionInstance.maxAlternatives = 1;
    
    let speechTimeout: NodeJS.Timeout;
    
    recognitionInstance.onstart = () => {
      setVoiceState(prev => ({ ...prev, isListening: true, error: null, transcript: "" }));
      
      speechTimeout = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 5000);
    };
    
    recognitionInstance.onresult = (event: any) => {
      clearTimeout(speechTimeout);
      
      let interimTranscript = "";
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      const currentTranscript = finalTranscript || interimTranscript;
      setVoiceState(prev => ({ ...prev, transcript: currentTranscript }));
      
      if (finalTranscript) {
        recognitionInstance.stop();
        handleVoiceInput(finalTranscript);
      } else {
        speechTimeout = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 2000);
      }
    };
    
    recognitionInstance.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      let errorMessage = "";
      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "No microphone found. Please check your microphone.";
          break;
        case "not-allowed":
          errorMessage = "Microphone access denied. Please allow microphone access.";
          break;
        case "network":
          errorMessage = "Network error. Please check your connection.";
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      setVoiceState(prev => ({ 
        ...prev, 
        isListening: false, 
        error: errorMessage,
        transcript: ""
      }));
      
      setTimeout(() => {
        setVoiceState(prev => ({ ...prev, error: null }));
      }, 3000);
    };
    
    recognitionInstance.onend = () => {
      setVoiceState(prev => ({ ...prev, isListening: false }));
      clearTimeout(speechTimeout);
    };
    
    recognitionRef.current = recognitionInstance;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearTimeout(speechTimeout);
    };
  }, [voiceState.isSupported]);

  const handleVoiceInput = useCallback((transcript: string) => {
    if (transcript.trim() && !isLoading) {
      // Send voice message with the transcript as parameter
      onSend(transcript.trim());
      
      setVoiceState(prev => ({ ...prev, transcript: "" }));
      
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }
  }, [isLoading, onSend]);

  const startListening = useCallback(() => {
    if (!voiceState.isSupported) {
      setVoiceState(prev => ({ ...prev, error: "Speech recognition not supported" }));
      return;
    }
    
    if (isLoading) {
      setVoiceState(prev => ({ ...prev, error: "Please wait for current response to complete" }));
      return;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start recognition:", error);
        setVoiceState(prev => ({ 
          ...prev, 
          error: "Failed to start voice recognition. Please try again." 
        }));
      }
    }
  }, [voiceState.isSupported, isLoading]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && voiceState.isListening) {
      recognitionRef.current.stop();
    }
  }, [voiceState.isListening]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && input.trim()) {
      // For typed messages, call onSend with NO parameters
      onSend(); // ← Changed: removed input.trim() parameter
    }
  };

  // Handle send button click for typed messages
  const handleSendClick = () => {
    if (!isLoading && input.trim()) {
      // For typed messages, call onSend with NO parameters
      onSend(); // ← Changed: removed input.trim() parameter
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
            voiceState.isListening 
              ? "🎙️ Listening..." 
              : voiceState.error 
                ? "⚠️ Voice unavailable - Type your message"
                : !voiceState.isSupported
                  ? "⌨️ Type your message to Aria..."
                  : "🎤 Type or click mic to speak..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={voiceState.isListening}
        />

        {/* Voice Feedback Display */}
        {voiceState.isListening && voiceState.transcript && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white/90 flex items-center gap-2 whitespace-nowrap animate-in fade-in slide-in-from-top-2">
            <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="max-w-[200px] truncate">{voiceState.transcript}</span>
          </div>
        )}

        {/* Error Display */}
        {voiceState.error && !voiceState.isListening && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500/80 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-3 h-3" />
            {voiceState.error}
          </div>
        )}

        {/* Microphone Button */}
        {voiceState.isSupported && (
          <button
            onClick={voiceState.isListening ? stopListening : startListening}
            disabled={isLoading}
            className={`
              relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer
              ${voiceState.isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' 
                : 'text-white/60 hover:text-white hover:bg-white/10'
              }
              disabled:opacity-30 disabled:cursor-not-allowed
              group
            `}
            title={voiceState.isListening ? "Stop listening" : "Speak your question"}
          >
            {voiceState.isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            
            {voiceState.isListening && (
              <span className="absolute inset-0 rounded-xl animate-ping bg-red-500/20" />
            )}
          </button>
        )}

        {/* Send Button - Updated onClick handler */}
        <button
          onClick={handleSendClick} // ← Changed: using the new handler
          disabled={isLoading || (!input.trim() && !voiceState.isListening)}
          className="glow-button w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Voice Status Indicator - Enhanced */}
      {voiceState.isListening && (
        <div className="absolute -top-9 right-0-translate-x-1/2 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-full text-sm text-white flex items-center gap-3 whitespace-nowrap animate-in fade-in slide-in-from-top-2 shadow-lg">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          </div>
          <span className="font-medium">Listening</span>
          <div className="flex gap-0.5">
            {[0, 0.1, 0.2, 0.3].map((delay, i) => (
              <div
                key={i}
                className="w-0.5 h-3 bg-white/60 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <button
            onClick={stopListening}
            className="ml-2 px-2 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded-md transition-colors"
          >
            Stop
          </button>
        </div>
      )}
    </footer>
  );
};

export default InputArea;