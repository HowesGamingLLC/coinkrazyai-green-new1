import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Users, DollarSign, Trophy, Spade, Heart, Diamond, Club } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import confetti from 'canvas-confetti';

interface PokerGameEngineProps {
  tableId?: number;
  tableName?: string;
  stakes?: string;
  maxPlayers?: number;
}

interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
}

interface Player {
  id: string;
  name: string;
  stack: number;
  hole: Card[];
  hand: string;
  handRank: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isActive: boolean;
  bet: number;
  folded: boolean;
}

interface GameState {
  balance: number;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  gamePhase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  button: number;
  smallBlind: number;
  bigBlind: number;
  winCount: number;
  totalWinnings: number;
}

const SUITS: Array<'spades' | 'hearts' | 'diamonds' | 'clubs'> = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Array<'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'> = [
  'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'
];

const getSuitIcon = (suit: string) => {
  switch (suit) {
    case 'spades': return '♠️';
    case 'hearts': return '♥️';
    case 'diamonds': return '♦️';
    case 'clubs': return '♣️';
    default: return '';
  }
};

const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

const RANK_VALUES = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5,
  '4': 4, '3': 3, '2': 2
};

const evaluateHand = (hole: Card[], community: Card[]): { hand: string; rank: number } => {
  const allCards = [...hole, ...community];

  // Count ranks and suits
  const rankCounts = new Map<string, number>();
  const suitCounts = new Map<string, number>();

  for (const card of allCards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  }

  // Check for flush (5 cards of same suit)
  const isFlush = Array.from(suitCounts.values()).some(count => count >= 5);

  // Check for straight (5 consecutive cards)
  const sortedRanks = Array.from(
    new Set(allCards.map(c => RANK_VALUES[c.rank as keyof typeof RANK_VALUES]))
  ).sort((a, b) => b - a);

  let isStraight = false;
  for (let i = 0; i <= sortedRanks.length - 5; i++) {
    if (sortedRanks[i] - sortedRanks[i + 4] === 4) {
      isStraight = true;
      break;
    }
  }

  // Check for pairs, three of a kind, four of a kind
  const pairs = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 2)
    .length;

  const threeOfAKind = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 3)
    .length > 0;

  const fourOfAKind = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 4)
    .length > 0;

  // Determine hand ranking (higher number = better hand)
  if (fourOfAKind) {
    return { hand: 'Four of a Kind', rank: 8 };
  }
  if (threeOfAKind && pairs >= 1) {
    return { hand: 'Full House', rank: 7 };
  }
  if (isFlush) {
    return { hand: 'Flush', rank: 6 };
  }
  if (isStraight) {
    return { hand: 'Straight', rank: 5 };
  }
  if (threeOfAKind) {
    return { hand: 'Three of a Kind', rank: 4 };
  }
  if (pairs >= 2) {
    return { hand: 'Two Pair', rank: 3 };
  }
  if (pairs === 1) {
    return { hand: 'One Pair', rank: 2 };
  }

  return { hand: 'High Card', rank: 1 };
};

