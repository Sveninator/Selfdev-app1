import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  writeBatch,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import {
  Smile,
  MessageCircle,
  Dumbbell,
  RotateCcw,
  Target,
  Heart,
  Palette,
  ShieldCheck,
  Star,
} from 'lucide-react';

// Importe aus unseren neuen aufgeräumten Dateien
import {
  initialSampleExercises,
  LEVEL_THRESHOLDS,
  ACHIEVEMENTS_LIST,
} from './constants.jsx';
import { generateId, getCurrentLevel, getNextLevelInfo } from './utils.js';
import Modal from './components/Modal.jsx';
import DashboardView from './components/DashboardView.jsx';
import LifeCoachView from './components/LifeCoachView.jsx';
import TrainingPlansView from './components/TrainingPlansView.jsx';
import HabitsView from './components/HabitsView.jsx';
import GoalsView from './components/GoalsView.jsx';
import ValuesLifeGoalsView from './components/ValuesLifeGoalsView.jsx';

// Firebase Konfiguration
const firebaseConfig = {
  apiKey: 'AIzaSyDjLQLcaQiJHOq3rK27Fk8WHYq95bZjiRk',
  authDomain: 'selfdev-bf5d2.firebaseapp.com',
  projectId: 'selfdev-bf5d2',
  storageBucket: 'selfdev-bf5d2.firebasestorage.app',
  messagingSenderId: '705951056387',
  appId: '1:705951056387:web:1843d7163e476651404436',
  measurementId: 'G-SXN3MFQCCJ',
};

