import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not defined in .env file');
  process.exit(1);
}

const client = new MongoClient(uri);

const sampleQuizzes = [
  {
    title: "Basic Navigation Quiz",
    description: "Test your knowledge of basic boat navigation",
    category: "Basic Navigation",
    questionCount: "5",
    questions: [
      {
        text: "What is the front of a boat called?",
        options: ["Bow", "Stern", "Port", "Starboard"],
        correctAnswer: 0
      },
      {
        text: "Which side of a boat is 'starboard'?",
        options: ["Left", "Right", "Front", "Back"],
        correctAnswer: 1
      }
    ]
  },
  {
    title: "Safety Quiz",
    description: "Essential safety knowledge for boating",
    category: "Safety",
    questionCount: "5",
    questions: [
      {
        text: "What color is the port navigation light?",
        options: ["Green", "White", "Red", "Blue"],
        correctAnswer: 2
      }
    ]
  }
];

async function initializeDb() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('quizDB');
    
    // Drop existing collections if they exist
    const collections = await database.listCollections().toArray();
    for (const collection of collections) {
      await database.collection(collection.name).drop();
    }
    
    // Create collections
    const quizzesCollection = database.collection('quizzes');
    const resultsCollection = database.collection('results');
    
    // Insert sample data
    await quizzesCollection.insertMany(sampleQuizzes);
    
    console.log('Database initialized successfully');
    
    // Verify data
    const quizCount = await quizzesCollection.countDocuments();
    console.log(`Number of quizzes in database: ${quizCount}`);
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

initializeDb();