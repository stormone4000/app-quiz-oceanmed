import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://marcosrenatobruno:kndQTgqVqW4Zjnvl@cluster0ocean.z5dzr.mongodb.net/quizDB?retryWrites=true&w=majority&appName=Cluster0OCEAN';
const client = new MongoClient(uri);

interface QuizDocument {
  _id: string;
  title: string;
  description: string;
  questions: {
    text: string;
    options: string[];
    correctAnswer: number;
  }[];
  category: string;
  questionCount: string;
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  timeLimit?: number;
}

interface QuizResult {
  user: {
    name: string;
    surname: string;
  };
  score: number;
  totalQuestions: number;
  results: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
  quizTitle: string;
}

export async function getQuestions(): Promise<Question[]> {
  try {
    await client.connect();
    const database = client.db('quizDB');
    const collection = database.collection('quizzes');
    
    const quizzes = await collection.find({}).toArray();
    
    const allQuestions = quizzes.flatMap((quiz: QuizDocument) => 
      quiz.questions.map((q, index) => ({
        id: index,
        question: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: quiz.category,
        timeLimit: 30
      }))
    );
    
    return allQuestions;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return [];
  } finally {
    await client.close();
  }
}

export async function saveQuizResult(result: QuizResult): Promise<void> {
  try {
    await client.connect();
    const database = client.db('quizDB');
    const collection = database.collection('results');
    
    await collection.insertOne(result);
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  } finally {
    await client.close();
  }
}

export async function getQuizResults(): Promise<QuizResult[]> {
  try {
    await client.connect();
    const database = client.db('quizDB');
    const collection = database.collection('results');
    
    return await collection.find({}).toArray();
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return [];
  } finally {
    await client.close();
  }
}