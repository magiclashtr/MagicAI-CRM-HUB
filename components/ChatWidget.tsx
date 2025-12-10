
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  onToggle: () => void;
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
  onToggle,
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
      return <img key={index} src={part.value} alt="uploaded content" className="max-w-xs rounded-lg my-2 border border-white/10" />;
    }
    // Using a div with whitespace-pre-wrap for better text rendering
    return <div key={index} className="whitespace-pre-wrap leading-relaxed">{part.value}</div>;
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggle}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-indigo-600 shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white border-2 border-white/20"
          >
            <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-10 transition-opacity"></div>
            {/* Simple Pulse Effect for 'Alive' feel */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20 animate-ping"></span>

            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 relative z-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 w-full max-w-lg h-[600px] max-h-[80vh] glass-panel flex flex-col z-50 overflow-hidden shadow-2xl shadow-black/50"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Mira AI</h3>
                  <p className="text-xs text-indigo-300">Intelligent Assistant</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0 mb-1" />
                  )}
                  {msg.role === 'system' ? ( // System messages
                    <div className="text-center w-full text-xs text-indigo-300/70 italic py-2 border-t border-b border-indigo-500/10 my-2">
                      {msg.parts.map(renderMessagePart)}
                    </div>
                  ) : (
                    <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white/10 text-gray-200 rounded-bl-none border border-white/5'}`}>
                      {msg.parts.map(renderMessagePart)}
                    </div>
                  )}
                </div>
              ))}
              {displayedTranscription && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex-shrink-0 animate-pulse mb-1" />
                  <div className="max-w-[85%] p-3 rounded-2xl rounded-bl-none bg-white/5 border border-dashed border-indigo-500/30 ml-2">
                    <p className="whitespace-pre-wrap italic text-indigo-300">{displayedTranscription}</p>
                  </div>
                </div>
              )}
              {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0" />
                  <div className="bg-white/10 px-4 py-2 rounded-full flex gap-1 items-center h-8">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Live Mode Visualizer */}
            {isLive && (
              <div className="h-16 bg-black/20 flex items-center justify-center gap-1 border-t border-white/5">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-indigo-500 rounded-full"
                    animate={{
                      height: [10, 30, 10],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      repeatType: "reverse",
                      delay: i * 0.1,
                    }}
                  />
                ))}
                <span className="text-xs text-indigo-300 ml-3 font-medium tracking-wide">LISTENING...</span>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-black/20 flex-shrink-0">
              {uploadedImage && (
                <div className="relative mb-2 w-20 h-20 group">
                  <img src={uploadedImage.url} alt="upload preview" className="w-full h-full object-cover rounded-lg border border-white/20" />
                  <button onClick={() => setUploadedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">&times;</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isLive ? "Speak now..." : "Ask Mira anything..."}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder-gray-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-400 p-1 rounded-md transition-colors"
                    title="Upload Image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                  </button>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isLive ? stopLiveSession : startLiveSession}
                    disabled={isLoading}
                    className={`p-3 rounded-xl transition-colors ${isLive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/5 text-gray-400 hover:text-indigo-400 hover:bg-white/10'}`}
                    title={isLive ? "Stop Listening" : "Start Voice"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 5.25v-1.5m-12 0v-1.5m12 0a9 9 0 0 0-9-9.75M12 4.5v1.5m0-1.5a9 9 0 0 1 9 9.75M12 4.5a9 9 0 0 0-9 9.75m16.5 0a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendText}
                    disabled={isLoading || (!inputText.trim() && !uploadedImage)}
                    className="p-3 bg-indigo-600 hovered:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Send Message"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" /></svg>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
