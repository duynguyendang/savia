import { motion } from 'motion/react';
import { Play, Download, Copy, RefreshCw, ThumbsDown } from 'lucide-react';
import type { Message } from '../types';
import { useEffect, useRef } from 'react';

interface ChatStreamProps {
  messages: Message[];
  isThinking: boolean;
}

export default function ChatStream({ messages, isThinking }: ChatStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 scroll-smooth">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-center my-4">
          <span className="text-xs font-medium text-text-dim bg-white/5 px-3 py-1 rounded-full border border-glass-border">
            Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'items-end justify-end' : 'items-start'} gap-4 group`}
          >
            {msg.role === 'assistant' && (
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-glass-border flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                <div
                  className="h-6 w-6 bg-contain bg-no-repeat"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCsa_1Z85bxHbsz_FBoRCYnw31NDvQIe3WcUNknuMBOv1feyDHB-4pvtU6DofT7K7ptYrGMq1XzkDfSRMNZw2h-bLrjpeV2IuSVweJYzbPAfsiqFZxm5_onaq9XE_CI1QH3mxpsJvbGHc6-GJly78QiswHRu0Vp8bmNL4dpr-lHtnXRmMns0G5cuIwFPug3w0S55yZNvGwySHHx_FsWTWG9HEqNRgJAnYEfzDLyNhfbc-70jCUC4Xh6hmxqYqaJfakTkKMFAM2zkQ")' }}
                />
              </div>
            )}

            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end max-w-[85%] sm:max-w-[75%]' : 'max-w-[90%] sm:max-w-[85%]'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Savia</span>
                  <span className="text-[10px] text-text-dim font-medium px-1.5 py-0.5 rounded bg-white/5 border border-glass-border">AI MODEL v4.2</span>
                </div>
              )}

              <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-accent/20 text-white border border-accent/30 rounded-tr-sm shadow-md backdrop-blur-sm' : 'text-slate-200 leading-relaxed space-y-4'}`}>
                <p className="text-sm sm:text-base leading-relaxed">{msg.content}</p>
              </div>

              {msg.role === 'assistant' && (
                <>
                  <div className="mt-2 p-3 bg-white/5 rounded-xl border border-glass-border flex items-center gap-4 w-full sm:w-fit min-w-[320px] shadow-sm">
                    <button className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-background-dark transition-all shadow-lg shadow-accent/20 flex-shrink-0">
                      <Play size={24} fill="currentColor" />
                    </button>
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                        <span>High-Fidelity Voice</span>
                        <span>00:42</span>
                      </div>
                      <div className="h-6 flex items-center gap-[2px] opacity-80">
                        {[2, 3, 5, 3, 4, 6, 3, 2, 4, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2].map((h, i) => (
                          <div
                            key={i}
                            className="waveform-bar"
                            style={{
                              height: `${h * 4}px`,
                              opacity: i > 5 ? 0.3 : 1
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <button className="text-text-dim hover:text-white transition-colors">
                      <Download size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button className="p-1.5 rounded-lg hover:bg-white/5 text-text-dim hover:text-white transition-colors" title="Copy">
                      <Copy size={18} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-white/5 text-text-dim hover:text-white transition-colors" title="Regenerate">
                      <RefreshCw size={18} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-white/5 text-text-dim hover:text-white transition-colors ml-auto" title="Bad response">
                      <ThumbsDown size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-accent flex-shrink-0 mb-1 border border-accent/50" />
            )}
          </motion.div>
        ))}

        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-4"
          >
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-glass-border flex items-center justify-center flex-shrink-0">
              <div
                className="h-6 w-6 bg-contain bg-no-repeat animate-pulse"
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCsa_1Z85bxHbsz_FBoRCYnw31NDvQIe3WcUNknuMBOv1feyDHB-4pvtU6DofT7K7ptYrGMq1XzkDfSRMNZw2h-bLrjpeV2IuSVweJYzbPAfsiqFZxm5_onaq9XE_CI1QH3mxpsJvbGHc6-GJly78QiswHRu0Vp8bmNL4dpr-lHtnXRmMns0G5cuIwFPug3w0S55yZNvGwySHHx_FsWTWG9HEqNRgJAnYEfzDLyNhfbc-70jCUC4Xh6hmxqYqaJfakTkKMFAM2zkQ")' }}
              />
            </div>
            <div className="flex items-center gap-2 h-10">
              <span className="text-sm font-medium text-accent animate-pulse">Savia is reasoning...</span>
              <div className="flex gap-1">
                <motion.span
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="w-1.5 h-1.5 bg-accent rounded-full"
                />
                <motion.span
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-1.5 h-1.5 bg-accent rounded-full"
                />
                <motion.span
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="w-1.5 h-1.5 bg-accent rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}