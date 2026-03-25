import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import { useSettingsStore } from '../../store/settings';
import { useGameScoresStore } from '../../store/gameScores';
import { GameShell } from '../GameShell';
import {
  COLORS,
  KENTE,
  FONT_FAMILY,
  FONT_FAMILY_BOLD,
  FONT_SIZE,
  SPACING,
  RADIUS,
  rs,
} from '../../constants/theme';
import { pickQuestions, type TriviaQuestion } from './triviaQuestions';

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 20;
const TIME_PER_QUESTION = 15; // seconds
const POINTS_PER_CORRECT = 10;
const FUN_FACT_DISPLAY_MS = 2000;

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  'Ghana History': '#8B5CF6',
  'Ghana Geography': '#3B82F6',
  'Ghana Culture': '#F59E0B',
  'Government & Civics': '#EF4444',
  'Science & Technology': '#06B6D4',
  'World Knowledge': '#22c55e',
};

// ── Types ────────────────────────────────────────────────────────────────────

type AnswerState = 'idle' | 'correct' | 'wrong' | 'timeout';

interface Props {
  onBack: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TriviaScreen({ onBack }: Props) {
  const theme = useSettingsStore((s) => s.theme);
  const c = COLORS[theme];
  const recordGame = useGameScoresStore((s) => s.recordGame);

  // ── Game state ───────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFunFact, setShowFunFact] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const funFactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const funFactSlide = useRef(new Animated.Value(0)).current;
  const scoreFlash = useRef(new Animated.Value(0)).current;

  // ── Init game ─────────────────────────────────────────────────────────────
  const startNewGame = useCallback(() => {
    const picked = pickQuestions(TOTAL_QUESTIONS);
    setQuestions(picked);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswerState('idle');
    setSelectedOption(null);
    setShowFunFact(false);
    setGameOver(false);
    setTimeLeft(TIME_PER_QUESTION);
    timerBarAnim.setValue(1);
    funFactSlide.setValue(0);
    scoreFlash.setValue(0);
  }, [timerBarAnim, funFactSlide, scoreFlash]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // ── Timer logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver || answerState !== 'idle' || questions.length === 0) return;

    // Animate timer bar
    timerBarAnim.setValue(1);
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: TIME_PER_QUESTION * 1000,
      useNativeDriver: false,
    }).start();

