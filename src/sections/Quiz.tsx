import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Shuffle,
  Filter,
  BookOpen,
  GraduationCap,
  Heart,
  Clock,
  BarChart3,
  Trash2,
  BookX,
  BookMarked,
  ArrowLeft,
  Timer,
} from 'lucide-react';
import type { QuizQuestion, FilterMode } from '@/types/quiz';

interface QuizProps {
  questions: QuizQuestion[];
  quiz: any;
  onBack: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s.toString().padStart(2, '0')}秒`;
}

function getMasteryInfo(
  q: QuizQuestion,
  stats: any,
  checked: boolean,
  correct: boolean
): { color: string; textColor: string; label: string } {
  if (!checked) {
    return { color: 'rgb(148, 163, 184)', textColor: 'white', label: '未答' };
  }
  if (!correct) {
    return { color: 'rgb(239, 68, 68)', textColor: 'white', label: '错误' };
  }

  const record = stats.records[q.id];
  if (!record || record.answerTimes.length === 0) {
    return q.type === 'single'
      ? { color: 'rgb(34, 197, 94)', textColor: 'white', label: '正确' }
      : { color: 'rgb(59, 130, 246)', textColor: 'white', label: '正确' };
  }

  const lastTime = record.answerTimes[record.answerTimes.length - 1];
  const threshold = q.type === 'single'
    ? stats.singleChoiceMasteryThreshold
    : stats.multipleChoiceMasteryThreshold;

  if (threshold <= 0) {
    return q.type === 'single'
      ? { color: 'rgb(34, 197, 94)', textColor: 'white', label: '正确' }
      : { color: 'rgb(59, 130, 246)', textColor: 'white', label: '正确' };
  }

  if (lastTime <= threshold) {
    return q.type === 'single'
      ? { color: 'rgb(34, 197, 94)', textColor: 'white', label: '已掌握' }
      : { color: 'rgb(59, 130, 246)', textColor: 'white', label: '已掌握' };
  }

  return q.type === 'single'
    ? { color: 'rgb(134, 239, 172)', textColor: 'rgb(21, 83, 45)', label: '需巩固' }
    : { color: 'rgb(147, 197, 253)', textColor: 'rgb(30, 64, 175)', label: '需巩固' };
}

export default function Quiz({ questions, quiz, onBack }: QuizProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);

  const {
    state,
    currentQuestion,
    totalQuestions,
    displayQuestions,
    getElapsedSeconds,
    selectOption,
    checkAnswer,
    goNext,
    goPrev,
    goToQuestion,
    resetQuiz,
    shuffleQuestions,
    setFilterMode,
    startQuestionTimer,
    toggleFavorite,
    clearAllStats,
  } = quiz;

  // Update elapsed display every second
  useEffect(() => {
    if (!state.sessionStartTime) return;
    const interval = setInterval(() => {
      setElapsedDisplay(getElapsedSeconds());
    }, 1000);
    setElapsedDisplay(getElapsedSeconds());
    return () => clearInterval(interval);
  }, [state.sessionStartTime, getElapsedSeconds]);

  // Start timer when question changes
  useEffect(() => {
    if (currentQuestion && state.hasStarted) {
      startQuestionTimer();
    }
  }, [currentQuestion?.id, state.hasStarted]);

  const parts = Array.from(new Set(questions.map((q) => q.part)));
  const chapters = Array.from(
    new Set(
      questions
        .filter((q) => !state.filteredPart || q.part === state.filteredPart)
        .map((q) => q.chapter)
    )
  );

  const filterModes: { key: FilterMode; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: '全部', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { key: 'wrong', label: '错题本', icon: <BookX className="w-3.5 h-3.5" /> },
    { key: 'favorite', label: '收藏夹', icon: <BookMarked className="w-3.5 h-3.5" /> },
  ];

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">暂无符合条件的题目</p>
          <Button onClick={() => setFilterMode('all')}>返回全部题目</Button>
        </div>
      </div>
    );
  }

  const isChecked = currentQuestion ? state.checkedQuestions.has(currentQuestion.id) : false;
  const isCorrect = currentQuestion ? state.correctQuestions.has(currentQuestion.id) : false;
  const selected = currentQuestion ? state.selectedAnswers[currentQuestion.id] || [] : [];
  const isFavorite = currentQuestion ? (state.stats.records[currentQuestion.id]?.isFavorite ?? false) : false;

  const currentRecord = currentQuestion ? state.stats.records[currentQuestion.id] : null;
  const masteryThreshold = currentQuestion
    ? (currentQuestion.type === 'single'
        ? state.stats.singleChoiceMasteryThreshold
        : state.stats.multipleChoiceMasteryThreshold)
    : 0;
  const lastAnswerTime = currentRecord?.lastAnswerTime ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4 px-3 sm:py-6 sm:px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
            <GraduationCap className="w-6 h-6" />
            出版专业资格考试互动练习
          </h1>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              本次用时：{formatElapsed(elapsedDisplay)}
            </span>
            <span className="text-xs text-muted-foreground">
              进度 {state.currentIndex + 1} / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-auto py-1 px-2" onClick={onBack}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                返回
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                {state.correctQuestions.size}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="w-4 h-4" />
                {state.checkedQuestions.size - state.correctQuestions.size}
              </span>
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                分析
              </button>
            </div>
          </div>
          <Progress value={((state.currentIndex + 1) / totalQuestions) * 100} className="h-2" />
        </div>

        {/* Stats Panel */}
        {showStats && (
          <Card className="mb-4">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  答题时间分析
                </h3>
                <Button variant="ghost" size="sm" className="text-xs text-red-500 h-auto py-1 px-2" onClick={clearAllStats}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  清除记录
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-medium">单选题掌握标准</p>
                  <p className="text-lg font-bold text-emerald-800">
                    {state.stats.singleChoiceMasteryThreshold > 0 ? `≤ ${state.stats.singleChoiceMasteryThreshold}秒` : '无数据'}
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">
                    平均：{state.stats.singleChoiceAvgTime > 0 ? `${state.stats.singleChoiceAvgTime}秒` : '--'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">多选题掌握标准</p>
                  <p className="text-lg font-bold text-blue-800">
                    {state.stats.multipleChoiceMasteryThreshold > 0 ? `≤ ${state.stats.multipleChoiceMasteryThreshold}秒` : '无数据'}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    平均：{state.stats.multipleChoiceAvgTime > 0 ? `${state.stats.multipleChoiceAvgTime}秒` : '--'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> 单选已掌握</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-300" /> 单选需巩固</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> 多选已掌握</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-300" /> 多选需巩固</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> 错误</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400" /> 未答</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filterModes.map((mode) => (
            <Button
              key={mode.key}
              variant={state.filterMode === mode.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode(mode.key)}
              className="text-xs"
            >
              {mode.icon}
              <span className="ml-1">{mode.label}</span>
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className="text-xs"
          >
            <Filter className="w-3.5 h-3.5 mr-1" />
            筛选
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shuffleQuestions}
            className="text-xs"
          >
            <Shuffle className="w-3.5 h-3.5 mr-1" />
            {state.shuffled ? '恢复顺序' : '随机顺序'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetQuiz}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            重置
          </Button>
        </div>

        {showFilter && (
          <Card className="mb-4">
            <CardContent className="p-3 sm:p-4">
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">科目</p>
                <div className="flex flex-wrap gap-2">
                  {parts.map((part) => (
                    <Badge
                      key={part}
                      variant={state.filteredPart === part ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                    >
                      {part === '基础' ? '出版专业基础' : '出版专业实务'}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">章节</p>
                <div className="flex flex-wrap gap-2">
                  {chapters.map((ch) => (
                    <Badge
                      key={ch}
                      variant={state.filteredChapter === ch ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                    >
                      {ch}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        {currentQuestion && (
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {currentQuestion.part === '基础' ? '基础' : '实务'}
                </Badge>
                <Badge variant="secondary" className="text-xs">{currentQuestion.chapter}</Badge>
                <Badge variant="secondary" className="text-xs">{currentQuestion.section}</Badge>
                <Badge
                  variant={currentQuestion.type === 'single' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {currentQuestion.type === 'single' ? '单选题' : '多选题'}
                </Badge>
                <button
                  onClick={() => toggleFavorite(currentQuestion.id)}
                  className="ml-auto p-1 rounded-md hover:bg-slate-100 transition-colors"
                  title={isFavorite ? '取消收藏' : '收藏题目'}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>
              <CardTitle className="text-base sm:text-lg font-medium leading-relaxed text-slate-800">
                <span className="text-muted-foreground mr-2">#{currentQuestion.id}</span>
                {currentQuestion.stem}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options.map((opt: { key: string; text: string }) => {
                  const isSelected = selected.includes(opt.key);
                  const isAnswer = currentQuestion.answer_letters.includes(opt.key);
                  let btnVariant: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' = 'outline';
                  let btnClass = '';

                  if (isChecked) {
                    if (isAnswer) {
                      btnVariant = 'default';
                      btnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600';
                    } else if (isSelected && !isAnswer) {
                      btnVariant = 'destructive';
                    } else {
                      btnVariant = 'ghost';
                      btnClass = 'opacity-50';
                    }
                  } else if (isSelected) {
                    btnVariant = 'default';
                  }

                  return (
                    <Button
                      key={opt.key}
                      variant={btnVariant}
                      className={`w-full justify-start text-left items-start h-auto py-3 px-4 text-sm sm:text-base whitespace-normal leading-relaxed ${btnClass}`}
                      onClick={() =>
                        !isChecked &&
                        selectOption(currentQuestion.id, opt.key, currentQuestion.type === 'multiple')
                      }
                      disabled={isChecked}
                    >
                      <span className="font-bold mr-3 shrink-0 w-6 text-center">{opt.key}.</span>
                      <span className="break-words">{opt.text}</span>
                      {isChecked && isAnswer && (
                        <CheckCircle2 className="w-5 h-5 ml-auto shrink-0 text-white" />
                      )}
                      {isChecked && isSelected && !isAnswer && (
                        <XCircle className="w-5 h-5 ml-auto shrink-0" />
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Answer Check */}
              {!isChecked ? (
                <div className="mt-4 sm:mt-6">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={selected.length === 0}
                    onClick={() => checkAnswer(currentQuestion.id)}
                  >
                    提交答案
                  </Button>
                </div>
              ) : (
                <div className="mt-4 sm:mt-6 space-y-3">
                  <div
                    className={`p-3 sm:p-4 rounded-lg flex items-start gap-3 ${
                      isCorrect
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`font-semibold text-sm sm:text-base ${
                          isCorrect ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isCorrect ? '回答正确！' : '回答错误'}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        正确答案：<span className="font-bold">{currentQuestion.answer}</span>
                      </p>
                      {lastAnswerTime !== null && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            本次用时：{lastAnswerTime}秒
                          </span>
                          {masteryThreshold > 0 && (
                            <span className={`flex items-center gap-1 ${
                              lastAnswerTime <= masteryThreshold
                                ? currentQuestion.type === 'single' ? 'text-emerald-600' : 'text-blue-600'
                                : 'text-amber-600'
                            }`}>
                              掌握标准：≤{masteryThreshold}秒
                              {lastAnswerTime <= masteryThreshold ? '（已掌握）' : '（需巩固）'}
                            </span>
                          )}
                          {currentRecord && currentRecord.answerTimes.length > 1 && (
                            <span className="text-slate-400">
                              已练习{currentRecord.answerTimes.length}次
                            </span>
                          )}
                        </div>
                      )}
                      {lastAnswerTime === null && (
                        <p className="text-xs text-amber-600 mt-2">
                          答题时间超过2分钟，未记录用时
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 sm:mt-6 gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={goPrev}
            disabled={state.currentIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            上一题
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={goNext}
            disabled={state.currentIndex === totalQuestions - 1}
            className="flex-1"
          >
            下一题
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>

        {/* Question Grid Navigator with Mastery Colors */}
        <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow-sm border p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">题目导航 · 掌握度</p>
          <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
            {displayQuestions.map((q: QuizQuestion, i: number) => {
              const isCurrent = i === state.currentIndex;
              const checked = state.checkedQuestions.has(q.id);
              const correct = state.correctQuestions.has(q.id);
              const mastery = getMasteryInfo(q, state.stats, checked, correct);

              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(i)}
                  title={`${q.chapter} ${q.section} · ${mastery.label}`}
                  className={`aspect-square rounded-md text-xs font-medium flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'ring-2 ring-primary ring-offset-1 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: isCurrent ? undefined : mastery.color,
                    color: isCurrent ? undefined : mastery.textColor,
                  }}
                >
                  {isCurrent ? (
                    <span className="bg-primary text-primary-foreground w-full h-full rounded-md flex items-center justify-center">
                      {i + 1}
                    </span>
                  ) : (
                    i + 1
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> 单选已掌握</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-300" /> 单选需巩固</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> 多选已掌握</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-300" /> 多选需巩固</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> 错误</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400" /> 未答</span>
        </div>
      </div>
    </div>
  );
}
