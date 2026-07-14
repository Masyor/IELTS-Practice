import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getResults, deleteResult } from '../lib/firebase';
import { format } from 'date-fns';
import { TestResult } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Trash2 } from 'lucide-react';

export default function Results() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResult[]>([]);
  const [fetching, setFetching] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchResults = async () => {
      try {
        const docs = await getResults(user.uid);
        docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setResults(docs);
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };

    fetchResults();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deleteResult(id);
      setResults(prev => prev.filter(r => r.id !== id));
      setDeletingId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete test record.');
      setDeletingId(null);
    }
  };

  if (loading || fetching) return <div className="p-8 text-center text-gray-500">Loading results...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const rlResults = results.filter(r => r.testType !== 'writing').slice().reverse(); // Chronological
  
  const filteredRlResults = rlResults.filter(r => {
    const d = new Date(r.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  });

  // Data for chart
  const chartData = filteredRlResults.map((r) => {
    const obj: any = { 
      date: format(new Date(r.date), 'MMM d, HH:mm'),
      title: r.testTitle
    };
    const pct = Math.round((r.score / r.totalQuestions) * 100);
    if (r.testType === 'reading') obj.Reading = pct;
    if (r.testType === 'listening') obj.Listening = pct;
    return obj;
  });

  // Calculate weakness by question type
  const getTypeStats = (typeFilter: 'reading' | 'listening' | 'all') => {
    const stats: Record<string, { correct: number; total: number }> = {};
    results.forEach(r => {
      if (typeFilter !== 'all' && r.testType !== typeFilter) return;
      if (r.questionPerformance) {
        r.questionPerformance.forEach(qp => {
          if (!stats[qp.type]) stats[qp.type] = { correct: 0, total: 0 };
          stats[qp.type].total++;
          if (qp.correct) stats[qp.type].correct++;
        });
      }
    });
    return Object.entries(stats)
      .map(([type, s]) => ({
        type: type.replace(/_/g, ' ').toUpperCase(),
        accuracy: Math.round((s.correct / s.total) * 100),
        total: s.total
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  };

  const readingWeaknesses = getTypeStats('reading');
  const listeningWeaknesses = getTypeStats('listening');

  const renderWeaknessList = (data: any[], title: string) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1">
      <h2 className="text-lg font-bold text-gray-900 mb-6">{title}</h2>
      <div className="space-y-4">
        {data.length > 0 ? data.slice(0, 5).map(item => (
          <div key={item.type}>
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-medium text-gray-700 truncate pr-4">{item.type}</span>
              <span className="text-sm font-bold text-gray-900">{item.accuracy}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full ${item.accuracy < 50 ? 'bg-red-500' : item.accuracy < 80 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                style={{ width: `${item.accuracy}%` }}
              />
            </div>
          </div>
        )) : (
          <div className="text-gray-400 text-sm text-center py-8">Not enough data.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Progress</h1>
        <p className="text-gray-500 mt-2">Track your scores and identify areas for improvement.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Score Tracking (%)</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="Reading" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Listening" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Complete reading or listening tests to see your progress chart.
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {renderWeaknessList(readingWeaknesses, 'Reading Weaknesses (Top 5)')}
        {renderWeaknessList(listeningWeaknesses, 'Listening Weaknesses (Top 5)')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Test History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, idx) => (
                <tr key={result.id || idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(result.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.testTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {result.testType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                    {result.testType === 'writing' 
                      ? <span className="text-gray-400 font-normal italic">Self/Tutor</span> 
                      : `${result.score} / ${result.totalQuestions}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {result.id && (
                        <button 
                          onClick={() => navigate(`/review/${result.id}`)}
                          className="text-blue-600 hover:text-blue-900 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                        >
                          Review
                        </button>
                      )}
                      {result.id && (
                        deletingId === result.id ? (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleDelete(result.id!)}
                              className="text-white transition-colors bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => setDeletingId(null)}
                              className="text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeletingId(result.id!)}
                            className="text-red-600 hover:text-red-900 transition-colors bg-red-50 hover:bg-red-100 p-1.5 rounded-lg"
                            title="Delete Record"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No tests completed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
