

// This service integrates with ElevenLabs API for TTS and Web Speech API for STT.

// Fix: Augment the Window interface to include SpeechRecognition and webkitSpeechRecognition
// The global declaration has been moved to types.ts to centralize type definitions.
// No 'declare global' block needed here.

const ELEVENLABS_API_KEY = 'b330b28ac534ab5e51ce05ad45d6482ffe0cfc32b4bae0a58172abddaeb0f918'; // Provided by user
const ELEVENLABS_VOICE_ID = '21m00Tcm4FNvytzEZVg8'; // Defaulting to "Rachel"
const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2'; // A common multilingual model for broader language support

export const elevenLabsService = {
  /**
   * Performs Text-to-Speech using the ElevenLabs API.
   * @param text The text to convert to speech.
   * @returns A Promise that resolves with an ArrayBuffer containing the audio data.
   */
  async textToSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs TTS API error: ${response.status} - ${errorText}`);
      }

      return await response.arrayBuffer(); // Returns audio data as ArrayBuffer
    } catch (error) {
      console.error('Error in ElevenLabs text-to-speech:', error);
      throw error;
    }
  },
};
