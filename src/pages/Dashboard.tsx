import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Headphones, PenTool, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAssetPath } from '../lib/utils';

interface TestManifest {
  id: string;
  title: string;
  file: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [manifest, setManifest] = useState<Record<string, TestManifest[]>>({
    reading: [],
    listening: [],
    writing: []
  });

  useEffect(() => {
    fetch(getAssetPath('/data/manifest.json'))
      .then(res => res.json())
      .then(data => setManifest(data))
      .catch(console.error);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const renderSection = (title: string, icon: React.ReactNode, type: 'reading' | 'listening' | 'writing', colorClass: string) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      
      <div className="space-y-3">
        {manifest[type].map((test) => (
          <div key={test.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="font-medium text-gray-700">{test.title}</span>
            <Link
              to={type === 'writing' ? `/writing/${test.id}` : `/test/${type}/${test.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Test
            </Link>
          </div>
        ))}
        {manifest[type].length === 0 && (
          <div className="text-sm text-gray-500 py-4 text-center">No tests available yet.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Select a test category to begin practicing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderSection("Reading Tests", <BookOpen className="w-5 h-5" />, 'reading', 'bg-blue-50 text-blue-600')}
        {renderSection("Listening Tests", <Headphones className="w-5 h-5" />, 'listening', 'bg-purple-50 text-purple-600')}
        {renderSection("Writing Tests", <PenTool className="w-5 h-5" />, 'writing', 'bg-green-50 text-green-600')}
      </div>
    </div>
  );
}
