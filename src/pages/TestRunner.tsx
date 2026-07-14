import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Test, QuestionType, Question } from '../types';
import { useTimer } from '../hooks/useTimer';
import { Clock, Save, CheckCircle, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Highlighter from '../components/Highlighter';
import { saveResult } from '../lib/firebase';
import { getAssetPath } from '../lib/utils';

export default function TestRunner() {
  const { type, id } = useParams<{ type: 'reading' | 'listening'; id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scoreInfo, setScoreInfo] = useState<{ score: number, total: number } | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [listeningStarted, setListeningStarted] = useState(false);
  const [viewedSections, setViewedSections] = useState<Set<number>>(new Set([0]));
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setViewedSections(prev => new Set(prev).add(currentSectionIdx));
  }, [currentSectionIdx]);

  useEffect(() => {
    // Fetch test data
    fetch(getAssetPath(`/data/${type}/${id}.json`))
      .then(res => res.json())
      .then(data => setTest(data))
      .catch(console.error);
    
    // Load saved answers from local storage
    const saved = localStorage.getItem(`ielts_${type}_${id}_answers`);
    if (saved) {
      setAnswers(JSON.parse(saved));
    }
  }, [type, id]);

  const handleFinish = async () => {
    if (!test || !user) return;
    setSaving(true);
    
    // Calculate score
    let score = 0;
    let total = 0;
    const performance: { type: QuestionType, correct: boolean }[] = [];

    test.sections.forEach(section => {
      section.questions.forEach(q => {
        let blanksCount = 0;
        if (q.text && ['completion', 'sentence_completion', 'table_completion'].includes(q.type)) {
          blanksCount += (q.text.match(/______/g) || []).length;
        }
        if (q.tableData) {
          blanksCount += (JSON.stringify(q.tableData).match(/______/g) || []).length;
        }

        if (blanksCount > 1) {
          for (let i = 0; i < blanksCount; i++) {
            total++;
            const userAnswer = (answers[`${q.id}_${i}`] || '').toLowerCase().trim();
            const acceptable = Array.isArray((q.answer as any)[i]) ? (q.answer as any)[i] : [(q.answer as any)[i] || q.answer];
            const isCorrect = acceptable.some((a: string) => a && typeof a === 'string' && a.toLowerCase().trim() === userAnswer);
            if (isCorrect) score++;
            performance.push({ type: q.type, correct: isCorrect });
          }
        } else {
          total++;
          const userAnswer = (answers[q.id] || '').toLowerCase().trim();
          let isCorrect = false;

          if (Array.isArray(q.answer)) {
            isCorrect = (q.answer as any[]).some(a => typeof a === 'string' && a.toLowerCase().trim() === userAnswer);
          } else {
            isCorrect = typeof q.answer === 'string' && (q.answer as string).toLowerCase().trim() === userAnswer;
          }

          if (isCorrect) score++;
          performance.push({ type: q.type, correct: isCorrect });
        }
      });
    });

    const result = {
      userId: user.uid,
      testId: test.id,
      testTitle: test.title,
      testType: test.type,
      date: new Date().toISOString(),
      score,
      totalQuestions: total,
      answers,
      questionPerformance: performance
    };

    try {
      const docRef = await saveResult(result);
      localStorage.removeItem(`ielts_${type}_${id}_answers`);
      setScoreInfo({ score, total });
      setResultId(docRef.id);
      setSubmitted(true);
      // Optional: navigate to review directly or show completion screen
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const timer = useTimer(test ? test.durationMinutes * 60 : 3600, handleFinish);

  useEffect(() => {
    if (test && !submitted) {
      if (test.type === 'reading' && !timer.isActive) {
        timer.start();
      } else if (test.type === 'listening' && listeningStarted && !timer.isActive) {
        timer.start();
      }
    }
  }, [test, timer.isActive, submitted, listeningStarted]);

  useEffect(() => {
    if (test?.type === 'listening' && listeningStarted && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [currentSectionIdx, listeningStarted, test]);

  const handleAnswer = (questionId: string, val: string) => {
    const newAnswers = { ...answers, [questionId]: val };
    setAnswers(newAnswers);
    localStorage.setItem(`ielts_${type}_${id}_answers`, JSON.stringify(newAnswers));
  };

  if (!test) return <div className="p-8 text-center text-gray-500">Loading test...</div>;

  if (test.type === 'listening' && !listeningStarted && !submitted) {
    return (
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-8 h-8 ml-1" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Listening Test</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            The audio will play automatically once you begin. You will not be able to pause, rewind, or replay the audio. Please ensure your volume is turned up before continuing.
          </p>
          <button 
            onClick={() => setListeningStarted(true)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Start Listening Test
          </button>
        </div>
      </div>
    );
  }

  if (submitted && scoreInfo) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Test Completed</h2>
        <p className="text-gray-500 mb-8">Your results have been saved successfully.</p>
        
        <div className="bg-gray-50 rounded-xl p-6 mb-8 inline-block">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Your Score</div>
          <div className="text-4xl font-extrabold text-blue-600">{scoreInfo.score} <span className="text-xl text-gray-400">/ {scoreInfo.total}</span></div>
        </div>

        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg">
            Dashboard
          </button>
          {resultId && (
            <>
              <button onClick={() => navigate(`/review/${resultId}`)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                Review Answers
              </button>
              <button onClick={() => window.open(`/review/${resultId}?print=true`, '_blank')} className="px-6 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg">
                Export to PDF
              </button>
            </>
          )}
          {!resultId && (
            <button onClick={() => navigate('/results')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
              View Detailed Results
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentSection = test.sections[currentSectionIdx];

  const renderQuestionInput = (q: Question) => {
    const val = answers[q.id] || '';
    
    if (q.type === 'multiple_choice' || q.type === 'true_false_not_given' || q.type === 'yes_no_not_given') {
      return (
        <div className="space-y-2 mt-3">
          {q.options?.map(opt => (
            <label key={opt} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={val === opt}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    }
    
    if (q.type === 'matching' || q.type === 'matching_headings' || q.type === 'matching_features' || q.type === 'matching_sentence_endings') {
      return (
        <select 
          value={val}
          onChange={(e) => handleAnswer(q.id, e.target.value)}
          className="mt-3 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
        >
          <option value="">Select an option...</option>
          {q.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    
    if (q.type === 'completion' || q.type === 'sentence_completion' || q.type === 'table_completion') {
      const textBlanks = q.text ? (q.text.match(/______/g) || []).length : 0;
      const tableBlanks = q.tableData ? (JSON.stringify(q.tableData).match(/______/g) || []).length : 0;
      const totalBlanks = textBlanks + tableBlanks;
      const isMulti = totalBlanks > 1;

      let blankIdx = 0;

      return (
        <div className="w-full mt-3">
          {q.text && q.text.includes('______') && (
            <div className="leading-relaxed inline-block w-full">
              {q.text.split('______').map((part, i, arr) => {
                if (i === arr.length - 1) return <span key={i}><Highlighter inline content={part} id={`test_${id}_q_${q.id}_p${i}`} /></span>;
                const currentBlankIdx = blankIdx++;
                const inputKey = isMulti ? `${q.id}_${currentBlankIdx}` : q.id;
                const qNum = isMulti ? q.number + currentBlankIdx : q.number;
                return (
                  <React.Fragment key={i}>
                    <span><Highlighter inline content={part} id={`test_${id}_q_${q.id}_p${i}`} /></span>
                    <span className="inline-flex items-center mx-2 align-middle">
                      <input
                        type="text"
                        spellCheck={false}
                        value={answers[inputKey] || ''}
                        onChange={(e) => handleAnswer(inputKey, e.target.value)}
                        className="w-40 p-1.5 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        placeholder={qNum.toString()}
                      />
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          )}
          {q.tableData && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                  {q.tableData.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => {
                        if (cell.includes('______')) {
                          const parts = cell.split('______');
                          return (
                            <td key={cIdx} className="border border-gray-300 p-2">
                              {parts.map((part, i) => {
                                if (i === parts.length - 1) return <span key={i}>{part}</span>;
                                const currentBlankIdx = blankIdx++;
                                const inputKey = isMulti ? `${q.id}_${currentBlankIdx}` : q.id;
                                const qNum = isMulti ? q.number + currentBlankIdx : q.number;
                                return (
                                  <React.Fragment key={i}>
                                    <span>{part}</span>
                                    <span className="inline-flex items-center mx-1 align-middle">
                                      <input
                                        type="text"
                                        spellCheck={false}
                                        value={answers[inputKey] || ''}
                                        onChange={(e) => handleAnswer(inputKey, e.target.value)}
                                        className="w-24 p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                        placeholder={qNum.toString()}
                                      />
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                            </td>
                          );
                        }
                        return <td key={cIdx} className={`border border-gray-300 p-2 ${rIdx === 0 ? 'bg-gray-100 font-bold' : ''}`}>{cell}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type="text"
        spellCheck={false}
        value={val}
        onChange={(e) => handleAnswer(q.id, e.target.value)}
        className="mt-3 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
        placeholder={q.number.toString()}
      />
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {test.type === 'listening' && test.sections[0].audioUrl && (
        <audio ref={audioRef} src={test.sections[0].audioUrl} className="hidden" />
      )}
      
      {/* Header */}
      <div className="bg-white p-4 rounded-t-2xl border border-gray-200 flex justify-between items-center mb-4 shadow-sm">
        <h1 className="font-bold text-gray-900 text-lg">{test.title}</h1>
        <div className="flex items-center gap-6">
          {test.type === 'reading' && (
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-4 py-2 rounded-lg font-mono">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className={`text-lg font-bold ${timer.secondsRemaining < 300 ? 'text-red-600' : ''}`}>
                {timer.formatTime()}
              </span>
            </div>
          )}
          <button
            onClick={handleFinish}
            disabled={saving || viewedSections.size < test.sections.length}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Finish Test'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left pane: Text or Audio */}
        <div className="w-1/2 bg-white rounded-2xl border border-gray-200 p-8 overflow-y-auto shadow-sm">
          <h2 className="text-xl font-bold mb-2">{currentSection.title}</h2>
          
          <div className="text-gray-600 mb-6 italic">{currentSection.instructions}</div>
          
          {currentSection.imageUrls && currentSection.imageUrls.map((url, i) => (
            <img key={i} src={url} alt="Diagram" className="max-w-full h-auto mb-6 rounded-lg border border-gray-200" />
          ))}
          
          <Highlighter content={currentSection.content} id={`test_${id}_sec_${currentSectionIdx}`} />
        </div>

        {/* Right pane: Questions */}
        <div className="w-1/2 bg-white rounded-2xl border border-gray-200 p-8 overflow-y-auto shadow-sm flex flex-col">
          <div className="space-y-8 flex-1">
            {currentSection.questions.map((q) => {
              const textBlanks = q.text ? (q.text.match(/______/g) || []).length : 0;
              const tableBlanks = q.tableData ? (JSON.stringify(q.tableData).match(/______/g) || []).length : 0;
              const totalBlanks = textBlanks + tableBlanks;
              const isMulti = totalBlanks > 1;
              const qNumberDisplay = isMulti ? `${q.number}-${q.number + totalBlanks - 1}` : q.number;

              return (
                <React.Fragment key={q.id}>
                  {q.groupTitle && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                      <h3 className="font-bold text-gray-900">{q.groupTitle}</h3>
                      {q.groupInstructions && <p className="text-gray-600 mt-1 text-sm">{q.groupInstructions}</p>}
                    </div>
                  )}
                  <div className="border-b border-gray-100 pb-6 mb-6 last:border-0 last:pb-0 last:mb-0">
                    <div className="flex gap-3">
                      <div className="px-3 h-8 flex-shrink-0 bg-blue-50 text-blue-700 font-bold rounded-full flex items-center justify-center text-sm border border-blue-100 min-w-[2rem]">
                        {qNumberDisplay}
                      </div>
                      <div className="flex-1 mt-1">
                        {!(q.type === 'completion' || q.type === 'sentence_completion' || q.type === 'table_completion') ? (
                          <>
                            <div className="font-medium text-gray-900 leading-relaxed">
                              <Highlighter content={q.text || 'Complete the answer:'} id={`test_${id}_q_${q.id}`} />
                            </div>
                            {renderQuestionInput(q)}
                          </>
                        ) : (
                          renderQuestionInput(q)
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              disabled={currentSectionIdx === 0}
              onClick={() => setCurrentSectionIdx(prev => prev - 1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Section
            </button>
            <button
              disabled={currentSectionIdx === test.sections.length - 1}
              onClick={() => setCurrentSectionIdx(prev => prev + 1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30 transition-colors"
            >
              Next Section <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
