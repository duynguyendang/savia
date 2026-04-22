import { Paperclip, Globe, Mic, Send } from 'lucide-react';
import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface InputComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
  onVoiceMode?: () => void;
}

export default function InputComposer({ onSend, disabled, onVoiceMode }: InputComposerProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="p-4 sm:p-6 z-20">
      <div className="max-w-3xl mx-auto relative">
        <div className="bg-white/5 border border-glass-border rounded-2xl shadow-2xl flex flex-col transition-all focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent backdrop-blur-md">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none text-white placeholder-white/30 p-4 pr-12 focus:ring-0 resize-none max-h-40 min-h-[56px] leading-relaxed text-base"
            placeholder="Ask Savia complex queries..."
            rows={1}
            disabled={disabled}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-text-dim hover:text-white hover:bg-white/5 transition-colors" title="Attach file">
                <Paperclip size={20} />
              </button>
              <button className="p-2 rounded-lg text-text-dim hover:text-white hover:bg-white/5 transition-colors" title="Web search">
                <Globe size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onVoiceMode}
                className="p-2 rounded-full text-text-dim hover:text-accent hover:bg-accent/10 transition-colors"
                title="Voice Input"
              >
                <Mic size={22} />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || disabled}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-accent hover:bg-cyan-300 text-background-dark shadow-lg shadow-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-text-dim mt-3 font-medium">Savia can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}