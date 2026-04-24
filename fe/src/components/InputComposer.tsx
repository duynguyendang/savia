import { Paperclip, Globe, Mic, MicOff, Send, X, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { speak } from '../services/elevenlabs';
import { api } from '../services/api';

interface InputComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
  isVoiceMode?: boolean;
  onVoiceModeToggle?: () => void;
}

export default function InputComposer({ onSend, disabled, isVoiceMode, onVoiceModeToggle }: InputComposerProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const interimRef = useRef('');
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const isActiveRef = useRef(false);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const sendTranscript = (text: string) => {
    if (!text.trim()) return;

    clearSilenceTimer();
    isActiveRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);

    handleVoiceResponse(text);
  };

  const resetSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (isActiveRef.current && interimRef.current.trim()) {
        const text = interimRef.current.trim();
        sendTranscript(text);
      }
    }, 1500);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      alert('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    console.log('Starting speech recognition...');
    console.log('SpeechRecognition available:', !!SpeechRecognition);

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }

      interimRef.current = '';

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started - listening');
        isActiveRef.current = true;
        setIsListening(true);
        resetSilenceTimer();
      };

      recognition.onresult = (event: any) => {
        clearSilenceTimer();

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          interimRef.current += finalTranscript;
        }

        setInput(interimRef.current + interimTranscript);
        resetSilenceTimer();
      };

      recognition.onend = () => {
        console.log('Speech recognition ended', { isListening, isActiveRef: isActiveRef.current });
        if (isActiveRef.current && isListening) {
          console.log('Restarting speech recognition...');
          try { recognition.start(); } catch (e) { console.log('Restart failed:', e); }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access and try again.');
          setIsListening(false);
          onVoiceModeToggle?.();
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          setIsListening(false);
        }
        clearSilenceTimer();
      };

      recognitionRef.current = recognition;
      recognition.start();
      console.log('Recognition start() called');
    } catch (e) {
      console.error('Failed to start recognition:', e);
      alert('Failed to start speech recognition. Please try again.');
    }
  };

  const stopListening = () => {
    clearSilenceTimer();
    isActiveRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);

    const text = interimRef.current.trim();
    if (text && !isSpeakingRef.current) {
      sendTranscript(text);
    } else {
      onVoiceModeToggle?.();
    }
  };

  const handleVoiceResponse = async (text: string) => {
    if (isSpeakingRef.current) return;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setInput('');
    interimRef.current = '';

    try {
      const { data } = await api.post('/v1/reason', { user_id: 'demo_user', message: text });
      const { url } = await speak(data.text as string, 'expressive');

      if (url) {
        const audio = new Audio(url);
        audio.onended = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          onVoiceModeToggle?.();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          onVoiceModeToggle?.();
        };
        audio.play();
      } else {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onVoiceModeToggle?.();
      }
    } catch (err) {
      console.error('Voice mode error:', err);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      onVoiceModeToggle?.();
    }
  };

  useEffect(() => {
    if (isVoiceMode && !isListening && !isSpeaking) {
      setTimeout(() => startListening(), 100);
    } else if (!isVoiceMode && isListening) {
      stopListening();
    }
  }, [isVoiceMode]);

  const handleSend = () => {
    const text = input.trim();
    if (text && !disabled && !isSpeaking) {
      interimRef.current = '';
      onSend(text);
      setInput('');
      clearSilenceTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
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

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="p-2 sm:p-4 z-20">
      <div className="max-w-3xl mx-auto relative">
        {isListening && (
          <div className="mb-3 flex items-center gap-3 px-4 py-3 bg-accent/10 border border-accent/30 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-accent font-medium">Listening... (auto-send in 1.5s)</span>
            </div>
            <div className="flex-1 h-6 flex items-center gap-[2px]">
              {[2, 3, 5, 3, 4, 6, 3, 2, 4, 2, 3, 2, 2, 2, 2, 2].map((h, i) => (
                <div key={i} className="waveform-bar animate-pulse" style={{ width: '3px', height: `${h * 3}px`, backgroundColor: '#a5f3fc', animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
            <button onClick={stopListening} className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {isSpeaking && (
          <div className="mb-3 flex items-center gap-3 px-4 py-3 bg-accent/10 border border-accent/30 rounded-xl">
            <Loader2 size={16} className="text-accent animate-spin" />
            <span className="text-sm text-accent font-medium">Savia is responding...</span>
            <div className="flex-1 h-6 flex items-center gap-[2px]">
              {[2, 3, 5, 3, 4, 6, 3, 2, 4, 2, 3, 2, 2, 2, 2, 2].map((h, i) => (
                <div key={i} className="waveform-bar" style={{ width: '3px', height: `${h * 3}px`, backgroundColor: '#a5f3fc', opacity: 0.5 + Math.random() * 0.5 }} />
              ))}
            </div>
          </div>
        )}

        <div className={`bg-white/5 border border-glass-border rounded-2xl shadow-2xl flex flex-col transition-all focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent backdrop-blur-md ${isListening ? 'ring-2 ring-accent/50 border-accent' : ''}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none text-white placeholder-white/30 p-4 pr-12 focus:ring-0 resize-none max-h-40 min-h-[56px] leading-relaxed text-base"
            placeholder={isListening ? "Speak now..." : isSpeaking ? "Savia is responding..." : "Ask Savia complex queries..."}
            rows={1}
            disabled={disabled || isSpeaking}
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
              {isListening ? (
                <button onClick={stopListening} className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors" title="Stop Recording">
                  <MicOff size={22} />
                </button>
              ) : (
                <button
                  onClick={startListening}
                  disabled={isSpeaking}
                  className={`p-2 rounded-full transition-colors ${isSpeaking ? 'text-text-dim cursor-not-allowed' : 'text-text-dim hover:text-accent hover:bg-accent/10'}`}
                  title="Voice Input"
                >
                  <Mic size={22} />
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={(!input.trim()) || disabled || isListening || isSpeaking}
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