import React, { useState, useEffect } from 'react';
import { adminV2, games } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Gamepad2, TrendingUp, Search, Toggle2, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Game {
  id: number;
  name: string;
  category: string;
  provider: string;
  rtp: number;
  volatility: string;
  enabled: boolean;
  players_today: number;
  revenue_today: number;
  spins_today: number;
}

const AdminGameManagementPro: React.FC = () => {
  const [games_, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [newRTP, setNewRTP] = useState(95);

  const categories = ['all', 'Slots', 'Poker', 'Bingo', 'Sportsbook', 'External'];

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      const response = await games.getGames();
      const gamesList = Array.isArray(response?.data) ? response.data : (response || []);
      setGames(gamesList);
    } catch (error) {
      console.error('Failed to load games:', error);
      toast.error('Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleGame = async (gameId: number) => {
    try {
      const game = games_.find(g => g.id === gameId);
      if (!game) return;

      await adminV2.games.update(gameId, { enabled: !game.enabled });
      setGames(games_.map(g => g.id === gameId ? { ...g, enabled: !g.enabled } : g));
      toast.success(`Game ${!game.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to toggle game');
    }
  };

  const handleUpdateRTP = async (gameId: number) => {
    try {
      await adminV2.games.update(gameId, { rtp: newRTP });
      setGames(games_.map(g => g.id === gameId ? { ...g, rtp: newRTP } : g));
      setEditingGame(null);
      toast.success('RTP updated');
    } catch (error) {
      toast.error('Failed to update RTP');
    }
  };

  const filteredGames = games_.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Games ({filteredGames.length})</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* GAMES LIST */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Library</CardTitle>
              <CardDescription>Manage all games, RTP, and availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-64">
                  <Input
                    placeholder="Search games..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Games Table */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredGames.map(game => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <h4 className="font-bold">{game.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{game.category}</Badge>
                        <Badge variant="outline">{game.provider}</Badge>
                        <Badge variant="secondary">RTP: {game.rtp}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        👥 {game.players_today} | 💰 ${game.revenue_today.toFixed(2)} | 🎰 {game.spins_today}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button
                        size="sm"
                        variant={game.enabled ? 'default' : 'outline'}
                        onClick={() => handleToggleGame(game.id)}
                      >
                        {game.enabled ? 'Enabled' : 'Disabled'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingGame(game);
                          setNewRTP(game.rtp);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROVIDERS */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Providers</CardTitle>
              <CardDescription>Manage third-party game providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
              <p className="text-muted-foreground text-center py-8">Provider management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-4">
          {editingGame && (
            <Card className="border-blue-500">
              <CardHeader>
                <CardTitle>Edit: {editingGame.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">RTP (%)</label>
                  <Input
                    type="number"
                    min="50"
                    max="99"
                    value={newRTP}
                    onChange={(e) => setNewRTP(Number(e.target.value))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleUpdateRTP(editingGame.id)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingGame(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGameManagementPro;
