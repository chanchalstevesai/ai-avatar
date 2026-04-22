import { User, Loader2, Send } from "lucide-react";

interface Props {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const InputArea = ({ input, setInput, isLoading, onSend, inputRef }: Props) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSend();
  };

  return (
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
          onClick={onSend}
          disabled={isLoading || !input.trim()}
          className="glow-button w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-white" />}
        </button>
      </div>
    </footer>
  );
};

export default InputArea;
