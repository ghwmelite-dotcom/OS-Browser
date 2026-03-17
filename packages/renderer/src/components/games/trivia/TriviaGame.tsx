// ── Trivia Quiz Game ─────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { pickQuestions, type TriviaQuestion } from './triviaQuestions';
import { gameSounds } from '../GameSoundEngine';

const QUESTIONS_PER_GAME = 10;
const TIME_PER_QUESTION = 15;
const POINTS_CORRECT = 10;
const MAX_SPEED_BONUS = 5;

type AnswerState = 'unanswered' | 'correct' | 'wrong';

interface QuestionResult {
  question: TriviaQuestion;
  answered: number | null;
  correct: boolean;
  timeTaken: number;
  points: number;
}

export const TriviaGame: React.FC = () => {
  const [questions, setQuestions] = useState<TriviaQuestion[]>(() => pickQuestions(QUESTIONS_PER_GAME));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showFunFact, setShowFunFact] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const current = questions[currentIdx];

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (answerState !== 'unanswered' || gameOver) return;
    startTimeRef.current = Date.now();
    setTimeLeft(TIME_PER_QUESTION);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // Time's up — count as wrong
          handleAnswer(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, gameOver]);

  // ── Answer handler ─────────────────────────────────────────────────
  const handleAnswer = useCallback(
    (optionIdx: number) => {
      if (answerState !== 'unanswered') return;
      if (timerRef.current) clearInterval(timerRef.current);

      const timeTaken = (Date.now() - startTimeRef.current) / 1000;
      const isCorrect = optionIdx === current.correctIndex;
      const speedBonus = isCorrect && timeTaken < 3 ? MAX_SPEED_BONUS : isCorrect ? Math.max(0, Math.round(MAX_SPEED_BONUS * (1 - timeTaken / TIME_PER_QUESTION))) : 0;
      const points = isCorrect ? POINTS_CORRECT + speedBonus : 0;

      setSelectedOption(optionIdx);
      setAnswerState(isCorrect ? 'correct' : 'wrong');
      setScore((s) => s + points);
      setShowFunFact(!!current.funFact);

      if (isCorrect) {
        gameSounds.score();
      } else {
        gameSounds.error();
      }

      setResults((r) => [
        ...r,
        {
          question: current,
          answered: optionIdx >= 0 ? optionIdx : null,
          correct: isCorrect,
          timeTaken,
          points,
        },
      ]);
    },
    [answerState, current],
  );

  // ── Next question ──────────────────────────────────────────────────
  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= QUESTIONS_PER_GAME) {
      setGameOver(true);
      gameSounds.win();
      return;
    }
    setCurrentIdx((i) => i + 1);
    setAnswerState('unanswered');
    setSelectedOption(null);
    setShowFunFact(false);
  }, [currentIdx]);

  // ── Restart ────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    setQuestions(pickQuestions(QUESTIONS_PER_GAME));
    setCurrentIdx(0);
    setTimeLeft(TIME_PER_QUESTION);
    setAnswerState('unanswered');
    setSelectedOption(null);
    setResults([]);
    setScore(0);
    setGameOver(false);
    setShowFunFact(false);
  }, []);

  // ── Timer bar color ────────────────────────────────────────────────
  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor = timerPct > 50 ? '#4CAF50' : timerPct > 25 ? '#FFC107' : '#F44336';

  // ── Styles ─────────────────────────────────────────────────────────
  const container: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(8px, 2vw, 16px)',
    width: '100%',
    maxWidth: 600,
    padding: 'clamp(8px, 2vw, 16px)',
    color: '#FAF6EE',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const card: React.CSSProperties = {
    width: '100%',
    padding: 'clamp(12px, 3vw, 24px)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  const optionBtn = (idx: number): React.CSSProperties => {
    let bg = 'rgba(255,255,255,0.06)';
    let border = '1px solid rgba(255,255,255,0.12)';
    let color = '#FAF6EE';

    if (answerState !== 'unanswered') {
      if (idx === current.correctIndex) {
        bg = 'rgba(76,175,80,0.25)';
        border = '2px solid #4CAF50';
        color = '#81C784';
      } else if (idx === selectedOption && !results[results.length - 1]?.correct) {
        bg = 'rgba(244,67,54,0.25)';
        border = '2px solid #F44336';
        color = '#EF9A9A';
      }
    }

    return {
      padding: 'clamp(10px, 2vw, 14px) clamp(12px, 2.5vw, 16px)',
      borderRadius: 8,
      background: bg,
      border,
      color,
      fontSize: 'clamp(12px, 1.8vw, 15px)',
      cursor: answerState === 'unanswered' ? 'pointer' : 'default',
      textAlign: 'left' as const,
      fontFamily: 'inherit',
      width: '100%',
      transition: 'all 0.2s ease-out',
    };
  };

  const btnStyle: React.CSSProperties = {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)',
    borderRadius: 8,
    border: '1px solid rgba(252,209,22,0.3)',
    background: 'rgba(252,209,22,0.1)',
    color: '#FCD116',
    fontSize: 'clamp(12px, 1.6vw, 14px)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
  };

  // ── Game Over Screen ──────────────────────────────────────────────
  if (gameOver) {
    const maxScore = QUESTIONS_PER_GAME * (POINTS_CORRECT + MAX_SPEED_BONUS);
    const categoryBreakdown: Record<string, { correct: number; total: number }> = {};
    results.forEach((r) => {
      if (!categoryBreakdown[r.question.category]) {
        categoryBreakdown[r.question.category] = { correct: 0, total: 0 };
      }
      categoryBreakdown[r.question.category].total++;
      if (r.correct) categoryBreakdown[r.question.category].correct++;
    });

    return (
      <div style={container}>
        <div style={{ fontSize: 'clamp(20px, 4vw, 32px)', fontWeight: 700 }}>Quiz Complete!</div>
        <div style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 800, color: '#FCD116' }}>
          {score}
          <span style={{ fontSize: 'clamp(14px, 2vw, 20px)', opacity: 0.5 }}>/{maxScore}</span>
        </div>
        <div style={{ fontSize: 'clamp(12px, 1.8vw, 16px)', opacity: 0.6 }}>
          {results.filter((r) => r.correct).length}/{QUESTIONS_PER_GAME} correct
        </div>

        {/* Category breakdown */}
        <div style={{ ...card, padding: 'clamp(8px, 2vw, 16px)' }}>
          <div
            style={{
              fontSize: 'clamp(11px, 1.4vw, 13px)',
              fontWeight: 600,
              marginBottom: 8,
              opacity: 0.6,
            }}
          >
            Category Breakdown
          </div>
          {Object.entries(categoryBreakdown).map(([cat, { correct, total }]) => (
            <div
              key={cat}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'clamp(11px, 1.4vw, 13px)',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span>{cat}</span>
              <span style={{ color: correct === total ? '#4CAF50' : '#FCD116' }}>
                {correct}/{total}
              </span>
            </div>
          ))}
        </div>

        <button onClick={restart} style={btnStyle}>
          Play Again
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={container}>
      {/* HUD */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: 'clamp(11px, 1.6vw, 14px)',
        }}
      >
        <span style={{ opacity: 0.5 }}>{current.category}</span>
        <span>
          <span style={{ opacity: 0.5 }}>Score </span>
          <span style={{ fontWeight: 700, color: '#FCD116' }}>{score}</span>
        </span>
      </div>

      {/* Timer bar */}
      <div
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            width: `${timerPct}%`,
            background: timerColor,
            transition: 'width 1s linear, background-color 0.5s',
          }}
        />
      </div>

      {/* Question card */}
      <div style={card}>
        <div
          style={{
            fontSize: 'clamp(14px, 2.2vw, 18px)',
            fontWeight: 600,
            lineHeight: 1.5,
            marginBottom: 'clamp(12px, 2vw, 20px)',
          }}
        >
          {current.question}
        </div>

        {/* Options: 2x2 grid, 1-col on narrow */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
            gap: 'clamp(6px, 1.5vw, 10px)',
          }}
        >
          {current.options.map((opt, i) => (
            <button
              key={i}
              style={optionBtn(i)}
              onClick={() => handleAnswer(i)}
              disabled={answerState !== 'unanswered'}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'clamp(20px, 3vw, 24px)',
                  height: 'clamp(20px, 3vw, 24px)',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  fontSize: 'clamp(10px, 1.4vw, 12px)',
                  fontWeight: 600,
                  marginRight: 8,
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Fun fact */}
      {showFunFact && current.funFact && (
        <div
          style={{
            ...card,
            padding: 'clamp(8px, 1.5vw, 12px)',
            background: 'rgba(0,107,63,0.15)',
            border: '1px solid rgba(0,107,63,0.3)',
            fontSize: 'clamp(11px, 1.6vw, 13px)',
          }}
        >
          <strong style={{ color: '#4CAF50' }}>Fun fact: </strong>
          {current.funFact}
        </div>
      )}

      {/* Next button */}
      {answerState !== 'unanswered' && (
        <button onClick={nextQuestion} style={btnStyle}>
          {currentIdx + 1 >= QUESTIONS_PER_GAME ? 'See Results' : 'Next Question'}
        </button>
      )}

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {Array.from({ length: QUESTIONS_PER_GAME }).map((_, i) => {
          let bg = 'rgba(255,255,255,0.15)';
          if (i < results.length) {
            bg = results[i].correct ? '#4CAF50' : '#F44336';
          } else if (i === currentIdx) {
            bg = '#FCD116';
          }
          return (
            <div
              key={i}
              style={{
                width: 'clamp(8px, 1.5vw, 10px)',
                height: 'clamp(8px, 1.5vw, 10px)',
                borderRadius: '50%',
                background: bg,
                transition: 'background 0.3s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TriviaGame;
