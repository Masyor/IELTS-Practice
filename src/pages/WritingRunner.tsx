import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WritingTest } from '../types';
import { useTimer } from '../hooks/useTimer';
import { Clock, Send, Mail, Copy, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function WritingRunner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<WritingTest | null>(null);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/data/writing/${id}.json`)
      .then(res => res.json())
      .then(data => setTest(data))
      .catch(console.error);

    const saved = localStorage.getItem(`ielts_writing_${id}_answers`);
    if (saved) {
      setAnswers(JSON.parse(saved));
    }
  }, [id]);

  const handleFinish = async () => {
    if (!test || !user) return;
    setSaving(true);
    
    const result = {
      userId: user.uid,
      testId: test.id,
      testTitle: test.title,
      testType: test.type,
      date: new Date().toISOString(),
      answers
    };

    try {
      const docRef = await addDoc(collection(db, 'results'), result);
      localStorage.removeItem(`ielts_writing_${id}_answers`);
      setResultId(docRef.id);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const timer = useTimer(test ? test.durationMinutes * 60 : 3600, handleFinish);

  useEffect(() => {
    if (test && !timer.isActive && !submitted) {
      timer.start();
    }
  }, [test, timer.isActive, submitted]);

  const handleAnswer = (val: string) => {
    if (!test) return;
    const taskId = test.tasks[currentTaskIdx].id;
    const newAnswers = { ...answers, [taskId]: val };
    setAnswers(newAnswers);
    localStorage.setItem(`ielts_writing_${id}_answers`, JSON.stringify(newAnswers));
  };

  if (!test) return <div className="p-8 text-center text-gray-500">Loading test...</div>;

  if (submitted) {
    const handleEmail = () => {
      let body = `IELTS Writing Practice Submission\n\n`;
      test.tasks.forEach(t => {
        body += `--- Task ${t.taskNumber} ---\n${t.prompt}\n\n`;
        body += `Response (${countWords(answers[t.id] || '')} words):\n${answers[t.id] || '(No response)'}\n\n\n`;
      });
      window.location.href = `mailto:?subject=IELTS Writing Practice Submission - ${test.title}&body=${encodeURIComponent(body)}`;
    };

    const handleCopy = () => {
      let text = 'Please act as an expert IELTS examiner. Grade my writing task based on the official IELTS rubrics (Task Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy). Provide a band score for each criterion and an overall band score. Also, provide detailed feedback and corrections.\n\n';
      test.tasks.forEach(t => {
        text += `Task ${t.taskNumber} Prompt:\n${t.prompt}\n\nMy Response:\n${answers[t.id] || ''}\n\n---\n`;
      });
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard. You can paste this into an AI for review.');
    };

    return (
      <div className="max-w-3xl mx-auto mt-12 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Writing Test Completed</h2>
        <p className="text-gray-500 mb-8">Your response has been saved. What would you like to do next?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button onClick={handleEmail} className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm">
            <Mail className="w-5 h-5 text-blue-600" />
            Email to Tutor
          </button>
          <button onClick={handleCopy} className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm">
            <Copy className="w-5 h-5 text-purple-600" />
            Copy for AI Review
          </button>
          {resultId && (
            <>
              <button onClick={() => navigate(`/review/${resultId}`)} className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Review Answers
              </button>
              <button onClick={() => window.open(`/review/${resultId}?print=true`, '_blank')} className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm">
                <Copy className="w-5 h-5 text-red-600" />
                Export to PDF
              </button>
            </>
          )}
        </div>

        <button onClick={() => navigate('/dashboard')} className="text-blue-600 font-medium hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentTask = test.tasks[currentTaskIdx];
  const currentAnswer = answers[currentTask.id] || '';
  
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };
  const wordCount = countWords(currentAnswer);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-white p-4 rounded-t-2xl border border-gray-200 flex justify-between items-center mb-4 shadow-sm">
        <h1 className="font-bold text-gray-900 text-lg">{test.title}</h1>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-4 py-2 rounded-lg font-mono">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className={`text-lg font-bold ${timer.secondsRemaining < 300 ? 'text-red-600' : ''}`}>
              {timer.formatTime()}
            </span>
          </div>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {saving ? 'Saving...' : 'Finish Test'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left pane: Prompt */}
        <div className="w-1/2 bg-white rounded-2xl border border-gray-200 p-8 overflow-y-auto shadow-sm">
          <div className="mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold mb-1">Task {currentTask.taskNumber}</h2>
            <p className="text-sm text-gray-500 italic">{currentTask.instructions}</p>
          </div>
          
          {currentTask.imageUrl && (
            <img src={currentTask.imageUrl} alt="Task prompt visual" className="max-w-full h-auto mb-6 rounded-lg border border-gray-200" />
          )}

          <div className="prose prose-blue max-w-none text-gray-800 whitespace-pre-wrap font-serif leading-relaxed">
            {currentTask.prompt}
          </div>
        </div>

        {/* Right pane: Editor */}
        <div className="w-1/2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <span className="text-sm font-medium text-gray-600">Your Response</span>
            <span className={`text-sm font-medium ${wordCount < currentTask.minimumWords ? 'text-orange-600' : 'text-green-600'}`}>
              {wordCount} / {currentTask.minimumWords} words minimum
            </span>
          </div>
          <textarea
            value={currentAnswer}
            onChange={(e) => handleAnswer(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            spellCheck={false}
            className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-0 text-gray-800 leading-relaxed"
            placeholder="Start typing your response here..."
          />
          
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-white">
            <button
              disabled={currentTaskIdx === 0}
              onClick={() => setCurrentTaskIdx(prev => prev - 1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Task 1
            </button>
            <button
              disabled={currentTaskIdx === test.tasks.length - 1}
              onClick={() => setCurrentTaskIdx(prev => prev + 1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30"
            >
              Task 2 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
