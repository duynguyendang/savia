import { Menu, Mic, Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
  onToggleVoice?: () => void;
  onSettingsClick?: () => void;
}

export default function Header({ title, onToggleVoice, onSettingsClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-glass-border flex items-center justify-between px-6 bg-white/5 backdrop-blur-md z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <div className="md:hidden text-white cursor-pointer">
          <Menu size={24} />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-white text-base sm:text-lg font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleVoice}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-accent hover:bg-cyan-300 text-background-dark border-0 transition-colors text-xs font-bold uppercase tracking-wide shadow-lg shadow-accent/30"
        >
          <Mic size={18} />
          <span>Voice Mode</span>
        </button>
        <div className="h-6 w-px bg-glass-border mx-1"></div>
        <button
          onClick={onSettingsClick}
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-text-dim hover:text-white transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}