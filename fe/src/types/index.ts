export interface SaviaRequest {
    user_id: string;
    message: string;
}

export interface SaviaResponse {
    text: string;
    voice_instruction: "stable" | "expressive"; // Mapped from Logic rules.dl
    trace_id: string; // For Logical Observability
}

export type BrainState = 'IDLE' | 'LISTENING' | 'REASONING' | 'SPEAKING' | 'HALTED';
