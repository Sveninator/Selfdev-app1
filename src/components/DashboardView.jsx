import React from 'react';
import { TrendingUp, Star, Badge as BadgeIcon, Info } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../constants.jsx';

function DashboardView({
  colors,
  userId,
  updateUserPoints,
  openModal,
  earnedAchievements,
}) {
  const achievementsArray = Object.values(earnedAchievements)
    .filter((ach) => ach.name && ach.earnedAt)
    .sort((a, b) => {
      const timeA = a.earnedAt?.toMillis ? a.earnedAt.toMillis() : 0;
      const timeB = b.earnedAt?.toMillis ? b.earnedAt.toMillis() : 0;
      return timeB - timeA;
    });

  const getAchievementIcon = (achievementId) => {
    const masterAchievement = ACHIEVEMENTS_LIST[achievementId];
    return masterAchievement ? masterAchievement.icon : <Star size={32} />;
  };

  return (
    <div className={`${colors.cardBg} p-6 rounded-xl shadow-lg`}>
      <h2 className={`text-3xl font-semibold mb-6 ${colors.darkAccent}`}>
        Willkommen zurück!
      </h2>
      <p className="text-lg text-slate-600 mb-4">
        Hier ist dein Dashboard mit einer Übersicht deiner Erfolge und
        Fortschritte.
      </p>
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className={`${colors.navBg} p-4 rounded-lg shadow`}>
          <h3
            className={`text-xl font-medium ${colors.darkAccent} mb-2 flex items-center`}
          >
            <TrendingUp size={24} className="mr-2 text-emerald-500" />
            Aktueller Fokus
          </h3>
          <p className="text-slate-600">
            Definiere deine Hauptziele für die Woche.
          </p>
        </div>
        <div className={`${colors.navBg} p-4 rounded-lg shadow`}>
          <h3
            className={`text-xl font-medium ${colors.darkAccent} mb-2 flex items-center`}
          >
            <Star size={24} className="mr-2 text-amber-500" />
            Gamification
          </h3>
          <p className="text-slate-600">
            Sammle Punkte, steige Level auf und schalte Abzeichen frei!
          </p>
          <button
            onClick={() => {
              updateUserPoints(30);
            }}
            className={`mt-2 ${colors.buttonPrimaryBg} ${colors.buttonPrimaryText} px-4 py-2 rounded-md ${colors.buttonPrimaryHoverBg}`}
          >
            30 Test-Punkte
          </button>
        </div>
      </div>
      {achievementsArray.length > 0 ? (
        <div className="mt-10">
          <h3
            className={`text-2xl font-semibold mb-5 ${colors.darkAccent} flex items-center`}
          >
            <BadgeIcon size={28} className="mr-3 text-sky-500" />
            Deine Abzeichen
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {achievementsArray.map((ach) => (
              <div
                key={ach.id}
                className={`${colors.achievementCardBg} border border-sky-200 p-4 rounded-lg shadow-lg flex flex-col items-center text-center transition-all duration-300 ease-in-out transform hover:shadow-xl hover:-translate-y-1 group`}
              >
                <div
                  className={`mb-3 p-3 rounded-full bg-white shadow-md ${colors.achievementIconColor} group-hover:bg-sky-100 transition-colors`}
                >
                  {getAchievementIcon(ach.id)}
                </div>
                <p
                  className={`text-md font-semibold ${colors.darkAccent} mb-1`}
                >
                  {ach.name}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  Erhalten:{' '}
                  {ach.earnedAt?.toDate
                    ? ach.earnedAt.toDate().toLocaleDateString()
                    : 'Unbekannt'}
                </p>
                <button
                  className={`mt-auto p-1.5 rounded-full text-slate-400 hover:text-sky-600 focus:outline-none bg-white/50 group-hover:bg-white transition-colors`}
                  onClick={() =>
                    openModal(
                      ach.name,
                      `${ach.description}\n\nErhalten am: ${
                        ach.earnedAt?.toDate
                          ? ach.earnedAt.toDate().toLocaleDateString()
                          : 'Unbekannt'
                      }`,
                      'info'
                    )
                  }
                  title="Mehr Infos"
                >
                  <Info size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10 text-center">
          <h3
            className={`text-2xl font-semibold mb-5 ${colors.darkAccent} flex items-center justify-center`}
          >
            <BadgeIcon size={28} className="mr-3 text-sky-500" />
            Deine Abzeichen
          </h3>
          <p className="text-slate-500">
            Noch keine Abzeichen freigeschaltet. Bleib dran!
          </p>
        </div>
      )}
    </div>
  );
}

export default DashboardView;
