import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Users, DollarSign, ArrowLeft, Play, Plus, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@/hooks/use-wallet';
import PoolChallenge from '@/components/pool/PoolChallenge';
import PoolLeaderboard from '@/components/pool/PoolLeaderboard';
import PoolPlayerStats from '@/components/pool/PoolPlayerStats';

interface PoolTable {
  id: number;
  name: string;
  minBuyIn: number;
  maxBuyIn: number;
  playersInGame: number;
  maxPlayers: number;
  currentPot: number;
  status: 'waiting' | 'in-progress' | 'finished';
  createdAt: string;
}

type TabType = 'tables' | 'challenges' | 'stats' | 'leaderboard';

const PoolShark = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sweepsCoins, refreshWallet } = useWallet();

  const [tables, setTables] = useState<PoolTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<PoolTable | null>(null);
  const [buyInAmount, setBuyInAmount] = useState<number>(10);
  const [creatingGame, setCreatingGame] = useState(false);
  const [newGameBuyIn, setNewGameBuyIn] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<TabType>('tables');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (activeTab === 'tables') {
      fetchTables();
    }
  }, [user, navigate, activeTab]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pool/tables');
      const data = await response.json();

      if (data.success) {
        setTables(data.data || []);
      } else {
        toast.error('Failed to load pool tables');
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Error loading pool tables');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTable = async (table: PoolTable) => {
    try {
      if (buyInAmount < table.minBuyIn || buyInAmount > table.maxBuyIn) {
        toast.error(`Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn} SC`);
        return;
      }

      if (sweepsCoins < buyInAmount) {
        toast.error('Insufficient Sweeps Coins balance');
        return;
      }

      setCreatingGame(true);
      const response = await fetch('/api/pool/join-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id,
          buyInAmount
        })
      });

      const data = await response.json();
      if (data.success) {
        await refreshWallet();
        navigate(`/pool/game/${data.gameId}`);
      } else {
        toast.error(data.error || 'Failed to join table');
      }
    } catch (error) {
      console.error('Error joining table:', error);
      toast.error('Error joining table');
    } finally {
      setCreatingGame(false);
      setShowJoinDialog(false);
    }
  };

  const handleCreateGame = async () => {
    try {
      if (newGameBuyIn < 5 || newGameBuyIn > 1000) {
        toast.error('Buy-in must be between 5 and 1000 SC');
        return;
      }

      if (sweepsCoins < newGameBuyIn) {
        toast.error('Insufficient Sweeps Coins balance');
        return;
      }

      setCreatingGame(true);
      const response = await fetch('/api/pool/create-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyInAmount: newGameBuyIn
        })
      });

      const data = await response.json();
      if (data.success) {
        await refreshWallet();
        navigate(`/pool/game/${data.gameId}`);
      } else {
        toast.error(data.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Error creating game');
    } finally {
      setCreatingGame(false);
      setShowCreateDialog(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'in-progress':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'finished':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tables':
        return (
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-xl shadow-lg shadow-blue-500/30"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Table
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 border-slate-600 hover:bg-slate-800 font-black text-lg rounded-xl"
                onClick={fetchTables}
              >
                Refresh Tables
              </Button>
            </div>

            {/* Available Tables */}
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Available Tables</h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : tables.length === 0 ? (
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg mb-4">No tables available</p>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create the First Table
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tables.map((table) => (
                    <Card
                      key={table.id}
                      className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 transition-all cursor-pointer"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg text-white">{table.name}</CardTitle>
                          <Badge className={`${getStatusColor(table.status)} border`}>
                            {table.status === 'waiting' && 'Waiting'}
                            {table.status === 'in-progress' && 'In Progress'}
                            {table.status === 'finished' && 'Finished'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-xs">Buy-In Range</p>
                            <p className="text-white font-bold text-lg">
                              ${table.minBuyIn} - ${table.maxBuyIn}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-xs">Players</p>
                            <p className="text-white font-bold text-lg">
                              {table.playersInGame}/{table.maxPlayers}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-slate-400 font-bold uppercase text-xs">Pot</p>
                            <p className="text-yellow-400 font-black text-xl">
                              {table.currentPot.toFixed(2)} SC
                            </p>
                          </div>
                        </div>

                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 font-bold"
                          disabled={
                            table.playersInGame >= table.maxPlayers ||
                            table.status === 'finished'
                          }
                          onClick={() => {
                            setSelectedTable(table);
                            setBuyInAmount(table.minBuyIn);
                            setShowJoinDialog(true);
                          }}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Join Table
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'challenges':
        return <PoolChallenge />;

      case 'stats':
        return <PoolPlayerStats />;

      case 'leaderboard':
        return <PoolLeaderboard />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="hover:bg-slate-800">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lobby
            </Link>
          </Button>
          <div className="text-right">
            <p className="text-sm text-slate-400">Your Balance</p>
            <p className="text-3xl font-black text-green-400">{sweepsCoins.toFixed(2)} SC</p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 rounded-3xl blur-3xl" />
          <Card className="border-2 border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-900/20 to-slate-900 relative overflow-hidden shadow-2xl">
            <CardContent className="p-12 text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
                <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white uppercase">
                  POOL <span className="text-blue-400">SHARK</span>
                </h1>
                <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
              </div>
              <p className="text-xl md:text-2xl text-slate-300 font-bold uppercase tracking-tight italic">
                Challenge Players & Compete on PlayCoinKrazy
              </p>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Play competitive 8-ball with other players. Challenge friends, climb the leaderboard, and become the ultimate Pool Shark!
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Badge variant="outline" className="border-green-500 bg-green-500/10">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Winner Takes All
                </Badge>
                <Badge variant="outline" className="border-blue-500 bg-blue-500/10">
                  <Users className="w-3 h-3 mr-1" />
                  Multiplayer Challenges
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 flex-wrap justify-center">
          {(['tables', 'challenges', 'stats', 'leaderboard'] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-bold rounded-xl ${
                activeTab === tab
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {tab === 'tables' && <Play className="w-4 h-4 mr-2" />}
              {tab === 'challenges' && <Users className="w-4 h-4 mr-2" />}
              {tab === 'stats' && <BarChart3 className="w-4 h-4 mr-2" />}
              {tab === 'leaderboard' && <Trophy className="w-4 h-4 mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Join Table Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Join {selectedTable?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300 font-bold">Buy-In Amount (SC)</Label>
              <Input
                type="number"
                min={selectedTable?.minBuyIn}
                max={selectedTable?.maxBuyIn}
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mt-2 bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-2">
                Range: {selectedTable?.minBuyIn} - {selectedTable?.maxBuyIn} SC
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-slate-300">
                <span className="font-bold text-blue-400">House Fee: </span>
                0.50 SC (deducted from total pot after win)
              </p>
            </div>
            <Button
              onClick={() => {
                if (selectedTable) {
                  handleJoinTable(selectedTable);
                }
              }}
              disabled={creatingGame}
              className="w-full bg-green-600 hover:bg-green-700 font-bold h-12"
            >
              {creatingGame ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Join Table
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Game Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Create New Pool Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300 font-bold">Your Buy-In (SC)</Label>
              <Input
                type="number"
                min="5"
                max="1000"
                value={newGameBuyIn}
                onChange={(e) => setNewGameBuyIn(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mt-2 bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-2">Minimum 5 SC, Maximum 1000 SC</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-300">
                <span className="font-bold">Starting Pot:</span> {newGameBuyIn.toFixed(2)} SC
              </p>
              <p className="text-sm text-slate-300">
                <span className="font-bold">House Fee (after win):</span> 0.50 SC
              </p>
              <p className="text-sm text-slate-400 italic">
                Other players can join with their own buy-in amounts
              </p>
            </div>
            <Button
              onClick={handleCreateGame}
              disabled={creatingGame}
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12"
            >
              {creatingGame ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Table
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoolShark;
