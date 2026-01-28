import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import {
  ClipboardDocumentListIcon,
  LightBulbIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { healthAssistant } from '../utils/api';

const SymptomChecker = () => {
  const [symptoms, setSymptoms] = useState('');
  const [results, setResults] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [chat, setChat] = useState([]);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
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
          setTimeout(() => startListening(), 1500);
        }
      };
      r.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
        setError('Voice recognition failed. Please try again.');
      };
      recognitionRef.current = r;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [conversationMode]);

  useEffect(() => {
    // Auto-scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

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
      setIsSpeaking(true);
      const utter = new SpeechSynthesisUtterance(msg);
      if (selectedVoice) {
        utter.voice = selectedVoice;
      } else if (langHint && langHint.startsWith('hi')) {
        utter.lang = 'hi-IN';
      }
      utter.rate = 0.9; // Slightly slower for clarity
      utter.pitch = 1.0;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch (_) {
      setIsSpeaking(false);
    }
  };

  const handleUserMessage = async (message) => {
    const language = /[\u0900-\u097F]/.test(message) ? 'hi' : 'en';
    const userMsg = { role: 'user', text: message, timestamp: new Date() };
    setChat((c) => [...c, userMsg]);
    setIsTyping(true);

    try {
      const { reply } = await healthAssistant({ message, language });
      const assistantMsg = {
        role: 'assistant',
        text: reply || 'I\'m here to help. Please describe your symptoms.',
        timestamp: new Date()
      };
      setChat((c) => [...c, assistantMsg]);
      speak(assistantMsg.text, language);
    } catch (e) {
      const assistantMsg = {
        role: 'assistant',
        text: e.message || 'I\'m sorry, I\'m having trouble right now. Please try again or consult a doctor for medical advice.',
        timestamp: new Date()
      };
      setChat((c) => [...c, assistantMsg]);
      speak(assistantMsg.text, 'en');
    } finally {
      setIsTyping(false);
    }
  };

  const toggleConversationMode = () => {
    if (conversationMode) {
      stopListening();
      setConversationMode(false);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      speak('Voice conversation ended. You can still type your questions below.', 'en');
      // Generate analysis from conversation
      if (chat.length > 0) {
        generateAnalysisFromChat();
      }
    } else {
      setConversationMode(true);
      setChat([]);
      setResults(null);
      speak('Starting voice conversation. Tell me about your symptoms and I\'ll help guide you.', 'en');
      setTimeout(() => startListening(), 2500);
    }
  };

  const generateAnalysisFromChat = async () => {
    if (chat.length === 0) return;

    setIsTyping(true);
    try {
      // Combine all user messages for analysis
      const conversationText = chat
        .filter(msg => msg.role === 'user')
        .map(msg => msg.text)
        .join('. ');

      const { reply } = await healthAssistant({ message: conversationText, language: 'en' });
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
    } finally {
      setIsTyping(false);
    }
  };

  const sendTextMessage = () => {
    if (!symptoms.trim()) return;
    handleUserMessage(symptoms.trim());
    setSymptoms('');
  };

  const clearChat = () => {
    setChat([]);
    setResults(null);
    setSymptoms('');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
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
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">AI Symptom Checker</h1>
          <p className="text-xl text-gray-600">
            Get intelligent insights about your symptoms with our AI health assistant. Always consult a doctor for accurate diagnosis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-primary-500 mr-3" />
                  <CardTitle>Describe Your Symptoms</CardTitle>
                </div>

                {/* Voice Conversation Mode */}
                <div className="mb-6">
                  <button
                    onClick={toggleConversationMode}
                    className={`w-full px-6 py-3 text-lg font-semibold rounded-full transition-all duration-300 flex items-center justify-center ${
                      conversationMode
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2" />
                    {conversationMode ? 'Stop Voice Chat' : 'Start Voice Chat'}
                  </button>
                  <p className="mt-2 text-sm text-gray-600 text-center">
                    {conversationMode ? 'Speak naturally - I\'ll listen and respond' : 'Click to talk with me about your health'}
                  </p>
                </div>

                {/* Manual Voice Input */}
                <div className="mb-6">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={conversationMode}
                    className={`w-full px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-300 flex items-center justify-center ${
                      isListening
                        ? 'bg-green-500 hover:bg-green-600 text-white animate-pulse'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    <MicrophoneIcon className={`h-6 w-6 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
                    {isListening ? 'Listening...' : 'Voice Input'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500 text-center">Quick voice input</p>
                </div>

                {/* Text Input */}
                <div className="mb-4">
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe how you're feeling, when it started, and any other relevant details..."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendTextMessage()}
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={sendTextMessage}
                    disabled={!symptoms.trim() || conversationMode}
                    className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 ${
                      symptoms.trim() && !conversationMode
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                    Send Message
                  </button>

                  <button
                    onClick={checkSymptoms}
                    disabled={!symptoms.trim() || conversationMode}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                      symptoms.trim() && !conversationMode
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Analyze Symptoms
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium flex items-center">
                      <XMarkIcon className="h-5 w-5 mr-2" />
                      {error}
                    </p>
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

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-500 mr-3" />
                    <CardTitle>AI Health Assistant</CardTitle>
                  </div>
                  {chat.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear conversation"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
                  {chat.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Start a conversation</p>
                        <p className="text-sm">Click "Start Voice Chat" or send a message to begin</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chat.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-primary-500 text-white'
                                : 'bg-white text-gray-800 border border-gray-200'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-gray-500">AI is typing...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {isSpeaking && (
                        <div className="flex justify-start">
                          <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <SpeakerWaveIcon className="h-4 w-4 text-green-500 animate-pulse" />
                              <span className="text-sm text-green-700">Speaking...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Status Indicators */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    {conversationMode && (
                      <span className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Voice Chat Active
                      </span>
                    )}
                    {isListening && (
                      <span className="flex items-center">
                        <MicrophoneIcon className="h-4 w-4 mr-1 animate-pulse" />
                        Listening
                      </span>
                    )}
                  </div>
                  <span>{chat.length} messages</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="mt-8">
            <Card>
              <CardContent className="p-6">
                <CardTitle className="mb-6">Analysis Results</CardTitle>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Severity */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Severity Level:</h4>
                    <div className={`px-3 py-2 rounded-lg text-white text-center font-medium ${
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
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mt-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Next Steps:</h4>
                  <p className="text-blue-700">
                    Consider scheduling a consultation with a doctor for proper diagnosis and treatment plan.
                  </p>
                  <button className="mt-3 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600">
                    Find a Doctor
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SymptomChecker;
