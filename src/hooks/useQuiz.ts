import { useState, useCallback, useRef, useEffect } from 'react';
import type { QuizQuestion, QuizStats, QuestionRecord, FilterMode, QuizConfig } from '@/types/quiz';

const STORAGE_KEY = 'pub-quiz-stats-v2';

interface QuizState {
  currentIndex: number;
  selectedAnswers: Record<number, string[]>;
  checkedQuestions: Set<number>;
  correctQuestions: Set<number>;
  shuffled: boolean;
  shuffledOrder: number[];
  filteredPart: string | null;
  filteredChapter: string | null;
  filterMode: FilterMode;
  isReview: boolean;
  stats: QuizStats;
  questionStartTime: number | null;
  sessionStartTime: number | null;
  hasStarted: boolean;
}

function calculateMasteryThreshold(
  records: Record<number, QuestionRecord>,
  questions: QuizQuestion[],
  qType: 'single' | 'multiple'
): number {
  const averages: number[] = [];
  Object.entries(records).forEach(([qid, rec]) => {
    if (rec.answerTimes.length === 0) return;
    const q = questions.find((qq) => qq.id === Number(qid));
    if (!q || q.type !== qType) return;
    const avg = rec.answerTimes.reduce((a, b) => a + b, 0) / rec.answerTimes.length;
    averages.push(avg);
  });

  if (averages.length === 0) return 0;
  averages.sort((a, b) => a - b);
  const top10 = averages.slice(0, 10);
  const threshold = top10.reduce((a, b) => a + b, 0) / top10.length;
  return Math.round(threshold * 10) / 10;
}

function loadStats(): QuizStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        singleChoiceMasteryThreshold: parsed.singleChoiceMasteryThreshold ?? 0,
        multipleChoiceMasteryThreshold: parsed.multipleChoiceMasteryThreshold ?? 0,
        singleChoiceAvgTime: parsed.singleChoiceAvgTime ?? 0,
        multipleChoiceAvgTime: parsed.multipleChoiceAvgTime ?? 0,
        records: parsed.records ?? {},
      };
    }
  } catch {
    // ignore
  }
  return {
    singleChoiceMasteryThreshold: 0,
    multipleChoiceMasteryThreshold: 0,
    singleChoiceAvgTime: 0,
    multipleChoiceAvgTime: 0,
    records: {},
  };
}

