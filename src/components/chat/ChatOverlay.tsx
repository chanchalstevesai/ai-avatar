import { Loader2 } from "lucide-react";

interface Props {
  replyText: string;
  isLoading: boolean;
}

const ChatOverlay = ({ replyText, isLoading }: Props) => {
  return (
    <>
      {/* AI Response Overlay */}
      {replyText && !isLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-30">
          <div className="ai-bubble mx-auto backdrop-blur-2xl max-h-[30vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <p className="text-sm md:text-base leading-relaxed text-white/90 font-medium">
              {replyText}
            </p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-[70%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-white/60 font-bold tracking-widest uppercase font-mono">Synthesizing...</p>
        </div>
      )}
    </>
  );
};

export default ChatOverlay;
