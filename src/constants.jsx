import React from 'react';
import {
  ListChecks,
  PlayCircle,
  RotateCcw,
  CalendarDays,
  Trophy,
  Target,
  CheckCircle,
  Award,
  MessageCircle,
  ZapIcon,
  Sparkles,
} from 'lucide-react';

export const EXERCISE_CATEGORIES = {
  KRAFT: 'Kraft',
  DEHNUNG: 'Dehnung',
  AUSDAUER: 'Ausdauer',
};

export const initialSampleExercises = [
  {
    id: 'ex1',
    name: 'Liegestütze',
    category: EXERCISE_CATEGORIES.KRAFT,
    description: 'Klassische Liegestütze.',
  },
  {
    id: 'ex2',
    name: 'Kniebeugen',
    category: EXERCISE_CATEGORIES.KRAFT,
    description: 'Grundübung für Beine.',
  },
  {
    id: 'ex3',
    name: 'Plank',
    category: EXERCISE_CATEGORIES.KRAFT,
    description: 'Stärkt den Rumpf.',
  },
  {
    id: 'ex4',
    name: 'Oberschenkeldehnung',
    category: EXERCISE_CATEGORIES.DEHNUNG,
    description: 'Dehnt vordere Oberschenkel.',
  },
  {
    id: 'ex5',
    name: 'Wadendehnung',
    category: EXERCISE_CATEGORIES.DEHNUNG,
    description: 'Dehnt Waden.',
  },
  {
    id: 'ex6',
    name: 'Joggen',
    category: EXERCISE_CATEGORIES.AUSDAUER,
    description: 'Ausdauertraining.',
  },
  {
    id: 'ex7',
    name: 'Hampelmänner',
    category: EXERCISE_CATEGORIES.AUSDAUER,
    description: 'Ganzkörperübung zur Erwärmung.',
  },
  {
    id: 'ex8',
    name: 'Katze-Kuh',
    category: EXERCISE_CATEGORIES.DEHNUNG,
    description: 'Mobilisiert die Wirbelsäule.',
  },
  {
    id: 'ex9',
    name: 'Ausfallschritte',
    category: EXERCISE_CATEGORIES.KRAFT,
    description: 'Stärkt Bein- und Gesäßmuskulatur.',
  },
];

export const LEVEL_THRESHOLDS = [
  { level: 1, points: 0, name: 'Neuling' },
  { level: 2, points: 100, name: 'Aufsteiger' },
  { level: 3, points: 250, name: 'Fortgeschrittener' },
  { level: 4, points: 500, name: 'Experte' },
  { level: 5, points: 1000, name: 'Meister' },
  { level: 6, points: 2000, name: 'Großmeister' },
  { level: 7, points: 5000, name: 'Legende' },
];

export const ACHIEVEMENTS_LIST = {
  FIRST_PLAN_CREATED: {
    id: 'FIRST_PLAN_CREATED',
    name: 'Pläne-Pionier',
    description: 'Du hast deinen ersten Trainingsplan erstellt!',
    icon: <ListChecks size={24} />,
    points: 20,
  },
  FIRST_PLAN_COMPLETED: {
    id: 'FIRST_PLAN_COMPLETED',
    name: 'Durchstarter',
    description: 'Du hast dein erstes Training abgeschlossen!',
    icon: <PlayCircle size={24} />,
    points: 30,
  },
  FIRST_HABIT_CREATED: {
    id: 'FIRST_HABIT_CREATED',
    name: 'Gewohnheits-Starter',
    description: 'Du hast deine erste Gewohnheit angelegt!',
    icon: <RotateCcw size={24} />,
    points: 15,
  },
  HABIT_STREAK_7_DAYS: {
    id: 'HABIT_STREAK_7_DAYS',
    name: 'Dranbleiber (7 Tage)',
    description: 'Eine Gewohnheit 7 Tage am Stück durchgehalten!',
    icon: <CalendarDays size={24} />,
    points: 50,
  },
  HABIT_STREAK_30_DAYS: {
    id: 'HABIT_STREAK_30_DAYS',
    name: 'Marathon-Mensch (30 T.)',
    description: 'Eine Gewohnheit 30 Tage am Stück durchgehalten!',
    icon: <Trophy size={24} />,
    points: 150,
  },
  FIRST_GOAL_CREATED: {
    id: 'FIRST_GOAL_CREATED',
    name: 'Zielsetzer',
    description: 'Du hast dein erstes SMART-Ziel definiert!',
    icon: <Target size={24} />,
    points: 20,
  },
  FIRST_GOAL_COMPLETED: {
    id: 'FIRST_GOAL_COMPLETED',
    name: 'Ziel-Erreicher',
    description: 'Ein SMART-Ziel erfolgreich abgeschlossen!',
    icon: <CheckCircle size={24} />,
    points: 75,
  },
  FIVE_GOALS_COMPLETED: {
    id: 'FIVE_GOALS_COMPLETED',
    name: 'Ziele-Champion (5)',
    description: 'Fünf SMART-Ziele erfolgreich abgeschlossen!',
    icon: <Award size={24} />,
    points: 100,
  },
  FIRST_GEMINI_CHAT: {
    id: 'FIRST_GEMINI_CHAT',
    name: 'Gesprächs-Initiator',
    description: 'Du hast dein erstes Gespräch mit dem Gemini Coach geführt!',
    icon: <MessageCircle size={24} />,
    points: 10,
  },
  LEVEL_5_REACHED: {
    id: 'LEVEL_5_REACHED',
    name: 'Meister-Status',
    description: 'Du hast Level 5 erreicht!',
    icon: <ZapIcon size={24} />,
    points: 200,
  },
  MULTI_CATEGORY_PLAN: {
    id: 'MULTI_CATEGORY_PLAN',
    name: 'Allrounder-Plan',
    description:
      'Einen Trainingsplan mit Übungen aus allen 3 Kategorien erstellt!',
    icon: <Sparkles size={24} />,
    points: 40,
  },
};
