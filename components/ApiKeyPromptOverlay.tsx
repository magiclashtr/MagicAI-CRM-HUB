import React from 'react';
import Button from './Button';

interface ApiKeyPromptOverlayProps {
  onKeySelect: () => void;
}

const ApiKeyPromptOverlay: React.FC<ApiKeyPromptOverlayProps> = ({ onKeySelect }) => {
  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      onKeySelect(); // Optimistically assume success and close the overlay
    } else {
      alert("AI Studio context is not available. This feature is designed to run within Google AI Studio.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[100]">
      <div className="bg-gray-800 p-8 rounded-lg text-center max-w-md shadow-2xl mx-4">
        <h2 className="text-2xl font-bold mb-4 text-white">API Key Required</h2>
        <p className="text-gray-300 mb-6">
          To use AI-powered features like Mira, you need to select a valid Google AI API key.
          This application requires billing to be enabled on your Google Cloud project for voice features.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          For more information, please see the{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            billing documentation
          </a>.
        </p>
        <Button variant="primary" size="lg" onClick={handleSelectKey}>
          Select API Key
        </Button>
      </div>
    </div>
  );
};

export default ApiKeyPromptOverlay;
