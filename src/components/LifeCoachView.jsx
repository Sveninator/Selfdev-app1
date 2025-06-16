import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { MessageCircle, Brain, Target, RotateCcw } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../constants.jsx';

// NEU: Definition der spezialisierten Coaches
const COACHES = {
  general: {
    id: 'general',
    name: 'Reflexions-Coach',
    icon: <Brain size={20} />,
    systemPrompt: "Du bist ein weiser und einfühlsamer Life Coach, der sich auf Selbstreflexion spezialisiert hat. Deine Antworten sind ruhig, nachdenklich und regen dazu an, die eigenen Gedanken und Gefühle zu hinterfragen. Du hilfst dem Nutzer, Klarheit zu gewinnen.",
    suggestions: [
      "Hilf mir, meine Stärken und Schwächen zu analysieren.",
      "Welche Glaubenssätze könnten mich zurückhalten?",
      "Analysiere mit mir eine schwierige Situation aus der letzten Woche.",
    ]
  },
  goals: {
    id: 'goals',
    name: 'Ziel-Coach',
    icon: <Target size={20} />,
    systemPrompt: "Du bist ein energiegeladener und fokussierter Ziel-Coach. Du bist Experte für die SMART-Methode. Deine Antworten sind klar, strukturiert und immer handlungsorientiert. Du hilfst dem Nutzer, Ziele zu definieren und die nächsten Schritte zu planen.",
    suggestions: [
      "Hilf mir, ein Ziel nach der SMART-Methode zu formulieren.",
      "Was sind mögliche erste Schritte für mein Ziel?",
      "Welche Hindernisse könnte ich auf meinem Weg antreffen?",
    ]
  },
  habits: {
    id: 'habits',
    name: 'Gewohnheits-Stratege',
    icon: <RotateCcw size={20} />,
    systemPrompt: "Du bist ein motivierender und praktischer Gewohnheits-Stratege. Du kennst dich perfekt mit 'Tiny Habits' und dem Aufbau von Routinen aus. Deine Antworten sind unterstützend, pragmatisch und voller nützlicher Tipps.",
    suggestions: [
      "Welche Routinen könnten mir helfen, produktiver zu sein?",
      "Wie kann ich eine neue Gewohnheit am besten starten?",
      "Was tue ich, wenn ich einen Tag bei meiner Gewohnheit aussetze?",
    ]
  }
};


