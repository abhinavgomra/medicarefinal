import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { transcribeVoice, healthAssistant } from '../utils/api';
import { useToast } from '../components/Toast';

const VoiceControl = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef(null);
  const [chat, setChat] = useState([]); // {role:'user'|'assistant', text}

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let finalText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += chunk + ' ';
        }
        if (finalText) setText((t) => (t ? t + ' ' : '') + finalText.trim());
      };
      r.onend = () => setDictating(false);
      recognitionRef.current = r;
    }
  }, []);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      setError(e.message || 'Microphone access denied');
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
      setRecording(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) return;
    setLoading(true); setText(''); setError('');
    try {
      const res = await transcribeVoice(audioFile);
      setText(res.text || '');
      addToast({ title: 'Transcription complete', variant: 'success' });
    } catch (e) {
      const msg = e.message || 'Transcription failed';
      setError(msg);
      addToast({ title: 'Transcription failed', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const startDictation = () => {
    setError('');
    if (!recognitionRef.current) {
      setError('Speech Recognition not supported in this browser');
      return;
    }
    try {
      setText('');
      recognitionRef.current.start();
      setDictating(true);
    } catch (e) {
      setError('Could not start dictation');
    }
  };

  const stopDictation = () => {
    try {
      recognitionRef.current && recognitionRef.current.stop();
    } catch (_) {}
    setDictating(false);
  };

  const speak = (msg, langHint) => {
    try {
      const utter = new SpeechSynthesisUtterance(msg);
      if (langHint && langHint.startsWith('hi')) utter.lang = 'hi-IN';
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  };

  const sendToAssistant = async (content) => {
    const language = /[\u0900-\u097F]/.test(content) ? 'hi' : 'en';
    const userMsg = { role: 'user', text: content };
    setChat((c) => [...c, userMsg]);
    try {
      const { reply } = await healthAssistant({ message: content, language });
      const assistantMsg = { role: 'assistant', text: reply || '' };
      setChat((c) => [...c, assistantMsg]);
      speak(assistantMsg.text, language);
    } catch (e) {
      const assistantMsg = { role: 'assistant', text: e.message || 'Assistant unavailable' };
      setChat((c) => [...c, assistantMsg]);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="glass">
          <CardContent className="p-6">
            <CardTitle className="mb-4">Voice Control</CardTitle>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {!recording ? (
                <Button onClick={startRecording}>Start Recording</Button>
              ) : (
                <Button onClick={stopRecording} variant="secondary">Stop</Button>
              )}
              <div className={`text-sm ${recording ? 'text-red-600' : 'text-gray-500'}`}>{recording ? 'Recording...' : 'Idle'}</div>
              <div className="h-5 w-px bg-gray-200" />
              {!dictating ? (
                <Button onClick={startDictation} variant="secondary">Start Dictation</Button>
              ) : (
                <Button onClick={stopDictation} variant="secondary">Stop Dictation</Button>
              )}
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <input type="file" accept="audio/*" onChange={(e)=>setAudioFile(e.target.files?.[0] || null)} />
              <Button type="submit" disabled={!audioFile || loading}>{loading ? 'Transcribing...' : 'Upload & Transcribe'}</Button>
            </form>
            {error && <div className="text-sm text-red-600 mt-4">{error}</div>}
            {text && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Transcribed Text</h4>
                <pre className="whitespace-pre-wrap text-gray-700 bg-white/60 p-4 rounded-lg border border-gray-200">{text}</pre>
              </div>
            )}
            <div className="mt-8">
              <h4 className="font-semibold mb-2">Health Assistant (English/Hindi)</h4>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Describe your symptom... (हिंदी या English)"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e)=>{
                    if(e.key==='Enter'){
                      const value=e.currentTarget.value.trim();
                      if(value){
                        sendToAssistant(value);
                        e.currentTarget.value='';
                      }
                    }
                  }}
                />
                <Button onClick={()=>{ if(text.trim()) { sendToAssistant(text.trim()); setText(''); } }} variant="secondary">Ask with Transcript</Button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto border rounded-lg p-3 bg-white/50">
                {chat.map((m,i)=> (
                  <div key={i} className={`text-sm ${m.role==='assistant' ? 'text-gray-800' : 'text-primary-700'}`}>
                    <span className="font-semibold mr-2">{m.role==='assistant'?'Assistant':'You'}:</span>{m.text}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoiceControl;


