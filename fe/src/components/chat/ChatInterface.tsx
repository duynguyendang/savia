import React, { useState } from 'react';

interface ChatInterfaceProps {
    transcript: string[];
    onSend: (text: string) => void;
    disabled: boolean;
}

export const ChatInterface = ({ transcript, onSend, disabled }: ChatInterfaceProps) => {
    const [input, setInput] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !disabled) {
            onSend(input);
            setInput("");
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto mb-4 p-4 border border-gray-700 rounded-lg bg-gray-900/50 text-white font-sans space-y-2">
                {transcript.map((line, i) => (
                    <div key={i} className={`p-2 rounded ${line.startsWith("User:") ? "bg-blue-900/20 text-right" : line.startsWith("SYSTEM") ? "bg-red-900/20 text-red-300" : "bg-purple-900/20 text-left"}`}>
                        <span className="font-bold opacity-70 block text-xs mb-1">{line.split(":")[0]}</span>
                        {line.split(":").slice(1).join(":").trim()}
                    </div>
                ))}
                {transcript.length === 0 && <div className="text-gray-500 italic text-center mt-20">Initialize conversation...</div>}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Savia..."
                    className="flex-1 bg-gray-800 text-white border border-gray-600 rounded px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
                    disabled={disabled}
                />
                <button
                    type="submit"
                    className="bg-accent text-gray-900 font-bold px-6 py-2 rounded hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-serif"
                    disabled={disabled || !input.trim()}
                >
                    SEND
                </button>
            </form>
        </div>
    );
};
