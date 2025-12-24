import axios from 'axios';

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_KEY;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Example Voice ID (e.g., Rachel)

export const speak = async (text: string, style: "stable" | "expressive") => {
    // Logic-driven Voice Settings:
    // "Stable" -> High stability (for financial data/warnings)
    // "Expressive" -> High similarity boost (for greetings/empathy)
    const stability = style === "stable" ? 0.75 : 0.30;
    const similarity = style === "stable" ? 0.75 : 0.90;

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
            {
                text,
                model_id: "eleven_turbo_v2",
                voice_settings: {
                    stability: stability,
                    similarity_boost: similarity
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer' // Critical for audio decoding
            }
        );

        // Audio Context Playback
        const audioContext = new window.AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(response.data);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);

        return new Promise((resolve) => {
            source.onended = resolve;
        });
    } catch (err) {
        console.error("Voice synthesis failed", err);
        // Fail gracefully (silent)
        return Promise.resolve();
    }
};
