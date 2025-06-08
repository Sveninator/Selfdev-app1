import { LEVEL_THRESHOLDS } from './constants.jsx';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getCurrentLevel = (points) => {
  let currentLevel = LEVEL_THRESHOLDS[0];
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].points) {
      currentLevel = LEVEL_THRESHOLDS[i];
      break;
    }
  }
  return currentLevel;
};

export const getNextLevelInfo = (currentLevelPoints) => {
  const currentLevelData = getCurrentLevel(currentLevelPoints);
  const nextLevelIndex = LEVEL_THRESHOLDS.findIndex(
    (l) => l.level === currentLevelData.level + 1
  );

  if (nextLevelIndex === -1) {
    const pointsInCurrentMaxLevel =
      currentLevelPoints - currentLevelData.points;
    const prevLevelData = LEVEL_THRESHOLDS.find(
      (l) => l.level === currentLevelData.level - 1
    );
    const currentLevelSpanStart = currentLevelData.points;
    const prevLevelEndPoints = prevLevelData ? prevLevelData.points : 0;
    const totalPointsForMaxLevel =
      currentLevelSpanStart - prevLevelEndPoints > 0
        ? currentLevelSpanStart - prevLevelEndPoints
        : currentLevelData.points > 0
        ? currentLevelData.points
        : 1;

    return {
      pointsForNextLevel: 0,
      progressPercentage: 100,
      nextLevelName: 'Max Level',
      currentPointsInLevel: pointsInCurrentMaxLevel,
      totalPointsForLevelSpan: totalPointsForMaxLevel || 1,
    };
  }

  const nextLevel = LEVEL_THRESHOLDS[nextLevelIndex];
  const pointsInCurrentLevel = currentLevelPoints - currentLevelData.points;
  const pointsForNextLevelTotal = nextLevel.points - currentLevelData.points;
  const progressPercentage =
    pointsForNextLevelTotal > 0
      ? Math.min(
          100,
          Math.floor((pointsInCurrentLevel / pointsForNextLevelTotal) * 100)
        )
      : pointsForNextLevelTotal === 0 && pointsInCurrentLevel >= 0
      ? 100
      : 0;

  return {
    pointsForNextLevel: pointsForNextLevelTotal - pointsInCurrentLevel,
    progressPercentage: progressPercentage,
    currentPointsInLevel: pointsInCurrentLevel,
    totalPointsForLevelSpan: pointsForNextLevelTotal,
    nextLevelName: nextLevel.name,
  };
};
