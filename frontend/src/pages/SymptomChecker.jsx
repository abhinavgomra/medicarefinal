import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { ClipboardDocumentListIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { healthAssistant } from '../utils/api';

const SymptomChecker = () => {
  const [symptoms, setSymptoms] = useState('');
  const [results, setResults] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [chat, setChat] = useState([]);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      // Select a default voice (prefer female, English)
      const defaultVoice = availableVoices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
                          availableVoices.find(v => v.lang.startsWith('en')) ||
                          availableVoices[0];
      setSelectedVoice(defaultVoice);
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = 'en-US';
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setSymptoms(transcript);
        if (conversationMode && transcript.trim()) {
          handleUserMessage(transcript.trim());
        }
      };
      r.onend = () => {
        setIsListening(false);
        if (conversationMode) {
          // Auto-restart listening after a short delay
          setTimeout(() => startListening(), 1000);
        }
      };
      r.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
        setError('Voice recognition failed. Please try again.');
      };
      recognitionRef.current = r;
    }
  }, [conversationMode]);

  const startListening = () => {
    setError('');
    if (!recognitionRef.current) {
      setError('Voice recognition not supported in this browser');
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      setError('Could not start voice recognition');
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current && recognitionRef.current.stop();
    } catch (_) {}
    setIsListening(false);
  };

  const speak = (msg, langHint) => {
    try {
      const utter = new SpeechSynthesisUtterance(msg);
      if (selectedVoice) {
        utter.voice = selectedVoice;
      } else if (langHint && langHint.startsWith('hi')) {
        utter.lang = 'hi-IN';
      }
      utter.rate = 0.9; // Slightly slower for clarity
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  };

  const handleUserMessage = async (message) => {
    const language = /[\u0900-\u097F]/.test(message) ? 'hi' : 'en';
    const userMsg = { role: 'user', text: message };
    setChat((c) => [...c, userMsg]);

    try {
      const { reply } = await healthAssistant({ message, language });
      const assistantMsg = { role: 'assistant', text: reply || 'I\'m here to help. Please describe your symptoms.' };
      setChat((c) => [...c, assistantMsg]);
      speak(assistantMsg.text, language);
    } catch (e) {
      const assistantMsg = { role: 'assistant', text: e.message || 'I\'m sorry, I\'m having trouble right now. Please try again or consult a doctor for medical advice.' };
      setChat((c) => [...c, assistantMsg]);
      speak(assistantMsg.text, 'en');
    }
  };

  const toggleConversationMode = () => {
    if (conversationMode) {
      stopListening();
      setConversationMode(false);
      speak('Voice conversation ended. You can still type your questions below.', 'en');
    } else {
      setConversationMode(true);
      setChat([]);
      speak('Starting voice conversation. Tell me about your symptoms and I\'ll help guide you.', 'en');
      setTimeout(() => startListening(), 2000);
    }
  };

  const checkSymptoms = async () => {
    if (!symptoms.trim()) return;

    try {
      const { reply } = await healthAssistant({ message: symptoms, language: 'en' });
      const mockResults = {
        possibleConditions: ['Please consult a doctor for proper diagnosis'],
        recommendations: [
          reply || 'Rest and stay hydrated',
          'Monitor your temperature',
          'Consult a doctor if symptoms worsen'
        ],
        severity: 'Please see a healthcare professional'
      };
      setResults(mockResults);
    } catch (e) {
      const mockResults = {
        possibleConditions: ['Unable to analyze - please consult a doctor'],
        recommendations: [
          'Rest and stay hydrated',
          'Monitor your temperature',
          'Consult a doctor if symptoms worsen'
        ],
        severity: 'Unknown - see doctor'
      };
      setResults(mockResults);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Symptom Checker</h1>
          <p className="text-xl text-gray-600">
            Get preliminary insights about your symptoms. Always consult a doctor for accurate diagnosis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Input Form */}
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-primary-500 mr-3" />
                  <CardTitle>Describe Your Symptoms</CardTitle>
                </div>

                {/* Voice Conversation Mode */}
                <div className="mb-6 text-center">
                  <button
                    onClick={toggleConversationMode}
                    className={`px-6 py-3 text-lg font-semibold rounded-full transition-all duration-300 ${
                      conversationMode
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {conversationMode ? 'Stop Voice Chat' : 'Start Voice Chat'}
                  </button>
                  <p className="mt-2 text-sm text-gray-600">
                    {conversationMode ? 'Speak naturally - I\'ll listen and respond' : 'Click to talk with me about your health'}
                  </p>
                </div>

                {/* Manual Voice Input */}
                <div className="mb-6 text-center">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={conversationMode}
                    className={`px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-300 ${
                      isListening
                        ? 'bg-green-500 hover:bg-green-600 text-white animate-pulse'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {isListening ? 'Stop Listening' : 'Listen Once'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">Listen for one message</p>
                </div>

                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe how you're feeling, when it started, and any other relevant details..."
                  className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />

                <button
                  onClick={checkSymptoms}
                  disabled={!symptoms.trim()}
                  className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold ${
                    symptoms.trim()
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Analyze Symptoms
                </button>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">⚠️ {error}</p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start">
                    <LightBulbIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">Important Note</h4>
                      <p className="text-yellow-700 text-sm">
                        This tool provides preliminary information only. Always consult a healthcare professional for proper diagnosis and treatment.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div>
            {results ? (
              <Card>
                <CardContent className="p-6">
                  <CardTitle className="mb-6">Analysis Results</CardTitle>
                  
                  <div className="space-y-6">
                    {/* Severity */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Severity Level:</h4>
                      <div className={`px-3 py-2 rounded-lg text-white text-center ${
                        results.severity === 'Mild' ? 'bg-green-500' :
                        results.severity === 'Moderate' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}>
                        {results.severity}
                      </div>
                    </div>

                    {/* Possible Conditions */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Possible Conditions:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {results.possibleConditions.map((condition, index) => (
                          <li key={index}>{condition}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Recommendations:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {results.recommendations.map((recommendation, index) => (
                          <li key={index}>{recommendation}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Next Steps:</h4>
                      <p className="text-blue-700">
                        Consider scheduling a consultation with a doctor for proper diagnosis and treatment plan.
                      </p>
                      <button className="mt-3 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600">
                        Find a Doctor
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No Analysis Yet
                  </h3>
                  <p className="text-gray-500">
                    Describe your symptoms on the left to get started with the analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomChecker;