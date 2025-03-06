export interface UserRole {
  isStudent: boolean;
  isProfessor: boolean;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  email?: string;
  hasActiveAccess?: boolean;
  isMasterAdmin?: boolean;
  needsSubscription?: boolean;
  hasInstructorAccess?: boolean;
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  timeLimit?: number;
}

export interface QuizState {
  currentQuestion: number;
  score: number;
  showResults: boolean;
  questions: Question[];
  answers: boolean[];
  startTime: number | null;
  totalTime: number | null;
  isCountingDown: boolean;
  questionTimes: number[];
  userAnswers: string[];
}

export interface QuizResult {
  id?: string;
  studentId?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  score: number;
  totalTime: number;
  answers: boolean[];
  questionTimes: number[];
  date: string;
  category: string;
  quizId?: string;
  questions?: any[];
  quiz_type?: QuizType;
}

export type QuizType = 'exam' | 'learning' | 'interactive';

export interface LiveQuizSession {
  id: string;
  pin: string;
  quizId: string;
  hostEmail: string;
  status: 'waiting' | 'active' | 'completed';
  participants: LiveQuizParticipant[];
  currentQuestionIndex: number;
  startedAt?: string;
  endedAt?: string;
}

export interface LiveQuizParticipant {
  id: string;
  nickname: string;
  score: number;
  answers: {
    questionIndex: number;
    answer: number;
    timeMs: number;
  }[];
  joinedAt: string;
}