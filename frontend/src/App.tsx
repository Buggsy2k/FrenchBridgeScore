import { useGame } from './context/GameContext';
import GameSetup from './components/GameSetup';
import ScorekeeperPanel from './components/ScorekeeperPanel';
import GameOver from './components/GameOver';

export default function App() {
  const { game } = useGame();

  if (!game) return <GameSetup />;
  if (game.phase === 'finished') return <GameOver />;
  return <ScorekeeperPanel />;
}
