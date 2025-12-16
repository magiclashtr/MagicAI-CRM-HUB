import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { NavItem, Currency } from './types';

// Components
import Layout from './components/Layout';
import ChatWidget from './components/ChatWidget';
import Dashboard from './views/Dashboard';
import Training from './views/Training';
import CoursePreparationView from './views/CoursePreparation';
import Finance from './views/Finance';
import Tasks from './views/Tasks';
import ApiKeyPromptOverlay from './components/ApiKeyPromptOverlay';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './src/components/ErrorBoundary';

// Contexts & Styles
import './src/index.css';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Hooks
import { useChatSession } from './src/hooks/useChatSession';
import { useLiveAudio } from './src/hooks/useLiveAudio';

interface AppProps {
    isGuest?: boolean;
    onExitGuest?: () => void;
}

const App: React.FC<AppProps> = ({ isGuest = false, onExitGuest }) => {
    // Main app state
    const [activeItem, setActiveItem] = useState<NavItem>('dashboard');
    const [currency, setCurrency] = useState<Currency>('TRY');
    const [hasApiKey, setHasApiKey] = useState(true);

    // Chat UI state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [startVoiceOnOpen, setStartVoiceOnOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [displayedTranscription, setDisplayedTranscription] = useState('');

    // Chat Session Hook
    const {
        messages,
        isLoading: isChatLoading,
        sendTextMessage,
        addMessages,
        addSystemMessage,
        setMessages
    } = useChatSession({ isGuest });

    // API Key Management
    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio) {
                const keySelected = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(keySelected);
            }
        };
        checkApiKey();
    }, []);

    const ensureApiKey = useCallback(async (): Promise<boolean> => {
        if (hasApiKey) return true;
        if (window.aistudio) {
            const keySelected = await window.aistudio.hasSelectedApiKey();
            if (keySelected) {
                setHasApiKey(true);
                return true;
            }
        }
        setHasApiKey(false);
        return false;
    }, [hasApiKey]);

    // Live Audio Session Hook
    const {
        startLiveSession: initLiveSession,
        stopLiveSession: endLiveSession,
        sendTextToLiveSession,
        sessionRef
    } = useLiveAudio({
        onMessage: (newMessages) => addMessages(newMessages),
        onTranscriptionUpdate: (text) => setDisplayedTranscription(text),
        onSessionEnd: () => {
            setIsLive(false);
            setDisplayedTranscription('');
            addSystemMessage('Voice session ended.');
        },
        onError: (errorMessage) => {
            addSystemMessage(errorMessage);
            setIsLive(false);
        },
        setApiKeyNeeded: () => setHasApiKey(false),
        isGuest
    });

    // Wrappers for UI interactions
    const startLiveSession = useCallback(async () => {
        if (isLive) return;
        const keyReady = await ensureApiKey();
        if (!keyReady) {
            addSystemMessage("Please select an API key to use voice features.");
            return;
        }

        setIsLive(true);
        addSystemMessage('Voice session started...');

        try {
            await initLiveSession();
        } catch (error) {
            console.error("Failed to init live session:", error);
            setIsLive(false);
        }
    }, [isLive, ensureApiKey, addSystemMessage, initLiveSession]);

    const stopLiveSession = useCallback(() => {
        if (isLive) {
            endLiveSession();
        }
    }, [isLive, endLiveSession]);

    const handleSendText = useCallback(async () => {
        if ((isChatLoading && !isLive) || (!inputText.trim() && !uploadedImage)) return;

        const keyReady = await ensureApiKey();
        if (!keyReady) {
            addSystemMessage("Please select an API key to chat.");
            return;
        }

        // If live session is active, send to live model
        if (isLive && sessionRef.current) {
            try {
                // Optimistic update
                setMessages(prev => [...prev, {
                    role: 'user',
                    parts: [
                        ...(uploadedImage ? [{ type: 'image' as const, value: uploadedImage.url }] : []),
                        ...(inputText.trim() ? [{ type: 'text' as const, value: inputText }] : [])
                    ]
                }]);

                await sendTextToLiveSession(inputText, uploadedImage ? { data: uploadedImage.data, mimeType: uploadedImage.mimeType } : undefined);

                setInputText('');
                setUploadedImage(null);
            } catch (error) {
                console.error("Error/Live:", error);
                addSystemMessage("Failed to send message to live session.");
            }
            return;
        }

        // Standard Text Chat
        const textToSend = inputText;
        const imageToSend = uploadedImage;

        setInputText('');
        setUploadedImage(null);

        await sendTextMessage(textToSend, imageToSend);

    }, [isChatLoading, isLive, inputText, uploadedImage, ensureApiKey, addSystemMessage, sessionRef, sendTextToLiveSession, sendTextMessage, setMessages]);

    const handleCloseChat = useCallback(() => {
        if (isLive) stopLiveSession();
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
            case 'dashboard': return <Dashboard currency={currency} />;
            case 'training': return <Training currency={currency} />;
            case 'course-preparation': return <CoursePreparationView />;
            case 'finance': return <Finance currency={currency} />;
            case 'tasks': return <Tasks />;
            default: return <Dashboard currency={currency} />;
        }
    };

    return (
        <ErrorBoundary>
            {!hasApiKey && <ApiKeyPromptOverlay onKeySelect={() => setHasApiKey(true)} />}
            <Layout
                activeItem={activeItem}
                setActiveItem={setActiveItem}
                currency={currency}
                setCurrency={setCurrency}
                onVoiceCommand={() => toggleChat(true)}
                onToggleChat={() => toggleChat(false)}
                isGuest={isGuest}
                onRegister={onExitGuest}
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
                isLoading={isChatLoading}
                startLiveSession={startLiveSession}
                stopLiveSession={stopLiveSession}
                handleSendText={handleSendText}
                displayedTranscription={displayedTranscription}
                uploadedImage={uploadedImage}
                setUploadedImage={setUploadedImage}
                startVoiceOnOpen={startVoiceOnOpen}
                onVoiceSessionHandled={onVoiceSessionHandled}
                onToggle={() => toggleChat()}
            />
        </ErrorBoundary>
    );
};

// Wrapper component that handles authentication
const AppWithAuth: React.FC = () => {
    const { user, loading } = useAuth();
    const [guestMode, setGuestMode] = useState(false);

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Завантаження...</p>
                </div>
            </div>
        );
    }

    // Show login page if not authenticated and not in guest mode
    if (!user && !guestMode) {
        return <LoginPage onGuestAccess={() => setGuestMode(true)} />;
    }

    // Show main app for authenticated users or guests
    return <App isGuest={user ? false : guestMode} onExitGuest={() => setGuestMode(false)} />;
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <AuthProvider>
            <AppWithAuth />
        </AuthProvider>
    );
}

export default App;