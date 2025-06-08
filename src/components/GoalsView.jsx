import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDocs, addDoc, updateDoc, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import { Target, PlusCircle, Edit3, Trash2, CheckCircle } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../constants.jsx';

// Die Firestore-Instanz `db` wird als Prop von App.jsx übergeben.
function GoalsView({ db, colors, userId, openModal, updateUserPoints, isAuthReady, appId, awardAchievement, earnedAchievements }) {
    const [goals, setGoals] = useState([]);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [currentGoal, setCurrentGoal] = useState({ id: null, name: '', specific: '', measurable: '', achievable: '', relevant: '', timeBound: '', progress: 0, status: 'active' });
    const goalsCollectionPath = userId ? `/artifacts/${appId}/users/${userId}/goals` : null;

    useEffect(() => {
        if (!userId || !isAuthReady || !goalsCollectionPath) { setGoals([]); return; }
        const q = query(collection(db, goalsCollectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setGoals(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0) ));
        }, (error) => { openModal("Fehler", `Smarte Ziele konnten nicht geladen werden: ${error.message}`, "error"); });
        return () => unsubscribe();
    }, [userId, isAuthReady, goalsCollectionPath, openModal, appId, db]);

    const handleOpenGoalModal = (goal = null) => {
        if (goal) {
            setCurrentGoal({ ...goal, timeBound: goal.timeBound?.toDate ? goal.timeBound.toDate().toISOString().split('T')[0] : (typeof goal.timeBound === 'string' ? goal.timeBound : '') });
        } else {
            setCurrentGoal({ id: null, name: '', specific: '', measurable: '', achievable: '', relevant: '', timeBound: '', progress: 0, status: 'active', createdAt: Timestamp.now() });
        }
        setShowGoalModal(true);
    };

    const handleSaveGoal = async () => {
        if (!currentGoal.name.trim() || !userId || !goalsCollectionPath) { openModal("Eingabefehler", "Ein Name für das Ziel ist erforderlich.", "error"); return; }
        
        const goalDataToSave = { ...currentGoal };
        if (goalDataToSave.timeBound && typeof goalDataToSave.timeBound === 'string' && goalDataToSave.timeBound.length > 0) {
            goalDataToSave.timeBound = Timestamp.fromDate(new Date(goalDataToSave.timeBound));
        } else if (!goalDataToSave.timeBound || (typeof goalDataToSave.timeBound === 'string' && goalDataToSave.timeBound.length === 0)) {
            goalDataToSave.timeBound = null;
        }
        
        goalDataToSave.lastModified = Timestamp.now();
        if (!goalDataToSave.id && !goalDataToSave.createdAt) {
             goalDataToSave.createdAt = Timestamp.now();
        }

        const localGoalId = goalDataToSave.id;
        if(localGoalId) {
            delete goalDataToSave.id;
        }
        
        try {
            if (localGoalId) {
                await setDoc(doc(db, goalsCollectionPath, localGoalId), goalDataToSave, { merge: true });
                openModal("Erfolg", `Ziel "${currentGoal.name}" aktualisiert.`, "success");
            } else {
                await addDoc(collection(db, goalsCollectionPath), goalDataToSave);
                updateUserPoints(20); 
                openModal("Erfolg", `Ziel "${currentGoal.name}" erstellt.`, "success");
                const currentGoalsSnapshot = await getDocs(query(collection(db, goalsCollectionPath)));
                if (currentGoalsSnapshot.docs.length === 1 && !earnedAchievements[ACHIEVEMENTS_LIST.FIRST_GOAL_CREATED.id]) {
                    awardAchievement(ACHIEVEMENTS_LIST.FIRST_GOAL_CREATED.id);
                }
            }
            setShowGoalModal(false);
        } catch (error) { 
            openModal("Fehler", `Konnte Ziel nicht speichern: ${error.message}`, "error");
        }
    };

    const handleGoalInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentGoal(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (type === 'number' || type === 'range' ? parseInt(value, 10) : value) }));
    };

    const updateGoalProgress = async (goalId, newProgress) => {
        if (!userId || !goalsCollectionPath) return;
        const progress = Math.max(0, Math.min(100, parseInt(newProgress, 10)));
        const targetGoal = goals.find(g => g.id === goalId);
        if (!targetGoal) return;
        const wasCompletedBefore = targetGoal.status === 'completed';
        const isNowCompleted = progress === 100;
        const newStatus = isNowCompleted ? 'completed' : 'active';
        try {
            await updateDoc(doc(db, goalsCollectionPath, goalId), { progress: progress, status: newStatus, lastModified: Timestamp.now() });
            if(isNowCompleted && !wasCompletedBefore) {
                updateUserPoints(50);
                openModal("Glückwunsch!", `Ziel "${targetGoal.name}" erreicht! +50 P.`, "success");
                if (!earnedAchievements[ACHIEVEMENTS_LIST.FIRST_GOAL_COMPLETED.id]) { awardAchievement(ACHIEVEMENTS_LIST.FIRST_GOAL_COMPLETED.id); }
                const allGoalsAfterUpdate = goals.map(g => g.id === goalId ? {...g, status: newStatus, progress: progress } : g);
                const completedGoalsCount = allGoalsAfterUpdate.filter(g => g.status === 'completed').length;
                if (completedGoalsCount >= 5 && !earnedAchievements[ACHIEVEMENTS_LIST.FIVE_GOALS_COMPLETED.id]) { awardAchievement(ACHIEVEMENTS_LIST.FIVE_GOALS_COMPLETED.id); }
            }
        } catch (error) { openModal("Fehler", `Fortschritt nicht aktualisiert: ${error.message}`, "error");}
    };
    
    const confirmDeleteGoal = (goalId, goalName) => {
        if(!userId || !goalsCollectionPath) return;
        openModal("Ziel löschen", `"${goalName}" löschen?`, 'confirmation', async () => {
            try { await deleteDoc(doc(db, goalsCollectionPath, goalId)); openModal("Gelöscht", `Ziel "${goalName}" gelöscht.`, "success");
            } catch(error) { openModal("Fehler", `Konnte nicht löschen: ${error.message}`, "error");}
        }, "Ja", "Nein");
    };

    const GoalCard = ({ goal }) => (
        <div className={`${colors.navBg} p-4 rounded-lg shadow`}>
            <div className="flex justify-between items-start mb-2"><h3 className={`text-xl font-medium ${colors.darkAccent} ${goal.status === 'completed' ? 'line-through text-slate-500' : ''}`}>{goal.name}</h3><div className="flex space-x-2"><button onClick={() => handleOpenGoalModal(goal)} className={`${colors.buttonSecondaryText} hover:text-emerald-600 p-1`} title="Bearbeiten"><Edit3 size={18}/></button><button onClick={() => confirmDeleteGoal(goal.id, goal.name)} className={`text-red-500 hover:text-red-700 p-1`} title="Löschen"><Trash2 size={18}/></button></div></div>
            {goal.timeBound?.toDate && <p className="text-sm text-slate-500 mb-1">Fällig: {goal.timeBound.toDate().toLocaleDateString()}</p>}
            {goal.status === 'completed' && <p className="text-sm text-green-600 font-semibold mb-2 flex items-center"><CheckCircle size={16} className="mr-1"/>Abgeschlossen!</p>}
            <div className="w-full bg-slate-300 rounded-full h-3 mb-1 mt-2 overflow-hidden"><div className={`${colors.accent} h-3 rounded-full transition-all duration-300`} style={{ width: `${goal.progress || 0}%` }}></div></div>
            <div className="flex justify-between items-center text-sm text-slate-500 mb-2"><span>{goal.progress || 0}%</span> {goal.status !== 'completed' && (<input type="range" min="0" max="100" value={goal.progress || 0} onChange={(e) => updateGoalProgress(goal.id, e.target.value)} className="w-2/3 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"/>)}</div>
            <details className="mt-3 text-sm group"><summary className={`cursor-pointer ${colors.darkAccent} font-medium hover:text-emerald-600 group-open:mb-2`}>SMART-Details</summary><ul className="list-none ml-1 mt-1 text-slate-600 space-y-1.5 text-xs border-l-2 border-sky-200 pl-3"><li><strong>Spezifisch:</strong> {goal.specific || 'k.A.'}</li><li><strong>Messbar:</strong> {goal.measurable || 'k.A.'}</li><li><strong>Attraktiv/Erreichbar:</strong> {goal.achievable || 'k.A.'}</li><li><strong>Relevant:</strong> {goal.relevant || 'k.A.'}</li><li><strong>Terminiert:</strong> {goal.timeBound?.toDate ? goal.timeBound.toDate().toLocaleDateString() : (goal.timeBound || 'k.A.')}</li></ul></details>
        </div>
    );

    return (
        <div className={`${colors.cardBg} p-6 rounded-xl shadow-lg`}>
            <div className="flex justify-between items-center mb-6"><h2 className={`text-3xl font-semibold ${colors.darkAccent} flex items-center`}><Target size={28} className="mr-3 text-emerald-500"/>Smarte Ziele</h2><button onClick={() => handleOpenGoalModal()} className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-4 py-2 rounded-lg ${colors.buttonPrimaryHoverBg} flex items-center`}><PlusCircle size={20} className="mr-2"/> Neues Ziel</button></div>
            {goals.filter(g => g.status === 'active').length === 0 && goals.filter(g => g.status !== 'completed').length === 0 && <p className="text-slate-500">Keine Ziele definiert.</p>}
            {goals.filter(g => g.status === 'active').length > 0 && <h3 className={`text-2xl font-semibold mt-6 mb-3 ${colors.darkAccent}`}>Aktive Ziele</h3>}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{goals.filter(g => g.status === 'active').map(goal => <GoalCard key={goal.id} goal={goal} />)}</div>
            {goals.filter(g => g.status === 'completed').length > 0 && ( <><h3 className={`text-2xl font-semibold mt-10 mb-3 ${colors.darkAccent}`}>Abgeschlossen</h3><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{goals.filter(g => g.status === 'completed').map(goal => <GoalCard key={goal.id} goal={goal} />)}</div></>)}
            {showGoalModal && ( <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className={`${colors.cardBg} p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto`}>
                <h3 className={`text-2xl font-semibold mb-4 ${colors.darkAccent}`}>{currentGoal.id ? 'Ziel bearbeiten' : 'Neues SMART-Ziel'}</h3>
                {['name', 'specific', 'measurable', 'achievable', 'relevant'].map(field => ( <div key={field} className="mb-3"><label className={`block text-sm font-medium ${colors.darkAccent} mb-1 capitalize`}>{field === 'name' ? 'Zielname' : field.charAt(0).toUpperCase() + field.slice(1)}</label>{field === 'name' ? (<input type="text" name={field} value={currentGoal[field] || ''} onChange={handleGoalInputChange} placeholder={field === 'name' ? "Was möchtest du erreichen?" : `Mache es ${field}!`} className={`w-full p-2 border rounded-md ${colors.cardBg} ${colors.darkAccent} focus:ring-emerald-500`}/>) : (<textarea name={field} value={currentGoal[field] || ''} onChange={handleGoalInputChange} placeholder={`Mache es ${field}!`} rows="2" className={`w-full p-2 border rounded-md ${colors.cardBg} ${colors.darkAccent} focus:ring-emerald-500`}></textarea>)}</div>))}
                <div className="mb-3"><label className={`block text-sm font-medium ${colors.darkAccent} mb-1`}>Terminiert bis (optional)</label><input type="date" name="timeBound" value={currentGoal.timeBound || ''} onChange={handleGoalInputChange} className={`w-full p-2 border rounded-md ${colors.cardBg} ${colors.darkAccent} focus:ring-emerald-500`}/></div>
                <div className="mb-4"><label className={`block text-sm font-medium ${colors.darkAccent} mb-1`}>Fortschritt ({currentGoal.progress}%)</label><input type="range" name="progress" value={currentGoal.progress || 0} onChange={handleGoalInputChange} min="0" max="100" className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500`}/></div>
                <div className="mt-6 flex justify-end space-x-3 pt-4"><button onClick={() => setShowGoalModal(false)} className={`${colors.buttonSecondaryBg} ${colors.buttonSecondaryText} px-4 py-2 rounded-lg ${colors.buttonSecondaryHoverBg}`}>Abbrechen</button><button onClick={handleSaveGoal} className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-4 py-2 rounded-lg ${colors.buttonPrimaryHoverBg}`}>{currentGoal.id ? 'Speichern' : 'Erstellen'}</button></div>
            </div></div>)}
        </div>
    );
}

export default GoalsView;