import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { ocrPrescription } from '../utils/api';
import { useToast } from '../components/Toast';

const PrescriptionOCR = () => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError(''); setText('');
    try {
      const res = await ocrPrescription(file);
      setText(res.text || '');
      addToast({ title: 'OCR complete', variant: 'success' });
    } catch (e) {
      const msg = e.message || 'OCR failed';
      setError(msg);
      addToast({ title: 'OCR failed', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="glass">
          <CardContent className="p-6">
            <CardTitle className="mb-4">Prescription Reader</CardTitle>
            <form onSubmit={onSubmit} className="space-y-4">
              <input type="file" accept="image/*,application/pdf" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
              <Button type="submit" disabled={!file || loading}>{loading ? 'Processing...' : 'Upload & Extract'}</Button>
            </form>
            {error && <div className="text-sm text-red-600 mt-4">{error}</div>}
            {text && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Extracted Text</h4>
                <pre className="whitespace-pre-wrap text-gray-700 bg-white/60 p-4 rounded-lg border border-gray-200 max-h-[400px] overflow-auto">{text}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrescriptionOCR;


