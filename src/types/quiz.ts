export interface QuizOption {
  key: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  part: string;
  chapter: string;
  section: string;
  table_num: string;
  type: 'single' | 'multiple' | 'unknown';
  stem: string;
  options: QuizOption[];
  answer: string;
  answer_letters: string[];
}

export interface QuestionRecord {
  answerTimes: number[];
  lastAnswerTime: number | null;
  lastCorrect: boolean | null;
  isFavorite: boolean;
}

export interface QuizStats {
  singleChoiceMasteryThreshold: number;
  multipleChoiceMasteryThreshold: number;
  singleChoiceAvgTime: number;
  multipleChoiceAvgTime: number;
  records: Record<number, QuestionRecord>;
}

export type FilterMode = 'all' | 'wrong' | 'favorite';
export type ReviewSource = 'wrong' | 'favorite' | 'all';

export interface QuizConfig {
  mode: 'practice' | 'review';
  part: string | null;
  chapter: string | null;
  reviewSource: ReviewSource;
}
