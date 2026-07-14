export type QuestionType =
  | 'multiple_choice'
  | 'matching'
  | 'labeling'
  | 'completion'
  | 'sentence_completion'
  | 'table_completion'
  | 'short_answer'
  | 'true_false_not_given'
  | 'yes_no_not_given'
  | 'matching_headings'
  | 'matching_features'
  | 'matching_sentence_endings';

export interface Question {
  id: string;
  type: QuestionType;
  number: number;
  text?: string;
  options?: string[]; // For multiple choice, matching headings etc
  answer: string | string[] | string[][]; // Single answer, variants, or multiple blanks with variants
  explanation?: string;
  tableData?: string[][]; // For table completion
  groupTitle?: string;
  groupInstructions?: string;
}

export interface Section {
  id: string;
  title: string;
  instructions: string;
  content: string; // The reading passage, or for listening this could be a placeholder or transcript
  audioUrl?: string; // For listening
  imageUrls?: string[]; // For diagrams/maps
  questions: Question[];
}

export interface Test {
  id: string;
  title: string;
  type: 'reading' | 'listening';
  durationMinutes: number;
  sections: Section[];
}

export interface WritingTask {
  id: string;
  taskNumber: 1 | 2;
  instructions: string;
  prompt: string;
  imageUrl?: string; // Often Task 1 has graphs/charts
  minimumWords: number;
}

export interface WritingTest {
  id: string;
  title: string;
  type: 'writing';
  durationMinutes: number;
  tasks: WritingTask[];
}

export interface TestResult {
  id?: string;
  userId: string;
  testId: string;
  testTitle: string;
  testType: 'reading' | 'listening' | 'writing';
  date: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string>; 
  questionPerformance?: {
    type: QuestionType;
    correct: boolean;
  }[];
}
