// FIX: Moved the 'Student' type import from '@google/genai' to the local '../types' file, as it is a custom application type and not exported by the Gemini library.
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, Modality, FunctionDeclaration, FunctionCall, LiveServerMessage, Part } from "@google/genai";
import { GeminiAnalysisResult, UserRole, Student, Course, Income, Task, AdvisorSuggestion } from '../types';
import { Type } from "@google/genai";
import { firestoreService } from './firestoreService'; // Import firestoreService for RAG

// Helper function to convert Blob to Base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result.split(',')[1]); // Extract base64 part
      } else {
        reject(new Error("Failed to read blob as string."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper functions for audio decoding/encoding
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to create audio Blob from Float32Array
function createAudioBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768; // Convert to Int16
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const getGeminiInstance = () => {
  let apiKey = '';
  try {
    // Safely attempt to access process.env.API_KEY. 
    // In some browser environments (like Vite without specific config), 'process' might be undefined, causing a crash.
    apiKey = process.env.API_KEY || '';
  } catch (e) {
    console.warn("process.env is not defined in this environment.");
  }

  // Ensure API key is available. If not, prompt user to select it.
  if (!apiKey) {
    console.error("Gemini API Key is not set.");
    // In a real app, you'd show a UI error or redirect to a key setup page.
    throw new Error("Gemini API Key is not set. Please ensure process.env.API_KEY is configured in your build settings.");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

export const geminiService = {
  async generateText(
    prompt: string,
    model: string = 'gemini-2.5-flash',
    systemInstruction?: string,
    responseSchema?: GenerateContentParameters['config']['responseSchema'],
    tools?: GenerateContentParameters['config']['tools'],
    thinkingBudget?: number,
    image?: { data: string; mimeType: string }, // New optional image parameter
  ): Promise<string | object> {
    try {
      const ai = getGeminiInstance();
      const config: GenerateContentParameters['config'] = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = responseSchema;
      }
      if (tools) {
        config.tools = tools;
      }
      if (thinkingBudget !== undefined) {
        config.thinkingConfig = { thinkingBudget };
      }

      const contentPartsArray: Array<Part> = [];
      if (image) {
        contentPartsArray.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      }
      if (prompt) {
        contentPartsArray.push({ text: prompt });
      }

      const contentsParam = (contentPartsArray.length === 1 && !image)
          ? prompt
          : { parts: contentPartsArray };

      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: contentsParam,
        config,
      });

      if (responseSchema) {
        try {
          return JSON.parse(response.text.trim());
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          console.debug("Raw non-JSON response:", response.text);
          throw new Error("Received non-JSON response when JSON was expected.");
        }
      }
      return response.text;
    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  },
  
  async generateTextWithRAG(
    prompt: string
  ): Promise<string> {
    try {
      const ragContext = await firestoreService.fetchRAGKnowledge();
      const fullPrompt = `${ragContext}\n--- User Query ---\n${prompt}`;
      
      const ai = getGeminiInstance();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
            systemInstruction: 'You are an AI assistant for a CRM. Answer the user\'s query based on the provided knowledge base context. If the information is not in the context, say you don\'t have that information.'
        }
      });

      return response.text;
    } catch (error) {
      console.error('Error generating text with RAG:', error);
      throw error;
    }
  },

  async generateTextStream(
    prompt: string,
    model: string = 'gemini-2.5-flash',
    systemInstruction?: string,
    tools?: GenerateContentParameters['config']['tools'],
    thinkingBudget?: number,
  ): Promise<AsyncIterable<string>> {
    const ai = getGeminiInstance();
    const config: GenerateContentParameters['config'] = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools) {
      config.tools = tools;
    }
    if (thinkingBudget !== undefined) {
      config.thinkingConfig = { thinkingBudget };
    }

    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config,
    });

    const textStream = (async function*() {
      for await (const chunk of response) {
        yield chunk.text;
      }
    })();
    return textStream;
  },

  async generateImage(
    prompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1',
    model: string = 'imagen-4.0-generate-001',
  ): Promise<string> {
    try {
      const ai = getGeminiInstance();
      const response = await ai.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio,
        },
      });
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  },

  async analyzeMessage(message: string): Promise<GeminiAnalysisResult> {
    const prompt = `Analyze the following client message. Extract sentiment (positive, negative, neutral), any key entities (e.g., client name, course name, contact info like phone/email), and suggest appropriate next actions.
    Message: "${message}"

    Return the analysis as a JSON object with the following schema:
    {
      "sentiment": "positive" | "negative" | "neutral",
      "entities": [{ "name": "string", "type": "string", "value": "string" }],
      "suggestions": ["string"]
    }`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        sentiment: {
          type: Type.STRING,
          enum: ["positive", "negative", "neutral"],
        },
        entities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              value: { type: Type.STRING },
            },
          },
        },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["sentiment", "entities", "suggestions"],
    };

    try {
      const result = await this.generateText(
        prompt,
        'gemini-2.5-pro', // Using pro for more complex analysis
        'You are an AI assistant for a CRM specializing in beauty academy clients.',
        schema
      );
      return result as GeminiAnalysisResult;
    } catch (error) {
      console.error('Error analyzing message:', error);
      // Return a default/error structure if AI fails
      return {
        sentiment: 'neutral',
        entities: [],
        suggestions: ['Could not analyze message. Please try again or provide more context.'],
      };
    }
  },

  async getStudentAdvice(student: Student): Promise<string> {
    try {
      const ai = getGeminiInstance();
      const debtInfo = student.enrolledCourses.reduce((acc, course) => acc + Number(course.priceDue), 0);
      const prompt = `
        You are an expert CRM manager for a beauty academy. 
        Analyze the student's profile and provide a concise, actionable recommendation for the academy manager.
        The recommendation should be in Russian or Ukrainian.
        
        Student Profile:
        - Name: ${student.name}
        - Status: ${student.status}
        - Total Debt: ${debtInfo.toFixed(2)} USD
        - Enrolled Courses: ${student.enrolledCourses.map(c => `${c.courseName} (Paid: ${Number(c.pricePaid)}/${Number(c.price)}, Status: ${c.paymentStatus})`).join(', ') || 'None'}
        - Notes: ${student.notes.map(n => n.content).join('; ') || 'None'}

        Based on this, what is the best next step? (e.g., send a motivational message, remind about payment, suggest a new course, congratulate on graduation).
        Be specific and friendly.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Error getting student advice:', error);
      throw error;
    }
  },

  async generateCourseDescription(courseName: string): Promise<string> {
      try {
          const ai = getGeminiInstance();
          const prompt = `Generate a compelling, concise, and attractive course description in Russian for a beauty academy course named "${courseName}". Focus on the benefits for the student. Keep it under 500 characters.`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
          });

          return response.text.trim();
      } catch (error) {
          console.error('Error generating course description:', error);
          throw error;
      }
  },

  async generateEmployeeBio(name: string, role: string, specializations: string[]): Promise<string> {
    try {
        const ai = getGeminiInstance();
        const safeSpecializations = specializations || [];
        const prompt = `Generate a short, professional, and engaging biography in Russian for a beauty academy employee.
        
        Name: ${name}
        Role: ${role}
        Specializations: ${safeSpecializations.join(', ')}

        Keep it concise (around 2-3 sentences). Highlight their expertise and passion.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error generating employee bio:', error);
        throw error;
    }
},

  async generateTaskDescription(taskTitle: string): Promise<string> {
    try {
        const ai = getGeminiInstance();
        const prompt = `Generate a detailed and actionable description in Ukrainian for a task with the title "${taskTitle}".
        Focus on what needs to be done, potential sub-steps, and the purpose of the task.
        Keep it concise, yet informative (around 3-5 sentences).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error generating task description:', error);
        throw error;
    }
  },

  async suggestExpenseCategory(
    description: string,
    categories: string[]
  ): Promise<string | null> {
    if (!description.trim()) {
      return null;
    }

    try {
      const ai = getGeminiInstance();
      const prompt = `Analyze the following expense description and choose the most fitting category from the list provided. Respond with ONLY the category name and nothing else.

      Expense Description: "${description}"
      
      Available Categories: ${categories.join(', ')}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are an expert accountant. Your task is to categorize expenses accurately based on the provided list. Only return the category name."
        }
      });
      
      const suggestedCategory = response.text.trim();

      // Validate if the response is one of the allowed categories
      if (categories.includes(suggestedCategory)) {
        return suggestedCategory;
      }
      console.warn(`Gemini suggested an invalid category: "${suggestedCategory}"`);
      return null;

    } catch (error) {
      console.error('Error suggesting expense category:', error);
      return null; // Return null on error so the UI can handle it gracefully
    }
  },

  async suggestExpenseDetails(
    category: string,
    notes: string,
    availableNames?: string[]
  ): Promise<{ suggestedName: string; suggestedUnit: string } | null> {
    if (!category) {
      return null;
    }

    try {
      const ai = getGeminiInstance();
      let prompt = `Based on the expense category and any notes, suggest a specific expense name and a common unit of measurement.
      
      Expense Category: "${category}"
      Notes: "${notes}"`;

      if (availableNames && availableNames.length > 0) {
        prompt += `\n\nPreferred Expense Names (choose one if suitable, otherwise suggest a new one): ${availableNames.join(', ')}`;
      }

      prompt += `\n\nProvide a concise and typical expense name. For example, for the category "Питание" (Food), a good name would be "Обед с клиентом" (Lunch with client) or "Продукты в офис" (Groceries for office).
      For the unit, suggest something like "шт" (pieces), "услуга" (service), "месяц" (month), "кг" (kg).
      Return ONLY a JSON object with the suggested name and unit.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          suggestedName: {
            type: Type.STRING,
            description: 'A specific, common name for the expense.',
          },
          suggestedUnit: {
            type: Type.STRING,
            description: 'The unit of measurement for the expense (e.g., шт, услуга, месяц).',
          },
        },
        required: ['suggestedName', 'suggestedUnit'],
      };

      const result = await this.generateText(
        prompt,
        'gemini-2.5-flash',
        'You are an expert accountant helping with data entry. You respond in Russian.',
        schema
      );

      return result as { suggestedName: string; suggestedUnit: string };

    } catch (error) {
      console.error('Error suggesting expense details:', error);
      return null;
    }
  },

  // FIX: Added textToSpeech method for GenAIMagic view.
  async textToSpeech(text: string): Promise<string> { // returns base64 string
    try {
        const ai = getGeminiInstance();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from Gemini TTS.");
        }
        return base64Audio;
    } catch (error) {
        console.error('Error in Gemini text-to-speech:', error);
        throw error;
    }
  },

  async performFunctionCall(
    prompt: string,
    functions: FunctionDeclaration[],
    systemInstruction?: string,
    image?: { data: string; mimeType: string }, // Add optional image parameter
  ): Promise<FunctionCall[] | string> {
    try {
      const ai = getGeminiInstance();
      const contentPartsArray: Array<Part> = [];
      if (image) {
        contentPartsArray.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      }
      if (prompt) {
        contentPartsArray.push({ text: prompt });
      }

      const contentsParam = (contentPartsArray.length === 1 && !image)
          ? prompt
          : { parts: contentPartsArray };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentsParam,
        config: {
          tools: [{ functionDeclarations: functions }],
          systemInstruction: systemInstruction || 'You are an AI assistant that can create clients, add notes, and manage tasks.',
        },
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        return response.functionCalls;
      }
      return response.text; // If no function call, return text
    } catch (error) {
      console.error('Error performing function call:', error);
      throw error;
    }
  },

  connectLiveSession(
    callbacks: {
      onopen: () => void;
      onmessage: (message: LiveServerMessage) => void;
      onerror: (e: ErrorEvent) => void;
      onclose: (e: CloseEvent) => void;
    },
    systemInstruction: string,
    functions?: FunctionDeclaration[],
    inputAudioContext?: AudioContext, // Added for dependency injection
    outputAudioContext?: AudioContext, // Added for dependency injection
    inputNode?: GainNode, // Added for dependency injection
    outputNode?: GainNode, // Added for dependency injection
  ): Promise<any> { // Returns the session promise
    if (!inputAudioContext || !outputAudioContext || !inputNode || !outputNode) {
      throw new Error("Audio contexts and nodes must be provided for live session.");
    }

    const ai = getGeminiInstance();
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();

    // This needs to be a promise to avoid race conditions with audio streaming
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        ...callbacks,
        onmessage: async (message: LiveServerMessage) => {
          // Process audio output
          const base64EncodedAudioString =
            message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString) {
            nextStartTime = Math.max(
              nextStartTime,
              outputAudioContext.currentTime,
            );
            try {
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputAudioContext,
                24000, // sampleRate for output
                1,
              );
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.addEventListener('ended', () => {
                sources.delete(source);
              });
              source.start(nextStartTime);
              nextStartTime = nextStartTime + audioBuffer.duration;
              sources.add(source);
            } catch (error) {
              console.error('Error decoding or playing audio:', error);
            }
          }

          // Handle interruption
          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            for (const source of sources.values()) {
              source.stop();
              sources.delete(source);
            }
            nextStartTime = 0;
          }

          callbacks.onmessage(message); // Pass original message to external callback
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: systemInstruction,
        tools: functions ? [{ functionDeclarations: functions }] : undefined,
        inputAudioTranscription: {}, // Enable transcription for user input audio.
        outputAudioTranscription: {}, // Enable transcription for model output audio.
      },
    });

    return sessionPromise;
  },

  async generateWelcomeMessage(userName: string, userRole: UserRole, currentDate: string, timeOfDay: string): Promise<string> {
    try {
      const ai = getGeminiInstance();
      const prompt = `You are a helpful and motivational AI assistant for a CRM. Generate a concise, welcoming, and encouraging message for a user named '${userName}' who has the role of '${userRole}'. The current date is '${currentDate}' and it is ${timeOfDay}. In Ukrainian, tailor the message to their role if possible, e.g., for a 'Director', mention strategic overview; for a 'Manager', mention team success; for a 'Trainer', mention student progress. Keep it positive and under 200 characters.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.7, // Moderate creativity
          maxOutputTokens: 100, // Keep it concise
        }
      });

      return (response.text || '').trim(); // Safely handle undefined/null response.text
    } catch (error) {
      console.error('Error generating welcome message:', error);
      return "Вітаємо на панелі керування! Маємо чудовий день для продуктивної роботи.";
    }
  },

  async generateAdvisorSuggestions(
    students: Student[],
    courses: Course[],
    income: Income[],
    tasks: Task[]
  ): Promise<AdvisorSuggestion[]> {
    try {
      const ai = getGeminiInstance();
      // Prepare data summary
      const activeStudents = students.filter(s => s.status === 'Active');
      const debtStudents = students.filter(s => s.enrolledCourses.some(c => c.priceDue > 0));
      const recentIncome = income.slice(-10);
      const pendingTasks = tasks.filter(t => t.status !== 'Done');

      const prompt = `
        Analyze the CRM data and suggest 3-5 priority actions for the manager (in Ukrainian).
        
        Data Summary:
        - Active Students: ${activeStudents.length}
        - Students with Debt: ${debtStudents.length}
        - Recent Income Entries: ${recentIncome.length}
        - Pending Tasks: ${pendingTasks.length}

        Suggestions should be about student retention, debt collection, financial optimization, or task management.
        
        Return a JSON array of suggestions.
        Schema:
        {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "title": { "type": "string" },
              "description": { "type": "string" },
              "type": { "type": "string", "enum": ["student", "finance", "course"] },
              "studentId": { "type": "string" }, // Optional
              "courseName": { "type": "string" }, // Optional
              "actionType": { "type": "string", "enum": ["payment_reminder", "follow_up", "general"] } // Optional
            },
            "required": ["id", "title", "description", "type"]
          }
        }
      `;

       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['student', 'finance', 'course'] },
                        studentId: { type: Type.STRING },
                        courseName: { type: Type.STRING },
                        actionType: { type: Type.STRING, enum: ['payment_reminder", "follow_up", "general'] }
                    },
                    required: ['id', 'title', 'description', 'type']
                }
            }
        }
      });

      const text = response.text;
      if (!text) return [];
      
      const suggestions = JSON.parse(text) as AdvisorSuggestion[];
      // Ensure unique IDs
      return suggestions.map((s, i) => ({ ...s, id: s.id || `ai-gen-${Date.now()}-${i}` }));

    } catch (error) {
      console.error('Error generating advisor suggestions:', error);
      return [];
    }
  },

  createAudioBlob: createAudioBlob,
  decodeAudioData: decodeAudioData,
  decode: decode,
  encode: encode,
};

