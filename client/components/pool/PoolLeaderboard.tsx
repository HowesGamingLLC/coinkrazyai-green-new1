import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface LeaderboardEntry {
  id: number;
  player_id: number;
  username: string;
  elo_rating: number;
  wins: number;
  losses: number;
  rank: number;
  win_percentage: number;
  total_earnings: number;
  period: string;
}

interface LeaderboardProps {
  period?: 'daily' | 'weekly' | 'monthly' | 'alltime';
  limit?: number;
}

const PoolLeaderboard: React.FC<LeaderboardProps> = ({
  period = 'alltime',
  limit = 50
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period, limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/pool/leaderboard?period=${period}&limit=${limit}`
      );
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      } else {
        toast.error('Failed to load leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-300';
      case 3:
        return 'text-orange-400';
      default:
        return 'text-slate-300';
    }
  };

  const getSkillBadge = (wins: number, losses: number) => {
    const totalGames = wins + losses;
    if (totalGames === 0) return 'Beginner';
    const winRate = (wins / totalGames) * 100;

    if (winRate >= 75) return 'Expert';
    if (winRate >= 60) return 'Advanced';
    if (winRate >= 45) return 'Intermediate';
    return 'Beginner';
  };

  const getSkillColor = (wins: number, losses: number) => {
    const skill = getSkillBadge(wins, losses);
    switch (skill) {
      case 'Expert':
        return 'bg-red-600 text-white';
      case 'Advanced':
        return 'bg-purple-600 text-white';
      case 'Intermediate':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-green-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Trophy className="w-12 h-12 animate-bounce text-yellow-400 mx-auto mb-4" />
          <p className="text-white font-bold">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white uppercase">Pool Leaderboard</h2>
        <Badge variant="outline" className="border-blue-500 text-blue-300">
          {leaderboard.length} Players
        </Badge>
      </div>

      {leaderboard.length > 0 ? (
        <div className="space-y-3">
          {leaderboard.slice(0, 5).map((entry, index) => (
            <Card
              key={entry.id}
              className={`border-2 bg-gradient-to-r ${
                index === 0
                  ? 'from-yellow-900/30 to-slate-900 border-yellow-500/50'
                  : index === 1
                  ? 'from-gray-700/30 to-slate-900 border-gray-500/50'
                  : index === 2
                  ? 'from-orange-900/30 to-slate-900 border-orange-500/50'
                  : 'from-slate-800 to-slate-900 border-slate-700'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Rank & Player */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`text-2xl font-black ${getRankColor(entry.rank)} w-12 text-center`}>
                      {getMedalEmoji(entry.rank)}
                      {entry.rank}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{entry.username}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={getSkillColor(entry.wins, entry.losses)}>
                          {getSkillBadge(entry.wins, entry.losses)}
                        </Badge>
                        <Badge variant="outline" className="border-blue-500 text-blue-300">
                          <Zap className="w-3 h-3 mr-1" />
                          {entry.elo_rating}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-slate-400 text-sm font-bold uppercase">Record</p>
                      <p className="text-white font-black text-lg">
                        {entry.wins}-{entry.losses}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-sm font-bold uppercase">Win Rate</p>
                      <p className="text-green-400 font-black text-lg">
                        {entry.win_percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-sm font-bold uppercase">Earnings</p>
                      <p className="text-yellow-400 font-black text-lg">
                        {entry.total_earnings.toFixed(2)} SC
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile Stats */}
                <div className="md:hidden grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase">Record</p>
                    <p className="text-white font-bold">{entry.wins}W-{entry.losses}L</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase">Win %</p>
                    <p className="text-green-400 font-bold">{entry.win_percentage.toFixed(0)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase">Earnings</p>
                    <p className="text-yellow-400 font-bold">{entry.total_earnings.toFixed(0)} SC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Rest of leaderboard in table format */}
          {leaderboard.length > 5 && (
            <Card className="border-slate-700 bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Top 10-{leaderboard.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.slice(5).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-slate-400 font-bold w-8 text-center">
                          #{entry.rank}
                        </div>
                        <div>
                          <p className="text-white font-bold">{entry.username}</p>
                          <p className="text-xs text-slate-400">
                            {entry.wins}W - {entry.losses}L
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 font-bold">{entry.elo_rating}</p>
                        <p className="text-xs text-slate-400">{entry.win_percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No leaderboard data available yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PoolLeaderboard;
