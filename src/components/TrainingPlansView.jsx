import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import {
  ListChecks,
  PlusCircle,
  Edit3,
  Trash2,
  PlayCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { EXERCISE_CATEGORIES, ACHIEVEMENTS_LIST } from '../constants.jsx';

// Die Firestore-Instanz `db` wird als Prop von App.jsx übergeben.
function TrainingPlansView({
  db,
  colors,
  userId,
  openModal,
  updateUserPoints,
  isAuthReady,
  allExercises,
  isLoadingExercises,
  appId,
  awardAchievement,
  earnedAchievements,
}) {
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [selectedExercisesForPlan, setSelectedExercisesForPlan] = useState([]);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [activeTrainingPlan, setActiveTrainingPlan] = useState(null);
  const [showActiveTrainingModal, setShowActiveTrainingModal] = useState(false);
  const [completedExercisesInActivePlan, setCompletedExercisesInActivePlan] =
    useState([]);

  const plansCollectionPath = userId
    ? `/artifacts/${appId}/users/${userId}/trainingPlans`
    : null;

  useEffect(() => {
    if (!userId || !isAuthReady || !plansCollectionPath) {
      setTrainingPlans([]);
      return;
    }
    const q = query(collection(db, plansCollectionPath));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        setTrainingPlans(
          querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      },
      (error) => {
        openModal(
          'Fehler',
          `Trainingspläne konnten nicht geladen werden: ${error.message}`,
          'error'
        );
      }
    );
    return () => unsubscribe();
  }, [userId, isAuthReady, plansCollectionPath, openModal, appId, db]);

  const resetCreateEditModalState = () => {
    setNewPlanName('');
    setSelectedExercisesForPlan([]);
    setEditingPlanId(null);
    setShowCreateEditModal(false);
  };
  const handleOpenCreateModal = () => {
    resetCreateEditModalState();
    setShowCreateEditModal(true);
  };
  const handleOpenEditModal = (plan) => {
    setNewPlanName(plan.name);
    setSelectedExercisesForPlan(plan.exerciseIds || []);
    setEditingPlanId(plan.id);
    setShowCreateEditModal(true);
  };

  const handleSavePlan = async () => {
    if (
      !newPlanName.trim() ||
      selectedExercisesForPlan.length === 0 ||
      !userId ||
      !plansCollectionPath
    ) {
      openModal(
        'Eingabefehler',
        'Ein Planname und mindestens eine Übung sind erforderlich.',
        'error'
      );
      return;
    }
    const planData = {
      name: newPlanName,
      exerciseIds: selectedExercisesForPlan,
      updatedAt: Timestamp.now(),
    };
    try {
      if (editingPlanId) {
        const originalPlan = trainingPlans.find((p) => p.id === editingPlanId);
        planData.createdAt = originalPlan?.createdAt || Timestamp.now();
        await setDoc(doc(db, plansCollectionPath, editingPlanId), planData, {
          merge: true,
        });
        openModal('Erfolg', `Plan "${newPlanName}" aktualisiert!`, 'success');
      } else {
        planData.createdAt = Timestamp.now();
        await addDoc(collection(db, plansCollectionPath), planData);
        openModal('Erfolg', `Plan "${newPlanName}" erstellt!`, 'success');
        updateUserPoints(15);
        const currentPlansSnapshot = await getDocs(
          query(collection(db, plansCollectionPath))
        );
        if (
          currentPlansSnapshot.docs.length === 1 &&
          !earnedAchievements[ACHIEVEMENTS_LIST.FIRST_PLAN_CREATED.id]
        ) {
          awardAchievement(ACHIEVEMENTS_LIST.FIRST_PLAN_CREATED.id);
        }
        const categoriesInPlan = new Set(
          selectedExercisesForPlan.map(
            (exId) => allExercises.find((e) => e.id === exId)?.category
          )
        );
        if (
          categoriesInPlan.size === Object.keys(EXERCISE_CATEGORIES).length &&
          !earnedAchievements[ACHIEVEMENTS_LIST.MULTI_CATEGORY_PLAN.id]
        ) {
          awardAchievement(ACHIEVEMENTS_LIST.MULTI_CATEGORY_PLAN.id);
        }
      }
      resetCreateEditModalState();
    } catch (error) {
      openModal(
        'Fehler',
        `Plan nicht ${editingPlanId ? 'aktualisiert' : 'erstellt'}: ${
          error.message
        }`,
        'error'
      );
    }
  };

  const toggleExerciseSelectionForPlan = (exerciseId) => {
    setSelectedExercisesForPlan((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const confirmDeletePlan = (planId, planName) => {
    if (!userId || !plansCollectionPath) return;
    openModal(
      'Plan löschen',
      `Soll der Plan "${planName}" wirklich gelöscht werden?`,
      'confirmation',
      async () => {
        try {
          await deleteDoc(doc(db, plansCollectionPath, planId));
          openModal(
            'Gelöscht',
            `Plan "${planName}" wurde gelöscht.`,
            'success'
          );
        } catch (error) {
          openModal('Fehler', `Plan nicht gelöscht: ${error.message}`, 'error');
        }
      },
      'Ja, löschen',
      'Abbrechen'
    );
  };

  const handleStartTraining = (plan) => {
    setActiveTrainingPlan(plan);
    setCompletedExercisesInActivePlan([]);
    setShowActiveTrainingModal(true);
  };
  const toggleExerciseCompletionInActivePlan = (exerciseId) => {
    setCompletedExercisesInActivePlan((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleFinishTraining = () => {
    if (!activeTrainingPlan) return;
    updateUserPoints(25);
    openModal(
      'Training beendet!',
      `Super! Plan "${activeTrainingPlan.name}" abgeschlossen (+25 P.).`,
      'success'
    );
    if (!earnedAchievements[ACHIEVEMENTS_LIST.FIRST_PLAN_COMPLETED.id]) {
      awardAchievement(ACHIEVEMENTS_LIST.FIRST_PLAN_COMPLETED.id);
    }
    setShowActiveTrainingModal(false);
    setActiveTrainingPlan(null);
    setCompletedExercisesInActivePlan([]);
  };

  if (isLoadingExercises) {
    return (
      <div
        className={`${colors.cardBg} p-6 rounded-xl shadow-lg flex items-center justify-center h-48`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mr-3"></div>
        <p className={`${colors.darkAccent}`}>Lade Übungen...</p>
      </div>
    );
  }

  return (
    <div className={`${colors.cardBg} p-6 rounded-xl shadow-lg`}>
      <div className="flex justify-between items-center mb-6">
        {' '}
        <h2
          className={`text-3xl font-semibold ${colors.darkAccent} flex items-center`}
        >
          <ListChecks size={28} className="mr-3 text-emerald-500" />
          Trainingspläne
        </h2>{' '}
        <button
          onClick={handleOpenCreateModal}
          className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-4 py-2 rounded-lg ${colors.buttonPrimaryHoverBg} flex items-center`}
        >
          <PlusCircle size={20} className="mr-2" /> Neuen Plan
        </button>{' '}
      </div>
      {trainingPlans.length === 0 && !isLoadingExercises && (
        <p className="text-slate-500">
          Keine Trainingspläne erstellt. Klicke auf "Neuen Plan", um loszulegen!
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        {trainingPlans.map((plan) => (
          <div
            key={plan.id}
            className={`${colors.navBg} p-4 rounded-lg shadow flex flex-col justify-between`}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                {' '}
                <h3 className={`text-xl font-medium ${colors.darkAccent}`}>
                  {plan.name}
                </h3>{' '}
                <div className="flex space-x-2">
                  {' '}
                  <button
                    onClick={() => handleOpenEditModal(plan)}
                    className={`${colors.buttonSecondaryText} hover:text-emerald-600 p-1 rounded-md hover:${colors.buttonSecondaryBg}`}
                    title="Bearbeiten"
                  >
                    <Edit3 size={18} />
                  </button>{' '}
                  <button
                    onClick={() => confirmDeletePlan(plan.id, plan.name)}
                    className={`text-red-500 hover:text-red-700 p-1 rounded-md hover:${colors.buttonSecondaryBg}`}
                    title="Löschen"
                  >
                    <Trash2 size={18} />
                  </button>{' '}
                </div>{' '}
              </div>
              <p className="text-sm text-slate-600 mb-1">
                Erstellt: {plan.createdAt?.toDate().toLocaleDateString()}
              </p>{' '}
              {plan.updatedAt && (
                <p className="text-xs text-slate-500 mb-2">
                  Geändert: {plan.updatedAt?.toDate().toLocaleDateString()}
                </p>
              )}
              <ul className="list-disc list-inside ml-2 text-sm space-y-1 mb-3">
                {' '}
                {plan.exerciseIds &&
                  plan.exerciseIds.map((exId) => {
                    const exercise = allExercises.find((e) => e.id === exId);
                    return (
                      <li key={exId} className="text-slate-700">
                        {exercise
                          ? `${exercise.name} (${exercise.category})`
                          : `Unbekannte Übung ID: ${exId}`}
                      </li>
                    );
                  })}{' '}
              </ul>
            </div>
            <button
              onClick={() => handleStartTraining(plan)}
              className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} w-full mt-2 px-4 py-2 rounded-lg ${colors.buttonPrimaryHoverBg} flex items-center justify-center`}
            >
              <PlayCircle size={20} className="mr-2" /> Plan starten
            </button>
          </div>
        ))}
      </div>
      {showCreateEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div
            className={`${colors.cardBg} p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col my-auto`}
          >
            {' '}
            <h3 className={`text-2xl font-semibold mb-4 ${colors.darkAccent}`}>
              {editingPlanId ? 'Plan bearbeiten' : 'Neuen Plan erstellen'}
            </h3>{' '}
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="Name des Trainingsplans"
              className={`w-full p-3 border rounded-lg mb-4 focus:ring-2 ${colors.cardBg} ${colors.darkAccent}`}
            />{' '}
            <h4 className={`text-lg font-medium mb-2 ${colors.darkAccent}`}>
              Übungen auswählen:
            </h4>{' '}
            <div className="flex-grow overflow-y-auto border p-3 rounded-md bg-slate-50 space-y-1 mb-4 min-h-[200px]">
              {' '}
              {Object.values(EXERCISE_CATEGORIES).map(
                (category) =>
                  allExercises.some((ex) => ex.category === category) && (
                    <div key={category}>
                      {' '}
                      <h5
                        className={`text-md font-semibold mt-2 pt-1 border-t first:border-t-0 first:mt-0 ${colors.darkAccent}`}
                      >
                        {category}
                      </h5>{' '}
                      {allExercises
                        .filter((ex) => ex.category === category)
                        .map((exercise) => (
                          <label
                            key={exercise.id}
                            className="flex items-center space-x-3 p-2 hover:bg-sky-100 rounded-md cursor-pointer"
                          >
                            {' '}
                            <input
                              type="checkbox"
                              checked={selectedExercisesForPlan.includes(
                                exercise.id
                              )}
                              onChange={() =>
                                toggleExerciseSelectionForPlan(exercise.id)
                              }
                              className="form-checkbox h-5 w-5 text-emerald-500 rounded focus:ring-emerald-400"
                            />{' '}
                            <span className={`${colors.darkAccent} text-sm`}>
                              {exercise.name}
                            </span>{' '}
                          </label>
                        ))}{' '}
                    </div>
                  )
              )}{' '}
              {allExercises.length === 0 && (
                <p className="text-slate-500 p-2">
                  Keine Übungen in der Datenbank gefunden.
                </p>
              )}{' '}
            </div>{' '}
            <div className="mt-auto flex justify-end space-x-3 pt-4">
              {' '}
              <button
                onClick={resetCreateEditModalState}
                className={`${colors.buttonSecondaryBg} ${colors.buttonSecondaryText} px-4 py-2 rounded-lg ${colors.buttonSecondaryHoverBg}`}
              >
                Abbrechen
              </button>{' '}
              <button
                onClick={handleSavePlan}
                className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-4 py-2 rounded-lg ${colors.buttonPrimaryHoverBg}`}
              >
                {editingPlanId ? 'Änderungen speichern' : 'Plan erstellen'}
              </button>{' '}
            </div>{' '}
          </div>{' '}
        </div>
      )}
      {showActiveTrainingModal && activeTrainingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60] overflow-y-auto">
          <div
            className={`${colors.cardBg} p-6 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col my-auto`}
          >
            {' '}
            <h3 className={`text-2xl font-semibold mb-1 ${colors.darkAccent}`}>
              Training aktiv: {activeTrainingPlan.name}
            </h3>{' '}
            <p className="text-sm text-slate-500 mb-4">
              Markiere die Übungen als erledigt, sobald du sie abgeschlossen
              hast.
            </p>{' '}
            <div className="flex-grow overflow-y-auto border p-3 rounded-md bg-slate-50 space-y-2 mb-4 min-h-[200px]">
              {' '}
              {(activeTrainingPlan.exerciseIds || []).map((exId) => {
                const exercise = allExercises.find((e) => e.id === exId);
                if (!exercise)
                  return (
                    <p key={exId} className="text-sm text-red-500">
                      Unbekannte Übung (ID: {exId})
                    </p>
                  );
                const isCompleted =
                  completedExercisesInActivePlan.includes(exId);
                return (
                  <div
                    key={exId}
                    className={`p-3 rounded-md flex items-center justify-between transition-colors ${
                      isCompleted
                        ? 'bg-emerald-100'
                        : 'bg-white hover:bg-sky-50'
                    }`}
                  >
                    {' '}
                    <span
                      className={`text-sm ${
                        isCompleted
                          ? colors.completedExerciseText
                          : colors.pendingExerciseText
                      }`}
                    >
                      {exercise.name} ({exercise.category})
                    </span>{' '}
                    <button
                      onClick={() => toggleExerciseCompletionInActivePlan(exId)}
                      className={`p-2 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : `bg-slate-200 text-slate-600 hover:bg-emerald-200`
                      }`}
                      title={
                        isCompleted
                          ? 'Als nicht erledigt markieren'
                          : 'Als erledigt markieren'
                      }
                    >
                      {isCompleted ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>{' '}
                  </div>
                );
              })}{' '}
            </div>{' '}
            <div className="mt-auto flex justify-between items-center space-x-3 pt-4">
              {' '}
              <button
                onClick={() => {
                  setShowActiveTrainingModal(false);
                  setActiveTrainingPlan(null);
                  setCompletedExercisesInActivePlan([]);
                }}
                className={`${colors.buttonSecondaryBg} ${colors.buttonSecondaryText} px-4 py-2 rounded-lg ${colors.buttonSecondaryHoverBg}`}
              >
                Training abbrechen
              </button>{' '}
              <button
                onClick={handleFinishTraining}
                className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-4 py-2 rounded-lg ${colors.buttonPrimaryHoverBg} disabled:opacity-50`}
                disabled={
                  !activeTrainingPlan.exerciseIds ||
                  activeTrainingPlan.exerciseIds.length !==
                    completedExercisesInActivePlan.length ||
                  activeTrainingPlan.exerciseIds.length === 0
                }
              >
                Abschließen & Punkte erhalten
              </button>{' '}
            </div>{' '}
          </div>{' '}
        </div>
      )}
    </div>
  );
}

export default TrainingPlansView;