    setTimeLeft(TIME_PER_QUESTION);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, gameOver, answerState, questions.length]);

  // ── Handle timeout ────────────────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    setAnswerState('timeout');
    setWrongCount((w) => w + 1);
    Vibration.vibrate(100);
    showFunFactThenAdvance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  // ── Handle answer ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (answerState !== 'idle' || gameOver) return;

      // Stop timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerBarAnim.stopAnimation();

      setSelectedOption(optionIndex);
      const question = questions[currentIndex];
      const isCorrect = optionIndex === question.correctIndex;

      if (isCorrect) {
        setAnswerState('correct');
        setScore((s) => s + POINTS_PER_CORRECT);
        setCorrectCount((c) => c + 1);
        Vibration.vibrate(50);

        // Flash score animation
        Animated.sequence([
          Animated.timing(scoreFlash, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(scoreFlash, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        setAnswerState('wrong');
        setWrongCount((w) => w + 1);
        Vibration.vibrate(100);
      }

      showFunFactThenAdvance();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answerState, gameOver, currentIndex, questions],
  );

  // ── Show fun fact then advance ────────────────────────────────────────────
  const showFunFactThenAdvance = useCallback(() => {
    const question = questions[currentIndex];
    const hasFunFact = !!question?.funFact;

    if (hasFunFact) {
      setShowFunFact(true);
      Animated.timing(funFactSlide, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }

    const delay = hasFunFact ? FUN_FACT_DISPLAY_MS : 1200;

    funFactTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  const advanceToNext = useCallback(() => {
    if (currentIndex >= TOTAL_QUESTIONS - 1) {
      // Game over
      const finalScore = score + (answerState === 'correct' ? 0 : 0); // score already updated
      setGameOver(true);
      // Score is recorded via useEffect below
    } else {
      setCurrentIndex((i) => i + 1);
      setAnswerState('idle');
      setSelectedOption(null);
      setShowFunFact(false);
      setTimeLeft(TIME_PER_QUESTION);
      funFactSlide.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, score, answerState]);

  // ── Record score when game ends ───────────────────────────────────────────
  useEffect(() => {
    if (gameOver && score >= 0) {
      recordGame('trivia', score);
    }
  }, [gameOver, score, recordGame]);

  // ── Cleanup timers ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (funFactTimerRef.current) clearTimeout(funFactTimerRef.current);
    };
  }, []);

  // ── Dismiss fun fact on tap ───────────────────────────────────────────────
  const dismissFunFact = useCallback(() => {
    if (showFunFact) {
      if (funFactTimerRef.current) clearTimeout(funFactTimerRef.current);
      advanceToNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFunFact]);

  // ── Get tier badge ────────────────────────────────────────────────────────
  const getTier = (s: number) => {
    if (s >= 180) return { label: 'National Treasure', color: KENTE.gold, glow: true };
    if (s >= 130) return { label: 'Ghana Scholar', color: '#22c55e', glow: false };
    if (s >= 70) return { label: 'Rising Star', color: KENTE.gold, glow: false };
    return { label: 'Keep Learning', color: '#EF4444', glow: false };
  };

  // ── Get option style ─────────────────────────────────────────────────────
  const getOptionStyle = (index: number) => {
    if (answerState === 'idle') {
      return { backgroundColor: c.surface1, borderColor: c.border };
    }

    const question = questions[currentIndex];
    const isCorrectOption = index === question.correctIndex;
    const isSelectedOption = index === selectedOption;

    if (isCorrectOption) {
      return { backgroundColor: '#22c55e', borderColor: '#16a34a' };
    }
    if (isSelectedOption && !isCorrectOption) {
      return { backgroundColor: '#EF4444', borderColor: '#DC2626' };
    }
    return { backgroundColor: c.surface1, borderColor: c.border, opacity: 0.5 };
  };

  const getOptionTextColor = (index: number) => {
    if (answerState === 'idle') return c.text;

    const question = questions[currentIndex];
    const isCorrectOption = index === question.correctIndex;
    const isSelectedOption = index === selectedOption;

    if (isCorrectOption || isSelectedOption) return '#FFFFFF';
    return c.textMuted;
  };

  // ── Timer bar color (gold -> red) ─────────────────────────────────────────
  const timerBarColor = timerBarAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#EF4444', '#F59E0B', KENTE.gold],
  });

  const timerBarWidth = timerBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── Score flash color ─────────────────────────────────────────────────────
  const scoreFlashOpacity = scoreFlash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // ── Fun fact slide ────────────────────────────────────────────────────────
  const funFactTranslateY = funFactSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const funFactOpacity = funFactSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // ── Render: loading ───────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <GameShell
        title="Ghana Trivia"
        emoji={'\u{1F1EC}\u{1F1ED}'}
        gameId="trivia"
        score={0}
        accentColor="#006B3F"
        onBack={onBack}
        onNewGame={startNewGame}
      >
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: c.textMuted }]}>
            Loading questions...
          </Text>
        </View>
      </GameShell>
    );
  }

  const question = questions[currentIndex];
  const categoryColor = CATEGORY_COLORS[question?.category] ?? KENTE.gold;
  const tier = getTier(score);

  // ── Render: end screen ────────────────────────────────────────────────────
  if (gameOver) {
    return (
      <GameShell
        title="Ghana Trivia"
        emoji={'\u{1F1EC}\u{1F1ED}'}
        gameId="trivia"
        score={score}
        accentColor="#006B3F"
        onBack={onBack}
        onNewGame={startNewGame}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.endScreenContent}
        >
          {/* Big score */}
          <Text style={[styles.endEmoji]}>{'\u{1F3C6}'}</Text>
          <Text style={[styles.endScoreLabel, { color: c.textMuted }]}>
            Your Score
          </Text>
          <Text
            style={[
              styles.endScore,
              { color: KENTE.gold },
              tier.glow && styles.endScoreGlow,
            ]}
          >
            {score}
          </Text>
          <Text style={[styles.endMaxScore, { color: c.textMuted }]}>
            out of {TOTAL_QUESTIONS * POINTS_PER_CORRECT}
          </Text>

          {/* Tier badge */}
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: tier.color },
              tier.glow && {
                shadowColor: KENTE.gold,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 16,
                elevation: 12,
              },
            ]}
          >
            <Text style={styles.tierText}>{tier.label}</Text>
          </View>

          {/* Stats breakdown */}
          <View style={[styles.statsCard, { backgroundColor: c.surface1, borderColor: c.border }]}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>
                {'\u2705'} Correct
              </Text>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                {correctCount}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>
                {'\u274C'} Wrong
              </Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {wrongCount}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>
                {'\u{1F4AF}'} Accuracy
              </Text>
              <Text style={[styles.statValue, { color: KENTE.gold }]}>
                {TOTAL_QUESTIONS > 0
                  ? Math.round((correctCount / TOTAL_QUESTIONS) * 100)
                  : 0}
                %
              </Text>
            </View>
          </View>

          {/* Play Again */}
          <TouchableOpacity
            onPress={startNewGame}
            style={[styles.playAgainButton, { backgroundColor: '#006B3F' }]}
            accessibilityLabel="Play Again"
            accessibilityRole="button"
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </GameShell>
    );
  }

  // ── Render: question screen ───────────────────────────────────────────────
  return (
    <GameShell
      title="Ghana Trivia"
      emoji={'\u{1F1EC}\u{1F1ED}'}
      gameId="trivia"
      score={score}
      accentColor="#006B3F"
      onBack={onBack}
      onNewGame={startNewGame}
    >
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.questionContent}
        bounces={false}
      >
        {/* Progress bar + question count */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: c.textMuted }]}>
            Question {currentIndex + 1} of {TOTAL_QUESTIONS}
          </Text>
          <View style={[styles.progressBarBg, { backgroundColor: c.surface2 }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: '#006B3F',
                  width: `${((currentIndex + 1) / TOTAL_QUESTIONS) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Timer bar */}
        <View style={[styles.timerBarBg, { backgroundColor: c.surface2 }]}>
          <Animated.View
            style={[
              styles.timerBarFill,
              {
                backgroundColor: timerBarColor,
                width: timerBarWidth,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.timerText,
            { color: timeLeft <= 5 ? '#EF4444' : c.textMuted },
          ]}
        >
          {timeLeft}s
        </Text>

        {/* Score flash indicator */}
        <Animated.View
          style={[
            styles.scoreFlash,
            { opacity: scoreFlashOpacity },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.scoreFlashText}>+{POINTS_PER_CORRECT}</Text>
        </Animated.View>

        {/* Question card */}
        <View style={[styles.questionCard, { backgroundColor: c.surface1, borderColor: c.border }]}>
          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryText}>{question.category}</Text>
          </View>

          {/* Question text */}
          <Text style={[styles.questionText, { color: c.text }]}>
            {question.question}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const optionStyle = getOptionStyle(index);
            const textColor = getOptionTextColor(index);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleAnswer(index)}
                disabled={answerState !== 'idle'}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: optionStyle.backgroundColor,
                    borderColor: optionStyle.borderColor,
                    opacity: optionStyle.opacity ?? 1,
                  },
                ]}
                accessibilityLabel={`Option ${OPTION_LABELS[index]}: ${option}`}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.optionLabel,
                    {
                      backgroundColor:
                        answerState !== 'idle' &&
                        (index === question.correctIndex || index === selectedOption)
                          ? 'rgba(255,255,255,0.25)'
                          : c.surface2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabelText,
                      { color: answerState !== 'idle' && (index === question.correctIndex || index === selectedOption) ? '#FFFFFF' : c.text },
                    ]}
                  >
                    {OPTION_LABELS[index]}
                  </Text>
                </View>
                <Text
                  style={[styles.optionText, { color: textColor }]}
                  numberOfLines={3}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fun fact card */}
        {showFunFact && question.funFact && (
          <TouchableOpacity onPress={dismissFunFact} activeOpacity={0.8}>
            <Animated.View
              style={[
                styles.funFactCard,
                {
                  backgroundColor: c.surface1,
                  opacity: funFactOpacity,
                  transform: [{ translateY: funFactTranslateY }],
                },
              ]}
            >
              {/* Ghana flag color border */}
              <View style={styles.funFactBorderTop}>
                <View style={[styles.funFactStripe, { backgroundColor: KENTE.red }]} />
                <View style={[styles.funFactStripe, { backgroundColor: KENTE.gold }]} />
                <View style={[styles.funFactStripe, { backgroundColor: KENTE.green }]} />
              </View>
              <Text style={[styles.funFactTitle, { color: KENTE.gold }]}>
                Did you know?
              </Text>
              <Text style={[styles.funFactText, { color: c.text }]}>
                {question.funFact}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </GameShell>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.lg,
  },

  // ── Question screen ─────────────────────────────────────────────────────
  questionContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // Progress
  progressContainer: {
    marginBottom: SPACING.sm,
  },
  progressText: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  progressBarBg: {
    height: rs(6),
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },

  // Timer
  timerBarBg: {
    height: rs(8),
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  timerBarFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  timerText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.sm,
    textAlign: 'right',
    marginTop: SPACING.xs,
    fontWeight: '700',
  },

  // Score flash
  scoreFlash: {
    position: 'absolute',
    top: rs(80),
    right: SPACING.lg,
    zIndex: 10,
  },
  scoreFlashText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: '#22c55e',
  },

  // Question card
  questionCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.md,
  },
  categoryText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  questionText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    lineHeight: rs(28),
  },

  // Options
  optionsContainer: {
    gap: SPACING.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    padding: SPACING.md,
    minHeight: rs(56),
  },
  optionLabel: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionLabelText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  optionText: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.md,
    flex: 1,
    lineHeight: rs(22),
  },

  // Fun fact
  funFactCard: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  funFactBorderTop: {
    flexDirection: 'row',
    height: rs(4),
    marginBottom: SPACING.sm,
    marginHorizontal: -SPACING.md,
    marginTop: -SPACING.md,
  },
  funFactStripe: {
    flex: 1,
  },
  funFactTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  funFactText: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.sm,
    lineHeight: rs(20),
  },

  // ── End screen ──────────────────────────────────────────────────────────
  endScreenContent: {
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  endEmoji: {
    fontSize: rs(56),
    marginBottom: SPACING.md,
  },
  endScoreLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.xs,
  },
  endScore: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: rs(64),
    fontWeight: '700',
    lineHeight: rs(72),
  },
  endScoreGlow: {
    textShadowColor: 'rgba(212, 160, 23, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  endMaxScore: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.lg,
  },
  tierBadge: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.xl,
  },
  tierText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statsCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  statLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.md,
  },
  statValue: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  statDivider: {
    height: 1,
  },
  playAgainButton: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    minWidth: rs(200),
    alignItems: 'center',
  },
  playAgainText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
