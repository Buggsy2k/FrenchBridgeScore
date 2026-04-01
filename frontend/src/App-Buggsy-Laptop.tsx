import { useState, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useGame } from './context/GameContext';
import GameSetup from './components/GameSetup';
import ManagePlayers from './components/ManagePlayers';
import ScorekeeperPanel from './components/ScorekeeperPanel';
import GameOver from './components/GameOver';
import GameReport from './components/GameReport';

function RecoveryPrompt() {
  const { savedGame, resumeGame, dismissSavedGame } = useGame();
  if (!savedGame) return null;

  const players = savedGame.players.map((p) => p.name).join(', ');
  const currentHand = savedGame.currentHandIndex + 1;
  const totalHands = savedGame.hands.length;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Game in Progress</h2>
        <p className="text-gray-300">
          {players}
        </p>
        <p className="text-gray-400 text-sm">
          Hand {currentHand} of {totalHands}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={resumeGame}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-lg"
          >
            Resume Game
          </button>
          <button
            onClick={dismissSavedGame}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-xl text-lg"
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { game, savedGame } = useGame();
  const [page, setPage] = useState<'setup' | 'manage' | 'report'>('setup');

  const goBack = useCallback(() => setPage('setup'), []);

  useEffect(() => {
    const listener = CapApp.addListener('backButton', () => {
      if (page !== 'setup') {
        goBack();
      }
    });
    return () => { listener.then((h) => h.remove()); };
  }, [page, goBack]);

  if (!game && savedGame) return <RecoveryPrompt />;

  if (!game) {
    return (
      <>
        <div className={page !== 'setup' ? 'hidden' : ''}>
          <GameSetup onManagePlayers={() => setPage('manage')} onHistory={() => setPage('report')} visible={page === 'setup'} />
        </div>
        {page === 'manage' && <ManagePlayers onBack={() => setPage('setup')} />}
        {page === 'report' && <GameReport onBack={() => setPage('setup')} />}
      </>
    );
  }
  if (game.phase === 'finished') return <GameOver />;
  return <ScorekeeperPanel />;
}
