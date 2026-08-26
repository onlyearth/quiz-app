import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, GraduationCap, Play, RotateCcw, BookX, BookMarked, Clock, BarChart3 } from 'lucide-react';
import type { QuizQuestion, QuizConfig, ReviewSource, QuizStats } from '@/types/quiz';

interface StartScreenProps {
  questions: QuizQuestion[];
  stats: QuizStats;
  onStart: (config: QuizConfig) => void;
}

export default function StartScreen({ questions, stats, onStart }: StartScreenProps) {
  const [mode, setMode] = useState<'practice' | 'review'>('practice');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [reviewSource, setReviewSource] = useState<ReviewSource>('wrong');

  const parts = useMemo(() => Array.from(new Set(questions.map((q) => q.part))), [questions]);

  const chapters = useMemo(() => {
    return Array.from(
      new Set(
        questions
          .filter((q) => !selectedPart || q.part === selectedPart)
          .map((q) => q.chapter)
      )
    );
  }, [questions, selectedPart]);

  // Calculate chapter-level stats for review mode
  const chapterStats = useMemo(() => {
    const result: Record<string, { total: number; favorite: number; answered: number }> = {};
    questions.forEach((q) => {
      if (!result[q.chapter]) {
        result[q.chapter] = { total: 0, favorite: 0, answered: 0 };
      }
      result[q.chapter].total++;
      const record = stats.records[q.id];
      if (record) {
        if (record.answerTimes.length > 0) result[q.chapter].answered++;
        if (record.isFavorite) result[q.chapter].favorite++;
      }
    });
    return result;
  }, [questions, stats]);

  // Overall review stats
  const reviewStats = useMemo(() => {
    let favoriteCount = 0;
    let answeredCount = 0;
    questions.forEach((q) => {
      const record = stats.records[q.id];
      if (record) {
        if (record.answerTimes.length > 0) answeredCount++;
        if (record.isFavorite) favoriteCount++;
      }
    });
    return { favoriteCount, answeredCount };
  }, [questions, stats]);

  const filteredCount = useMemo(() => {
    if (mode === 'practice') {
      return questions.filter((q) => {
        if (selectedPart && q.part !== selectedPart) return false;
        if (selectedChapter && q.chapter !== selectedChapter) return false;
        return true;
      }).length;
    }
    // Review mode: count based on source
    return questions.filter((q) => {
      if (selectedPart && q.part !== selectedPart) return false;
      if (selectedChapter && q.chapter !== selectedChapter) return false;
      const record = stats.records[q.id];
      if (reviewSource === 'wrong' || reviewSource === 'all') {
        return (record?.answerTimes.length ?? 0) > 0;
      }
      if (reviewSource === 'favorite') {
        return record?.isFavorite ?? false;
      }
      return true;
    }).length;
  }, [questions, selectedPart, selectedChapter, mode, reviewSource, stats]);

  const handleStart = () => {
    onStart({
      mode,
      part: selectedPart,
      chapter: selectedChapter,
      reviewSource: mode === 'review' ? reviewSource : 'all',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center justify-center gap-2">
            <GraduationCap className="w-8 h-8" />
            出版专业资格考试互动练习
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            共 {questions.length} 道题目 · 基础 + 实务
          </p>
        </div>

        {/* Mode Switch */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-full shadow-sm border p-1 flex">
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'practice'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setMode('practice')}
            >
              练习模式
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'review'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setMode('review')}
            >
              复习模式
            </button>
          </div>
        </div>

        {mode === 'practice' ? (
          <>
            {/* Part Selection */}
            <Card className="mb-4 shadow-md border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  选择科目
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedPart === null ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => { setSelectedPart(null); setSelectedChapter(null); }}
                  >
                    全部科目
                  </Badge>
                  {parts.map((part) => (
                    <Badge
                      key={part}
                      variant={selectedPart === part ? 'default' : 'outline'}
                      className="cursor-pointer text-sm py-1.5 px-3"
                      onClick={() => { setSelectedPart(part); setSelectedChapter(null); }}
                    >
                      {part === '基础' ? '出版专业基础' : '出版专业实务'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chapter Selection */}
            <Card className="mb-6 shadow-md border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  选择章节
                  {selectedPart && (
                    <span className="text-xs font-normal text-muted-foreground">
                      （{selectedPart === '基础' ? '出版专业基础' : '出版专业实务'}）
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedChapter === null ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => setSelectedChapter(null)}
                  >
                    全部章节
                  </Badge>
                  {chapters.map((ch) => {
                    const info = chapterStats[ch];
                    return (
                      <Badge
                        key={ch}
                        variant={selectedChapter === ch ? 'default' : 'outline'}
                        className="cursor-pointer text-sm py-1.5 px-3"
                        onClick={() => setSelectedChapter(ch)}
                      >
                        {ch}
                        <span className="ml-1 text-xs opacity-70">({info?.total ?? 0}题)</span>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Review Source Selection */}
            <Card className="mb-4 shadow-md border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  复习来源
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={reviewSource === 'wrong' ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => setReviewSource('wrong')}
                  >
                    <BookX className="w-3.5 h-3.5 mr-1" />
                    错题本
                    <span className="ml-1 text-xs opacity-70">({reviewStats.answeredCount}题)</span>
                  </Badge>
                  <Badge
                    variant={reviewSource === 'favorite' ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => setReviewSource('favorite')}
                  >
                    <BookMarked className="w-3.5 h-3.5 mr-1" />
                    收藏夹
                    <span className="ml-1 text-xs opacity-70">({reviewStats.favoriteCount}题)</span>
                  </Badge>
                  <Badge
                    variant={reviewSource === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => setReviewSource('all')}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    全部已答
                    <span className="ml-1 text-xs opacity-70">({reviewStats.answeredCount}题)</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Chapter Filter for Review */}
            <Card className="mb-4 shadow-md border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  章节筛选（可选）
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedChapter === null ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => setSelectedChapter(null)}
                  >
                    全部章节
                  </Badge>
                  {chapters.map((ch) => {
                    const info = chapterStats[ch];
                    const sourceCount =
                      reviewSource === 'favorite'
                        ? info?.favorite ?? 0
                        : info?.answered ?? 0;
                    return (
                      <Badge
                        key={ch}
                        variant={selectedChapter === ch ? 'default' : 'outline'}
                        className="cursor-pointer text-sm py-1.5 px-3"
                        onClick={() => setSelectedChapter(ch)}
                      >
                        {ch}
                        <span className="ml-1 text-xs opacity-70">({sourceCount}题)</span>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Summary & Start */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">
                  {mode === 'practice' ? '本次练习' : '本次复习'}
                </p>
                <p className="text-2xl font-bold mt-1">{filteredCount} 道题目</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs opacity-70">
                  {mode === 'practice' ? (
                    <>
                      {selectedPart && <span>{selectedPart === '基础' ? '出版专业基础' : '出版专业实务'}</span>}
                      {selectedChapter && <span>· {selectedChapter}</span>}
                      {!selectedPart && !selectedChapter && <span>全部题目</span>}
                    </>
                  ) : (
                    <>
                      {reviewSource === 'wrong' && <span>错题本</span>}
                      {reviewSource === 'favorite' && <span>收藏夹</span>}
                      {reviewSource === 'all' && <span>全部已答</span>}
                      {selectedChapter && <span>· {selectedChapter}</span>}
                    </>
                  )}
                </div>
              </div>
              <Button
                size="lg"
                className="bg-white text-slate-800 hover:bg-slate-100 font-bold px-6"
                onClick={handleStart}
                disabled={filteredCount === 0}
              >
                <Play className="w-5 h-5 mr-2" />
                {mode === 'practice' ? '开始练习' : '开始复习'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-6 text-xs text-muted-foreground text-center space-y-1">
          <p>💡 答题时间将被记录，用于分析掌握情况</p>
          <p>💡 单选题和多选题分别统计，颜色标识不同</p>
          <p>💡 超过2分钟未作答将不记录用时</p>
        </div>
      </div>
    </div>
  );
}