function saveStats(stats: QuizStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

function getDefaultState(): QuizState {
  return {
    currentIndex: 0,
    selectedAnswers: {},
    checkedQuestions: new Set(),
    correctQuestions: new Set(),
    shuffled: false,
    shuffledOrder: [],
    filteredPart: null,
    filteredChapter: null,
    filterMode: 'all',
    isReview: false,
    stats: loadStats(),
    questionStartTime: null,
    sessionStartTime: null,
    hasStarted: false,
  };
}

export function useQuiz(questions: QuizQuestion[]) {
  const [state, setState] = useState<QuizState>(getDefaultState());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveStats(state.stats);
  }, [state.stats]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!state.sessionStartTime) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [state.sessionStartTime]);

  const getElapsedSeconds = useCallback((): number => {
    if (!stateRef.current.sessionStartTime) return 0;
    return Math.floor((Date.now() - stateRef.current.sessionStartTime) / 1000);
  }, []);

  const getFilteredQuestions = useCallback(() => {
    return questions.filter((q) => {
      if (stateRef.current.filteredPart && q.part !== stateRef.current.filteredPart) return false;
      if (stateRef.current.filteredChapter && q.chapter !== stateRef.current.filteredChapter) return false;
      const mode = stateRef.current.filterMode;
      if (mode === 'wrong') {
        const record = stateRef.current.stats.records[q.id];
        return record?.lastCorrect === false;
      }
      if (mode === 'favorite') {
        const record = stateRef.current.stats.records[q.id];
        return record?.isFavorite ?? false;
      }
      if (stateRef.current.isReview && mode === 'all') {
        const record = stateRef.current.stats.records[q.id];
        return (record?.answerTimes.length ?? 0) > 0;
      }
      return true;
    });
  }, [questions]);

  const filteredQuestions = getFilteredQuestions();
  const totalQuestions = filteredQuestions.length;

  const displayQuestions = state.shuffled && state.shuffledOrder.length > 0
    ? state.shuffledOrder
        .map((id) => filteredQuestions.find((q) => q.id === id))
        .filter((q): q is QuizQuestion => q !== undefined)
    : filteredQuestions;

  const currentQuestion = displayQuestions[state.currentIndex] || null;

  const startPractice = useCallback((config: QuizConfig) => {
    const filterMode: FilterMode =
      config.mode === 'review'
        ? config.reviewSource === 'wrong'
          ? 'wrong'
          : config.reviewSource === 'favorite'
            ? 'favorite'
            : 'all'
        : 'all';
    setState((prev) => ({
      ...prev,
      filteredPart: config.part,
      filteredChapter: config.chapter,
      filterMode,
      isReview: config.mode === 'review',
      hasStarted: true,
      sessionStartTime: Date.now(),
      currentIndex: 0,
      selectedAnswers: {},
      checkedQuestions: new Set(),
      correctQuestions: new Set(),
      questionStartTime: Date.now(),
    }));
  }, []);

  const startQuestionTimer = useCallback(() => {
    setState((prev) => ({ ...prev, questionStartTime: Date.now() }));
  }, []);

  const selectOption = useCallback((questionId: number, optionKey: string, isMultiple: boolean) => {
    setState((prev) => {
      const current = prev.selectedAnswers[questionId] || [];
      let next: string[];
      if (isMultiple) {
        if (current.includes(optionKey)) {
          next = current.filter((k) => k !== optionKey);
        } else {
          next = [...current, optionKey].sort();
        }
      } else {
        next = [optionKey];
      }
      return {
        ...prev,
        selectedAnswers: { ...prev.selectedAnswers, [questionId]: next },
      };
    });
  }, []);

  const checkAnswer = useCallback((questionId: number) => {
    const q = questions.find((q) => q.id === questionId);
    if (!q) return;
    const selected = stateRef.current.selectedAnswers[questionId] || [];
    const correct =
      selected.length === q.answer_letters.length &&
      selected.every((letter) => q.answer_letters.includes(letter));

    let answerTime: number | null = null;
    const startTime = stateRef.current.questionStartTime;
    if (startTime) {
      const elapsed = (Date.now() - startTime) / 1000;
      if (selected.length > 0 && elapsed <= 120) {
        answerTime = Math.round(elapsed * 10) / 10;
      }
    }

    setState((prev) => {
      const newChecked = new Set(prev.checkedQuestions);
      newChecked.add(questionId);
      const newCorrect = new Set(prev.correctQuestions);
      if (correct) newCorrect.add(questionId);
      else newCorrect.delete(questionId);

      const newStats = { ...prev.stats };
      const records = { ...newStats.records };
      const existing = records[questionId] ?? { answerTimes: [], lastAnswerTime: null, lastCorrect: null, isFavorite: false };
      const updatedRecord: QuestionRecord = {
        ...existing,
        lastAnswerTime: answerTime ?? existing.lastAnswerTime,
        lastCorrect: correct,
      };
      if (answerTime !== null) {
        updatedRecord.answerTimes = [...existing.answerTimes, answerTime];
      }
      records[questionId] = updatedRecord;
      newStats.records = records;

      newStats.singleChoiceMasteryThreshold = calculateMasteryThreshold(records, questions, 'single');
      newStats.multipleChoiceMasteryThreshold = calculateMasteryThreshold(records, questions, 'multiple');

      const singleTimes: number[] = [];
      const multiTimes: number[] = [];
      Object.entries(records).forEach(([qid, rec]) => {
        const question = questions.find((qq) => qq.id === Number(qid));
        if (!question || rec.answerTimes.length === 0) return;
        const avg = rec.answerTimes.reduce((a, b) => a + b, 0) / rec.answerTimes.length;
        if (question.type === 'single') singleTimes.push(avg);
        else if (question.type === 'multiple') multiTimes.push(avg);
      });

      newStats.singleChoiceAvgTime = singleTimes.length > 0
        ? Math.round((singleTimes.reduce((a, b) => a + b, 0) / singleTimes.length) * 10) / 10
        : 0;
      newStats.multipleChoiceAvgTime = multiTimes.length > 0
        ? Math.round((multiTimes.reduce((a, b) => a + b, 0) / multiTimes.length) * 10) / 10
        : 0;

      return {
        ...prev,
        checkedQuestions: newChecked,
        correctQuestions: newCorrect,
        stats: newStats,
        questionStartTime: null,
      };
    });
  }, [questions]);

  const goToQuestion = useCallback((index: number) => {
    setState((prev) => ({ ...prev, currentIndex: Math.max(0, Math.min(index, totalQuestions - 1)) }));
  }, [totalQuestions]);

  const goNext = useCallback(() => {
    setState((prev) => ({ ...prev, currentIndex: Math.min(prev.currentIndex + 1, totalQuestions - 1) }));
  }, [totalQuestions]);

  const goPrev = useCallback(() => {
    setState((prev) => ({ ...prev, currentIndex: Math.max(prev.currentIndex - 1, 0) }));
  }, []);

  const resetQuiz = useCallback(() => {
    setState({
      ...getDefaultState(),
      stats: loadStats(),
    });
  }, []);

  const shuffleQuestions = useCallback(() => {
    setState((prev) => {
      const willShuffle = !prev.shuffled;
      if (willShuffle) {
        const ids = getFilteredQuestions().map((q) => q.id);
        const shuffledIds = [...ids].sort(() => Math.random() - 0.5);
        return { ...prev, shuffled: true, shuffledOrder: shuffledIds, currentIndex: 0 };
      }
      return { ...prev, shuffled: false, shuffledOrder: [], currentIndex: 0 };
    });
  }, [getFilteredQuestions]);

  const setFilterMode = useCallback((mode: FilterMode) => {
    setState((prev) => ({
      ...prev,
      filterMode: mode,
      currentIndex: 0,
      shuffled: false,
      shuffledOrder: [],
    }));
  }, []);

  const toggleFavorite = useCallback((questionId: number) => {
    setState((prev) => {
      const newStats = { ...prev.stats };
      const records = { ...newStats.records };
      const existing = records[questionId] ?? { answerTimes: [], lastAnswerTime: null, lastCorrect: null, isFavorite: false };
      records[questionId] = { ...existing, isFavorite: !existing.isFavorite };
      newStats.records = records;
      return { ...prev, stats: newStats };
    });
  }, []);

  const clearAllStats = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({
      ...prev,
      stats: {
        singleChoiceMasteryThreshold: 0,
        multipleChoiceMasteryThreshold: 0,
        singleChoiceAvgTime: 0,
        multipleChoiceAvgTime: 0,
        records: {},
      },
      checkedQuestions: new Set(),
      correctQuestions: new Set(),
      selectedAnswers: {},
    }));
  }, []);

  return {
    state,
    currentQuestion,
    totalQuestions,
    displayQuestions,
    getElapsedSeconds,
    selectOption,
    checkAnswer,
    goToQuestion,
    goNext,
    goPrev,
    resetQuiz,
    shuffleQuestions,
    startPractice,
    setFilterMode,
    startQuestionTimer,
    toggleFavorite,
    clearAllStats,
  };
}
