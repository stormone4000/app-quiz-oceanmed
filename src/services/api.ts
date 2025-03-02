import { supabase } from './supabase';
import type { Question, QuizResult } from '../types';

export async function getQuestions(): Promise<Question[]> {
  try {
    const { data: questions, error } = await supabase
      .from('questions')
      .select(`
        id,
        text,
        options,
        correct_answer,
        time_limit,
        quiz_id,
        quizzes (
          type_id
        )
      `);

    if (error) throw error;

    return (questions || []).map(q => ({
      id: q.id,
      question: q.text,
      options: q.options,
      correctAnswer: q.correct_answer,
      category: q.quizzes && typeof q.quizzes.type_id !== 'undefined' ? String(q.quizzes.type_id) : '',
      timeLimit: q.time_limit
    }));
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

export async function saveQuizResult(result: QuizResult): Promise<void> {
  try {
    if (!result.email) {
      throw new Error('Student email is required');
    }

    if (!result.quizId) {
      throw new Error('Quiz ID is required');
    }

    console.log("Tentativo di salvare il risultato per", result.email, "quiz_id:", result.quizId);
    console.log("Tipo di quiz_id:", typeof result.quizId);

    // Validate and normalize the score
    const score = Math.max(0, Math.min(1, result.score));
    if (isNaN(score)) {
      throw new Error('Invalid score value');
    }

    // Validate other required fields
    if (!Array.isArray(result.answers)) {
      throw new Error('Invalid answers array');
    }

    if (!Array.isArray(result.questionTimes)) {
      throw new Error('Invalid question times array');
    }

    // First get user details from auth_users
    const { data: userData, error: userError } = await supabase
      .from('auth_users')
      .select('first_name, last_name')
      .eq('email', result.email)
      .single();

    if (userError) {
      console.warn('Could not fetch user details:', userError);
      // Continue without user details
    }

    // Verifichiamo prima se il quiz esiste
    const { data: quizExists, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', result.quizId)
      .single();

    if (quizError) {
      console.warn('Attenzione: Quiz non trovato, verifica l\'ID:', result.quizId, quizError);
    }

    const resultData = {
      student_email: result.email,
      quiz_id: result.quizId,
      score: score, // Use the validated score
      total_time: result.totalTime || 0,
      answers: result.answers,
      question_times: result.questionTimes,
      date: result.date || new Date().toISOString(),
      category: result.category || 'uncategorized',
      first_name: userData?.first_name || result.firstName || '',
      last_name: userData?.last_name || result.lastName || ''
    };

    console.log("Dati da inserire:", JSON.stringify(resultData));

    const { error: insertError } = await supabase
      .from('results')
      .insert([resultData]);

    if (insertError) {
      console.error('Errore dettagliato durante inserimento risultato:', insertError);
      console.error('Codice errore:', insertError.code);
      console.error('Messaggio errore:', insertError.message);
      console.error('Dettagli errore:', insertError.details);
      throw new Error(`Failed to save quiz result: ${insertError.message}`);
    }

    console.log("Risultato salvato con successo!");
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
}

export async function getQuizResults(): Promise<QuizResult[]> {
  try {
    const { data: results, error } = await supabase
      .from('results')
      .select(`
        *,
        quiz:quizzes(
          title,
          description,
          type_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching results:', error);
      return [];
    }

    return (results || []).map(r => ({
      studentId: '',
      firstName: r.first_name || '',
      lastName: r.last_name || '',
      email: r.student_email,
      score: r.score,
      totalTime: r.total_time || 0,
      answers: r.answers || [],
      questionTimes: r.question_times || [],
      date: r.created_at || new Date().toISOString(),
      category: r.quiz?.type_id ? String(r.quiz.type_id) : '',
      quizId: r.quiz_id
    }));
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    throw error;
  }
}