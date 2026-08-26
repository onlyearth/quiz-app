import { useState, useEffect } from 'react';
import type { QuizQuestion, QuizConfig } from '@/types/quiz';
import StartScreen from '@/sections/StartScreen';
import Quiz from '@/sections/Quiz';
import { useQuiz } from '@/hooks/useQuiz';

export default function Home() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quiz = useQuiz(questions);

  useEffect(() => {
    fetch('/quiz_data.json')
      .then((res) => res.json())
      .then((data: QuizQuestion[]) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch(() => {
        setError('加载题目失败，请刷新页面重试');
        setLoading(false);
      });
  }, []);

  const handleStart = (config: QuizConfig) => {
    quiz.startPractice(config);
  };

  const handleBack = () => {
    quiz.resetQuiz();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">正在加载题目...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-600 underline">刷新页面</button>
        </div>
      </div>
    );
  }

  if (!quiz.state.hasStarted) {
    return <StartScreen questions={questions} stats={quiz.state.stats} onStart={handleStart} />;
  }

  return <Quiz questions={questions} quiz={quiz} onBack={handleBack} />;
}
