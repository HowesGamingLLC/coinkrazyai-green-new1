import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Coins, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Winner {
  id: number;
  username: string;
  amount: string;
  game: string;
  time: string;
  avatar: string;
}

// Fallback demo data
const FALLBACK_WINNERS: Winner[] = [
  { id: 1, username: 'SlotMaster99', amount: '1250.00 SC', game: 'CoinKrazy-CoinUp', time: '2m ago', avatar: '1' },
  { id: 2, username: 'LuckyLady', amount: '500.00 SC', game: 'CoinKrazy-Hot', time: '5m ago', avatar: '2' },
  { id: 3, username: 'CoinKing', amount: '850.50 SC', game: 'CoinKrazy-Thunder', time: '8m ago', avatar: '3' },
  { id: 4, username: 'DiceRoller', amount: '1250.00 SC', game: 'CoinKrazy-4Wolfs', time: '12m ago', avatar: '4' },
];

export const RecentWinners = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchWinners = async () => {
      if (!isMounted) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 15000); // 15 second timeout

        const response = await fetch('/api/platform/winners', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[RecentWinners] API returned ${response.status}`);
          if (isMounted) {
            setWinners(FALLBACK_WINNERS);
            setIsLoading(false);
          }
          return;
        }

        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          if (isMounted) {
            setWinners(result.data);
            setIsLoading(false);
          }
        } else {
          // Invalid response format, use fallback
          if (isMounted) {
            setWinners(FALLBACK_WINNERS);
            setIsLoading(false);
          }
        }
      } catch (error) {
        // Network error or timeout - use fallback data
        console.warn('[RecentWinners] Fetch failed, using fallback data:', error instanceof Error ? error.message : 'Unknown error');
        if (isMounted) {
          setWinners(FALLBACK_WINNERS);
          setIsLoading(false);
        }
      }
    };

    fetchWinners();
    // Refresh every 2 minutes instead of 1 to reduce server load
    const interval = setInterval(fetchWinners, 120000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (winners.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-black italic uppercase tracking-tight">Recent Big Winners</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {winners.map((winner) => (
          <Card key={winner.id} className="bg-slate-900/50 border-white/5 overflow-hidden group hover:border-yellow-500/30 transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-yellow-500/30 overflow-hidden bg-slate-800 flex-shrink-0">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${winner.avatar}`} alt={winner.username} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="font-black italic text-sm truncate text-white">{winner.username}</p>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{winner.time}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Coins className="w-3 h-3 text-yellow-500" />
                  <p className="text-yellow-500 font-black text-sm">{winner.amount}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase truncate mt-0.5">{winner.game}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
