import React from 'react';
import { BookOpen, Footprints, Mountain } from 'lucide-react';

// HINWEIS: In einem echten Projekt würde diese Liste in `constants.jsx` leben
// und hier importiert werden.
const QUEST_LIST = {
    FOREST_OF_HABIT: {
        id: 'FOREST_OF_HABIT',
        title: 'Die Wälder der Gewohnheit',
        icon: <Footprints size={24} className="mr-3"/>,
        description: 'Ein neuer Pfad will getreten werden. Nur durch Beständigkeit wird aus einem Trampelpfad ein fester Weg. Etabliere eine neue Gewohnheit und verfolge sie sieben Tage lang, um das Artefakt zu finden.',
        triggerAchievement: 'HABIT_STREAK_7_DAYS',
        reward: 'Amulett des Anfangs'
    },
    MOUNTAIN_OF_GOALS: {
        id: 'MOUNTAIN_OF_GOALS',
        title: 'Der Berg der Ziele',
        icon: <Mountain size={24} className="mr-3"/>,
        description: 'Ein unbezwingbar scheinender Gipfel liegt vor dir. Formuliere einen klaren Plan, um ihn zu erklimmen. Erstelle dein erstes SMART-Ziel, um den ersten Basislager-Schlüssel zu erhalten.',
        triggerAchievement: 'FIRST_GOAL_CREATED',
        reward: 'Schlüssel des Basislagers'
    },
};

function AdventureView({ colors, earnedAchievements }) {
    return (
        <div className={`${colors.cardBg} p-6 rounded-xl shadow-lg`}>
            <h2 className={`text-3xl font-semibold mb-6 ${colors.darkAccent} flex items-center`}>
                <BookOpen size={28} className="mr-3 text-emerald-500"/>
                Die Reise des Suchenden
            </h2>
            <p className="text-lg text-slate-600 mb-8">Dein Pfad zur Selbstfindung ist ein Abenteuer. Erfülle Quests, um magische Artefakte zu finden und neue Gebiete auf deiner inneren Landkarte zu entdecken.</p>

            <div className="space-y-6">
                {Object.values(QUEST_LIST).map(quest => {
                    const isQuestCompleted = earnedAchievements[quest.triggerAchievement];
                    return (
                        <div key={quest.id} className={`border-2 rounded-lg p-6 transition-all duration-300 ${isQuestCompleted ? 'border-green-500/50 bg-green-50/50' : 'border-amber-500/50 bg-amber-50/50'}`}>
                            <h3 className={`text-2xl font-bold mb-3 flex items-center ${isQuestCompleted ? 'text-green-800' : 'text-amber-800'}`}>
                                {quest.icon}
                                {quest.title}
                            </h3>
                            <p className="text-slate-700 mb-4">{quest.description}</p>
                            
                            {isQuestCompleted ? (
                                <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-lg text-center">
                                    <p className="font-bold text-green-800">Quest abgeschlossen!</p>
                                    <p className="text-green-700">Du hast das Artefakt **"{quest.reward}"** gefunden. Deine Beständigkeit hat dir den Weg gewiesen.</p>
                                </div>
                            ) : (
                                <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-lg text-center">
                                    <p className="font-bold text-gray-800">Status: Aktiv</p>
                                    <p className="text-gray-600">Erfülle die Bedingung in der App, um diese Quest abzuschließen.</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AdventureView;