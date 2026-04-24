import { motion } from 'motion/react';
import { Play, Download, Copy, RefreshCw, ThumbsDown, Pause } from 'lucide-react';
import type { Message } from '../types';
import { useEffect, useRef, useState } from 'react';

interface MessageWithAudio extends Message {
  audioUrl?: string;
  audioError?: string;
}

interface ChatStreamProps {
  messages: MessageWithAudio[];
  isThinking: boolean;
}

export default function ChatStream({ messages, isThinking }: ChatStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const handlePlayVoice = (msg: Message) => {
    if (playingId === msg.id) {
      synthRef.current?.cancel();
      setPlayingId(null);
      return;
    }

    synthRef.current?.cancel();
    const utterance = new SpeechSynthesisUtterance(msg.content);

    const voices = synthRef.current?.getVoices() || [];
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Enhanced') || v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.pitch = 1.1;
    utterance.rate = 1.0;

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    setPlayingId(msg.id);
    synthRef.current?.speak(utterance);
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    audio.onended = () => {
      setPlayingId(null);
      currentAudioRef.current = null;
    };
    audio.onloadedmetadata = () => {
      setAudioDuration(prev => ({ ...prev, [messageId]: Math.round(audio.duration) }));
    };
    audio.play();
    currentAudioRef.current = audio;
    setPlayingId(messageId);
  };

  const togglePlay = (audioUrl: string, messageId: string) => {
    if (playingId === messageId && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingId(null);
    } else {
      playAudio(audioUrl, messageId);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scroll-smooth">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 sm:gap-8">
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

            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end max-w-[90%] sm:max-w-[75%]' : 'max-w-[95%] sm:max-w-[85%]'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Savia</span>
                  <span className="text-[10px] text-text-dim font-medium px-1.5 py-0.5 rounded bg-white/5 border border-glass-border">AI MODEL v4.2</span>
                </div>
              )}

              <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-accent/20 text-white border border-accent/30 rounded-tr-sm shadow-md backdrop-blur-sm' : 'text-slate-200 leading-relaxed space-y-4'}`}>
                <p className="text-sm sm:text-base leading-relaxed">{msg.content}</p>
              </div>

              {msg.role === 'assistant' && msg.audioUrl && (
                <>
                  <div className={`mt-2 p-3 rounded-xl border flex items-center gap-3 w-full sm:w-fit min-w-0 sm:min-w-[280px] md:min-w-[320px] transition-all duration-500 shadow-sm ${playingId === msg.id ? 'bg-accent/10 border-accent/50 ring-1 ring-accent/30' : 'bg-white/5 border-glass-border'}`}>
                    <button
                      onClick={() => togglePlay(msg.audioUrl!, msg.id)}
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-all shadow-lg flex-shrink-0 ${playingId === msg.id ? 'bg-white text-background-dark scale-110' : 'bg-accent text-background-dark'}`}
                    >
                      {playingId === msg.id ? <Pause size={20} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                    </button>
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                        <span className={playingId === msg.id ? 'text-accent' : 'text-text-dim'}>High-Fidelity Voice</span>
                        <span className="text-text-dim font-mono">{audioDuration[msg.id] ? formatDuration(audioDuration[msg.id]) : '00:00'}</span>
                      </div>
                      <div className="h-6 flex items-center gap-[2px]">
                        {[2, 3, 5, 3, 4, 6, 3, 2, 4, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2].map((h, i) => (
                          <motion.div
                            key={i}
                            className="waveform-bar"
                            animate={playingId === msg.id ? {
                              height: [`${h * 2}px`, `${h * 4}px`, `${h * 2}px`],
                              opacity: [0.4, 1, 0.4]
                            } : {
                              height: `${h * 4}px`,
                              opacity: i > 5 ? 0.3 : 1
                            }}
                            transition={playingId === msg.id ? {
                              repeat: Infinity,
                              duration: 0.5 + Math.random() * 0.5,
                              delay: i * 0.05
                            } : {}}
                            style={{
                              width: '3px',
                              backgroundColor: playingId === msg.id ? '#a5f3fc' : 'rgba(255, 255, 255, 0.4)'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <a
                      href={msg.audioUrl}
                      download="savia-response.mp3"
                      className="text-text-dim hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
                    >
                      <Download size={18} />
                    </a>
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

              {msg.role === 'assistant' && !msg.audioUrl && (
                <div className="mt-2 p-3 rounded-xl border border-glass-border flex items-center gap-4 w-full sm:w-fit min-w-[320px] shadow-sm opacity-50">
                  <button
                    onClick={() => handlePlayVoice(msg)}
                    className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white transition-all shadow-lg flex-shrink-0 hover:bg-white/20"
                  >
                    {playingId === msg.id ? <Pause size={20} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                  </button>
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                      <span className={msg.audioError ? 'text-red-400' : 'text-text-dim'}>{msg.audioError ? 'Voice Error' : 'Web Speech'}</span>
                      <span className="text-text-dim font-mono">--:--</span>
                    </div>
                    <div className="h-6 flex items-center gap-[2px]">
                      {[2, 3, 5, 3, 4, 6, 3, 2, 4, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2].map((h, i) => (
                        <div
                          key={i}
                          className="waveform-bar"
                          style={{
                            width: '3px',
                            height: `${h * 4}px`,
                            backgroundColor: 'rgba(255, 255, 255, 0.4)',
                            opacity: i > 5 ? 0.3 : 1
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {msg.audioError && (
                    <p className="text-[10px] text-red-400 truncate max-w-[100px]">{msg.audioError}</p>
                  )}
                </div>
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