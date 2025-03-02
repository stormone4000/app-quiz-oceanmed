import { generateTestData } from './generateTestData.js';

const run = async () => {
  try {
    await generateTestData();
    console.log('Test data generation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error generating test data:', error);
    process.exit(1);
  }
};

run();