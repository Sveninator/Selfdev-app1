import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Heart } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../constants.jsx';

// Die Firestore-Instanz `db` wird als Prop von App.jsx übergeben.
function ValuesLifeGoalsView({
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
  const [userInput, setUserInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userValues, setUserValues] = useState('');
  const [lifeGoals, setLifeGoals] = useState('');
  const dataPathPrefix = userId
    ? `/artifacts/${appId}/users/${userId}/valuesAndGoals`
    : null;

  useEffect(() => {
    if (!userId || !isAuthReady || !dataPathPrefix) return;
    const loadData = async () => {
      try {
        const valuesSnap = await getDoc(
          doc(db, `${dataPathPrefix}/userValues`)
        );
        const goalsSnap = await getDoc(doc(db, `${dataPathPrefix}/lifeGoals`));
        if (valuesSnap.exists()) setUserValues(valuesSnap.data().text || '');
        if (goalsSnap.exists()) setLifeGoals(goalsSnap.data().text || '');
      } catch (error) {
        openModal(
          'Ladefehler',
          `Werte/Ziele nicht geladen: ${error.message}`,
          'error'
        );
      }
    };
    loadData();
  }, [userId, isAuthReady, dataPathPrefix, openModal, appId, db]);

  const saveData = async (dataType, data) => {
    if (!userId || !dataPathPrefix) return;
    try {
      await setDoc(doc(db, `${dataPathPrefix}/${dataType}`), {
        text: data,
        lastModified: Timestamp.now(),
      });
      openModal(
        'Gespeichert',
        `Deine ${
          dataType === 'userValues' ? 'Werte' : 'Lebensziele'
        } wurden gespeichert.`,
        'success'
      );
    } catch (error) {
      openModal(
        'Fehler',
        `Konnte ${
          dataType === 'userValues' ? 'Werte' : 'Ziele'
        } nicht speichern: ${error.message}`,
        'error'
      );
    }
  };

  const askGemini = async (promptContext) => {
    let basePrompt = '',
      currentThoughts = '';
    if (promptContext === 'values') {
      basePrompt =
        'Hilf mir, meine Kernwerte zu identifizieren. Stelle mir klärende Fragen, gib Beispiele oder schlage Reflexionsfragen vor, um meine wichtigsten Werte herauszufinden.';
      currentThoughts = userValues
        ? `\n\nMeine bisherigen Gedanken zu meinen Werten:\n"${userValues}"`
        : '';
    } else if (promptContext === 'lifegoals') {
      basePrompt =
        'Hilf mir, meine langfristigen Lebensziele basierend auf meinen Werten zu formulieren. Wie kann ich vorgehen? Welche Fragen sollte ich mir stellen?';
      currentThoughts = lifeGoals
        ? `\n\nMeine bisherigen Gedanken zu meinen Lebenszielen:\n"${lifeGoals}"`
        : '';
      if (userValues)
        currentThoughts += `\n\nMeine zugrundeliegenden Werte sind:\n"${userValues}"`;
    } else {
      if (!userInput.trim()) {
        openModal(
          'Eingabe fehlt',
          'Bitte gib eine Frage für den Gemini Coach ein.',
          'info'
        );
        return;
      }
      basePrompt = userInput;
    }
    const fullPrompt = basePrompt + currentThoughts;
    setGeminiResponse('');
    setIsLoading(true);

    if (!earnedAchievements[ACHIEVEMENTS_LIST.FIRST_GEMINI_CHAT.id]) {
      awardAchievement(ACHIEVEMENTS_LIST.FIRST_GEMINI_CHAT.id);
    }

    const apiKey = 'AIzaSyAmop3isHMrbTrL1OXv---6upR-Ru542e4'; // Dein Gemini API Schlüssel
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    if (!apiKey || apiKey.length < 20) {
      openModal(
        'Gemini Coach Fehler',
        'Der Gemini API Schlüssel scheint nicht korrekt konfiguriert zu sein.',
        'error'
      );
      setGeminiResponse('API Schlüssel nicht (korrekt) konfiguriert.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        }),
      });
      if (!response.ok) {
        const errorResult = await response
          .json()
          .catch(() => ({
            error: {
              message: `HTTP Fehler ${response.status}: ${response.statusText}`,
            },
          }));
        const errorMessage =
          errorResult.error?.message || `HTTP Fehler ${response.status}`;
        setGeminiResponse('Antwortfehler von der API: ' + errorMessage);
        openModal(
          'Gemini API Fehler',
          'Antwortfehler: ' + errorMessage,
          'error'
        );
        setIsLoading(false);
        return;
      }
      const result = await response.json();
      if (result.candidates && result.candidates[0].content?.parts[0]?.text) {
        setGeminiResponse(result.candidates[0].content.parts[0].text);
        updateUserPoints(5);
      } else {
        const errorMsg =
          result.error?.message ||
          (result.candidates ? 'Kein Inhalt in Antwort' : 'API Fehler');
        setGeminiResponse('Antwortfehler: ' + errorMsg);
        openModal('Gemini Fehler', 'Antwortfehler: ' + errorMsg, 'error');
      }
    } catch (error) {
      setGeminiResponse(`Kommunikationsfehler: ${error.message}`);
      openModal(
        'API Fehler',
        `Kommunikation fehlgeschlagen: ${error.message}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${colors.cardBg} p-6 rounded-xl shadow-lg`}>
      <h2
        className={`text-3xl font-semibold mb-6 ${colors.darkAccent} flex items-center`}
      >
        <Heart size={28} className="mr-3 text-emerald-500" />
        Werte & Lebensziele
      </h2>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className={`text-xl font-medium mb-2 ${colors.darkAccent}`}>
            Meine Kernwerte
          </h3>
          <textarea
            value={userValues}
            onChange={(e) => setUserValues(e.target.value)}
            placeholder="Was ist dir im Leben wirklich wichtig? (z.B. Ehrlichkeit, Kreativität, Mitgefühl...)"
            rows="5"
            className={`w-full p-3 border rounded-lg focus:ring-2 ${colors.cardBg} ${colors.darkAccent} mb-2`}
          />
          <div className="flex space-x-2">
            <button
              onClick={() => saveData('userValues', userValues)}
              className={`${colors.buttonSecondaryBg} ${colors.buttonSecondaryText} px-3 py-1.5 rounded-md text-sm hover:${colors.buttonSecondaryHoverBg} flex-1`}
            >
              Werte speichern
            </button>
            <button
              onClick={() => askGemini('values')}
              disabled={isLoading}
              className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-3 py-1.5 rounded-md text-sm hover:${colors.buttonPrimaryHoverBg} disabled:opacity-50 flex-1`}
            >
              {isLoading ? 'Denke...' : 'Gemini fragen'}
            </button>
          </div>
        </div>
        <div>
          <h3 className={`text-xl font-medium mb-2 ${colors.darkAccent}`}>
            Meine Lebensziele
          </h3>
          <textarea
            value={lifeGoals}
            onChange={(e) => setLifeGoals(e.target.value)}
            placeholder="Welche großen Ziele möchtest du langfristig erreichen?"
            rows="5"
            className={`w-full p-3 border rounded-lg focus:ring-2 ${colors.cardBg} ${colors.darkAccent} mb-2`}
          />
          <div className="flex space-x-2">
            <button
              onClick={() => saveData('lifeGoals', lifeGoals)}
              className={`${colors.buttonSecondaryBg} ${colors.buttonSecondaryText} px-3 py-1.5 rounded-md text-sm hover:${colors.buttonSecondaryHoverBg} flex-1`}
            >
              Ziele speichern
            </button>
            <button
              onClick={() => askGemini('lifegoals')}
              disabled={isLoading}
              className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-3 py-1.5 rounded-md text-sm hover:${colors.buttonPrimaryHoverBg} disabled:opacity-50 flex-1`}
            >
              {isLoading ? 'Denke...' : 'Gemini fragen'}
            </button>
          </div>
        </div>
      </div>
      <h3 className={`text-xl font-medium mb-2 mt-8 ${colors.darkAccent}`}>
        Allgemeine Unterstützung vom Coach
      </h3>
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Stelle hier eine spezifische Frage an den Gemini Coach bezüglich deiner Werte, Ziele oder anderer Selbstentwicklungsthemen..."
        rows="3"
        className={`w-full p-3 border rounded-lg focus:ring-2 ${colors.cardBg} ${colors.darkAccent} mb-2`}
        disabled={isLoading}
      />
      <button
        onClick={() => askGemini('custom')}
        disabled={isLoading || !userInput.trim()}
        className={`${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} w-full px-4 py-2 rounded-lg hover:${colors.buttonPrimaryHoverBg} disabled:opacity-50`}
      >
        {isLoading ? 'Senden...' : 'Frage an Gemini Coach'}
      </button>
      {isLoading && (
        <div className="mt-4 p-4 border rounded-lg bg-slate-50 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto mb-2"></div>
          <p className={`${colors.darkAccent}`}>Gemini Coach denkt nach...</p>
        </div>
      )}
      {geminiResponse && (
        <div className="mt-4 p-4 border rounded-lg bg-emerald-50">
          <h4 className={`text-lg font-semibold mb-2 text-emerald-700`}>
            Antwort vom Coach:
          </h4>
          <p className="text-emerald-800 whitespace-pre-wrap">
            {geminiResponse}
          </p>
        </div>
      )}
    </div>
  );
}

export default ValuesLifeGoalsView;
