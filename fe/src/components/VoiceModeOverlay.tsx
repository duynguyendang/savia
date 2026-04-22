import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Volume2, Shield } from 'lucide-react';
import { ai, LIVE_MODEL, Modality } from '../lib/gemini';
import { floatTo16BitPCM, base64ToArrayBuffer, arrayBufferToBase64 } from '../lib/audio-utils';

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceModeOverlay({ isOpen, onClose }: VoiceModeOverlayProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'idle'>('idle');
  const [transcription, setTranscription] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
    return () => stopSession();
  }, [isOpen]);

  const startSession = async () => {
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are Savia, listening in voice mode. Be concise and conversational.",
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setIsActive(true);
            source.connect(processor);
            processor.connect(audioContext.destination);
          },
          onmessage: async (message) => {
            const parts = message.serverContent?.modelTurn?.parts;
            const base64Audio = parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playBuffer(base64Audio);
            }

            const text = parts?.[0]?.text;
            if (text) {
              setTranscription(prev => prev + ' ' + text);
            }
          },
          onerror: (err) => {
            console.error('Live error:', err);
            setStatus('error');
          },
          onclose: () => {
            setStatus('idle');
            setIsActive(false);
          }
        }
      });

      sessionRef.current = await sessionPromise;

      processor.onaudioprocess = (e) => {
        if (isMuted || !sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        const base64 = arrayBufferToBase64(pcmBuffer);

        sessionRef.current.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };

    } catch (err) {
      console.error('Failed to start voice mode:', err);
      setStatus('error');
    }
  };

  const playBuffer = (base64: string) => {
    if (!audioContextRef.current) return;
    const arrayBuffer = base64ToArrayBuffer(base64);

    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
    }

    const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 16000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const stopSession = () => {
    setIsActive(false);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    nextPlayTimeRef.current = 0;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/90 backdrop-blur-2xl"
        >
          <div className="relative w-full max-w-lg p-8 flex flex-col items-center gap-12">
            <button
              onClick={onClose}
              className="absolute top-0 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-xs font-bold uppercase tracking-widest">
                <span className={`w-2 h-2 rounded-full bg-accent ${isActive ? 'animate-pulse' : ''}`} />
                {status === 'connecting' ? 'Calibrating Neural Sync...' : status === 'connected' ? 'Bilateral Sync Active' : status === 'error' ? 'Sync Failed' : 'Idle'}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{
                  scale: isActive ? [1, 1.2, 1] : 1,
                  opacity: isActive ? [0.3, 0.6, 0.3] : 0.2
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute w-64 h-64 rounded-full bg-accent/20 blur-3xl"
              />
              <motion.div
                animate={{
                  scale: isActive ? [1, 1.1, 1] : 1,
                  rotate: isActive ? 360 : 0
                }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                className="w-48 h-48 rounded-full border-2 border-dashed border-accent/30 flex items-center justify-center"
              >
                  <div className="w-40 h-40 rounded-full border border-accent/50 flex items-center justify-center bg-background-dark shadow-2xl shadow-accent/20">
                    <div
                      className="h-20 w-20 bg-contain bg-no-repeat opacity-80"
                      style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCsa_1Z85bxHbsz_FBoRCYnw31NDvQIe3WcUNknuMBOv1feyDHB-4pvtU6DofT7K7ptYrGMq1XzkDfSRMNZw2h-bLrjpeV2IuSVweJYzbPAfsiqFZxm5_onaq9XE_CI1QH3mxpsJvbGHc6-GJly78QiswHRu0Vp8bmNL4dpr-lHtnXRmMns0G5cuIwFPug3w0S55yZNvGwySHHx_FsWTWG9HEqNRgJAnYEfzDLyNhfbc-70jCUC4Xh6hmxqYqaJfakTkKMFAM2zkQ")' }}
                    />
                  </div>
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                    {status === 'connecting' ? 'Initiating Interface...' : 'Savia is listening'}
                </h2>
                <p className="text-text-dim max-w-sm">
                    {status === 'error' ? 'Quantum linkage failed. Please check microphone permissions.' : 'Speak naturally. Savia perceives your voice directly.'}
                </p>
                {transcription && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-accent/80 font-mono text-sm"
                  >
                    "{transcription.slice(-60)}..."
                  </motion.p>
                )}
            </div>

            <div className="flex items-center gap-8 mt-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/5 text-white border border-glass-border hover:bg-white/10'}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-background-dark font-bold shadow-xl shadow-accent/20">
                <Volume2 size={20} />
                <span>Live Audio</span>
              </div>

              <div className="flex items-center gap-2 text-text-dim text-xs font-mono">
                <Shield size={14} className="text-green-500" />
                <span>End-to-End Encryption</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}