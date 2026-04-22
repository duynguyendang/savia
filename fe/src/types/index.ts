export interface SaviaRequest {
    user_id: string;
    message: string;
}

export interface SaviaResponse {
    text: string;
    voice_instruction: "stable" | "expressive";
    trace_id: string;
}

export type BrainState = 'IDLE' | 'LISTENING' | 'REASONING' | 'SPEAKING' | 'HALTED';
