import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Test, TestResult } from '../types';
import { Check, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Highlighter from '../components/Highlighter';
import { getResultById } from '../lib/firebase';
import { getAssetPath } from '../lib/utils';

export default function ReviewRunner() {
  const { resultId } = useParams<{ resultId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);

  useEffect(() => {
    if (!user || !resultId) return;

    const fetchResultAndTest = async () => {
      try {
        const resultData = await getResultById(resultId);
        if (resultData) {
          setResult(resultData);

          const testRes = await fetch(getAssetPath(`/data/${resultData.testType}/${resultData.testId}.json`));
          const testData = await testRes.json();
          setTest(testData);

          if (new URLSearchParams(window.location.search).get('print') === 'true') {
            setTimeout(() => window.print(), 500);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchResultAndTest();
  }, [resultId, user]);

  if (!test || !result) return <div className="p-8 text-center text-gray-500">Loading review...</div>;

  const sections = test.sections || (test as any).tasks || [];
  const currentSection: any = sections[currentSectionIdx];

  const renderQuestionReview = (q: any) => {
    const textBlanks = q.text ? (q.text.match(/______/g) || []).length : 0;
    const tableBlanks = q.tableData ? (JSON.stringify(q.tableData).match(/______/g) || []).length : 0;
    const totalBlanks = textBlanks + tableBlanks;
    const isMulti = totalBlanks > 1;

    let blankIdx = 0;

    const renderResultCard = (userAns: string, ansDef: any, idx?: number) => {
      const normalizedUserAns = (userAns || '').toLowerCase().trim();
      const isCorrect = Array.isArray(ansDef)
        ? ansDef.some((a: any) => typeof a === 'string' && a.toLowerCase().trim() === normalizedUserAns)
        : typeof ansDef === 'string' && ansDef.toLowerCase().trim() === normalizedUserAns;

      return (
        <div key={idx} className={`mt-3 p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
            <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? 'Correct' : 'Incorrect'} {isMulti ? `(Blank ${idx! + 1})` : ''}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-500 uppercase">Your Answer:</span>
            <div className={`font-mono mt-1 ${isCorrect ? 'text-green-800' : 'text-red-800 line-through opacity-70'}`}>
              {userAns || '(No answer)'}
            </div>
          </div>
          {!isCorrect && (
            <div>
              <span className="text-sm font-medium text-gray-500 uppercase">Correct Answer:</span>
              <div className="font-mono mt-1 text-green-800">
                {Array.isArray(ansDef) ? ansDef.join(' OR ') : ansDef}
              </div>
            </div>
          )}
        </div>
      );
    };

    if (isMulti) {
      const cards = [];
      for (let i = 0; i < totalBlanks; i++) {
        const uAns = result.answers[`${q.id}_${i}`] || '';
        const cAns = Array.isArray(q.answer[i]) ? q.answer[i] : (q.answer[i] || q.answer);
        cards.push(renderResultCard(uAns, cAns, i));
      }
      return <div className="space-y-2">{cards}</div>;
    }

    const userAnswer = result.answers[q.id] || '';
    return renderResultCard(userAnswer, q.answer);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-white p-4 rounded-t-2xl border border-gray-200 flex justify-between items-center mb-4 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/results')} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">{test.title} (Review)</h1>
        </div>
        <div className="flex items-center gap-6">
          {result.testType !== 'writing' && (
            <div className="text-xl font-extrabold text-blue-600">
              {result.score} <span className="text-sm text-gray-400 font-medium">/ {result.totalQuestions}</span>
            </div>
          )}
          <button 
            onClick={() => window.open(window.location.pathname + '?print=true', '_blank')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
          >
            Export to PDF
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden print:block print:overflow-visible print:h-auto">
        {result.testType === 'writing' ? (
          sections.map((sec: any, idx: number) => (
          <div key={idx} className={`${idx === currentSectionIdx ? 'block' : 'hidden'} print:block w-full max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 overflow-y-auto shadow-sm print:overflow-visible print:border-none print:shadow-none print:p-0 print:mb-12`}>
            <h2 className="text-xl font-bold mb-4">{sec.title || `Task ${sec.taskNumber}`}</h2>
            <div className="text-gray-600 mb-6 italic whitespace-pre-wrap">{sec.instructions}</div>
            
            {sec.imageUrls && sec.imageUrls.map((url: string, i: number) => (
              <img key={i} src={url} alt="Prompt" className="max-w-full h-auto mb-6 rounded-lg border border-gray-200" />
            ))}
            
            <div className="mb-8 p-6 bg-gray-50 rounded-xl whitespace-pre-wrap text-gray-800 font-serif print:bg-transparent print:p-0 print:mb-4">
              {sec.content || sec.prompt}
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Your Answer:</h3>
              <div className="w-full min-h-[300px] p-6 bg-white border border-gray-300 rounded-xl leading-relaxed whitespace-pre-wrap font-serif text-gray-800 print:border-none print:p-0 print:min-h-0">
                {result.answers[sec.id] || '(No answer provided)'}
              </div>
            </div>

            {/* Pagination for writing */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 print:hidden">
              <button
                disabled={currentSectionIdx === 0}
                onClick={() => setCurrentSectionIdx(prev => prev - 1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Task
              </button>
              <button
                disabled={currentSectionIdx === sections.length - 1}
                onClick={() => setCurrentSectionIdx(prev => prev + 1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30 transition-colors"
              >
                Next Task <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          ))
        ) : (
          sections.map((sec: any, idx: number) => (
          <React.Fragment key={idx}>
            <div className={`${idx === currentSectionIdx ? 'flex' : 'hidden'} print:block print:w-full flex-1 gap-6 overflow-hidden print:overflow-visible print:h-auto`}>
            {/* Left pane: Text */}
            <div className="w-1/2 bg-white rounded-2xl border border-gray-200 p-8 overflow-y-auto shadow-sm print:w-full print:overflow-visible print:mb-8 print:border-none print:shadow-none print:p-0">
              <h2 className="text-xl font-bold mb-2">{sec.title}</h2>
              
              <div className="text-gray-600 mb-6 italic">{sec.instructions}</div>
              
              {sec.imageUrls && sec.imageUrls.map((url: string, i: number) => (
                <img key={i} src={url} alt="Diagram" className="max-w-full h-auto mb-6 rounded-lg border border-gray-200" />
              ))}
              
              <Highlighter content={sec.content} id={`test_${test.id}_sec_${idx}`} />
            </div>

            {/* Right pane: Questions */}
            <div className="w-1/2 bg-white rounded-2xl border border-gray-200 p-8 overflow-y-auto shadow-sm flex flex-col print:w-full print:overflow-visible print:border-none print:shadow-none print:p-0 print:mt-8">
              <div className="space-y-8 flex-1">
                {sec.questions.map((q: any) => {
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
                      <div className="border-b border-gray-100 pb-6 mb-6 last:border-0 last:pb-0 last:mb-0 print:break-inside-avoid">
                        <div className="flex gap-3">
                          <div className="px-3 h-8 flex-shrink-0 bg-blue-50 text-blue-700 font-bold rounded-full flex items-center justify-center text-sm border border-blue-100 min-w-[2rem] print:border print:border-blue-200">
                            {qNumberDisplay}
                          </div>
                          <div className="flex-1 mt-1">
                            {!(q.type === 'completion' || q.type === 'sentence_completion' || q.type === 'table_completion') ? (
                              <div className="font-medium text-gray-900 leading-relaxed">
                                <Highlighter content={q.text || 'Complete the answer:'} id={`test_${test.id}_q_${q.id}`} />
                              </div>
                            ) : (
                              <div className="w-full">
                                {(() => {
                                  let blankIdx = 0;

                                  return (
                                    <>
                                      {q.text && q.text.includes('______') && (
                                        <div className="leading-relaxed inline-block w-full">
                                          {(q.text || '').split('______').map((part: string, i: number, arr: any[]) => {
                                            if (i === arr.length - 1) return <span key={i}><Highlighter inline content={part} id={`test_${test.id}_q_${q.id}_p${i}`} /></span>;
                                            const currentBlankIdx = blankIdx++;
                                            const inputKey = isMulti ? `${q.id}_${currentBlankIdx}` : q.id;
                                            const qNum = isMulti ? q.number + currentBlankIdx : q.number;
                                            return (
                                              <React.Fragment key={i}>
                                                <span><Highlighter inline content={part} id={`test_${test.id}_q_${q.id}_p${i}`} /></span>
                                                <span className="inline-flex items-center mx-2 align-middle">
                                                  <span className="px-3 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-sm text-gray-800">
                                                    {result.answers[inputKey] || `(${qNum})`}
                                                  </span>
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
                                              {q.tableData.map((row: string[], rIdx: number) => (
                                                <tr key={rIdx}>
                                                  {row.map((cell: string, cIdx: number) => {
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
                                                                  <span className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-sm text-gray-800">
                                                                    {result.answers[inputKey] || `(${qNum})`}
                                                                  </span>
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
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            {renderQuestionReview(q)}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 print:hidden">
                <button
                  disabled={currentSectionIdx === 0}
                  onClick={() => setCurrentSectionIdx(prev => prev - 1)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous Section
                </button>
                <button
                  disabled={currentSectionIdx === sections.length - 1}
                  onClick={() => setCurrentSectionIdx(prev => prev + 1)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-30 transition-colors"
                >
                  Next Section <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            </div>
          </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
