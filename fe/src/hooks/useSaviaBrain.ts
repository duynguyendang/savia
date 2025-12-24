import { useState } from 'react';
import { api } from '../services/api';
import { speak } from '../services/elevenlabs';
import type { SaviaResponse, BrainState } from '../types';

export const useSaviaBrain = () => {
    const [state, setState] = useState<BrainState>('IDLE');
    const [transcript, setTranscript] = useState<string[]>([]);
    const [lastTraceId, setLastTraceId] = useState<string | null>(null);

    const processInput = async (text: string) => {
        // 1. Transition to REASONING (Visual: Purple Spin)
        setState('REASONING');
        setTranscript(prev => [...prev, `User: ${text}`]);

        try {
            // 2. Call Savia-BE (The Manglekit Kernel)
            const { data } = await api.post<SaviaResponse>('/v1/reason', {
                user_id: "demo_user", // Hardcoded for MVP
                message: text
            });

            setTranscript(prev => [...prev, `Savia: ${data.text}`]);
            setLastTraceId(data.trace_id);

            // 3. Transition to SPEAKING (Visual: Waveform)
            setState('SPEAKING');

            // 4. Trigger Voice based on Neuro-Symbolic Logic Instruction
            await speak(data.text, data.voice_instruction);

            // 5. Return to IDLE
            setState('IDLE');

        } catch (error: any) {
            // Handle Manglekit Halt (403 Forbidden)
            if (error.response?.status === 403) {
                setState('HALTED'); // Visual: Static Red
                const errorMsg = error.response.data || "Policy Violation";
                setTranscript(prev => [...prev, `SYSTEM [BLOCK]: ${errorMsg}`]);

                // Safety Fallback Voice
                await speak("I cannot fulfill that request due to security policy.", "stable");

                // Reset after delay
                setTimeout(() => setState('IDLE'), 3000);
            } else {
                console.error("System Error", error);
                setState('IDLE');
            }
        }
    };

    return { state, transcript, lastTraceId, processInput };
};
