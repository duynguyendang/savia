import { useState } from 'react';
import { api } from '../services/api';
import { speak } from '../services/elevenlabs';
import type { SaviaResponse, BrainState } from '../types';

export const useSaviaBrain = () => {
    const [state, setState] = useState<BrainState>('IDLE');
    const [transcript, setTranscript] = useState<string[]>([]);
    const [lastTraceId, setLastTraceId] = useState<string | null>(null);

    const processInput = async (text: string) => {
        setState('REASONING');
        setTranscript(prev => [...prev, `User: ${text}`]);

        try {
            const { data } = await api.post<SaviaResponse>('/v1/reason', {
                user_id: "demo_user",
                message: text
            });

            setTranscript(prev => [...prev, `Savia: ${data.text}`]);
            setLastTraceId(data.trace_id);

            setState('SPEAKING');
            await speak(data.text, data.voice_instruction as "stable" | "expressive");
            setState('IDLE');

        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: string } };
            if (err.response?.status === 403) {
                setState('HALTED');
                const errorMsg = err.response.data || "Policy Violation";
                setTranscript(prev => [...prev, `SYSTEM [BLOCK]: ${errorMsg}`]);
                await speak("I cannot fulfill that request due to security policy.", "stable" as "stable");
                setTimeout(() => setState('IDLE'), 3000);
            } else {
                console.error("System Error", error);
                setState('IDLE');
            }
        }
    };

    return { state, transcript, lastTraceId, processInput };
};
