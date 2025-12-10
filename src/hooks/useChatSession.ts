import { useState, useCallback } from 'react';
import { geminiService } from '../../services/geminiService';
import { firestoreService } from '../../services/firestoreService';
import { functionDeclarations } from '../config/functionDeclarations';
import { handleFunctionCall, formatToolResponses } from '../handlers/functionCallHandler';

export interface Message {
    role: 'user' | 'model' | 'system';
    parts: { type: 'text' | 'image'; value: string }[];
}

interface UseChatSessionOptions {
    initialMessages?: Message[];
    isGuest?: boolean;
}

/**
 * Hook for managing chat sessions with Gemini AI
 * Handles text messages, function calling, and RAG context
 */
export function useChatSession(options: UseChatSessionOptions = {}) {
    const [messages, setMessages] = useState<Message[]>(options.initialMessages || [
        {
            role: 'system',
            parts: [{ type: 'text', value: "I am Mira, I will answer in any language and to any question. I'm listening to you-)" }]
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const addMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message]);
    }, []);

    const addMessages = useCallback((newMessages: Message[]) => {
        setMessages(prev => [...prev, ...newMessages]);
    }, []);

    const addSystemMessage = useCallback((text: string) => {
        setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: text }] }]);
    }, []);

    const sendTextMessage = useCallback(async (
        text: string,
        image?: { data: string; mimeType: string; url: string }
    ): Promise<void> => {
        if (isLoading) return;
        if (!text.trim() && !image) return;

        // Optimistic UI update - add user message
        const userMessageParts: { type: 'text' | 'image'; value: string }[] = [];
        if (image) {
            userMessageParts.push({ type: 'image', value: image.url });
        }
        if (text.trim()) {
            userMessageParts.push({ type: 'text', value: text });
        }

        setMessages(prev => [...prev, { role: 'user', parts: userMessageParts }]);
        setIsLoading(true);

        try {
            // Fetch RAG knowledge + memories to inject into system instruction
            const ragContext = await firestoreService.fetchRAGKnowledge();
            let systemInstruction = `You are a helpful CRM assistant named Mira. You can manage students, employees, courses, tasks, and finances. 
      
--- Knowledge Base & Memory ---
${ragContext}
      
If the user asks a question about the CRM itself or past facts, use the provided knowledge base.
If the user provides new personal information or rules (e.g., "My name is X", "We don't work on Fridays"), use the 'rememberFact' tool to save it.
Respond in the user's language.`;

            let toolsForSession = functionDeclarations;

            // GUEST MODE OVERRIDE
            if (options.isGuest) {
                systemInstruction = `You are Mira, the AI assistant for MagicAI CRM.
                
CURRENT USER IS A GUEST (Not Logged In).
- You CANNOT perform backend actions (adding students, tasks, etc.).
- You SHOULD explain CRM features and answer questions about courses.
- You MUST encourage the user to REGISTER to access full features (courses, CRM tools).
- Do NOT try to call any tools/functions. Just respond with text.`;
                toolsForSession = [];
            }

            const result = await geminiService.performFunctionCall(
                text,
                toolsForSession,
                systemInstruction,
                image ? { data: image.data, mimeType: image.mimeType } : undefined
            );

            if (Array.isArray(result)) {
                // Function call response
                const toolResponses = await handleFunctionCall(result);
                const responseText = formatToolResponses(toolResponses);
                setMessages(prev => [...prev, { role: 'model', parts: [{ type: 'text', value: responseText }] }]);
            } else {
                // Regular text response
                setMessages(prev => [...prev, { role: 'model', parts: [{ type: 'text', value: result }] }]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, {
                role: 'model',
                parts: [{ type: 'text', value: 'Sorry, I encountered an error. Please try again.' }]
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, options.isGuest]);

    const clearMessages = useCallback(() => {
        setMessages([{
            role: 'system',
            parts: [{ type: 'text', value: "I am Mira, I will answer in any language and to any question. I'm listening to you-)" }]
        }]);
    }, []);

    return {
        messages,
        isLoading,
        sendTextMessage,
        addMessage,
        addMessages,
        addSystemMessage,
        clearMessages,
        setMessages
    };
}