const appId = 'default-app-id';

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [gamificationPoints, setGamificationPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(LEVEL_THRESHOLDS[0]);
  const [earnedAchievements, setEarnedAchievements] = useState({});
  const [nextLevelInfo, setNextLevelInfo] = useState(getNextLevelInfo(0));
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    confirmText: 'Bestätigen',
    cancelText: 'Abbrechen',
  });
  const [allExercises, setAllExercises] = useState([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);

  const openModal = useCallback(
    (
      title,
      message,
      type = 'info',
      onConfirmCallback = null,
      confirmButtonText = 'Bestätigen',
      cancelButtonText = 'Abbrechen'
    ) => {
      setModalContent({
        title,
        message,
        type: onConfirmCallback ? 'confirmation' : type,
        onConfirm: onConfirmCallback,
        confirmText: confirmButtonText,
        cancelText: cancelButtonText,
      });
      setShowModal(true);
    },
    []
  );
  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const updateUserPointsStateAndLevel = useCallback((newPoints) => {
    const newLevelDataForUpdate = getCurrentLevel(newPoints);
    setGamificationPoints(newPoints);
    setUserLevel(newLevelDataForUpdate);
    setNextLevelInfo(getNextLevelInfo(newPoints));
    return newLevelDataForUpdate;
  }, []);

  const awardAchievement = useCallback(
    async (achievementId) => {
      if (!userId || !isAuthReady || earnedAchievements[achievementId]) return;
      const achievement = ACHIEVEMENTS_LIST[achievementId];
      if (!achievement) return;

      const achievementsRef = doc(
        db,
        `/artifacts/${appId}/users/${userId}/profile/achievements`
      );
      try {
        const achievementDataToStore = {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          earnedAt: Timestamp.now(),
        };
        await setDoc(
          achievementsRef,
          { [achievementId]: achievementDataToStore },
          { merge: true }
        );
        setEarnedAchievements((prev) => ({
          ...prev,
          [achievementId]: { ...achievement, earnedAt: Timestamp.now() },
        }));
        openModal(
          'Neues Abzeichen!',
          `"${achievement.name}" (${achievement.points} P.) freigeschaltet!`,
          'success'
        );

        if (achievement.points > 0) {
          const newTotalPoints = gamificationPoints + achievement.points;
          const newLevelData = updateUserPointsStateAndLevel(newTotalPoints);
          const profileRefGamification = doc(
            db,
            `/artifacts/${appId}/users/${userId}/profile/gamification`
          );
          await setDoc(
            profileRefGamification,
            { points: newTotalPoints, level: newLevelData.level },
            { merge: true }
          );
        }
      } catch (error) {
        console.error('Fehler beim Vergeben des Abzeichens:', error);
      }
    },
    [
      userId,
      isAuthReady,
      earnedAchievements,
      openModal,
      appId,
      gamificationPoints,
      updateUserPointsStateAndLevel,
    ]
  );

  const updateUserPoints = useCallback(
    async (pointsToAdd) => {
      if (!userId || !isAuthReady || pointsToAdd === 0) return;
      const currentPointsBeforeAdd = gamificationPoints;
      const finalTotalPoints = currentPointsBeforeAdd + pointsToAdd;
      const oldLevelData = userLevel;
      const newLevelData = updateUserPointsStateAndLevel(finalTotalPoints);
      const profileRef = doc(
        db,
        `/artifacts/${appId}/users/${userId}/profile/gamification`
      );
      try {
        await setDoc(
          profileRef,
          { points: finalTotalPoints, level: newLevelData.level },
          { merge: true }
        );
        if (newLevelData.level > oldLevelData.level) {
          openModal(
            'Level Aufstieg!',
            `Glückwunsch! Du bist jetzt Level ${newLevelData.level} (${newLevelData.name})!`,
            'success'
          );
          if (
            newLevelData.level === 5 &&
            !earnedAchievements[ACHIEVEMENTS_LIST.LEVEL_5_REACHED.id]
          ) {
            awardAchievement(ACHIEVEMENTS_LIST.LEVEL_5_REACHED.id);
          }
        }
      } catch (error) {
        updateUserPointsStateAndLevel(currentPointsBeforeAdd);
        openModal(
          'Speicherfehler',
          'Punkte konnten nicht gespeichert werden.',
          'error'
        );
      }
    },
    [
      userId,
      isAuthReady,
      gamificationPoints,
      userLevel,
      earnedAchievements,
      openModal,
      appId,
      awardAchievement,
      updateUserPointsStateAndLevel,
    ]
  );

  useEffect(() => {
    if (!userId || !isAuthReady) return;
    const profileRef = doc(
      db,
      `/artifacts/${appId}/users/${userId}/profile/gamification`
    );
    const achievementsRef = doc(
      db,
      `/artifacts/${appId}/users/${userId}/profile/achievements`
    );
    const loadProfile = async () => {
      try {
        const docSnap = await getDoc(profileRef);
        let currentPoints = 0;
        if (docSnap.exists()) {
          currentPoints = docSnap.data().points || 0;
        } else {
          await setDoc(profileRef, {
            points: 0,
            level: 1,
            createdAt: Timestamp.now(),
          });
        }
        updateUserPointsStateAndLevel(currentPoints);

        const achievementsSnap = await getDoc(achievementsRef);
        if (achievementsSnap.exists()) {
          const loadedAchievements = achievementsSnap.data();
          const enrichedAchievements = {};
          for (const key in loadedAchievements) {
            if (ACHIEVEMENTS_LIST[key]) {
              enrichedAchievements[key] = {
                ...ACHIEVEMENTS_LIST[key],
                ...loadedAchievements[key],
              };
            }
          }
          setEarnedAchievements(enrichedAchievements);
        } else {
          await setDoc(achievementsRef, {});
        }
      } catch (e) {
        openModal(
          'Profilfehler',
          `Konnte Profil nicht laden: ${e.message}`,
          'error'
        );
      }
    };
    loadProfile();
  }, [userId, isAuthReady, appId, openModal, updateUserPointsStateAndLevel]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          openModal(
            'Authentifizierungsfehler',
            `Anonyme Anmeldung fehlgeschlagen: ${error.message}.`,
            'error'
          );
          setUserId(generateId());
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [appId, openModal]);

  useEffect(() => {
    if (!isAuthReady) return;
    const path = `/artifacts/${appId}/public/data/exercises`;
    const ref = collection(db, path);
    const seedAndFetch = async () => {
      setIsLoadingExercises(true);
      try {
        const snap = await getDocs(ref);
        if (snap.empty && initialSampleExercises.length > 0) {
          const batch = writeBatch(db);
          initialSampleExercises.forEach((ex) =>
            batch.set(doc(db, path, ex.id), ex)
          );
          await batch.commit();
          setAllExercises(initialSampleExercises);
        } else {
          setAllExercises(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        }
      } catch (e) {
        openModal(
          'Fehler Ladeübungen',
          `Übungen nicht geladen: ${e.message}`,
          'error'
        );
        setAllExercises(initialSampleExercises);
      } finally {
        setIsLoadingExercises(false);
      }
    };
    seedAndFetch();
  }, [isAuthReady, openModal, appId]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Smile size={20} /> },
    { id: 'lifecoach', label: 'Life Coach', icon: <MessageCircle size={20} /> },
    { id: 'training', label: 'Trainingspläne', icon: <Dumbbell size={20} /> },
    { id: 'habits', label: 'Tiny Habits', icon: <RotateCcw size={20} /> },
    { id: 'goals', label: 'Smarte Ziele', icon: <Target size={20} /> },
    { id: 'values', label: 'Werte & Ziele', icon: <Heart size={20} /> },
  ];
  const pastelColors = {
    bg: 'bg-sky-50',
    navBg: 'bg-sky-100',
    navText: 'text-slate-700',
    navHoverBg: 'hover:bg-sky-200',
    accent: 'bg-emerald-500',
    accentText: 'text-white',
    darkAccent: 'text-slate-800',
    cardBg: 'bg-white',
    buttonPrimaryBg: 'bg-emerald-500',
    buttonPrimaryText: 'text-white',
    buttonPrimaryHoverBg: 'hover:bg-emerald-600',
    buttonSecondaryBg: 'bg-slate-200',
    buttonSecondaryText: 'text-slate-700',
    buttonSecondaryHoverBg: 'hover:bg-slate-300',
    buttonDestructiveBg: 'bg-red-500',
    buttonDestructiveText: 'text-white',
    buttonDestructiveHoverBg: 'hover:bg-red-600',
    pointsPillBg: 'bg-amber-400',
    pointsPillText: 'text-slate-800 font-semibold',
    levelPillBg: 'bg-sky-400',
    levelPillText: 'text-white font-semibold',
    progressBg: 'bg-sky-200',
    progressBar: 'bg-sky-500',
    completedExerciseText: 'text-green-600 line-through',
    pendingExerciseText: 'text-slate-700',
    achievementIconColor: 'text-sky-600',
    achievementCardBg: 'bg-sky-50 hover:bg-sky-100',
  };
  const currentColors = pastelColors;

  if (!isAuthReady) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${currentColors.bg} ${currentColors.darkAccent}`}
      >
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
        <p className="ml-4 text-xl">App wird vorbereitet...</p>
      </div>
    );
  }

  const renderPage = () => {
    const props = {
      db,
      colors: currentColors,
      userId,
      openModal,
      updateUserPoints,
      isAuthReady,
      appId,
      awardAchievement,
      earnedAchievements,
    };
    switch (currentPage) {
      case 'dashboard':
        return <DashboardView {...props} />;
      case 'lifecoach':
        return <LifeCoachView {...props} />;
      case 'training':
        return (
          <TrainingPlansView
            {...props}
            allExercises={allExercises}
            isLoadingExercises={isLoadingExercises}
          />
        );
      case 'habits':
        return <HabitsView {...props} />;
      case 'goals':
        return <GoalsView {...props} />;
      case 'values':
        return <ValuesLifeGoalsView {...props} />;
      default:
        return <DashboardView {...props} />;
    }
  };

  return (
    <div
      className={`flex flex-col md:flex-row min-h-screen ${currentColors.bg} ${currentColors.darkAccent} font-sans`}
    >
      <nav
        className={`${currentColors.navBg} w-full md:w-72 p-4 space-y-1 shadow-lg md:shadow-none flex flex-col`}
      >
        <div className="flex items-center space-x-2 mb-4">
          {' '}
          <Palette size={32} className={currentColors.darkAccent} />{' '}
          <h1 className={`text-2xl font-bold ${currentColors.darkAccent}`}>
            SelfDev
          </h1>{' '}
        </div>
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center space-x-3 p-2.5 rounded-lg transition-colors duration-200 ${
              currentPage === item.id
                ? `${currentColors.accent} ${currentColors.accentText}`
                : `${currentColors.navText} ${currentColors.navHoverBg}`
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <div className="mt-auto pt-3 space-y-2">
          <div
            className={`p-2.5 rounded-lg ${currentColors.pointsPillBg} ${currentColors.pointsPillText} text-center shadow text-sm`}
          >
            {' '}
            <Star size={16} className="inline mr-1.5" /> {gamificationPoints}{' '}
            Punkte{' '}
          </div>
          <div
            className={`p-2.5 rounded-lg ${currentColors.levelPillBg} ${currentColors.levelPillText} text-center shadow text-sm mb-1`}
          >
            {' '}
            <ShieldCheck size={16} className="inline mr-1.5" /> Level{' '}
            {userLevel.level}: {userLevel.name}{' '}
          </div>
          {userLevel.level <
            LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level &&
            nextLevelInfo.totalPointsForLevelSpan > 0 && (
              <div className="w-full mt-0.5">
                <div className="text-xs text-slate-500 text-center mb-0.5">
                  {nextLevelInfo.currentPointsInLevel} /{' '}
                  {nextLevelInfo.totalPointsForLevelSpan} P. bis Lvl.{' '}
                  {userLevel.level <
                  LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level
                    ? userLevel.level + 1
                    : userLevel.level}
                </div>
                <div
                  className={`w-full ${currentColors.progressBg} rounded-full h-2.5`}
                >
                  <div
                    className={`${currentColors.progressBar} h-2.5 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${nextLevelInfo.progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          {userId && (
            <p
              className="text-xs text-slate-500 mt-2 text-center truncate"
              title={userId}
            >
              ID: {userId.substring(0, 10)}...
            </p>
          )}
        </div>
      </nav>
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        {renderPage()}
      </main>
      {showModal && (
        <Modal
          {...modalContent}
          show={showModal}
          onClose={closeModal}
          colors={currentColors}
        />
      )}
    </div>
  );
}

export default App;
