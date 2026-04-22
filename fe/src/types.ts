export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isThinking?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

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