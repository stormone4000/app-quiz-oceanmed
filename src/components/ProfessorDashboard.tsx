import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './layout/DashboardLayout';
import { QuizManager } from './instructor/QuizManager';
import { AccessCodeManager } from './instructor/AccessCodeManager';
import { VideoManager } from './instructor/VideoManager';
import { UserManagement } from './instructor/UserManagement';
import { UserProfile } from './profile/UserProfile';
import { QuizSelection } from './QuizSelection';
import { QuizCategories } from './QuizCategories';
import { Quiz } from './student/Quiz';
import { StudentLeaderboard } from './instructor/StudentLeaderboard';
import { SubscriptionManager } from './instructor/SubscriptionManager';
import { StudentManagement } from './instructor/StudentManagement';
import { NotificationManager } from './notifications/NotificationManager';
import { DashboardStats } from './admin/DashboardStats';
import type { QuizType, QuizResult } from '../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Users, Target, CheckCircle2, Trophy, Star, Book, ArrowRight, Key } from 'lucide-react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface ProfessorDashboardProps {
  results: QuizResult[];
  onLogout: () => void;
  hostEmail?: string;
  needsSubscription?: boolean;
}

export function ProfessorDashboard({ results, onLogout, hostEmail, needsSubscription }: ProfessorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live'>('stats');
  const [quizType, setQuizType] = useState<QuizType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
  
  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    const needsSubscription = localStorage.getItem('needsSubscription') === 'true';
    const isCodeDeactivated = localStorage.getItem('isCodeDeactivated') === 'true';
    
    if (userEmail === 'istruttore1@io.it' && (needsSubscription || isCodeDeactivated) && activeTab !== 'profile') {
      console.log('Reindirizzamento forzato al profilo per istruttore1@io.it');
      setActiveTab('profile');
    }
  }, [activeTab]);
  
  const renderContent = () => {
    if (activeTab === 'students' && isMasterAdmin) {
      return <UserManagement />;
    }

    if (activeTab === 'subscriptions') {
      return <SubscriptionManager />;
    }

    if (activeTab === 'notifications') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">Gestione Notifiche</h2>
          <NotificationManager />
        </div>
      );
    }

    if (activeTab === 'quiz-studenti') {
      if (quizType) {
        if (selectedCategory) {
          return (
            <Quiz
              quizId={selectedCategory}
              onBack={() => setSelectedCategory(null)}
              studentEmail="instructor@example.com"
            />
          );
        }
        return (
          <QuizCategories
            type={quizType}
            onBack={() => setQuizType(null)}
            onSelectCategory={setSelectedCategory}
          />
        );
      }
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">Quiz Studenti</h2>
          <StudentLeaderboard />
          <div className="mt-8">
            <QuizSelection
              onSelectQuizType={(type) => setQuizType(type)}
              onShowDashboard={() => setActiveTab('stats')}
            />
          </div>
        </div>
      );
    }

    if (activeTab === 'videos') {
      return <VideoManager />;
    }

    if (activeTab === 'profile') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">Profilo Utente</h2>
          <UserProfile 
            userEmail={localStorage.getItem('userEmail') || ''}
            needsSubscription={needsSubscription}
          />
        </div>
      );
    }

    if (activeTab === 'quizzes') {
      return <QuizManager />;
    }

    if (activeTab === 'access-codes') {
      return <AccessCodeManager />;
    }

    // Stats tab (default)
    const totalAttempts = results.length;
    const averageScore = results.reduce((acc, curr) => acc + curr.score, 0) / totalAttempts;
    const passedAttempts = results.filter(r => r.score >= 0.75).length;
    const failedAttempts = totalAttempts - passedAttempts;
    const totalStudents = new Set(results.map(r => r.email)).size;

    // Get top 5 students
    const studentScores = results.reduce((acc: { [key: string]: { score: number, attempts: number, name: string } }, curr) => {
      if (!acc[curr.email]) {
        acc[curr.email] = {
          score: 0,
          attempts: 0,
          name: `${curr.firstName || ''} ${curr.lastName || ''}`.trim() || curr.email
        };
      }
      acc[curr.email].score += curr.score;
      acc[curr.email].attempts += 1;
      return acc;
    }, {});

    const topStudents = Object.entries(studentScores)
      .map(([email, data]) => ({
        email,
        name: data.name,
        averageScore: data.score / data.attempts
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    const pieData = {
      labels: ['Superati', 'Non Superati'],
      datasets: [
        {
          data: [passedAttempts, failedAttempts],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderColor: ['#16a34a', '#dc2626'],
          borderWidth: 1,
        },
      ],
    };

    const categoryResults = results.reduce((acc: { [key: string]: number[] }, curr) => {
      if (!acc[curr.category]) {
        acc[curr.category] = [];
      }
      acc[curr.category].push(curr.score);
      return acc;
    }, {});

    const categoryAverages = Object.entries(categoryResults).map(([category, scores]) => ({
      category,
      average: scores.reduce((a, b) => a + b, 0) / scores.length
    }));

    const barData = {
      labels: categoryAverages.map(c => c.category),
      datasets: [
        {
          label: 'Media Punteggi per Categoria',
          data: categoryAverages.map(c => c.average * 100),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
        },
      ],
    };

    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white">
          {isMasterAdmin ? 'Dashboard Admin Master' : 'Dashboard Istruttore'}
        </h2>

        {/* Mostra le statistiche aggregate solo per gli admin master */}
        {isMasterAdmin && (
          <DashboardStats />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-inner dark:shadow-none">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Studenti Totali</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalStudents}</p>
          </div>

          <div className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg shadow-inner dark:shadow-none">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Tentativi Totali</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalAttempts}</p>
          </div>

          <div className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg shadow-inner dark:shadow-none">
                <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Media Punteggi</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {(averageScore * 100).toFixed(1)}%
            </p>
          </div>

          <div className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg shadow-inner dark:shadow-none">
                <Target className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Tasso di Successo</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {((passedAttempts / totalAttempts) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Top 5 Students */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold dark:text-slate-100">Top 5 Studenti</h3>
            </div>
            <button
              onClick={() => setActiveTab('students')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2"
            >
              Vedi Tutti
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {topStudents.map((student, index) => (
              <div
                key={student.email}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  index === 0
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-500 dark:text-slate-400 w-8">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium dark:text-slate-100">{student.name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{student.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-blue-600">
                    {(student.averageScore * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Media</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">Distribuzione Risultati</h3>
            <div className="w-full max-w-xs mx-auto">
              <Pie data={pieData} options={{ responsive: true }} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">Performance per Categoria</h3>
            <Bar
              data={barData}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: value => `${value}%`,
                      color: 'rgb(148 163 184)'
                    }
                   },
                   x: {
                     ticks: {
                       color: 'rgb(148 163 184)'
                     }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Recent Quiz Results */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Book className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold dark:text-slate-100">Quiz Recenti</h3>
              </div>
              <button
                onClick={() => setActiveTab('quiz-studenti')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2"
              >
                Vedi Tutti
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Studente</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Categoria</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Punteggio</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {results.slice(0, 5).map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium dark:text-slate-100">
                          {result.firstName} {result.lastName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{result.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                        {result.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${
                        result.score >= 0.75 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                      {new Date(result.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
      isMaster={isMasterAdmin}
    >
      {renderContent()}
    </DashboardLayout>
  );
}