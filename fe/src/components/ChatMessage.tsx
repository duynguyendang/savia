interface ChatMessageProps {
  message: string;
  isUser: boolean;
  isThinking?: boolean;
}

export function ChatMessage({ message, isUser, isThinking }: ChatMessageProps) {
  const content = message.startsWith('User:')
    ? message.replace('User: ', '')
    : message.replace('Savia: ', '');

  const waveformHeights = [8, 12, 14, 10, 6, 16, 12, 10, 14, 8, 12, 10, 6, 8, 10, 12, 8, 10, 12, 14, 10, 8, 12, 10];

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-3 group">
        <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400 font-medium">You</span>
          </div>
          <div className="p-4 bg-primary text-white rounded-2xl rounded-tr-sm shadow-md">
            <p className="text-sm sm:text-base leading-relaxed">{content}</p>
          </div>
        </div>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-primary flex-shrink-0 mb-1" />
      </div>
    );
  }

  if (isThinking) {
    return (
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-center flex-shrink-0">
          <div className="h-6 w-6 bg-gradient-to-tr from-primary to-purple-500 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-2 h-10">
          <span className="text-sm font-medium text-primary animate-pulse">Savia is reasoning...</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 group">
      <div className="h-10 w-10 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
        <div className="h-6 w-6 bg-gradient-to-tr from-primary to-purple-500 rounded-full" />
      </div>
      <div className="flex flex-col gap-2 max-w-[90%] sm:max-w-[85%]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Savia</span>
          <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 rounded bg-surface-dark border border-surface-border">
            AI MODEL v4.2
          </span>
        </div>
        <div className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>

        <div className="mt-2 p-3 bg-surface-dark rounded-xl border border-surface-border flex items-center gap-4 w-full sm:w-fit min-w-[320px] shadow-sm">
          <button className="h-10 w-10 rounded-full bg-primary hover:bg-blue-600 flex items-center justify-center text-white transition-all shadow-lg shadow-primary/20 flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">play_arrow</span>
          </button>
          <div className="flex-1 flex flex-col justify-center gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <span>High-Fidelity Voice</span>
            </div>
            <div className="h-6 flex items-center gap-[2px] opacity-80">
              {waveformHeights.map((height, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-primary/50 rounded-full"
                  style={{
                    height: `${height}px`,
                    opacity: i > 12 ? 0.3 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button className="p-1.5 rounded-lg hover:bg-surface-dark text-slate-500 hover:text-white transition-colors" title="Copy">
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
          <button className="p-1.5 rounded-lg hover:bg-surface-dark text-slate-500 hover:text-white transition-colors" title="Regenerate">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
          <button className="p-1.5 rounded-lg hover:bg-surface-dark text-slate-500 hover:text-white transition-colors ml-auto" title="Good response">
            <span className="material-symbols-outlined text-[18px]">thumb_up</span>
          </button>
        </div>
      </div>
    </div>
  );
}
