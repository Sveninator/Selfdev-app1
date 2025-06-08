import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../constants.jsx';

function LifeCoachView({
  colors,
  userId,
  openModal,
  updateUserPoints,
  awardAchievement,
  earnedAchievements,
}) {
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!userInput.trim() || !userId) return;
    const newHumanMessage = { role: 'user', parts: [{ text: userInput }] };
    const currentChatHistory = [...chatHistory, newHumanMessage];
    setChatHistory(currentChatHistory);
    setUserInput('');
    setIsLoading(true);

    // Prüfe, ob das Achievement für den ersten Chat vergeben werden soll
    if (
      !earnedAchievements[ACHIEVEMENTS_LIST.FIRST_GEMINI_CHAT.id] &&
      currentChatHistory.filter((m) => m.role === 'user').length === 1
    ) {
      awardAchievement(ACHIEVEMENTS_LIST.FIRST_GEMINI_CHAT.id);
    }

    const payload = {
      contents: currentChatHistory.map((msg) => ({
        role: msg.role,
        parts: msg.parts,
      })),
    };
    const apiKey = 'AIzaSyAmop3isHMrbTrL1OXv---6upR-Ru542e4'; // Dein Gemini API Schlüssel
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Überprüfung des API-Schlüssels
    if (!apiKey || apiKey.length < 20) {
      openModal(
        'Gemini Coach Fehler',
        'Der Gemini API Schlüssel scheint nicht korrekt konfiguriert zu sein.',
        'error'
      );
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: 'API Schlüssel nicht (korrekt) konfiguriert.' }],
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'model',
            parts: [{ text: 'API Antwortfehler: ' + errorMessage }],
          },
        ]);
        openModal(
          'Gemini Coach API Fehler',
          'Antwortfehler von der API: ' + errorMessage,
          'error'
        );
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'model',
            parts: [{ text: result.candidates[0].content.parts[0].text }],
          },
        ]);
        updateUserPoints(5);
      } else {
        const errorMessage =
          result.error?.message ||
          (result.candidates
            ? 'Kein Inhalt in der API-Antwort'
            : 'Unbekannter API Fehler nach erfolgreicher Anfrage');
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'model',
            parts: [{ text: 'Antwortfehler: ' + errorMessage }],
          },
        ]);
        openModal('Gemini Coach', 'Antwortfehler: ' + errorMessage, 'error');
      }
    } catch (error) {
      const errorMessage = error.message || 'Kommunikationsfehler mit der API';
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: `Kommunikationsfehler: ${errorMessage}` }],
        },
      ]);
      openModal(
        'Gemini Coach',
        `Kommunikationsfehler: ${errorMessage}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageClasses = (msgRole) =>
    [
      'p-3',
      'rounded-lg',
      'max-w-[80%]',
      'text-sm',
      'whitespace-pre-wrap',
      msgRole === 'user'
        ? `bg-sky-200 ml-auto ${colors.darkAccent}`
        : `${colors.navBg} ${colors.darkAccent}`,
    ].join(' ');
  const loadingIndicatorClasses = [
    'p-3',
    'rounded-lg',
    'max-w-[80%]',
    colors.navBg,
    colors.darkAccent,
    'flex',
    'items-center',
    'text-sm',
  ].join(' ');

  return (
    <div
      className={`${colors.cardBg} p-6 rounded-xl shadow-lg h-full flex flex-col`}
    >
      <h2
        className={`text-3xl font-semibold mb-6 ${colors.darkAccent} flex items-center`}
      >
        <MessageCircle size={28} className="mr-3 text-emerald-500" />
        Dein Life Coach
      </h2>
      <div className="flex-grow overflow-y-auto mb-4 p-4 border rounded-lg space-y-3 bg-slate-50 min-h-[300px]">
        {chatHistory.length === 0 && !isLoading && (
          <p className="text-slate-500 text-center py-4">
            Stelle deine erste Frage an den Life Coach!
          </p>
        )}
        {chatHistory.map((msg, index) => (
          <div key={index} className={getMessageClasses(msg.role)}>
            <p>{msg.parts[0].text}</p>
          </div>
        ))}
        {isLoading && (
          <div className={loadingIndicatorClasses}>
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-500 mr-2"></div>
            <span>Gemini denkt nach...</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) =>
            e.key === 'Enter' && !isLoading && handleSendMessage()
          }
          placeholder="Stelle eine Frage..."
          className={`flex-grow p-3 border rounded-lg focus:ring-2 ${colors.cardBg} ${colors.darkAccent}`}
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
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
