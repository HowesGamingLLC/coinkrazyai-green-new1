import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Trophy,
  Users,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Loader2,
  Search,
  Shield,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface PoolStats {
  totalGamesPlayed: number;
  totalGamesCompleted: number;
  totalMoneyWagered: number;
  totalHouseFee: number;
  activeGames: number;
  totalPlayers: number;
  averageGameDuration: number;
  peakHour: string;
}

interface AdminAction {
  id: number;
  action_type: string;
  target_player_id: number;
  reason: string;
  status: string;
  created_at: string;
}

const PoolAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'moderation' | 'analytics'>('overview');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<string>('warning');
  const [actionReason, setActionReason] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // In a real app, this would call an admin API endpoint
      // For now, we'll set default stats
      setStats({
        totalGamesPlayed: 2543,
        totalGamesCompleted: 2501,
        totalMoneyWagered: 25432.50,
        totalHouseFee: 1271.63,
        activeGames: 12,
        totalPlayers: 845,
        averageGameDuration: 8.5,
        peakHour: '8 PM - 9 PM'
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async () => {
    if (!selectedPlayerId || !actionReason) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Call admin API to record action
      toast.success(`${actionType} recorded for player ${selectedPlayerId}`);
      setShowActionDialog(false);
      setSelectedPlayerId(null);
      setActionReason('');
    } catch (error) {
      console.error('Error recording action:', error);
      toast.error('Failed to record action');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white uppercase">Pool Admin Dashboard</h1>
          <p className="text-slate-400">Manage games, monitor activity, and maintain fair play</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 flex-wrap">
          {(['overview', 'moderation', 'analytics'] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-bold rounded-xl ${
                activeTab === tab
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {tab === 'overview' && <BarChart3 className="w-4 h-4 mr-2" />}
              {tab === 'moderation' && <Shield className="w-4 h-4 mr-2" />}
              {tab === 'analytics' && <TrendingUp className="w-4 h-4 mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-700 bg-gradient-to-br from-blue-900/20 to-slate-900">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm font-bold uppercase">Active Games</p>
                    <p className="text-3xl font-black text-blue-400 mt-2">{stats.activeGames}</p>
                    <p className="text-xs text-slate-500 mt-2">Currently running</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-gradient-to-br from-green-900/20 to-slate-900">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm font-bold uppercase">Total Players</p>
                    <p className="text-3xl font-black text-green-400 mt-2">{stats.totalPlayers}</p>
                    <p className="text-xs text-slate-500 mt-2">Platform total</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-gradient-to-br from-yellow-900/20 to-slate-900">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm font-bold uppercase">Money Wagered</p>
                    <p className="text-3xl font-black text-yellow-400 mt-2">
                      ${stats.totalMoneyWagered.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">All-time total</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-700 bg-gradient-to-br from-purple-900/20 to-slate-900">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm font-bold uppercase">House Revenue</p>
                    <p className="text-3xl font-black text-purple-400 mt-2">
                      ${stats.totalHouseFee.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">From fees</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System Health */}
            <Card className="border-slate-700 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-slate-400">Game Server</p>
                      <p className="text-white font-bold">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-slate-400">Database</p>
                      <p className="text-white font-bold">Healthy</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-slate-400">Payment System</p>
                      <p className="text-white font-bold">Active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-slate-400">Fair Play Engine</p>
                      <p className="text-white font-bold">Running</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Peak Usage */}
            {stats && (
              <Card className="border-slate-700 bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-white">Usage Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm font-bold mb-2">Peak Usage Hour</p>
                    <Badge className="bg-blue-600">{stats.peakHour}</Badge>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-bold mb-2">Avg Game Duration</p>
                    <p className="text-white font-bold">{stats.averageGameDuration} minutes</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-bold mb-2">Completion Rate</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(stats.totalGamesCompleted / stats.totalGamesPlayed) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-white font-bold">
                        {((stats.totalGamesCompleted / stats.totalGamesPlayed) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search player ID or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Button
                onClick={() => setShowActionDialog(true)}
                className="bg-red-600 hover:bg-red-700 font-bold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Record Action
              </Button>
            </div>

            {/* Recent Admin Actions */}
            <Card className="border-slate-700 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Recent Admin Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actions.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No admin actions recorded</p>
                  ) : (
                    actions.map((action) => (
                      <div key={action.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-white font-bold">
                              {action.action_type.replace('_', ' ').toUpperCase()}
                            </p>
                            <p className="text-slate-400 text-sm">Player ID: {action.target_player_id}</p>
                            <p className="text-slate-300 text-sm mt-2">{action.reason}</p>
                          </div>
                          <Badge
                            className={`${
                              action.status === 'pending'
                                ? 'bg-yellow-600'
                                : action.status === 'approved'
                                ? 'bg-green-600'
                                : 'bg-red-600'
                            }`}
                          >
                            {action.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          {new Date(action.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Moderation Guidelines */}
            <Alert className="bg-blue-500/10 border-blue-500 text-blue-300">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <p className="font-bold mb-2">Moderation Tools Available:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Issue warnings to players for rule violations</li>
                  <li>Suspend accounts temporarily for multiple violations</li>
                  <li>Process refunds for disputed games</li>
                  <li>Flag games for fair play investigation</li>
                  <li>Adjust player rankings if needed</li>
                  <li>View detailed game audits and transaction history</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-slate-700 bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-white">Player Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Beginner</span>
                      <span className="text-white font-bold">45%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Intermediate</span>
                      <span className="text-white font-bold">35%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Advanced</span>
                      <span className="text-white font-bold">15%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '15%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Expert</span>
                      <span className="text-white font-bold">5%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-700 bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-white">Win Rate Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">0-25%</span>
                      <span className="text-white font-bold">18%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '18%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">25-50%</span>
                      <span className="text-white font-bold">42%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '42%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">50-75%</span>
                      <span className="text-white font-bold">30%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">75%+</span>
                      <span className="text-white font-bold">10%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Admin Action Dialog */}
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl">Record Admin Action</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-slate-300 font-bold">Player ID</Label>
                <Input
                  type="number"
                  value={selectedPlayerId || ''}
                  onChange={(e) => setSelectedPlayerId(parseInt(e.target.value) || null)}
                  placeholder="Enter player ID"
                  className="mt-2 bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300 font-bold">Action Type</Label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full mt-2 bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                >
                  <option value="warning">Warning</option>
                  <option value="suspend_player">Suspend Account</option>
                  <option value="refund">Process Refund</option>
                  <option value="investigate">Flag for Investigation</option>
                  <option value="adjust_odds">Adjust Rankings</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-300 font-bold">Reason</Label>
                <Textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Detailed reason for this action..."
                  className="mt-2 bg-slate-800 border-slate-700 text-white min-h-20"
                />
              </div>

              <Button
                onClick={handleAdminAction}
                className="w-full bg-red-600 hover:bg-red-700 font-bold h-12"
              >
                Record Action
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PoolAdminDashboard;
