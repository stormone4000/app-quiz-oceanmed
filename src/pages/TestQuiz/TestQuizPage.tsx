import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Quiz } from '../../components/student/Quiz';
import { ChevronLeft } from 'lucide-react';

// Funzione per verificare se un valore è un UUID v4 valido
function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

export function TestQuizPage() {
  const { quizType, quizId } = useParams<{ quizType: string; quizId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizExists, setQuizExists] = useState(false);
  
  useEffect(() => {
    const checkQuiz = async () => {
      if (!quizId) {
        setError('ID Quiz mancante');
        setLoading(false);
        return;
      }
      
      // Verifica che l'ID sia un UUID valido
      if (!isValidUUID(quizId)) {
        console.error("ID quiz non valido, non è un UUID:", quizId);
        setError('ID quiz non valido. Si prega di utilizzare un quiz con un ID valido.');
        setLoading(false);
        return;
      }
      
      try {
        // Verifica se il quiz esiste
        const { data: quiz, error } = await supabase
          .from('quiz_templates')
          .select('id, title')
          .eq('id', quizId)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (quiz) {
          setQuizExists(true);
          // Imposta la modalità di test
          sessionStorage.setItem('testMode', 'true');
        } else {
          setError('Quiz non trovato');
        }
      } catch (err) {
        console.error('Errore durante il controllo del quiz:', err);
        setError('Errore durante il controllo del quiz');
      } finally {
        setLoading(false);
      }
    };
    
    checkQuiz();
    
    // Pulizia quando il componente viene smontato
    return () => {
      sessionStorage.removeItem('testMode');
    };
  }, [quizId]);
  
  const handleBack = () => {
    navigate('/dashboard', { state: { activeTab: 'quizzes' } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-white hover:text-blue-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Torna a Tutti i Quiz</span>
          </button>
          
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 text-white">
            <h2 className="text-xl font-bold mb-2">Errore</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quizExists) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-white hover:text-blue-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Torna a Tutti i Quiz</span>
          </button>
          
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-6 text-white">
            <h2 className="text-xl font-bold mb-2">Quiz non trovato</h2>
            <p>Il quiz che stai cercando non esiste o non è più disponibile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-blue-900 to-blue-950">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-white hover:text-blue-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Torna a Tutti i Quiz</span>
          </button>
          
          <div className="bg-blue-600 px-3 py-1 rounded-full text-xs text-white">
            Modalità Test - I risultati non verranno salvati
          </div>
        </div>
        
        {quizId && (
          <Quiz 
            quizId={quizId} 
            onBack={handleBack} 
            studentEmail="instructor-test@example.com" 
            isTestMode={true}
          />
        )}
      </div>
    </div>
  );
} 