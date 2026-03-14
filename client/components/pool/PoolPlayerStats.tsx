import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, TrendingUp, Target, Flame, Award, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface PlayerStats {
  id: number;
  player_id: number;
  total_games_played: number;
  total_games_won: number;
  win_rate: number;
  total_earnings: number;
  total_wagered: number;
  highest_win: number;
  current_streak: number;
  longest_streak: number;
  elo_rating: number;
  rank: number;
  skill_level: string;
  level: number;
  experience_points: number;
}

interface PoolPlayerStatsProps {
  playerId?: number;
}

const PoolPlayerStats: React.FC<PoolPlayerStatsProps> = ({ playerId }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const targetId = playerId || user?.id;

  useEffect(() => {
    if (targetId) {
      fetchStats();
    }
  }, [targetId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pool/stats/${targetId}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-slate-400">Loading stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert className="bg-slate-800 border-slate-700">
        <AlertDescription className="text-slate-300">
          No statistics available yet. Play your first Pool game!
        </AlertDescription>
      </Alert>
    );
  }

  const getSkillBadgeColor = (skill: string) => {
    switch (skill) {
      case 'expert':
        return 'bg-red-600 text-white';
      case 'advanced':
        return 'bg-purple-600 text-white';
      case 'intermediate':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-green-600 text-white';
    }
  };

  const getLevelProgress = (xp: number) => {
    const xpPerLevel = 1000;
    const currentLevelXp = stats.level * xpPerLevel;
    const nextLevelXp = (stats.level + 1) * xpPerLevel;
    const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Skill Level */}
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm font-bold uppercase">Skill</p>
              <Award className="w-4 h-4 text-yellow-400" />
            </div>
            <Badge className={getSkillBadgeColor(stats.skill_level)}>
              {stats.skill_level.charAt(0).toUpperCase() + stats.skill_level.slice(1)}
            </Badge>
          </CardContent>
        </Card>

        {/* ELO Rating */}
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="p-4">
            <p className="text-slate-400 text-sm font-bold uppercase">ELO</p>
            <p className="text-3xl font-black text-blue-400">{stats.elo_rating}</p>
            {stats.rank && <p className="text-xs text-slate-400">Rank #{stats.rank}</p>}
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm font-bold uppercase">Win Rate</p>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-3xl font-black text-green-400">{stats.win_rate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        {/* Level */}
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="p-4">
            <p className="text-slate-400 text-sm font-bold uppercase">Level</p>
            <div className="space-y-2">
              <p className="text-3xl font-black text-purple-400">{stats.level}</p>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${getLevelProgress(stats.experience_points)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Games Played */}
        <Card className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs font-bold uppercase">Games Played</p>
            <p className="text-2xl font-black text-white mt-2">
              {stats.total_games_played}
            </p>
          </CardContent>
        </Card>

        {/* Games Won */}
        <Card className="border-slate-700 bg-gradient-to-br from-green-900/20 to-slate-800">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs font-bold uppercase">Games Won</p>
            <p className="text-2xl font-black text-green-400 mt-2">
              {stats.total_games_won}
            </p>
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card className="border-slate-700 bg-gradient-to-br from-yellow-900/20 to-slate-800">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs font-bold uppercase">Total Earnings</p>
            <p className="text-2xl font-black text-yellow-400 mt-2">
              {stats.total_earnings.toFixed(2)} SC
            </p>
          </CardContent>
        </Card>

        {/* Highest Win */}
        <Card className="border-slate-700 bg-gradient-to-br from-orange-900/20 to-slate-800">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs font-bold uppercase">Highest Win</p>
            <p className="text-2xl font-black text-orange-400 mt-2">
              {stats.highest_win.toFixed(2)} SC
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Streak Info */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current Streak */}
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-bold uppercase">Current Streak</p>
                <p className="text-3xl font-black text-blue-400 mt-2">
                  {stats.current_streak}
                </p>
              </div>
              <Flame className={`w-8 h-8 ${stats.current_streak > 0 ? 'text-orange-400' : 'text-slate-600'}`} />
            </div>
          </CardContent>
        </Card>

        {/* Longest Streak */}
        <Card className="border-slate-700 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-bold uppercase">Best Streak</p>
                <p className="text-3xl font-black text-purple-400 mt-2">
                  {stats.longest_streak}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wagering Stats */}
      <Card className="border-slate-700 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            Wagering Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <p className="text-slate-400">Total Wagered</p>
            <p className="text-white font-bold">{stats.total_wagered.toFixed(2)} SC</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-slate-400">Return on Investment</p>
            <p className={`font-bold ${
              ((stats.total_earnings / stats.total_wagered) * 100) > 100
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {((stats.total_earnings / stats.total_wagered) * 100).toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoolPlayerStats;
