import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, TrendingUp, Trophy, Share2, Copy, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@/hooks/use-wallet';
import PoolGameEngine from '@/components/pool/PoolGameEngine';
import confetti from 'canvas-confetti';

interface GamePlayer {
  id: string;
  username: string;
  buyIn: number;
  ballsHit: string[];
  balls: 'solid' | 'stripe' | null;
  isCurrentTurn: boolean;
}

interface GameData {
  id: number;
  status: 'waiting' | 'in-progress' | 'finished';
  creatorId: string;
  players: GamePlayer[];
  currentPlayerId: string;
  totalPot: number;
  createdAt: string;
}

interface VictoryData {
  winner: GamePlayer;
  payout: number;
  houseFee: number;
  netWinnings: number;
}

const PoolGamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshWallet } = useWallet();

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);
  const [showVictoryPopup, setShowVictoryPopup] = useState(false);
  const [showRaiseDialog, setShowRaiseDialog] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(5);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchGameData();
    const interval = setInterval(fetchGameData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [user, gameId, navigate]);

  const fetchGameData = async () => {
    try {
      const response = await fetch(`/api/pool/game/${gameId}`);
      const data = await response.json();

      if (data.success) {
        setGameData(data.data);

        // Check if game ended
        if (data.data.status === 'finished') {
          if (!gameEnded) {
            setGameEnded(true);
            setVictoryData(data.data.victoryData);
            setShowVictoryPopup(true);
            fireConfetti();
            await refreshWallet();
          }
        }
      } else {
        toast.error('Failed to load game data');
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    } finally {
      setLoading(false);
    }
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleGameEnd = async (winner: GamePlayer) => {
    try {
      const response = await fetch(`/api/pool/end-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: parseInt(gameId!),
          winnerId: winner.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setVictoryData(data.victoryData);
        setShowVictoryPopup(true);
        fireConfetti();
        await refreshWallet();
      } else {
        toast.error(data.error || 'Failed to end game');
      }
    } catch (error) {
      console.error('Error ending game:', error);
      toast.error('Error ending game');
    }
  };

  const handleRaise = async (amount: number) => {
    try {
      const response = await fetch(`/api/pool/raise-bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: parseInt(gameId!),
          raiseAmount: amount
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Raised by ${amount} SC! Total pot: ${data.newPot} SC`);
        setShowRaiseDialog(false);
        setRaiseAmount(5);
        await fetchGameData();
      } else {
        toast.error(data.error || 'Failed to raise');
      }
    } catch (error) {
      console.error('Error raising:', error);
      toast.error('Error processing raise');
    }
  };

  const shareWin = async (platform: string) => {
    if (!victoryData) return;

    const winMessage = `🎉 I just won ${victoryData.netWinnings.toFixed(2)} SC playing Pool Shark on PlayCoinKrazy! 🎱`;
    const url = 'https://playcoinkrazy.com';

    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(winMessage)}&url=${encodeURIComponent(url)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(winMessage)}`,
          '_blank'
        );
        break;
      case 'copy':
        navigator.clipboard.writeText(winMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copied to clipboard!');
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-white text-lg font-bold">Loading Pool Game...</p>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-red-500 max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-white text-lg font-bold">Game not found</p>
            <Button onClick={() => navigate('/pool-shark')} className="w-full">
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentUser = gameData.players.find(p => p.id === user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/pool-shark')}
            className="hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
          <div className="text-center">
            <Badge className="bg-blue-600 text-white mb-2">
              <Users className="w-3 h-3 mr-1" />
              {gameData.players.length} Players
            </Badge>
            <p className="text-3xl font-black text-yellow-400">
              POT: {gameData.totalPot.toFixed(2)} SC
            </p>
          </div>
        </div>

        {/* Game Status Alert */}
        {gameData.status === 'waiting' && (
          <Alert className="bg-blue-500/10 border-blue-500 text-blue-300">
            <AlertDescription>
              Waiting for opponent to join... Game will start when next player joins.
            </AlertDescription>
          </Alert>
        )}

        {gameData.status === 'finished' && (
          <Alert className="bg-green-500/10 border-green-500 text-green-300">
            <AlertDescription>
              Game finished! Check the victory popup for your winnings.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Engine */}
          <div className="lg:col-span-3">
            {gameData.status !== 'finished' ? (
              <PoolGameEngine
                gameId={gameData.id}
                players={gameData.players}
                currentPlayerId={user?.id || ''}
                onGameEnd={handleGameEnd}
                onRaise={(amount) => {
                  setRaiseAmount(amount);
                  setShowRaiseDialog(true);
                }}
              />
            ) : (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-12 text-center space-y-6">
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
                  <div>
                    <p className="text-sm text-slate-400 font-bold uppercase mb-2">Game Finished</p>
                    <p className="text-3xl font-black text-white">Game Over</p>
                  </div>
                  <Button
                    onClick={() => navigate('/pool-shark')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Back to Lobby
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Players Panel */}
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {gameData.players.map(player => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border-2 ${
                      player.id === gameData.currentPlayerId
                        ? 'bg-blue-500/20 border-blue-500'
                        : player.id === user?.id
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-sm">
                          {player.username}
                          {player.id === user?.id && ' (You)'}
                        </p>
                        <p className="text-xs text-slate-400">Buy-in: {player.buyIn} SC</p>
                      </div>
                      {player.id === gameData.currentPlayerId && (
                        <Badge className="bg-blue-600">Turn</Badge>
                      )}
                    </div>
                    {player.ballsHit.length > 0 && (
                      <p className="text-xs text-slate-300 mt-2">
                        Balls: {player.ballsHit.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Game Info */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Game Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <Badge variant={gameData.status === 'in-progress' ? 'default' : 'secondary'}>
                    {gameData.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">House Fee:</span>
                  <span className="font-bold text-orange-400">0.50 SC</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <p className="text-xs text-slate-500">
                    House takes 0.50 SC from final pot. Winner receives remainder.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            {gameData.status === 'in-progress' && currentUser && (
              <div className="space-y-2">
                <Button
                  onClick={() => setShowRaiseDialog(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 font-bold"
                  disabled={gameData.currentPlayerId !== user?.id}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Raise Bet
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Victory Popup */}
      <Dialog open={showVictoryPopup} onOpenChange={setShowVictoryPopup}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-slate-950 border-yellow-500/50 max-w-md">
          <DialogHeader>
            <div className="text-center space-y-4">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce" />
              <DialogTitle className="text-3xl font-black text-white">
                🎉 CONGRATS! 🎉
              </DialogTitle>
            </div>
          </DialogHeader>

          {victoryData && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-400 font-bold uppercase">You Won</p>
                <p className="text-4xl font-black text-yellow-400">
                  {victoryData.netWinnings.toFixed(2)} SC!
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Total Pot:</span>
                  <span className="font-bold">{victoryData.payout.toFixed(2)} SC</span>
                </div>
                <div className="flex justify-between text-orange-400">
                  <span>House Fee:</span>
                  <span className="font-bold">-{victoryData.houseFee.toFixed(2)} SC</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-green-400">
                  <span className="font-bold">Your Winnings:</span>
                  <span className="font-black text-lg">
                    {victoryData.netWinnings.toFixed(2)} SC
                  </span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-white font-bold mb-2">
                  Playing Pool Shark - CoinkKrazy's new pool game!
                </p>
                <p className="text-xs text-slate-400">
                  Share your win on social media and challenge your friends!
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => shareWin('twitter')}
                  size="sm"
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Twitter
                </Button>
                <Button
                  onClick={() => shareWin('facebook')}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Facebook
                </Button>
                <Button
                  onClick={() => shareWin('copy')}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setShowVictoryPopup(false);
                    navigate('/pool-shark');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 font-bold"
                >
                  Collect Winnings
                </Button>
                <Button
                  onClick={() => navigate('/pool-shark')}
                  variant="outline"
                  className="w-full border-slate-600 hover:bg-slate-800 font-bold"
                >
                  Back to Lobby
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Raise Dialog */}
      <Dialog open={showRaiseDialog} onOpenChange={setShowRaiseDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Raise Bet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-300 font-bold block mb-2">
                Raise Amount (SC)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg"
              />
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <p className="text-sm text-orange-300">
                Increase pot to {(gameData.totalPot + raiseAmount).toFixed(2)} SC
              </p>
            </div>
            <Button
              onClick={() => handleRaise(raiseAmount)}
              className="w-full bg-orange-600 hover:bg-orange-700 font-bold h-12"
            >
              Raise {raiseAmount} SC
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoolGamePage;
