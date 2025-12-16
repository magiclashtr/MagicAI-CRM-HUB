import { useRef, useCallback } from 'react';
import { LiveServerMessage, FunctionDeclaration } from '@google/genai';
import { geminiService } from '../../services/geminiService';
import { firestoreService } from '../../services/firestoreService';
import { functionDeclarations } from '../config/functionDeclarations';
import { handleFunctionCall } from '../handlers/functionCallHandler';

interface Message {
    role: 'user' | 'model' | 'system';
    parts: { type: 'text' | 'image'; value: string }[];
}

interface UseLiveAudioOptions {
    onMessage: (messages: Message[]) => void;
    onTranscriptionUpdate: (text: string) => void;
    onSessionEnd: () => void;
    onError: (message: string) => void;
    setApiKeyNeeded: () => void;
    isGuest?: boolean;
}

/**
 * Hook for managing live audio sessions with Gemini AI
 * Handles microphone input, audio output, and transcription
 */
export function useLiveAudio({
    onMessage,
    onTranscriptionUpdate,
    onSessionEnd,
    onError,
    setApiKeyNeeded,
    isGuest = false
}: UseLiveAudioOptions) {
    // Session and audio refs
    const sessionRef = useRef<any>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputNodeRef = useRef<GainNode | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    // Transcription refs
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const stopLiveSession = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        inputAudioContextRef.current?.close().catch(e => console.warn('Error closing input audio context:', e));
        outputAudioContextRef.current?.close().catch(e => console.warn('Error closing output audio context:', e));

        sessionRef.current?.then((s: any) => s.close());

        sessionRef.current = null;
        mediaStreamRef.current = null;
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        inputNodeRef.current = null;
        outputNodeRef.current = null;

        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        onTranscriptionUpdate('');
        onSessionEnd();
    }, [onTranscriptionUpdate, onSessionEnd]);

    const startLiveSession = useCallback(async () => {
        // Initialize audio contexts
        inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        inputNodeRef.current = inputAudioContextRef.current.createGain();
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        if (outputAudioContextRef.current && outputNodeRef.current) {
            outputNodeRef.current.connect(outputAudioContextRef.current.destination);
        }

        // Resume contexts to ensure they are active (browsers may suspend them)
        try {
            await inputAudioContextRef.current.resume();
            await outputAudioContextRef.current.resume();
        } catch (e) {
            console.warn('Failed to resume audio contexts:', e);
        }

        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            const ragContext = await firestoreService.fetchRAGKnowledge();
            let systemInstruction = `You are Mira, a helpful and friendly female AI assistant for the MagicAI-CRM-HUB. You can fully manage all aspects of the CRM.
        
--- Knowledge Base & Memory ---
${ragContext}

If the user provides new personal information or rules (e.g., "My name is X", "I prefer Y"), use the 'rememberFact' tool to save it.
If a function call to find or modify an entity returns multiple suggestions, ask the user for clarification.
Always respond in the language of the user's query.`;

            let toolsForSession: FunctionDeclaration[] = functionDeclarations;

            if (isGuest) {
                systemInstruction = `You are Mira, the AI assistant.
CURRENT USER IS A GUEST.
- You CANNOT perform backend actions.
- You SHOULD explain features and answer questions about courses.
- You MUST encourage the user to REGISTER to access full features.
- Do not use tools.`;
                toolsForSession = [];
            }

            sessionRef.current = geminiService.connectLiveSession(
                {
                    onopen: () => {
                        if (!inputAudioContextRef.current || !mediaStreamRef.current || !inputNodeRef.current) return;

                        mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = geminiService.createAudioBlob(inputData);
                            sessionRef.current?.then((s: any) => s.sendRealtimeInput({ media: pcmBlob }));
                        };

                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputNodeRef.current);
                        inputNodeRef.current.gain.value = 0;
                        inputNodeRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            onTranscriptionUpdate(currentInputTranscriptionRef.current);
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }

                        // Handle turn complete
                        if (message.serverContent?.turnComplete) {
                            const userText = currentInputTranscriptionRef.current.trim();
                            const modelText = currentOutputTranscriptionRef.current.trim();
                            const newMessages: Message[] = [];

                            if (userText) {
                                newMessages.push({ role: 'user', parts: [{ type: 'text', value: userText }] });
                            }
                            if (modelText) {
                                newMessages.push({ role: 'model', parts: [{ type: 'text', value: modelText }] });
                            }

                            if (newMessages.length > 0) {
                                onMessage(newMessages);
                            }

                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            onTranscriptionUpdate('');
                        }

                        // Handle function calls
                        if (message.toolCall?.functionCalls) {
                            try {
                                const toolResponses = await handleFunctionCall(message.toolCall.functionCalls);

                                const safeToolResponses = toolResponses.map(tr => {
                                    const { id, name, response } = tr;
                                    const safeResponse = JSON.parse(JSON.stringify(response, (key, value) => {
                                        if (value && typeof value === 'object' && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
                                            return undefined;
                                        }
                                        return value;
                                    }));
                                    return { id, name, response: safeResponse };
                                });

                                if (safeToolResponses.length > 0) {
                                    sessionRef.current?.then((s: any) => s.sendToolResponse({ functionResponses: safeToolResponses }));
                                }
                            } catch (e) {
                                console.error('Error handling function call in live session:', e);
                            }
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        if (e.message.includes('Requested entity was not found')) {
                            onError('API Key Error: Your key may be invalid. Please select a new one.');
                            setApiKeyNeeded();
                        } else {
                            onError(`Error: ${e.message}`);
                        }
                        stopLiveSession();
                    },
                    onclose: () => {
                        console.warn('Live session closed');
                        stopLiveSession();
                    }
                },
                systemInstruction,
                toolsForSession,
                inputAudioContextRef.current,
                outputAudioContextRef.current,
                inputNodeRef.current,
                outputNodeRef.current
            );

        } catch (error: any) {
            console.error('Failed to start live session:', error);
            let errorMessage = 'Could not start microphone. Please check permissions.';

            if (error.message) {
                if (error.message.includes('Gemini API Key')) {
                    errorMessage = 'System Error: API Key is missing. Please check your deployment settings.';
                } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    errorMessage = 'Microphone access denied. Please allow microphone permissions in your browser.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = 'No microphone found on this device.';
                } else {
                    errorMessage = `Connection Error: ${error.message}`;
                }
            }

            onError(errorMessage);
            throw error;
        }
    }, [onMessage, onTranscriptionUpdate, onError, setApiKeyNeeded, isGuest, stopLiveSession]);

    const sendTextToLiveSession = useCallback(async (
        prompt: string,
        image?: { data: string; mimeType: string }
    ) => {
        if (!sessionRef.current) return;

        try {
            const session = await sessionRef.current;

            if (image) {
                await session.sendRealtimeInput({
                    media: {
                        mimeType: image.mimeType,
                        data: image.data
                    }
                });
            }

            if (prompt) {
                await session.send({ parts: [{ text: prompt }], turnComplete: true });
            }
        } catch (error) {
            console.error('Error sending to live session:', error);
            throw error;
        }
    }, []);

    return {
        startLiveSession,
        stopLiveSession,
        sendTextToLiveSession,
        sessionRef
    };
}
