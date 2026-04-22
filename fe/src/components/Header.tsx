import { Menu, Mic, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
  onToggleVoice?: () => void;
}

export default function Header({ title, onToggleVoice }: HeaderProps) {
  return (
    <header className="h-16 border-b border-glass-border flex items-center justify-between px-6 bg-white/5 backdrop-blur-md z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <div className="md:hidden text-white cursor-pointer">
          <Menu size={24} />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-white text-lg font-bold tracking-tight">{title}</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase tracking-wide">Connected</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleVoice}
          className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 transition-colors text-xs font-bold uppercase tracking-wide"
        >
          <Mic size={18} />
          <span>Voice Mode</span>
        </button>
        <div className="h-6 w-px bg-glass-border mx-1"></div>
        <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-text-dim hover:text-white transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}