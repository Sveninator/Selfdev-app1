import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import {
  RotateCcw,
  PlusCircle,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../constants.jsx';

// Die Firestore-Instanz `db` wird als Prop von App.jsx übergeben.
function HabitsView({
  db,
  colors,
  userId,
  openModal,
  updateUserPoints,
  isAuthReady,
  appId,
  awardAchievement,
  earnedAchievements,
}) {
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [editingHabit, setEditingHabit] = useState(null);
  const habitsCollectionPath = userId
    ? `/artifacts/${appId}/users/${userId}/habits`
    : null;

  useEffect(() => {
    if (!userId || !isAuthReady || !habitsCollectionPath) {
      setHabits([]);
      return;
    }
    const q = query(collection(db, habitsCollectionPath));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedHabits = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const lastCompletedDate = data.lastCompleted?.toDate
            ? data.lastCompleted.toDate()
            : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const completedToday = lastCompletedDate
            ? lastCompletedDate.valueOf() === today.valueOf()
            : false;
          fetchedHabits.push({
            id: doc.id,
            ...data,
            completedToday: completedToday,
            streak: data.streak || 0,
          });
        });
        setHabits(
          fetchedHabits.sort(
            (a, b) =>
              (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
          )
        );
      },
      (error) => {
        openModal(
          'Fehler',
          `Gewohnheiten nicht geladen: ${error.message}`,
          'error'
        );
      }
    );
    return () => unsubscribe();
  }, [userId, isAuthReady, habitsCollectionPath, openModal, appId, db]);

  const handleAddOrUpdateHabit = async () => {
    if (!newHabitName.trim() || !userId || !habitsCollectionPath) {
      openModal('Eingabefehler', 'Name für Gewohnheit erforderlich.', 'error');
      return;
    }
    const habitData = {
      name: newHabitName,
      lastModified: Timestamp.now(),
      streak: editingHabit ? editingHabit.streak || 0 : 0,
      lastCompleted: editingHabit ? editingHabit.lastCompleted : null,
    };
    if (!editingHabit) {
      habitData.createdAt = Timestamp.now();
    } else {
      habitData.createdAt = editingHabit.createdAt || Timestamp.now();
    }

    try {
      if (editingHabit) {
        await setDoc(
          doc(db, habitsCollectionPath, editingHabit.id),
          habitData,
          { merge: true }
        );
        openModal(
          'Erfolg',
          `Gewohnheit "${newHabitName}" aktualisiert!`,
          'success'
        );
      } else {
        await addDoc(collection(db, habitsCollectionPath), habitData);
        openModal(
          'Erfolg',
          `Gewohnheit "${newHabitName}" hinzugefügt!`,
          'success'
        );
        updateUserPoints(10);
        // Überprüfe, ob dies die erste erstellte Gewohnheit ist, um das Achievement zu vergeben
        const currentHabitsSnapshot = await getDocs(
          query(collection(db, habitsCollectionPath))
        );
        if (
          currentHabitsSnapshot.docs.length === 1 &&
          !earnedAchievements[ACHIEVEMENTS_LIST.FIRST_HABIT_CREATED.id]
        ) {
          awardAchievement(ACHIEVEMENTS_LIST.FIRST_HABIT_CREATED.id);
        }
      }
      setNewHabitName('');
      setEditingHabit(null);
    } catch (error) {
      openModal(
        'Fehler',
        `Gewohnheit konnte nicht gespeichert werden: ${error.message}`,
        'error'
      );
    }
  };

  const toggleHabitCompletion = async (habit) => {
    if (!userId || !habitsCollectionPath) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let newStreak = habit.streak || 0;
    let newLastCompleted = habit.lastCompleted;
    let pointsChange = 0;

    if (habit.completedToday) {
      const lastCompletedDate = habit.lastCompleted?.toDate
        ? habit.lastCompleted.toDate()
        : null;
      if (
        lastCompletedDate &&
        lastCompletedDate.valueOf() === today.valueOf()
      ) {
        newStreak = Math.max(0, newStreak - 1);
        pointsChange = -5;
      }
      newLastCompleted = null;
      openModal('Info', `"${habit.name}" als nicht erledigt markiert.`, 'info');
    } else {
      newStreak += 1;
      newLastCompleted = Timestamp.fromDate(today);
      pointsChange = 5;
      openModal(
        'Super!',
        `"${habit.name}" erledigt! +${pointsChange} Punkte.`,
        'success'
      );
      if (
        newStreak === 7 &&
        !earnedAchievements[ACHIEVEMENTS_LIST.HABIT_STREAK_7_DAYS.id]
      ) {
        awardAchievement(ACHIEVEMENTS_LIST.HABIT_STREAK_7_DAYS.id);
      }
      if (
        newStreak === 30 &&
        !earnedAchievements[ACHIEVEMENTS_LIST.HABIT_STREAK_30_DAYS.id]
      ) {
        awardAchievement(ACHIEVEMENTS_LIST.HABIT_STREAK_30_DAYS.id);
      }
    }
    try {
      await updateDoc(doc(db, habitsCollectionPath, habit.id), {
        streak: newStreak,
        lastCompleted: newLastCompleted,
        lastModified: Timestamp.now(),
      });
      if (pointsChange !== 0) {
        updateUserPoints(pointsChange);
      }
    } catch (error) {
      openModal(
        'Fehler',
        `Status konnte nicht aktualisiert werden: ${error.message}`,
        'error'
      );
    }
  };

  const confirmDeleteHabit = (habitId, habitName) => {
    if (!userId || !habitsCollectionPath) return;
    openModal(
      'Gewohnheit löschen',
      `Soll "${habitName}" wirklich gelöscht werden?`,
      'confirmation',
      async () => {
        try {
          await deleteDoc(doc(db, habitsCollectionPath, habitId));
          openModal('Gelöscht', `"${habitName}" wurde gelöscht.`, 'success');
        } catch (error) {
          openModal(
            'Fehler',
            `Konnte nicht löschen: ${error.message}`,
            'error'
          );
        }
      },
      'Ja, löschen',
      'Nein'
    );
  };

  const startEditHabit = (habit) => {
    setEditingHabit(habit);
    setNewHabitName(habit.name);
  };

  return (
    <div className={`${colors.cardBg} p-6 rounded-xl shadow-lg`}>
      <h2
        className={`text-3xl font-semibold mb-6 ${colors.darkAccent} flex items-center`}
      >
        <RotateCcw size={28} className="mr-3 text-emerald-500" />
        Tiny Habits
      </h2>
      <div className="flex space-x-2 mb-6">
        <input
          type="text"
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          placeholder={
            editingHabit ? 'Gewohnheit bearbeiten...' : 'Neue Gewohnheit...'
          }
          className={`flex-grow p-3 border rounded-lg focus:ring-2 ${colors.cardBg} ${colors.darkAccent}`}
        />
        <button
          onClick={handleAddOrUpdateHabit}
          className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-4 py-2 rounded-lg ${colors.buttonPrimaryHoverBg} flex items-center`}
          disabled={!newHabitName.trim()}
        >
          {editingHabit ? (
            <Edit3 size={20} className="mr-2" />
          ) : (
            <PlusCircle size={20} className="mr-2" />
          )}
          {editingHabit ? 'Speichern' : 'Hinzufügen'}
        </button>
        {editingHabit && (
          <button
            onClick={() => {
              setEditingHabit(null);
              setNewHabitName('');
            }}
            className={`${colors.buttonSecondaryBg} ${colors.buttonSecondaryText} px-4 py-2 rounded-lg ${colors.buttonSecondaryHoverBg}`}
          >
            Abbrechen
          </button>
        )}
      </div>
      <div className="space-y-3">
        {habits.length === 0 && (
          <p className="text-slate-500">Keine Gewohnheiten definiert.</p>
        )}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className={`${colors.navBg} p-4 rounded-lg shadow flex items-center justify-between`}
          >
            <div>
              <h3 className={`text-lg font-medium ${colors.darkAccent}`}>
                {habit.name}
              </h3>
              <p className="text-sm text-slate-500">
                Streak: {habit.streak || 0} Tag(e)
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => startEditHabit(habit)}
                className={`${colors.buttonSecondaryText} hover:text-emerald-600 p-1 rounded-md hover:${colors.buttonSecondaryBg}`}
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={() => confirmDeleteHabit(habit.id, habit.name)}
                className={`text-red-500 hover:text-red-700 p-1 rounded-md hover:${colors.buttonSecondaryBg}`}
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={() => toggleHabitCompletion(habit)}
                className={`p-2 rounded-full ${
                  habit.completedToday
                    ? `bg-emerald-500 text-white hover:bg-emerald-600`
                    : `bg-slate-200 text-slate-600 hover:bg-emerald-100`
                }`}
                title={
                  habit.completedToday
                    ? 'Als nicht erledigt markieren'
                    : 'Für heute als erledigt markieren'
                }
              >
                {habit.completedToday ? (
                  <CheckSquare size={24} />
                ) : (
                  <Square size={24} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HabitsView;
