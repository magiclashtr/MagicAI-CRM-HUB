import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FunctionDeclaration,
  LiveServerMessage,
  Part,
  Type,
} from '@google/genai';
import { NavItem, Currency, StudentDetailsResponse, Task, Student } from './types';
import { geminiService } from './services/geminiService';
import { firestoreService } from './services/firestoreService';

import Layout from './components/Layout';
import ChatWidget from './components/ChatWidget';
import Dashboard from './views/Dashboard';
import Training from './views/Training';
import CoursePreparationView from './views/CoursePreparation';
import Finance from './views/Finance';
import Tasks from './views/Tasks';
import ApiKeyPromptOverlay from './components/ApiKeyPromptOverlay';

type Message = {
  role: 'user' | 'model' | 'system';
  parts: { type: 'text' | 'image'; value: string }[];
};

const App: React.FC = () => {
  // Main app state
  const [activeItem, setActiveItem] = useState<NavItem>('dashboard');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [hasApiKey, setHasApiKey] = useState(true); // Assume true initially to avoid flash

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [startVoiceOnOpen, setStartVoiceOnOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
        role: 'system',
        parts: [{ type: 'text', value: "I am Mira, I will answer in any language and to any question. I'm listening to you-)" }]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);

  // Live session state
  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Transcription state
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const [displayedTranscription, setDisplayedTranscription] = useState('');

  useEffect(() => {
    const checkApiKey = async () => {
        if (window.aistudio) {
            const keySelected = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(keySelected);
        }
    };
    checkApiKey();
  }, []);
  
  const ensureApiKey = async (): Promise<boolean> => {
    if (hasApiKey) return true;
    if (window.aistudio) {
        const keySelected = await window.aistudio.hasSelectedApiKey();
        if (keySelected) {
            setHasApiKey(true);
            return true;
        }
    }
    setHasApiKey(false); // Show the overlay
    return false;
  };

  const functionDeclarations: FunctionDeclaration[] = [
    // --- MEMORY ---
    {
        name: 'rememberFact',
        parameters: {
            type: Type.OBJECT,
            description: "Store a new fact, preference, or rule in long-term memory. Use this when the user explicitly asks to remember something or provides important context that should persist (e.g., 'My name is X', 'I prefer Y', 'We don't work on Sundays').",
            properties: {
                fact: { type: Type.STRING, description: "The content of the fact to remember." },
                category: { type: Type.STRING, description: "A category for the fact (e.g., 'user_preference', 'business_rule', 'general'). Defaults to 'general'." }
            },
            required: ['fact']
        }
    },
    // --- STUDENT MANAGEMENT ---
    {
        name: 'addStudent',
        parameters: {
            type: Type.OBJECT, description: 'Create a new student in the CRM.',
            properties: { name: { type: Type.STRING, description: 'The full name of the student.' }, email: { type: Type.STRING, description: 'The student\'s email address.' }, phone: { type: Type.STRING, description: 'The student\'s phone number.' }, source: { type: Type.STRING, description: 'How the student was acquired (e.g., Instagram).' }, },
            required: ['name'],
        },
    },
    { name: 'deleteStudent', parameters: { type: Type.OBJECT, description: 'Delete a student from the CRM by their name.', properties: { name: { type: Type.STRING, description: 'The full or partial name of the student to delete.' } }, required: ['name'] } },
    { name: 'addNoteToStudent', parameters: { type: Type.OBJECT, description: 'Add a note to a specific student\'s profile.', properties: { studentName: { type: Type.STRING, description: 'The full or partial name of the student.' }, content: { type: Type.STRING, description: 'The content of the note.' } }, required: ['studentName', 'content'] } },
    {
      name: 'listStudents',
      parameters: { type: Type.OBJECT, description: "List students based on optional filters like status, debt, or course enrollment. Shows all students if no filters are provided.", properties: { status: { type: Type.STRING, enum: ['Active', 'Pending', 'Graduated', 'Dropped'], description: "Filter students by their status." }, hasDebt: { type: Type.BOOLEAN, description: "Filter for students who have an outstanding balance." }, courseName: { type: Type.STRING, description: "Filter students by a specific course they are enrolled in." }, }, },
    },
    { name: 'getStudentDetailsByName', parameters: { type: Type.OBJECT, description: "Get a student's details by their full or partial name. Returns suggestions if the name is ambiguous.", properties: { name: { type: Type.STRING, description: "The full or partial name of the student to search for." } }, required: ['name'] } },
    { name: 'updateStudentDetails', parameters: { type: Type.OBJECT, description: "Update a student's details like name, email, phone, status, or source. Can search by partial name.", properties: { studentName: { type: Type.STRING, description: "The full or partial name of the student to update." }, newName: { type: Type.STRING, description: "The student's new full name." }, email: { type: Type.STRING, description: "The student's new email." }, phone: { type: Type.STRING, description: "The student's new phone number." }, messenger: { type: Type.STRING, description: "The student's new messenger contact." }, source: { type: Type.STRING, description: "The student's new source." }, status: { type: Type.STRING, enum: ['Active', 'Pending', 'Graduated', 'Dropped'], description: "The student's new status." } }, required: ['studentName'] } },
    { name: 'enrollStudentInCourse', parameters: { type: Type.OBJECT, description: "Enroll an existing student in a new course. Can search by partial student name.", properties: { studentName: { type: Type.STRING, description: "The full or partial name of the student to enroll." }, courseName: { type: Type.STRING, description: "The name of the course to enroll the student in." } }, required: ['studentName', 'courseName'] } },
    { name: 'recordStudentPayment', parameters: { type: Type.OBJECT, description: "Record a payment from a student for a specific course. Can search by partial student name.", properties: { studentName: { type: Type.STRING, description: "The full or partial name of the student making the payment." }, courseName: { type: Type.STRING, description: "The name of the course for which the payment is being made." }, amount: { type: Type.NUMBER, description: "The amount of the payment." }, paymentMethod: { type: Type.STRING, enum: ['Карта', 'Наличные', 'IBAN', 'Криптовалюта', 'Другое'], description: "The method of payment. Defaults to 'Карта'." } }, required: ['studentName', 'courseName', 'amount'] } },

    // --- TASK MANAGEMENT ---
    { name: 'addTask', parameters: { type: Type.OBJECT, description: 'Create a new task in the system.', properties: { title: { type: Type.STRING, description: 'The title of the task.' }, details: { type: Type.STRING, description: 'Optional details about the task.' }, assigneeName: { type: Type.STRING, description: "The name of the employee assigned to the task. Defaults to 'Margarita Gulina'." }, dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format. Defaults to today's date." }, priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The task priority. Defaults to 'Medium'." } }, required: ['title'] } },
    { name: 'updateTask', parameters: { type: Type.OBJECT, description: 'Update an existing task by its title.', properties: { taskTitle: { type: Type.STRING, description: 'The title of the task to update.' }, newTitle: { type: Type.STRING, description: 'The new title for the task.' }, status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'Done'], description: 'The new status of the task.' }, assigneeName: { type: Type.STRING, description: 'The new assignee for the task.' }, dueDate: { type: Type.STRING, description: 'The new due date in YYYY-MM-DD format.' }, priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: 'The new priority for the task.' } }, required: ['taskTitle'] } },
    { name: 'deleteTask', parameters: { type: Type.OBJECT, description: 'Delete a task by its title.', properties: { title: { type: Type.STRING, description: 'The title of the task to delete.' } }, required: ['title'] } },
    { name: 'listTasks', parameters: { type: Type.OBJECT, description: 'List tasks, optionally filtered by assignee or status.', properties: { assigneeName: { type: Type.STRING, description: 'Filter tasks by the name of the assignee.' }, status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'Done'], description: 'Filter tasks by their status.' } }, }, },

    // --- EMPLOYEE MANAGEMENT ---
    { name: 'addEmployee', parameters: { type: Type.OBJECT, description: 'Add a new employee to the CRM.', properties: { name: { type: Type.STRING, description: 'Full name.' }, email: { type: Type.STRING, description: 'Email address.' }, phone: { type: Type.STRING, description: 'Phone number.' }, role: { type: Type.STRING, description: 'Role (e.g., Trainer, Manager).' }, salary: { type: Type.NUMBER, description: 'Monthly salary in USD.' } }, required: ['name', 'role'] } },
    { name: 'updateEmployee', parameters: { type: Type.OBJECT, description: 'Update an employee\'s details by name.', properties: { name: { type: Type.STRING, description: 'The name of the employee to update.' }, newName: { type: Type.STRING, description: 'The employee\'s new name.' }, email: { type: Type.STRING, description: 'New email.' }, phone: { type: Type.STRING, description: 'New phone.' }, role: { type: Type.STRING, description: 'New role.' }, salary: { type: Type.NUMBER, description: 'New salary.' }, status: { type: Type.STRING, enum: ['Active', 'On Leave', 'Terminated'], description: 'New status.' } }, required: ['name'] } },
    { name: 'deleteEmployee', parameters: { type: Type.OBJECT, description: 'Delete an employee by name.', properties: { name: { type: Type.STRING, description: 'The name of the employee to delete.' } }, required: ['name'] } },

    // --- COURSE MANAGEMENT ---
    { name: 'addCourse', parameters: { type: Type.OBJECT, description: 'Add a new course to the catalog.', properties: { name: { type: Type.STRING, description: 'Name of the course.' }, description: { type: Type.STRING, description: 'A short description.' }, teacherName: { type: Type.STRING, description: 'Name of the assigned teacher.' }, duration: { type: Type.STRING, description: 'Duration (e.g., 5 days).' }, price: { type: Type.NUMBER, description: 'Price in USD.' } }, required: ['name', 'teacherName', 'price'] } },
    { name: 'updateCourse', parameters: { type: Type.OBJECT, description: 'Update a course\'s details by name.', properties: { name: { type: Type.STRING, description: 'The name of the course to update.' }, newName: { type: Type.STRING, description: 'The new name for the course.' }, description: { type: Type.STRING, description: 'New description.' }, teacherName: { type: Type.STRING, description: 'New teacher\'s name.' }, price: { type: Type.NUMBER, description: 'New price in USD.' } }, required: ['name'] } },
    { name: 'deleteCourse', parameters: { type: Type.OBJECT, description: 'Delete a course by name.', properties: { name: { type: Type.STRING, description: 'The name of the course to delete.' } }, required: ['name'] } },

    // --- FINANCIAL MANAGEMENT ---
    { name: 'addIncome', parameters: { type: Type.OBJECT, description: 'Record a new income entry.', properties: { description: { type: Type.STRING, description: 'Description of the income.' }, amount: { type: Type.NUMBER, description: 'Amount in USD.' } }, required: ['description', 'amount'] } },
    { name: 'addExpense', parameters: { type: Type.OBJECT, description: 'Record a new expense entry.', properties: { category: { type: Type.STRING, description: 'The category of the expense.' }, name: { type: Type.STRING, description: 'A specific name for the expense.' }, unitPrice: { type: Type.NUMBER, description: 'The price per unit in USD.' }, quantity: { type: Type.NUMBER, description: 'The quantity.' } }, required: ['category', 'name', 'unitPrice', 'quantity'] } },
    { name: 'deleteIncome', parameters: { type: Type.OBJECT, description: 'Delete an income record by its description.', properties: { description: { type: Type.STRING, description: 'The description of the income record to delete.' } }, required: ['description'] } },
    { name: 'deleteExpense', parameters: { type: Type.OBJECT, description: 'Delete an expense record by its name.', properties: { name: { type: Type.STRING, description: 'The name of the expense record to delete.' } }, required: ['name'] } },
    { name: 'getFinancialSummary', parameters: { type: Type.OBJECT, description: 'Get a financial summary for a given period.', properties: { days: { type: Type.NUMBER, description: 'The number of past days to summarize (e.g., 30 for the last month).' } } } },
];


  const handleFunctionCall = async (functionCalls: any[]) => {
    const toolResponses: any[] = [];
    for (const call of functionCalls) {
      try {
        const { id, name, args } = call;
        if (!id) {
            console.warn("Received function call without ID, skipping:", call);
            continue;
        }

        let result: any;
        // MEMORY
        if (name === 'rememberFact') {
            result = await firestoreService.rememberFact(args.fact, args.category);
        }
        // STUDENT
        else if (name === 'listStudents') {
            const students: Student[] = await firestoreService.findStudents(args);
            if (students.length === 0) {
                result = { message: "I couldn't find any students matching those criteria." };
            } else {
                const studentList = students.map(s => {
                    const debt = s.enrolledCourses.reduce((acc, c) => acc + Number(c.priceDue), 0);
                    return `- ${s.name} (${s.status})${debt > 0 ? ` - Owes ${debt.toFixed(2)} USD` : ''}`;
                }).join('\n');
                result = { message: `I found ${students.length} student(s):\n${studentList}` };
            }
        } else if (name === 'getStudentDetailsByName') {
            const response: StudentDetailsResponse = await firestoreService.getStudentDetailsByName(args.name);
            result = response;
        } else if (name === 'updateStudentDetails') {
            const { studentName, ...updates } = args;
            const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
                if (value !== undefined) { acc[key] = value; }
                return acc;
            }, {} as any);
            result = await firestoreService.updateStudentDetailsByName(studentName, cleanUpdates);
        } else if (name === 'enrollStudentInCourse') {
            result = await firestoreService.enrollStudentInCourseByName(args.studentName, args.courseName);
        } else if (name === 'recordStudentPayment') {
            result = await firestoreService.recordPaymentByName(args.studentName, args.courseName, args.amount, args.paymentMethod || 'Карта');
        } else if (name === 'addStudent') {
            result = await firestoreService.addStudent(args);
        } else if (name === 'deleteStudent') {
            result = await firestoreService.deleteStudentByName(args.name);
        } else if (name === 'addNoteToStudent') {
            result = await firestoreService.addNoteToStudentByName(args.studentName, args.content);
        }
        // TASK
        else if (name === 'addTask') {
            result = await firestoreService.addTaskFromAI(args);
        } else if (name === 'updateTask') {
            result = await firestoreService.updateTaskByName(args.taskTitle, args);
        } else if (name === 'deleteTask') {
            result = await firestoreService.deleteTaskByName(args.title);
        } else if (name === 'listTasks') {
            result = await firestoreService.listTasks(args);
        }
        // EMPLOYEE
        else if (name === 'addEmployee') {
            result = await firestoreService.addEmployee(args);
        } else if (name === 'updateEmployee') {
            result = await firestoreService.updateEmployeeByName(args.name, args);
        } else if (name === 'deleteEmployee') {
            result = await firestoreService.deleteEmployeeByName(args.name);
        }
        // COURSE
        else if (name === 'addCourse') {
            result = await firestoreService.addCourseFromAI(args);
        } else if (name === 'updateCourse') {
            result = await firestoreService.updateCourseByName(args.name, args);
        } else if (name === 'deleteCourse') {
            result = await firestoreService.deleteCourseByName(args.name);
        }
        // FINANCE
        else if (name === 'addIncome') {
            result = await firestoreService.addIncome({ ...args, date: new Date().toISOString().split('T')[0] });
        } else if (name === 'addExpense') {
            result = await firestoreService.addExpense({ ...args, date: new Date().toISOString().split('T')[0], unit: args.unit || 'unit', paymentMethod: 'Card' });
        } else if (name === 'deleteIncome') {
            result = await firestoreService.deleteIncomeByDescription(args.description);
        } else if (name === 'deleteExpense') {
            result = await firestoreService.deleteExpenseByName(args.name);
        } else if (name === 'getFinancialSummary') {
            result = await firestoreService.getFinancialSummary(args.days);
        }
        // UNKNOWN
        else {
            result = { error: 'Unknown function' };
        }
        
        toolResponses.push({
            id,
            name,
            response: { result },
        });
      } catch (error: any) {
        console.error(`Error executing function call "${call.name}":`, error);
        if (call.id) {
          toolResponses.push({
            id: call.id,
            name: call.name,
            response: { error: `Function execution failed: ${error.message}` },
          });
        }
      }
    }
    return toolResponses;
  }
  
  const handleSendText = async () => {
    // Allow sending if isLive even if technically "loading" (processing audio)
    if ((isLoading && !isLive) || (!inputText.trim() && !uploadedImage)) return;

    const keyReady = await ensureApiKey();
    if (!keyReady) {
        setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: "Please select an API key to chat." }] }]);
        return;
    }

    // Optimistic UI update
    const userMessageParts: { type: 'text' | 'image'; value: string }[] = [];
    if (uploadedImage) {
        userMessageParts.push({ type: 'image', value: uploadedImage.url });
    }
    if (inputText.trim()) {
        userMessageParts.push({ type: 'text', value: inputText });
    }

    const newMessages: Message[] = [...messages, { role: 'user', parts: userMessageParts }];
    setMessages(newMessages);
    
    const prompt = inputText;
    const image = uploadedImage;

    setInputText('');
    setUploadedImage(null);

    // LIVE SESSION HANDLING
    if (isLive && sessionRef.current) {
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
                // Send text input to the live model
                await session.send({ parts: [{ text: prompt }], turnComplete: true });
            }
        } catch (error) {
            console.error("Error sending to live session:", error);
            setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: "Failed to send message to live session." }] }]);
        }
        return; // Exit, do not use REST API
    }

    setIsLoading(true);
    try {
        // Fetch RAG knowledge + memories to inject into system instruction
        const ragContext = await firestoreService.fetchRAGKnowledge();
        const systemInstruction = `You are a helpful CRM assistant named Mira. You can manage students, employees, courses, tasks, and finances. 
        
        --- Knowledge Base & Memory ---
        ${ragContext}
        
        If the user asks a question about the CRM itself or past facts, use the provided knowledge base.
        If the user provides new personal information or rules (e.g., "My name is X", "We don't work on Fridays"), use the 'rememberFact' tool to save it.
        Respond in the user's language.`;

        const result = await geminiService.performFunctionCall(
          prompt, 
          functionDeclarations,
          systemInstruction,
          image ? { data: image.data, mimeType: image.mimeType } : undefined,
        );

        if (Array.isArray(result)) { // Function call
            const toolResponses = await handleFunctionCall(result);
            const responseText = toolResponses.map(tr => {
                const res = tr.response.result;
                if (res.suggestions && res.suggestions.length > 0) {
                  const suggestionsList = res.suggestions.map((s: any) => `- ${s.name || s}`).join('\n');
                  return `${res.message}\n${suggestionsList}`;
                }
                return res.message || `Action ${tr.name} performed.`;
            }).join('\n');
            setMessages(prev => [...prev, { role: 'model', parts: [{ type: 'text', value: responseText }] }]);

        } else { // Regular text response
            setMessages(prev => [...prev, { role: 'model', parts: [{ type: 'text', value: result }] }]);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev, { role: 'model', parts: [{ type: 'text', value: 'Sorry, I encountered an error. Please try again.' }] }]);
    } finally {
        setIsLoading(false);
    }
  };

  const startLiveSession = useCallback(async () => {
    if (isLive) return;

    const keyReady = await ensureApiKey();
    if (!keyReady) {
        setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: "Please select an API key to use voice features." }] }]);
        return;
    }
    
    setIsLive(true);
    setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: 'Voice session started...'}] }]);
    
    inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    inputNodeRef.current = inputAudioContextRef.current.createGain();
    outputNodeRef.current = outputAudioContextRef.current.createGain();
    outputNodeRef.current.connect(outputAudioContextRef.current.destination);

    try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const ragContext = await firestoreService.fetchRAGKnowledge();
        const systemInstruction = `You are Mira, a helpful and friendly female AI assistant for the MagicGenAI CRM. You can fully manage all aspects of the CRM.
        
        --- Knowledge Base & Memory ---
        ${ragContext}

        If the user provides new personal information or rules (e.g., "My name is X", "I prefer Y"), use the 'rememberFact' tool to save it.
        If a function call to find or modify an entity returns multiple suggestions, ask the user for clarification.
        Always respond in the language of the user's query.`;

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
                    // Connect processor to a muted gain node to keep it alive without causing feedback echo.
                    scriptProcessorRef.current.connect(inputNodeRef.current);
                    inputNodeRef.current.gain.value = 0;
                    inputNodeRef.current.connect(inputAudioContextRef.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        setDisplayedTranscription(currentInputTranscriptionRef.current);
                    }
                     if (message.serverContent?.outputTranscription) {
                        currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                    }
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
                             setMessages(prev => [...prev, ...newMessages]);
                        }
                        
                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                        setDisplayedTranscription('');
                    }
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
                      } catch(e) {
                         console.error("Error handling function call in live session:", e);
                      }
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    if (e.message.includes('Requested entity was not found')) {
                        setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: "API Key Error: Your key may be invalid. Please select a new one." }] }]);
                        setHasApiKey(false); // Trigger the API key prompt overlay
                    } else {
                        setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: `Error: ${e.message}` }] }]);
                    }
                    stopLiveSession();
                },
                onclose: (e: CloseEvent) => {
                    console.log('Live session closed');
                    stopLiveSession();
                },
            },
            systemInstruction,
            functionDeclarations,
            inputAudioContextRef.current,
            outputAudioContextRef.current,
            inputNodeRef.current,
            outputNodeRef.current,
        );
    } catch (error: any) {
        console.error("Failed to start live session:", error);
        let errorMessage = "Could not start microphone. Please check permissions.";
        
        // Improve error reporting to distinguish between microphone errors and API key/Process errors
        if (error.message) {
             if (error.message.includes("Gemini API Key")) {
                 errorMessage = "System Error: API Key is missing. Please check your deployment settings.";
             } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                 errorMessage = "Microphone access denied. Please allow microphone permissions in your browser.";
             } else if (error.name === 'NotFoundError') {
                 errorMessage = "No microphone found on this device.";
             } else {
                 errorMessage = `Connection Error: ${error.message}`;
             }
        }
        
        setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: errorMessage }] }]);
        setIsLive(false);
    }
  }, [isLive, hasApiKey]);
  
  const stopLiveSession = useCallback(() => {
    if (!isLive) return;
    setIsLive(false);
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    inputAudioContextRef.current?.close().catch(e => console.warn("Error closing input audio context:", e));
    outputAudioContextRef.current?.close().catch(e => console.warn("Error closing output audio context:", e));

    sessionRef.current?.then((s:any) => s.close());

    sessionRef.current = null;
    mediaStreamRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    inputNodeRef.current = null;
    outputNodeRef.current = null;

    setDisplayedTranscription('');
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    setMessages(prev => [...prev, { role: 'system', parts: [{ type: 'text', value: 'Voice session ended.' }] }]);
  }, [isLive]);

  const handleCloseChat = useCallback(() => {
    if (isLive) {
      stopLiveSession();
    }
    setIsChatOpen(false);
  }, [isLive, stopLiveSession]);

  const toggleChat = useCallback((startWithVoice = false) => {
    if (isChatOpen) {
      handleCloseChat();
    } else {
      setIsChatOpen(true);
      if (startWithVoice) {
        setStartVoiceOnOpen(true);
      }
    }
  }, [isChatOpen, handleCloseChat]);

  const onVoiceSessionHandled = useCallback(() => {
      setStartVoiceOnOpen(false);
  }, []);

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return <Dashboard currency={currency} />;
      case 'training':
        return <Training currency={currency} />;
      case 'course-preparation':
        return <CoursePreparationView />;
      case 'finance':
        return <Finance currency={currency} />;
      case 'tasks':
        return <Tasks />;
      default:
        return <Dashboard currency={currency} />;
    }
  };

  return (
    <>
      {!hasApiKey && <ApiKeyPromptOverlay onKeySelect={() => setHasApiKey(true)} />}
      <Layout
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        currency={currency}
        setCurrency={setCurrency}
        onVoiceCommand={() => toggleChat(true)}
        onToggleChat={() => toggleChat(false)}
      >
        {renderContent()}
      </Layout>
      <ChatWidget
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        messages={messages}
        inputText={inputText}
        setInputText={setInputText}
        isLive={isLive}
        isLoading={isLoading}
        startLiveSession={startLiveSession}
        stopLiveSession={stopLiveSession}
        handleSendText={handleSendText}
        displayedTranscription={displayedTranscription}
        uploadedImage={uploadedImage}
        setUploadedImage={setUploadedImage}
        startVoiceOnOpen={startVoiceOnOpen}
        onVoiceSessionHandled={onVoiceSessionHandled}
      />
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;