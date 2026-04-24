export const speak = async (text: string, voiceInstruction: "stable" | "expressive"): Promise<{ url: string; error?: string }> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    
    const response = await fetch(`${API_URL}/v1/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_instruction: voiceInstruction })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'TTS failed' }));
      return { url: '', error: error.error || 'TTS failed' };
    }

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    return { url };
  } catch (err: any) {
    console.error("TTS failed:", err?.message || err);
    return { url: '', error: err?.message || 'TTS error' };
  }
};