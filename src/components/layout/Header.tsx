import { Bot, Sparkles } from "lucide-react";

const Header = () => {
  return (
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
  );
};

export default Header;
