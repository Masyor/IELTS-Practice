import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Headphones, PenTool } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Master the IELTS with Authentic Practice
        </h1>
        <p className="text-xl text-gray-500">
          Prepare for your IELTS exam with full-length reading, listening, and writing tests. Get instant feedback and track your progress over time.
        </p>
        
        {!user && (
          <div className="pt-4">
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Get Started for Free
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Academic Reading</h3>
          <p className="text-gray-500 text-sm">Practice with diverse texts and all 11 official question types. Timed for 60 minutes.</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mb-4">
            <Headphones className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Listening</h3>
          <p className="text-gray-500 text-sm">Improve your listening skills with authentic audio tracks and varied question formats.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl mb-4">
            <PenTool className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Academic Writing</h3>
          <p className="text-gray-500 text-sm">Complete Task 1 and Task 2 under timed conditions. Export for AI review or email to a tutor.</p>
        </div>
      </div>
    </div>
  );
}
