import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Trophy, Zap, Gift, Users } from 'lucide-react';
import { io } from 'socket.io-client';

interface Activity {
  id: string;
  type: 'win' | 'achievement' | 'level' | 'bonus' | 'friend' | 'milestone';
  username: string;
  playerName: string;
  description: string;
  amount?: number;
  timestamp: string;
  icon: React.ReactNode;
}

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const socket = io();

    // Listen for various activity events
    socket.on('activity:win', (data) => {
      setActivities(prev => [{
        id: Date.now().toString(),
        type: 'win',
        username: data.username,
        playerName: data.playerName,
        description: `Won ${data.amount} SC`,
        amount: data.amount,
        timestamp: new Date().toISOString(),
        icon: <Trophy className="w-4 h-4 text-yellow-600" />
      }, ...prev].slice(0, 20));
    });

    socket.on('activity:achievement', (data) => {
      setActivities(prev => [{
        id: Date.now().toString(),
        type: 'achievement',
        username: data.username,
        playerName: data.playerName,
        description: `Unlocked: ${data.achievement}`,
        timestamp: new Date().toISOString(),
        icon: <Zap className="w-4 h-4 text-purple-600" />
      }, ...prev].slice(0, 20));
    });

    socket.on('activity:bonus', (data) => {
      setActivities(prev => [{
        id: Date.now().toString(),
        type: 'bonus',
        username: data.username,
        playerName: data.playerName,
        description: `Claimed ${data.amount} SC bonus`,
        amount: data.amount,
        timestamp: new Date().toISOString(),
        icon: <Gift className="w-4 h-4 text-green-600" />
      }, ...prev].slice(0, 20));
    });

    socket.on('activity:milestone', (data) => {
      setActivities(prev => [{
        id: Date.now().toString(),
        type: 'milestone',
        username: data.username,
        playerName: data.playerName,
        description: data.description,
        timestamp: new Date().toISOString(),
        icon: <Heart className="w-4 h-4 text-red-600" />
      }, ...prev].slice(0, 20));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Mock initial data
  useEffect(() => {
    setActivities([
      {
        id: '1',
        type: 'win',
        username: 'lucky_luke',
        playerName: 'Lucky Luke',
        description: 'Won 500 SC on Mega Spin Slots',
        amount: 500,
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        icon: <Trophy className="w-4 h-4 text-yellow-600" />
      },
      {
        id: '2',
        type: 'achievement',
        username: 'player_pro',
        playerName: 'Pro Player',
        description: 'Unlocked: Slot Master',
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
        icon: <Zap className="w-4 h-4 text-purple-600" />
      },
      {
        id: '3',
        type: 'bonus',
        username: 'mega_wins',
        playerName: 'Mega Wins',
        description: 'Claimed 100 SC Daily Bonus',
        amount: 100,
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        icon: <Gift className="w-4 h-4 text-green-600" />
      },
    ]);
  }, []);

  const getTypeColor = (type: Activity['type']) => {
    switch (type) {
      case 'win': return 'bg-yellow-100 text-yellow-700';
      case 'achievement': return 'bg-purple-100 text-purple-700';
      case 'bonus': return 'bg-green-100 text-green-700';
      case 'milestone': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Live Activity</CardTitle>
        <CardDescription>See what your community is doing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activities yet</p>
        ) : (
          activities.map(activity => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="mt-1">{activity.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold truncate">{activity.playerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <Badge className={`text-xs whitespace-nowrap ${getTypeColor(activity.type)}`}>
                    {activity.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatTime(activity.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
