// Definizione centralizzata dei tipi per la dashboard

export type DashboardTab = 
  | 'stats' 
  | 'quizzes' 
  | 'student-quiz' 
  | 'access-codes' 
  | 'profile' 
  | 'videos' 
  | 'quiz-studenti' 
  | 'notifications' 
  | 'subscriptions' 
  | 'students' 
  | 'quiz-live' 
  | 'dashboard' 
  | 'gestione-quiz' 
  | 'gestione-alunni' 
  | 'quiz-history' 
  | 'student-access-codes' 
  | 'instructor-access-codes'
  | 'pro-codes'
  | 'my-videos';

export interface MenuItem {
  id: DashboardTab;
  icon: React.ElementType;
  label: string;
  showFor: 'admin' | 'instructor' | 'student' | 'all';
  path?: string;
  route?: string;
  requiresAccess?: boolean;
  lockedMessage?: string;
} 