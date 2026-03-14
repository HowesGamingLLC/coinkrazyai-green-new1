import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Users, Trophy, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@/hooks/use-wallet';

interface Challenge {
  id: number;
  challenger_id: number;
  opponent_id: number;
  challenger_username: string;
  opponent_username: string;
  buy_in_amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  message: string;
  direction: 'sent' | 'received';
  created_at: string;
  expires_at: string;
}

interface Opponent {
  id: number;
  username: string;
  elo_rating: number;
  skill_level: string;
  win_percentage: number;
  total_games_won: number;
  sweeps_coins: number;
}

const PoolChallenge: React.FC = () => {
  const { user } = useAuth();
  const { sweepsCoins, refreshWallet } = useWallet();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [showFindOpponentsDialog, setShowFindOpponentsDialog] = useState(false);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [buyInAmount, setBuyInAmount] = useState<number>(10);
  const [message, setMessage] = useState<string>('');
  const [sendingChallenge, setSendingChallenge] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pool/challenges');
      const data = await response.json();

      if (data.success) {
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const findOpponents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pool/find-opponents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyInAmount })
      });

      const data = await response.json();
      if (data.success) {
        setOpponents(data.opponents || []);
        if (data.opponents.length === 0) {
          toast.info('No opponents found with your criteria');
        }
      } else {
        toast.error(data.error || 'Failed to find opponents');
      }
    } catch (error) {
      console.error('Error finding opponents:', error);
      toast.error('Failed to find opponents');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChallenge = async () => {
    if (!selectedOpponent) {
      toast.error('Please select an opponent');
      return;
    }

    if (buyInAmount <= 0 || buyInAmount > sweepsCoins) {
      toast.error('Invalid buy-in amount');
      return;
    }

    try {
      setSendingChallenge(true);
      const response = await fetch('/api/pool/challenge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentId: selectedOpponent.id,
          buyInAmount,
          message: message || null
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Challenge sent to ${selectedOpponent.username}!`);
        setShowChallengeDialog(false);
        setMessage('');
        setSelectedOpponent(null);
        await fetchChallenges();
      } else {
        toast.error(data.error || 'Failed to send challenge');
      }
    } catch (error) {
      console.error('Error sending challenge:', error);
      toast.error('Failed to send challenge');
    } finally {
      setSendingChallenge(false);
    }
  };

  const handleAcceptChallenge = async (challengeId: number) => {
    try {
      const response = await fetch('/api/pool/challenge/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Challenge accepted! Starting game...');
        // In a real app, navigate to the game
        window.location.href = `/pool/game/${data.gameId}`;
      } else {
        toast.error(data.error || 'Failed to accept challenge');
      }
    } catch (error) {
      console.error('Error accepting challenge:', error);
      toast.error('Failed to accept challenge');
    }
  };

  const handleDeclineChallenge = async (challengeId: number) => {
    try {
      const response = await fetch('/api/pool/challenge/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Challenge declined');
        await fetchChallenges();
      } else {
        toast.error(data.error || 'Failed to decline challenge');
      }
    } catch (error) {
      console.error('Error declining challenge:', error);
      toast.error('Failed to decline challenge');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'accepted':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'declined':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const pendingReceivedChallenges = challenges.filter(
    c => c.status === 'pending' && c.direction === 'received'
  );

  const sentChallenges = challenges.filter(c => c.direction === 'sent');

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={() => {
            setShowFindOpponentsDialog(true);
            findOpponents();
          }}
          className="bg-blue-600 hover:bg-blue-700 font-bold h-12"
        >
          <Users className="w-5 h-5 mr-2" />
          Challenge a Player
        </Button>
        <Button
          onClick={fetchChallenges}
          variant="outline"
          className="border-slate-600 hover:bg-slate-800 font-bold h-12"
        >
          Refresh Challenges
        </Button>
      </div>

      {/* Pending Challenges (Received) */}
      {pendingReceivedChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase">Challenge Requests</h2>
          <div className="space-y-3">
            {pendingReceivedChallenges.map(challenge => (
              <Card
                key={challenge.id}
                className="border-yellow-500/30 bg-gradient-to-r from-yellow-900/20 to-slate-900"
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-white">
                        {challenge.challenger_username} challenges you!
                      </p>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-yellow-600">
                          <Trophy className="w-3 h-3 mr-1" />
                          {challenge.buy_in_amount.toFixed(2)} SC Buy-In
                        </Badge>
                        <Badge variant="outline" className="border-slate-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Expires in 24h
                        </Badge>
                      </div>
                      {challenge.message && (
                        <p className="text-sm text-slate-300 italic">"{challenge.message}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleAcceptChallenge(challenge.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 font-bold"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleDeclineChallenge(challenge.id)}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-400 hover:bg-red-900"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sent Challenges */}
      {sentChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase">Your Challenges</h2>
          <div className="space-y-3">
            {sentChallenges.map(challenge => (
              <Card
                key={challenge.id}
                className={`border ${getStatusColor(challenge.status)}`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">
                        {challenge.opponent_username}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-slate-700">
                          <Trophy className="w-3 h-3 mr-1" />
                          {challenge.buy_in_amount.toFixed(2)} SC
                        </Badge>
                        <Badge className={getStatusColor(challenge.status)}>
                          {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {challenges.length === 0 && !loading && (
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-4">No active challenges</p>
            <Button
              onClick={() => setShowFindOpponentsDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Challenge Someone
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Find Opponents Dialog */}
      <Dialog open={showFindOpponentsDialog} onOpenChange={setShowFindOpponentsDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Challenge a Player</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Buy-In Selection */}
            <div>
              <Label className="text-slate-300 font-bold">Buy-In Amount (SC)</Label>
              <Input
                type="number"
                min="1"
                max={sweepsCoins}
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                className="mt-2 bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-2">
                Your balance: {sweepsCoins.toFixed(2)} SC
              </p>
            </div>

            {/* Opponents List */}
            {opponents.length > 0 ? (
              <div>
                <h3 className="text-white font-bold mb-3">
                  Available Opponents ({opponents.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {opponents.map(opponent => (
                    <div
                      key={opponent.id}
                      onClick={() => setSelectedOpponent(opponent)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedOpponent?.id === opponent.id
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-lg">{opponent.username}</p>
                          <p className="text-sm text-slate-400">
                            Skill: {opponent.skill_level} | ELO: {opponent.elo_rating}
                          </p>
                          <p className="text-sm text-slate-400">
                            {opponent.win_percentage.toFixed(1)}% Win Rate | {opponent.total_games_won} Wins
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="border-green-500">
                            {opponent.sweeps_coins.toFixed(2)} SC
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert className="bg-slate-800 border-slate-700">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-slate-300">
                  No opponents found with available balance. Try adjusting your buy-in amount.
                </AlertDescription>
              </Alert>
            )}

            {/* Challenge Message */}
            <div>
              <Label className="text-slate-300 font-bold">Message (Optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a friendly message to your challenge..."
                className="mt-2 bg-slate-800 border-slate-700 text-white min-h-20"
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendChallenge}
              disabled={sendingChallenge || !selectedOpponent || buyInAmount <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12"
            >
              {sendingChallenge ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Challenge
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoolChallenge;
