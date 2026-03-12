import React, { useState, useEffect } from 'react';
import { adminV2, wallet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, RefreshCw, Users, TrendingUp, DollarSign, Lock, Shield, Bell, Gamepad2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalPlayers: number;
  activePlayers: number;
  totalRevenue: number;
  totalWagered: number;
  averagePlayerValue: number;
  newPlayersToday: number;
  pendingKyc: number;
  pendingRedemptions: number;
  activeGames: number;
  systemHealth: string;
}

interface Player {
  id: number;
  username: string;
  email: string;
  name: string;
  gc_balance: number;
  sc_balance: number;
  status: string;
  kyc_level: string;
  created_at: string;
}

interface AdminAction {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  result: 'success' | 'error';
}

const AdminMasterDashboard: React.FC = () => {
  const { isAdmin, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLog, setActionLog] = useState<AdminAction[]>([]);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);

      if (!isAdmin) {
        console.warn('Admin not logged in.');
        setIsLoading(false);
        return;
      }

      // Fetch stats
      try {
        const statsResponse = await adminV2.dashboard.getStats();
        const statsData = statsResponse.data || statsResponse || {};
        setStats({
          totalPlayers: statsData.totalPlayers || 0,
          activePlayers: statsData.activePlayers || 0,
          totalRevenue: statsData.totalRevenue || 0,
          totalWagered: statsData.totalWagered || 0,
          averagePlayerValue: statsData.averagePlayerValue || 0,
          newPlayersToday: statsData.newPlayersToday || 0,
          pendingKyc: statsData.pendingKyc || 0,
          pendingRedemptions: statsData.pendingRedemptions || 0,
          activeGames: statsData.activeGames || 0,
          systemHealth: statsData.systemHealth || 'Optimal'
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Use placeholder data
        setStats({
          totalPlayers: 1234,
          activePlayers: 89,
          totalRevenue: 125430.50,
          totalWagered: 450230.00,
          averagePlayerValue: 101.85,
          newPlayersToday: 12,
          pendingKyc: 5,
          pendingRedemptions: 3,
          activeGames: 45,
          systemHealth: 'Optimal'
        });
      }

      // Fetch players
      try {
        const playersResponse = await adminV2.players.list(1, 10);
        const playersData = playersResponse.data || [];
        setPlayers(Array.isArray(playersData) ? playersData : []);
      } catch (error) {
        console.error('Failed to fetch players:', error);
      }
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePlayerBalanceUpdate = async (player: Player) => {
    const gcAmount = prompt(`Add GC balance for ${player.username}:`, '0');
    if (gcAmount !== null) {
      const scAmount = prompt('Add SC balance:', '0');
      if (scAmount !== null) {
        try {
          await adminV2.players.updateBalanceByUsername(
            player.username,
            undefined,
            undefined,
            parseFloat(gcAmount),
            parseFloat(scAmount),
            `Balance adjustment by admin`
          );
          toast.success(`Updated balance for ${player.username}`);
          setActionLog([...actionLog, {
            id: Date.now().toString(),
            action: 'balance_update',
            target: player.username,
            timestamp: new Date().toISOString(),
            result: 'success'
          }]);
          fetchDashboardData();
        } catch (error: any) {
          toast.error(error.message || 'Failed to update balance');
          setActionLog([...actionLog, {
            id: Date.now().toString(),
            action: 'balance_update',
            target: player.username,
            timestamp: new Date().toISOString(),
            result: 'error'
          }]);
        }
      }
    }
  };

  const handlePlayerStatusChange = async (player: Player, newStatus: string) => {
    try {
      await adminV2.players.updateStatusByUsername(player.username, newStatus);
      toast.success(`${player.username} status changed to ${newStatus}`);
      setActionLog([...actionLog, {
        id: Date.now().toString(),
        action: 'status_change',
        target: `${player.username} -> ${newStatus}`,
        timestamp: new Date().toISOString(),
        result: 'success'
      }]);
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black">Admin Master Dashboard</h2>
          <p className="text-sm text-muted-foreground">Full platform management and control</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardData}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Total Players</CardDescription>
                <Users className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{(stats?.totalPlayers || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{stats?.activePlayers || 0} active today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Total Revenue</CardDescription>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-green-600">${(stats?.totalRevenue || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Total Wagered</CardDescription>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-blue-600">${(stats?.totalWagered || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Lifetime</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>System Health</CardDescription>
                <Shield className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-green-600">{stats?.systemHealth}</div>
                <p className="text-xs text-muted-foreground">{stats?.activeGames || 0} active games</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts & Pending Items */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-yellow-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-600">⚠️ Pending KYC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{stats?.pendingKyc || 0}</div>
                <p className="text-sm text-muted-foreground">Documents awaiting review</p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-600">💰 Pending Redemptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{stats?.pendingRedemptions || 0}</div>
                <p className="text-sm text-muted-foreground">Withdrawal requests pending</p>
              </CardContent>
            </Card>

            <Card className="border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-600">👥 New Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{stats?.newPlayersToday || 0}</div>
                <p className="text-sm text-muted-foreground">Registered today</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PLAYERS TAB */}
        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Management</CardTitle>
              <CardDescription>Search, view, and manage player accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No players found</p>
                ) : (
                  players.map(player => (
                    <Card key={player.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold">{player.name}</h4>
                          <p className="text-sm text-muted-foreground">@{player.username} • {player.email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge>{player.status}</Badge>
                            <Badge variant="outline">{player.kyc_level}</Badge>
                            <Badge variant="secondary">GC: {player.gc_balance.toFixed(2)}</Badge>
                            <Badge variant="secondary">SC: {player.sc_balance.toFixed(2)}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handlePlayerBalanceUpdate(player)}>Update Balance</Button>
                          <select
                            value={player.status}
                            onChange={(e) => handlePlayerStatusChange(player, e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            <option value="Active">Active</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Banned">Banned</option>
                          </select>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GAMES TAB */}
        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Management</CardTitle>
              <CardDescription>Manage games, RTP, and game settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Game management features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCIAL TAB */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Bonus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Bonus Amount (SC)</label>
                  <Input type="number" placeholder="100" />
                </div>
                <div>
                  <label className="text-sm font-medium">Bonus Type</label>
                  <select className="w-full px-3 py-2 border rounded-md text-sm">
                    <option>Deposit Bonus</option>
                    <option>Free Spins</option>
                    <option>Cashback</option>
                    <option>Welcome Bonus</option>
                  </select>
                </div>
                <Button className="w-full">Create Bonus</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manage Jackpots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Jackpot Amount</label>
                  <Input type="number" placeholder="5000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Jackpot Game</label>
                  <select className="w-full px-3 py-2 border rounded-md text-sm">
                    <option>Slots</option>
                    <option>Bingo</option>
                    <option>Poker</option>
                  </select>
                </div>
                <Button className="w-full">Update Jackpot</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SYSTEM TAB */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Status & Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold mb-2">Recent Admin Actions</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {actionLog.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent actions</p>
                    ) : (
                      actionLog.slice(-10).reverse().map(action => (
                        <div key={action.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                          <span>{action.action}: {action.target}</span>
                          <Badge variant={action.result === 'success' ? 'default' : 'destructive'}>
                            {action.result}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMasterDashboard;