function LifeCoachView({ db, colors, userId, openModal, updateUserPoints, awardAchievement, earnedAchievements, isAuthReady, appId }) {
    const [userInput, setUserInput] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeCoachId, setActiveCoachId] = useState('general');
    const chatViewRef = useRef(null);

    const activeCoach = COACHES[activeCoachId];

    // Lädt den Chatverlauf, wenn sich der Coach oder Nutzer ändert
    useEffect(() => {
        if (!userId || !isAuthReady || !db) return;
        
        // Jeder Coach bekommt seinen eigenen Chatverlauf
        const chatCollectionPath = `/artifacts/${appId}/users/${userId}/lifeCoachHistory_${activeCoachId}`;
        const q = query(collection(db, chatCollectionPath), orderBy("createdAt"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const history = [];
            querySnapshot.forEach((doc) => {
                history.push(doc.data());
            });
            setChatHistory(history);
        }, (error) => {
            console.error("Fehler beim Laden des Chatverlaufs: ", error);
            openModal("Fehler", "Chatverlauf konnte nicht geladen werden.", "error");
        });

        return () => unsubscribe();
    }, [userId, isAuthReady, db, appId, openModal, activeCoachId]);
    
    // Effekt zum automatischen Scrollen
    useEffect(() => {
        if (chatViewRef.current) {
            chatViewRef.current.scrollTop = chatViewRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleSendMessage = async (predefinedPrompt = null) => {
        const messageText = predefinedPrompt || userInput;
        if (!messageText.trim() || !userId) return;
        
        const userMessage = { role: "user", parts: [{ text: messageText }] };
        const userMessageToSave = { ...userMessage, createdAt: Timestamp.now() };
        
        // Der System-Prompt wird nur für die API-Anfrage hinzugefügt, nicht im State gespeichert
        const currentChatWithSystemPrompt = [
            { role: "user", parts: [{ text: activeCoach.systemPrompt }] },
            ...chatHistory, 
            userMessage
        ];
        
        setIsLoading(true);
        if (!predefinedPrompt) {
            setUserInput('');
        }

        if (!earnedAchievements[ACHIEVEMENTS_LIST.FIRST_GEMINI_CHAT.id]) {
            awardAchievement(ACHIEVEMENTS_LIST.FIRST_GEMINI_CHAT.id);
        }
        
        const chatCollectionPath = `/artifacts/${appId}/users/${userId}/lifeCoachHistory_${activeCoachId}`;

        try {
            await addDoc(collection(db, chatCollectionPath), userMessageToSave);

            const apiPayload = { contents: currentChatWithSystemPrompt.map(({role, parts}) => ({role, parts})) };
            const apiKey = "AIzaSyAmop3isHMrbTrL1OXv---6upR-Ru542e4"; // Dein Gemini API Schlüssel
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apiPayload) });
            
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: { message: `HTTP-Fehler: ${response.status}` } }));
                 throw new Error(errorData.error?.message || `HTTP-Fehler: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const modelMessage = { role: "model", parts: [{ text: result.candidates[0].content.parts[0].text }] };
                const modelMessageToSave = { ...modelMessage, createdAt: Timestamp.now() };
                await addDoc(collection(db, chatCollectionPath), modelMessageToSave);
                updateUserPoints(5);
            } else {
                throw new Error("Kein Inhalt in der API-Antwort.");
            }

        } catch (error) {
            openModal("Fehler beim Senden", `Nachricht konnte nicht verarbeitet werden: ${error.message}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const getMessageClasses = (msgRole) => ([
        "p-3", "rounded-lg", "max-w-[80%]", "text-sm", "whitespace-pre-wrap", 
        msgRole === 'user' ? `bg-sky-200 ml-auto ${colors.darkAccent}` : `${colors.navBg} ${colors.darkAccent}`
    ].join(" "));

    const loadingIndicatorClasses = [
        "p-3", "rounded-lg", "max-w-[80%]", colors.navBg, colors.darkAccent, "flex", "items-center", "text-sm"
    ].join(" ");

    return (
        <div className={`${colors.cardBg} p-6 rounded-xl shadow-lg h-full flex flex-col`}>
            {/* Coach Auswahl Tabs */}
            <div className="flex border-b mb-4">
                {Object.values(COACHES).map(coach => (
                    <button 
                        key={coach.id}
                        onClick={() => setActiveCoachId(coach.id)}
                        className={`flex items-center space-x-2 py-2 px-4 -mb-px font-semibold transition-colors duration-200 ${activeCoachId === coach.id ? `border-b-2 border-emerald-500 text-slate-800` : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {coach.icon}
                        <span>{coach.name}</span>
                    </button>
                ))}
            </div>

            <div ref={chatViewRef} className="flex-grow overflow-y-auto mb-4 p-4 border rounded-lg space-y-3 bg-slate-50 min-h-[300px]">
                {/* Gesprächsstarter, wenn der Chat leer ist */}
                {chatHistory.length === 0 && !isLoading && (
                    <div className="text-center p-4">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Womit kann dir der {activeCoach.name} heute helfen?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {activeCoach.suggestions.map((prompt, index) => (
                                <button key={index} onClick={() => handleSendMessage(prompt)} className={`p-3 rounded-lg text-sm text-left transition-colors ${colors.navBg} hover:bg-sky-200 text-slate-700`}>
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {chatHistory.map((msg, index) => (
                    <div key={index} className={getMessageClasses(msg.role)}>
                        <p>{msg.parts[0].text}</p>
                    </div>
                ))}
                {isLoading && (
                    <div className={loadingIndicatorClasses}>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-500 mr-2"></div>
                        <span>{activeCoach.name} denkt nach...</span>
                    </div>
                )}
            </div>
            <div className="flex items-center space-x-2">
                <input 
                    type="text" 
                    value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                    placeholder={`Stelle dem ${activeCoach.name} eine Frage...`} 
                    className={`flex-grow p-3 border rounded-lg focus:ring-2 ${colors.cardBg} ${colors.darkAccent}`} 
                    disabled={isLoading}
                />
                <button 
                    onClick={() => handleSendMessage()} 
                    disabled={isLoading || !userInput.trim()} 
                    className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} p-3 rounded-lg ${colors.buttonPrimaryHoverBg} disabled:opacity-50`}
                >
                    {isLoading ? 'Senden...' : 'Senden'}
                </button>
            </div>
        </div>
    );
}

export default LifeCoachView;