// Simple mock for window.aistudio
if (typeof window !== 'undefined' && !window.aistudio) {
  window.aistudio = {
    hasSelectedApiKey: async () => {
      console.log("Mock: Checking for API key selection...");
      // Simulate that a key is selected after 2 seconds the first time.
      if (!localStorage.getItem('mockApiKeySelected')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        localStorage.setItem('mockApiKeySelected', 'true');
        return true;
      }
      return localStorage.getItem('mockApiKeySelected') === 'true';
    },
    openSelectKey: async () => {
      console.log("Mock: Opening API key selection dialog...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('mockApiKeySelected', 'true');
      alert("Mock API Key Selected (simulated). Please ensure you have configured your Gemini API key and billing on ai.google.dev/gemini-api/docs/billing if this were a real application.");
    },
    getHostUrl: async () => {
      console.log("Mock: getHostUrl called.");
      return "https://mock-gemini.googleapis.com";
    },
    getModelQuota: async (model: string) => {
      console.log(`Mock: getModelQuota called for model: ${model}`);
      const mockQuota: ModelQuota = {
        metricName: `mock-${model}-requests-per-minute`,
        maxQuota: 1000,
        remainingQuota: 999,
        quota: "mock_quota_value",
        remaining: "mock_remaining_value",
      };
      return mockQuota;
    },
  } as AIStudio;
}