const PokerGameEngine: React.FC<PokerGameEngineProps> = ({
  tableId,
  tableName = 'Diamond Table 1',
  stakes = '$1/$2',
  maxPlayers = 8,
}) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>({
    balance: 1000,
    players: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    gamePhase: 'waiting',
    button: 0,
    smallBlind: 1,
    bigBlind: 2,
    winCount: 0,
    totalWinnings: 0,
  });

  const [myBet, setMyBet] = useState(0);
  const [myAction, setMyAction] = useState<'fold' | 'check' | 'call' | 'raise' | null>(null);

  useEffect(() => {
    if (user) {
      setGameState(prev => ({
        ...prev,
        balance: (user as any).sc_balance || 1000,
      }));
    }
    initializeGame();
  }, [user]);

  const initializeGame = () => {
    // Create players
    const players: Player[] = [
      {
        id: 'player-1',
        name: user?.name || 'You',
        stack: 1000,
        hole: [],
        hand: '',
        handRank: 0,
        isDealer: true,
        isSmallBlind: false,
        isBigBlind: false,
        isActive: true,
        bet: 0,
        folded: false,
      },
    ];

    // Add AI players
    for (let i = 1; i < Math.min(4, maxPlayers); i++) {
      players.push({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        stack: 1000 + Math.random() * 500,
        hole: [],
        hand: '',
        handRank: 0,
        isDealer: i === 0,
        isSmallBlind: i === 1,
        isBigBlind: i === 2,
        isActive: true,
        bet: 0,
        folded: false,
      });
    }

    // Deal cards
    const deck = generateDeck();
    let deckIndex = 0;

    for (const player of players) {
      player.hole = [deck[deckIndex++], deck[deckIndex++]];
    }

    setGameState(prev => ({
      ...prev,
      players,
      gamePhase: 'preflop',
      pot: 3, // Small blind + big blind
    }));
  };

  const dealFlop = () => {
    const deck = generateDeck();
    setGameState(prev => ({
      ...prev,
      communityCards: [deck[0], deck[1], deck[2]],
      gamePhase: 'flop',
    }));
  };

  const dealTurn = () => {
    const deck = generateDeck();
    setGameState(prev => ({
      ...prev,
      communityCards: [...prev.communityCards, deck[0]],
      gamePhase: 'turn',
    }));
  };

  const dealRiver = () => {
    const deck = generateDeck();
    setGameState(prev => ({
      ...prev,
      communityCards: [...prev.communityCards, deck[0]],
      gamePhase: 'river',
    }));
  };

  const handleFold = () => {
    setMyAction('fold');
    toast.info('You folded');
    setMyBet(0);

    setGameState(prev => ({
      ...prev,
      players: prev.players.map((p, idx) =>
        idx === 0 ? { ...p, folded: true } : p
      ),
    }));
  };

  const handleCall = () => {
    const callAmount = gameState.currentBet - myBet;
    if (gameState.balance < callAmount) {
      toast.error('Insufficient balance');
      return;
    }

    setMyAction('call');
    setMyBet(gameState.currentBet);
    setGameState(prev => ({
      ...prev,
      balance: prev.balance - callAmount,
      pot: prev.pot + callAmount,
    }));

    toast.info(`Called ${callAmount.toFixed(2)}`);
  };

  const handleRaise = (amount: number) => {
    const totalBet = myBet + amount;
    if (gameState.balance < amount) {
      toast.error('Insufficient balance');
      return;
    }

    setMyAction('raise');
    setMyBet(totalBet);
    setGameState(prev => ({
      ...prev,
      balance: prev.balance - amount,
      pot: prev.pot + amount,
      currentBet: totalBet,
    }));

    toast.info(`Raised to ${totalBet.toFixed(2)}`);
  };

  const handleAllIn = () => {
    handleRaise(gameState.balance);
  };

  const showdown = () => {
    // Evaluate hands
    const evaluatedPlayers = gameState.players.map(p => {
      const evaluation = evaluateHand(p.hole, gameState.communityCards);
      return {
        ...p,
        hand: evaluation.hand,
        handRank: evaluation.rank,
      };
    });

    // Find winner
    const winner = evaluatedPlayers.reduce((best, current) =>
      current.handRank > best.handRank ? current : best
    );

    const winAmount = Math.min(gameState.pot * 0.9, 10); // Max 10 SC win

    if (winner.id === 'player-1') {
      toast.success(`🎉 You won ${winAmount.toFixed(2)} SC with ${winner.hand}!`);
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
      });

      setGameState(prev => ({
        ...prev,
        gamePhase: 'showdown',
        balance: prev.balance + winAmount,
        winCount: prev.winCount + 1,
        totalWinnings: prev.totalWinnings + winAmount,
        players: evaluatedPlayers,
      }));
    } else {
      toast.info(`${winner.name} won with ${winner.hand}`);
      setGameState(prev => ({
        ...prev,
        gamePhase: 'showdown',
        players: evaluatedPlayers,
      }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black italic uppercase text-white">{tableName}</h1>
        <p className="text-blue-400 font-bold uppercase tracking-widest text-sm">Stakes: {stakes} • Blinds: ${parseFloat(stakes) / 2}/${parseFloat(stakes)}</p>
      </div>

      {/* Table Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-sm font-bold uppercase">Your Stack</p>
            <p className="text-2xl font-black text-white">{gameState.balance.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-sm font-bold uppercase">Pot</p>
            <p className="text-2xl font-black text-green-400">${gameState.pot.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-sm font-bold uppercase">Players</p>
            <p className="text-2xl font-black text-white">{gameState.players.length}/{maxPlayers}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-sm font-bold uppercase">Total Won</p>
            <p className="text-2xl font-black text-yellow-400">${gameState.totalWinnings.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Poker Table */}
      <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-blue-500/30">
        <CardContent className="p-8">
          {/* Community Cards */}
          <div className="mb-8 space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-400">Community Cards</h3>
            <div className="flex gap-2 justify-center">
              {gameState.communityCards.map((card, idx) => (
                <div
                  key={idx}
                  className="w-20 h-28 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-slate-400 shadow-lg"
                >
                  <span className={`text-2xl font-black ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                    {card.rank}
                  </span>
                  <span className="text-3xl">{getSuitIcon(card.suit)}</span>
                </div>
              ))}
              {gameState.communityCards.length < 5 && (
                Array.from({ length: 5 - gameState.communityCards.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="w-20 h-28 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg border-2 border-slate-600"
                  />
                ))
              )}
            </div>
          </div>

          {/* Your Hand */}
          <div className="mb-8 space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-400">Your Hand</h3>
            <div className="flex gap-4 justify-center">
              {gameState.players[0]?.hole?.map((card, idx) => (
                <div
                  key={idx}
                  className="w-24 h-32 bg-white rounded-lg flex flex-col items-center justify-center border-4 border-yellow-500 shadow-xl"
                >
                  <span className={`text-3xl font-black ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                    {card.rank}
                  </span>
                  <span className="text-4xl">{getSuitIcon(card.suit)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Other Players */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase text-slate-400 mb-4">Table</h3>
            <div className="grid grid-cols-3 gap-4">
              {gameState.players.slice(1).map((player, idx) => (
                <div key={player.id} className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{player.name}</span>
                    {player.isDealer && <Badge className="bg-yellow-600">D</Badge>}
                  </div>
                  <p className="text-xl font-black text-white mb-2">${player.stack.toFixed(2)}</p>
                  <div className="flex gap-1 justify-center">
                    <div className="w-8 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded border border-slate-500" />
                    <div className="w-8 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded border border-slate-500" />
                  </div>
                  {player.bet > 0 && (
                    <p className="text-xs font-bold text-green-400 mt-2">Bet: ${player.bet.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {gameState.gamePhase !== 'showdown' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-400">Your Action</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  onClick={handleFold}
                  className="bg-red-600 hover:bg-red-700 text-white font-black"
                >
                  FOLD
                </Button>
                <Button
                  onClick={handleCall}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black"
                >
                  CALL
                </Button>
                <Button
                  onClick={() => handleRaise(gameState.currentBet)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-black font-black"
                >
                  RAISE
                </Button>
                <Button
                  onClick={handleAllIn}
                  className="bg-green-600 hover:bg-green-700 text-white font-black"
                >
                  ALL IN
                </Button>
              </div>

              {/* Street Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                <Button
                  onClick={dealFlop}
                  variant="outline"
                  disabled={gameState.communityCards.length > 0}
                >
                  Flop
                </Button>
                <Button
                  onClick={dealTurn}
                  variant="outline"
                  disabled={gameState.communityCards.length < 3}
                >
                  Turn
                </Button>
                <Button
                  onClick={dealRiver}
                  variant="outline"
                  disabled={gameState.communityCards.length < 4}
                >
                  River
                </Button>
                <Button
                  onClick={showdown}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black"
                  disabled={gameState.communityCards.length < 5}
                >
                  Showdown
                </Button>
              </div>
            </div>
          )}

          {gameState.gamePhase === 'showdown' && (
            <Button
              onClick={initializeGame}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg italic rounded-xl"
            >
              NEW HAND
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PokerGameEngine;
