import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Loader2 } from 'lucide-react';
import { speak } from '../services/elevenlabs';

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceModeOverlay({ isOpen, onClose }: VoiceModeOverlayProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const transcriptRef = useRef('');

  const stopSession = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(false);
    transcriptRef.current = '';
  }, []);

  const sendToBackend = async (text: string) => {
    try {
      const { api } = await import('../services/api');
      const { data } = await api.post('/v1/reason', {
        user_id: 'demo_user',
        message: text,
      });
      return data.text as string;
    } catch (err) {
      console.error('Backend error:', err);
      return 'Sorry, I could not process that request.';
    }
  };

  const handleResponse = async (text: string) => {
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    const responseText = await sendToBackend(text);

    setTranscript(prev => prev + '\n\nSavia: ' + responseText);

    const { url } = await speak(responseText, 'expressive');

    if (url) {
      const audio = new Audio(url);
      audio.onended = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };
      audio.play();
    } else {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    setIsConnecting(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsConnecting(false);
      setIsListening(true);
      transcriptRef.current = '';
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          setTranscript(prev => {
            const base = prev.split('\n\nSavia:')[0];
            return base + '\n\nYou (interim): ' + t;
          });
        }
      }

      if (finalTranscript && !isSpeakingRef.current) {
        setTranscript(prev => {
          const base = prev.split('\n\nSavia:')[0];
          return base + '\n\nYou: ' + finalTranscript;
        });
        await handleResponse(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      console.error('Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        onClose();
      }
    };

    recognition.onend = () => {
      if (isListening && !isSpeakingRef.current) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setIsConnecting(false);
    }

    return () => stopSession();
  }, [isOpen, stopSession, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl"
        >
          <div className="relative w-full max-w-lg p-8 flex flex-col items-center gap-10">
            <button
              onClick={onClose}
              className="absolute top-0 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-xs font-bold uppercase tracking-widest">
                <span className={`w-2 h-2 rounded-full bg-accent ${isListening ? 'animate-pulse' : ''}`} />
                {isConnecting ? 'Calibrating...' : isSpeaking ? 'Speaking...' : isListening ? 'Listening' : 'Idle'}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{
                  scale: isListening ? [1, 1.1, 1] : 1,
                  opacity: isListening ? [0.3, 0.6, 0.3] : 0.2
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute w-64 h-64 rounded-full bg-accent/20 blur-3xl"
              />
              <motion.div
                animate={{
                  scale: isListening ? [1, 1.05, 1] : 1,
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-48 h-48 rounded-full border-2 border-dashed border-accent/30 flex items-center justify-center"
              >
                <div className="w-40 h-40 rounded-full border border-accent/50 flex items-center justify-center bg-black/50 shadow-2xl shadow-accent/20">
                  <div
                    className="h-20 w-20 bg-contain bg-no-repeat opacity-80"
                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCsa_1Z85bxHbsz_FBoRCYnw31NDvQIe3WcUNknuMBOv1feyDHB-4pvtU6DofT7K7ptYrGMq1XzkDfSRMNZw2h-bLrjpeV2IuSVweJYzbPAfsiqFZxm5_onaq9XE_CI1QH3mxpsJvbGHc6-GJly78QiswHRu0Vp8bmNL4dpr-lHtnXRmMns0G5cuIwFPug3w0S55yZNvGwySHHx_FsWTWG9HEqNRgJAnYEfzDLyNhfbc-70jCUC4Xh6hmxqYqaJfakTkKMFAM2zkQ")' }}
                  />
                </div>
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-4 text-center min-h-[80px]">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isSpeaking ? 'Savia is responding...' : isListening ? 'Speak now' : isConnecting ? 'Starting...' : 'Ready'}
              </h2>
              <p className="text-text-dim max-w-sm text-sm">
                {isSpeaking ? 'Listen to Savia\'s response' : isListening ? 'Savia is listening to you' : 'Voice mode using Gemini 3.1 Flash'}
              </p>
            </div>

            {transcript && (
              <div className="w-full max-w-md p-4 bg-white/5 border border-glass-border rounded-2xl max-h-48 overflow-y-auto">
                <p className="text-xs text-text-dim font-mono whitespace-pre-wrap">{transcript}</p>
              </div>
            )}

            <div className="flex items-center gap-6 mt-4">
              <button
                onClick={stopSession}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isListening ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-white border border-glass-border'
                }`}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              {isConnecting && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-accent/10 text-accent text-sm font-medium">
                  <Loader2 size={18} className="animate-spin" />
                  Connecting...
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}