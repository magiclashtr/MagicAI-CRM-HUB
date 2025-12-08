
import React, { useEffect, useRef } from 'react';
import Button from './Button';

// Define the props for the ChatWidget component
interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: { role: 'user' | 'model' | 'system'; parts: { type: 'text' | 'image'; value: string }[] }[];
  inputText: string;
  setInputText: (text: string) => void;
  isLive: boolean;
  isLoading: boolean;
  startLiveSession: () => Promise<void>;
  stopLiveSession: () => void;
  handleSendText: () => void;
  displayedTranscription: string;
  uploadedImage: { data: string; mimeType: string; url: string } | null;
  setUploadedImage: (image: { data: string; mimeType: string; url: string } | null) => void;
  startVoiceOnOpen: boolean;
  onVoiceSessionHandled: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen,
  onClose,
  messages,
  inputText,
  setInputText,
  isLive,
  isLoading,
  startLiveSession,
  stopLiveSession,
  handleSendText,
  displayedTranscription,
  uploadedImage,
  setUploadedImage,
  startVoiceOnOpen,
  onVoiceSessionHandled,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedTranscription]);

  // Start voice session automatically if triggered from header
  useEffect(() => {
    if (isOpen && startVoiceOnOpen) {
      startLiveSession();
      onVoiceSessionHandled();
    }
  }, [isOpen, startVoiceOnOpen, startLiveSession, onVoiceSessionHandled]);

  // Handle image file selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        setUploadedImage({
          data: base64Data,
          mimeType: file.type,
          url: URL.createObjectURL(file), // Create a local URL for preview
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Send message on Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendText();
    }
  };

  // Helper to render message parts (text or image)
  const renderMessagePart = (part: { type: 'text' | 'image'; value: string }, index: number) => {
    if (part.type === 'image') {
      return <img key={index} src={part.value} alt="uploaded content" className="max-w-xs rounded-lg my-2" />;
    }
    // Using a div with whitespace-pre-wrap for better text rendering
    return <div key={index} className="whitespace-pre-wrap">{part.value}</div>;
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-full max-w-lg h-full max-h-[70vh] bg-gray-900 text-white rounded-lg shadow-2xl flex flex-col z-50 transition-transform transform-gpu">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-xl font-bold text-indigo-400">Mira</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'system' ? (
              <div className="text-center w-full text-xs text-gray-500 italic py-2">
                {msg.parts.map(renderMessagePart)}
              </div>
            ) : (
              <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                {msg.parts.map(renderMessagePart)}
              </div>
            )}
          </div>
        ))}
        {displayedTranscription && (
            <div className="flex justify-start">
                <div className="max-w-md p-3 rounded-lg bg-gray-700 opacity-75">
                    <p className="whitespace-pre-wrap italic">{displayedTranscription}</p>
                </div>
            </div>
        )}
        {isLoading && messages.length > 0 && messages[messages.length-1]?.role === 'user' && (
             <div className="flex justify-start">
                <div className="max-w-md p-3 rounded-lg bg-gray-700">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        {uploadedImage && (
          <div className="relative mb-2 w-24 h-24">
            <img src={uploadedImage.url} alt="upload preview" className="w-full h-full object-cover rounded-md" />
            <button onClick={() => setUploadedImage(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
          </div>
        )}
        <div className="flex items-center bg-gray-700 rounded-lg p-1">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Attach Image">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81" /></svg>
          </Button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLive ? "Listening... (or type)" : "Type your message..."}
            className="flex-1 bg-transparent px-2 py-2 outline-none text-sm"
            disabled={isLoading}
          />
          <Button
            variant={isLive ? "danger" : "ghost"}
            onClick={isLive ? stopLiveSession : startLiveSession}
            disabled={isLoading}
            title={isLive ? "Stop Listening" : "Start Voice"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 5.25v-1.5m-12 0v-1.5m12 0a9 9 0 0 0-9-9.75M12 4.5v1.5m0-1.5a9 9 0 0 1 9 9.75M12 4.5a9 9 0 0 0-9 9.75m16.5 0a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
          </Button>
          <Button variant="primary" onClick={handleSendText} isLoading={isLoading} disabled={!inputText.trim() && !uploadedImage} title="Send Message">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" /></svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
