import axios from 'axios';

export const speak = async (text: string, style: "stable" | "expressive") => {
    try {
        const response = await axios.post(
            '/v1/speak',
            { text, voice_instruction: style },
            { responseType: 'arraybuffer' }
        );

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
        return Promise.resolve();
    }
};
