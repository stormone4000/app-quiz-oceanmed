import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AssignedQuiz {
  id: string;
  quiz_id: string;
  quiz: {
    id: string;
    title: string;
    description: string;
    quiz_type: 'exam' | 'learning';
    category: string;
    question_count: number;
    duration_minutes: number;
  };
  start_date: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  instructions?: string;
  attempt_limit: number;
}

export function AssignedQuizzes({ studentEmail }: { studentEmail: string }) {
  const [assignments, setAssignments] = useState<AssignedQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [studentEmail]);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_assignments')
        .select(`
          id,
          quiz_id,
          start_date,
          deadline,
          status,
          instructions,
          attempt_limit,
          quiz:quiz_templates (
            id,
            title,
            description,
            quiz_type,
            category,
            question_count,
            duration_minutes
          )
        `)
        .eq('student_email', studentEmail)
        .order('deadline', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Caricamento quiz assegnati...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Non hai quiz assegnati al momento.</p>
      </div>
    );
  }

  const now = new Date();
  const activeAssignments = assignments.filter(
    a => new Date(a.deadline) >= now && a.status !== 'completed'
  );
  const pastAssignments = assignments.filter(
    a => new Date(a.deadline) < now || a.status === 'completed'
  );

  return (
    <div className="space-y-8">
      {activeAssignments.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Quiz Attivi</h3>
          <div className="space-y-4">
            {activeAssignments.map((assignment) => {
              const isExpiringSoon = 
                new Date(assignment.deadline).getTime() - now.getTime() < 24 * 60 * 60 * 1000;

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium">{assignment.quiz.title}</h4>
                      <p className="text-gray-600 mt-1">{assignment.quiz.description}</p>
                      
                      {assignment.instructions && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {assignment.instructions}
                        </p>
                      )}
                      
                      <div className="flex gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Scadenza: {formatDate(assignment.deadline)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{assignment.quiz.duration_minutes} minuti</span>
                        </div>
                      </div>

                      {isExpiringSoon && (
                        <div className="flex items-center gap-2 mt-3 text-amber-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>Scade tra meno di 24 ore!</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      onClick={() => {/* TODO: Start quiz */}}
                    >
                      Inizia Quiz
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pastAssignments.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Quiz Completati</h3>
          <div className="space-y-4">
            {pastAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-gray-50 rounded-lg p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-medium text-gray-700">
                      {assignment.quiz.title}
                    </h4>
                    <p className="text-gray-600 mt-1">{assignment.quiz.description}</p>
                    
                    <div className="flex gap-6 mt-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Completato il: {formatDate(assignment.deadline)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{assignment.quiz.duration_minutes} minuti</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    onClick={() => {/* TODO: View results */}}
                  >
                    Vedi Risultati
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}