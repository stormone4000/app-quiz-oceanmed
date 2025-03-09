import React, { useState, useEffect } from 'react';
import { Search, Book, Key, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface QuizSelectorProps {
  onQuizSelect: (quizId: string) => void;
}

interface QuizCategory {
  id: string;
  name: string;
  count: number;
}

export function QuizSelector({ onQuizSelect }: QuizSelectorProps) {
  const [quizCode, setQuizCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // Controlla se esiste già un codice quiz salvato in localStorage all'avvio del componente
  useEffect(() => {
    const savedQuizCode = localStorage.getItem('accessCode');
    if (savedQuizCode) {
      console.log('Codice quiz trovato in localStorage:', savedQuizCode);
      setQuizCode(savedQuizCode);
      // Verifica automaticamente il codice salvato
      handleVerifySavedCode(savedQuizCode);
    }
  }, []);

  // Funzione per verificare automaticamente il codice salvato
  const handleVerifySavedCode = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Formatta il codice (aggiunge QUIZ- se necessario)
      let formattedCode = code.toUpperCase().trim();
      if (!formattedCode.startsWith('QUIZ-')) {
        formattedCode = `QUIZ-${formattedCode}`;
      }
      
      // Cerca il quiz associato al codice
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_templates')
        .select('*')
        .eq('access_code', formattedCode);
        
      if (quizError) {
        console.error('Errore nella ricerca del quiz:', quizError);
        setLoading(false);
        return;
      }
      
      // Se troviamo un quiz, lo selezioniamo automaticamente
      if (quizData && quizData.length === 1) {
        const quiz = quizData[0];
        console.log('Quiz trovato automaticamente:', quiz);
        setSuccess(`Codice quiz valido! Accesso concesso al quiz "${quiz.title}"`);
        
        // Registra l'utilizzo del codice quiz se necessario
        const studentEmail = localStorage.getItem('userEmail');
        if (studentEmail) {
          // Ottieni l'ID del codice di accesso
          const { data: accessCodeData, error: accessCodeError } = await supabase
            .from('access_codes')
            .select('id, created_by')
            .eq('code', formattedCode)
            .single();
            
          if (!accessCodeError && accessCodeData) {
            // Verifichiamo se l'utilizzo è già stato registrato
            const { data: existingUsage, error: existingUsageError } = await supabase
              .from('access_code_usage')
              .select('*')
              .eq('code_id', accessCodeData.id)
              .eq('student_email', studentEmail);
              
            if (!existingUsageError && (!existingUsage || existingUsage.length === 0)) {
              // Se non esiste, registriamo l'utilizzo
              await supabase
                .from('access_code_usage')
                .insert([{
                  code_id: accessCodeData.id,
                  student_email: studentEmail,
                  used_at: new Date().toISOString(),
                  instructor_email: accessCodeData.created_by
                }]);
            }
          }
        }
        
        // Seleziona il quiz
        onQuizSelect(quiz.id);
        return;
      }
      
      // Se non troviamo un quiz specifico, cerchiamo un codice di accesso generale
      let { data: accessCodes, error: accessCodesError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', formattedCode);
      
      // Se non troviamo risultati, proviamo senza il prefisso QUIZ-
      if (!accessCodesError && (!accessCodes || accessCodes.length === 0)) {
        const accessCodeValue = formattedCode.replace('QUIZ-', '');
        
        const result = await supabase
          .from('access_codes')
          .select('*')
          .eq('code', accessCodeValue);
          
        accessCodes = result.data;
        accessCodesError = result.error;
      }
      
      if (!accessCodesError && accessCodes && accessCodes.length > 0) {
        const accessCode = accessCodes[0];
        
        if (accessCode.is_active) {
          // Il codice è valido, ma non è associato a un quiz specifico
          // Mostriamo un messaggio di successo
          setSuccess(`Codice di accesso valido! Puoi selezionare un quiz.`);
          
          // Registra l'utilizzo del codice se necessario
          const studentEmail = localStorage.getItem('userEmail');
          if (studentEmail) {
            // Verifichiamo se l'utilizzo è già stato registrato
            const { data: existingUsage, error: existingUsageError } = await supabase
              .from('access_code_usage')
              .select('*')
              .eq('code_id', accessCode.id)
              .eq('student_email', studentEmail);
              
            if (!existingUsageError && (!existingUsage || existingUsage.length === 0)) {
              // Se non esiste, registriamo l'utilizzo
              await supabase
                .from('access_code_usage')
                .insert([{
                  code_id: accessCode.id,
                  student_email: studentEmail,
                  used_at: new Date().toISOString(),
                  instructor_email: accessCode.created_by
                }]);
            }
          }
        } else {
          // Il codice non è attivo, rimuoviamolo dal localStorage
          localStorage.removeItem('accessCode');
          setError('Questo codice è stato disattivato. Inserisci un nuovo codice.');
        }
      } else {
        // Il codice non è valido, rimuoviamolo dal localStorage
        localStorage.removeItem('accessCode');
        setError('Il codice salvato non è più valido. Inserisci un nuovo codice.');
      }
    } catch (error) {
      console.error('Errore durante la verifica automatica del codice:', error);
      // In caso di errore, rimuoviamo il codice dal localStorage
      localStorage.removeItem('accessCode');
      setError('Si è verificato un errore. Inserisci nuovamente il codice.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!quizCode.trim()) {
        throw new Error('Inserisci un codice quiz');
      }

      // Verifica che il codice inizi con "QUIZ-"
      const formattedCode = quizCode.trim();
      console.log('Verifica codice quiz:', formattedCode);
      
      if (!formattedCode.startsWith('QUIZ-')) {
        throw new Error('Codice quiz non valido. I codici quiz devono iniziare con "QUIZ-"');
      }

      // Verify quiz code
      console.log('Ricerca quiz con codice:', formattedCode);
      
      // STEP 1: Prima proviamo a cercare il codice nei quiz_templates
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_templates')
        .select('id, title, quiz_type, category')
        .eq('quiz_code', formattedCode);

      // Controlliamo manualmente se abbiamo trovato esattamente un quiz
      if (quizData && quizData.length === 1) {
        const quiz = quizData[0];
        console.log('Quiz trovato nei quiz_templates con prefisso:', quiz);
        
        // Store the quiz code in localStorage
        localStorage.setItem('quizCode', formattedCode);
        
        // Registra l'utilizzo del codice quiz
        const studentEmail = localStorage.getItem('userEmail');
        if (studentEmail) {
          // Ottieni l'ID del codice di accesso
          const { data: accessCodeData, error: accessCodeError } = await supabase
            .from('access_codes')
            .select('id, created_by')
            .eq('code', formattedCode)
            .single();
            
          if (!accessCodeError && accessCodeData) {
            // Registra l'utilizzo del codice
            const { error: usageError } = await supabase
              .from('access_code_usage')
              .insert([{
                code_id: accessCodeData.id,
                student_email: studentEmail,
                used_at: new Date().toISOString(),
                instructor_email: accessCodeData.created_by
              }]);
              
            if (usageError) {
              console.error('Errore nella registrazione dell\'utilizzo del codice:', usageError);
            } else {
              console.log('Utilizzo del codice registrato con successo');
            }
            
            // Registriamo anche l'associazione studente-istruttore
            // Solo se il codice ha un creatore associato
            if (accessCodeData.created_by) {
              console.log('Registrazione associazione studente-istruttore');
              
              // Verifichiamo se l'associazione esiste già
              const { data: existingRelation, error: relationError } = await supabase
                .from('student_instructor')
                .select('*')
                .eq('student_email', studentEmail)
                .eq('instructor_email', accessCodeData.created_by);
                
              if (!existingRelation || existingRelation.length === 0) {
                // Se non esiste, la creiamo
                const { data: relationData, error: insertRelationError } = await supabase
                  .from('student_instructor')
                  .insert([{
                    student_email: studentEmail,
                    instructor_email: accessCodeData.created_by,
                    created_at: new Date().toISOString()
                  }]);
                  
                if (insertRelationError) {
                  console.error('Errore nella creazione dell\'associazione studente-istruttore:', insertRelationError);
                } else {
                  console.log('Associazione studente-istruttore creata con successo');
                }
              } else {
                console.log('Associazione studente-istruttore già esistente');
              }
            }
          }
        }
        
        setSuccess(`Codice quiz valido! Accesso concesso al quiz "${quiz.title}"`);
        onQuizSelect(quiz.id);
        return;
      }
      
      // STEP 2: Se non troviamo un quiz specifico, cerchiamo un codice di accesso generale
      console.log('Nessun quiz specifico trovato, cerco un codice di accesso generale');
      
      // Prima proviamo a cercare il codice esattamente come inserito (con prefisso QUIZ-)
      console.log('Cercando il codice di accesso con prefisso originale:', formattedCode);
      
      let { data: accessCodes, error: accessCodesError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', formattedCode);
      
      // Se non troviamo risultati, proviamo senza il prefisso QUIZ-
      if (!accessCodesError && (!accessCodes || accessCodes.length === 0)) {
        const accessCodeValue = formattedCode.replace('QUIZ-', '');
        console.log('Nessun risultato trovato con prefisso, cercando senza prefisso:', accessCodeValue);
        
        const result = await supabase
          .from('access_codes')
          .select('*')
          .eq('code', accessCodeValue);
          
        accessCodes = result.data;
        accessCodesError = result.error;
      }
      
      if (accessCodesError) {
        console.error('Errore tecnico nella ricerca del codice di accesso:', accessCodesError);
        throw new Error('Si è verificato un errore tecnico. Riprova più tardi.');
      }
      
      // Verifica se abbiamo trovato codici
      if (!accessCodes || accessCodes.length === 0) {
        console.log('Nessun codice di accesso trovato per:', formattedCode);
        throw new Error(`Codice "${formattedCode}" non valido o inesistente. Verifica il codice e riprova.`);
      }
      
      // Otteniamo il primo codice trovato
      const accessCode = accessCodes[0];
      console.log('Codice di accesso trovato:', accessCode);
      
      if (!accessCode.is_active) {
        throw new Error('Questo codice è stato disattivato dall\'amministratore.');
      }
      
      if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
        throw new Error('Questo codice è scaduto. Contatta il tuo istruttore per un nuovo codice.');
      }
      
      console.log('Codice di accesso valido trovato:', accessCode);
      
      // Store the access code in localStorage
      localStorage.setItem('accessCode', accessCode.code);
      
      // Registra l'utilizzo del codice di accesso
      const studentEmail = localStorage.getItem('userEmail');
      if (studentEmail) {
        try {
          // Verifichiamo se l'utilizzo è già stato registrato
          const { data: existingUsage, error: existingUsageError } = await supabase
            .from('access_code_usage')
            .select('*')
            .eq('code_id', accessCode.id)
            .eq('student_email', studentEmail);
            
          if (existingUsageError) {
            console.error('Errore nella verifica dell\'utilizzo esistente:', existingUsageError);
          }
            
          if (!existingUsage || existingUsage.length === 0) {
            // Se non esiste, registriamo l'utilizzo
            const { error: usageError } = await supabase
              .from('access_code_usage')
              .insert([{
                code_id: accessCode.id,
                student_email: studentEmail,
                used_at: new Date().toISOString(),
                instructor_email: accessCode.created_by
              }]);
              
            if (usageError) {
              console.error('Errore nella registrazione dell\'utilizzo del codice:', usageError);
            } else {
              console.log('Utilizzo del codice registrato con successo');
            }
          } else {
            console.log('Utilizzo del codice già registrato');
          }
          
          // Registriamo anche l'associazione studente-istruttore
          // Solo se il codice ha un creatore associato
          if (accessCode.created_by) {
            console.log('Registrazione associazione studente-istruttore con:', accessCode.created_by);
            
            // Verifichiamo se l'associazione esiste già
            const { data: existingRelation, error: relationError } = await supabase
              .from('student_instructor')
              .select('*')
              .eq('student_email', studentEmail)
              .eq('instructor_email', accessCode.created_by);
              
            if (relationError) {
              console.error('Errore nella verifica dell\'associazione studente-istruttore:', relationError);
            }
              
            if (!existingRelation || existingRelation.length === 0) {
              // Se non esiste, la creiamo
              const { error: insertRelationError } = await supabase
                .from('student_instructor')
                .insert([{
                  student_email: studentEmail,
                  instructor_email: accessCode.created_by,
                  created_at: new Date().toISOString()
                }]);
                
              if (insertRelationError) {
                console.error('Errore nella creazione dell\'associazione studente-istruttore:', insertRelationError);
              } else {
                console.log('Associazione studente-istruttore creata con successo');
              }
            } else {
              console.log('Associazione studente-istruttore già esistente');
            }
          }
        } catch (error) {
          console.error('Errore durante la registrazione dell\'utilizzo del codice:', error);
          // Continuiamo comunque perché l'utente dovrebbe poter accedere anche se fallisce la registrazione
        }
      }
      
      // Otteniamo informazioni sul creatore del codice, se disponibili
      let creatorInfo = "";
      if (accessCode.created_by) {
        try {
          // Recuperiamo il nome dell'istruttore che ha creato il codice
          const { data: creatorData, error: creatorError } = await supabase
            .from('auth_users')
            .select('first_name, last_name')
            .eq('email', accessCode.created_by)
            .single();
            
          if (!creatorError && creatorData) {
            const creatorName = `${creatorData.first_name || ''} ${creatorData.last_name || ''}`.trim();
            if (creatorName) {
              creatorInfo = ` fornito da ${creatorName}`;
            } else {
              creatorInfo = ` fornito da ${accessCode.created_by}`;
            }
          } else {
            creatorInfo = ` fornito da ${accessCode.created_by}`;
          }
        } catch (error) {
          console.error('Errore nel recupero delle informazioni sul creatore:', error);
          creatorInfo = ` fornito da ${accessCode.created_by}`;
        }
      }
      
      setSuccess(`Codice di accesso "${accessCode.code}"${creatorInfo} attivato con successo! Ora puoi accedere a tutti i quiz pubblici.`);
      
      // Redirect to dashboard or refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Error verifying quiz code:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del codice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Quiz Code Input */}
      <div className="bg-emerald-100 dark:bg-emerald-800/20 backdrop-blur-lg border border-emerald-300 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-200 dark:bg-green-900/30 rounded-lg">
            <Key className="w-6 h-6 text-emerald-700 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-emerald-900 dark:text-slate-100">Aggiungi Codice Quiz</h3>
            <p className="text-emerald-800 dark:text-slate-400">Inserisci il codice fornito dall'istruttore per accedere ai quiz personalizzati</p>
          </div>
        </div>

        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 text-lg tracking-wider font-mono rounded-lg border border-emerald-400 dark:border-slate-700/30 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-800/10 text-emerald-900 dark:text-slate-100 placeholder-emerald-500/70 dark:placeholder-slate-500"
              placeholder="Inserisci il codice quiz"
              maxLength={15}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifica in corso...
                </>
              ) : (
                <>
                  Accedi al Quiz
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-100">
              <div className="p-1 bg-green-500 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p>{success}</p>
            </div>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-100">
            <div className="p-1 bg-blue-500 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p>Ricorda: il codice quiz ti viene fornito dal tuo istruttore e ti permette di accedere ai quiz personalizzati.</p>
          </div>
        </div>
      </div>
    </div>
  );
}