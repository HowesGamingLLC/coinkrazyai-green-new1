import React, { useState, useEffect } from 'react';
import { wallet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Eye, EyeOff, RefreshCw, Wallet as WalletIcon } from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

interface WalletBalance {
  gc_balance: number;
  sc_balance: number;
  currency: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status?: string;
}

const WalletLiveWidget: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Initialize socket connection for real-time updates
  useEffect(() => {
    const socket = io();

    if (user) {
      // Listen for wallet updates specific to this user
      socket.on(`wallet:${user.id}`, (data) => {
        console.log('Wallet update received:', data);
        setBalance({
          gc_balance: data.gc_balance || data.goldCoins || 0,
          sc_balance: data.sc_balance || data.sweepsCoins || 0,
          currency: data.currency || 'USD'
        });
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Add to recent transactions
        if (data.transactionType) {
          setTransactions(prev => [{
            id: Date.now(),
            type: data.transactionType,
            amount: data.amount || 0,
            description: data.description || 'Balance update',
            created_at: new Date().toISOString(),
            status: 'completed'
          }, ...prev].slice(0, 10));
        }
      });

      // Fallback listener for general wallet updates
      socket.on('wallet:update', (data) => {
        if (data.userId === user.id || !data.userId) {
          setBalance({
            gc_balance: data.gc_balance || data.goldCoins || 0,
            sc_balance: data.sc_balance || data.sweepsCoins || 0,
            currency: data.currency || 'USD'
          });
          setLastUpdate(new Date().toLocaleTimeString());
        }
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  // Load initial balance and transactions
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setIsLoading(true);
        const balanceResponse = await wallet.getBalance();
        const transactionsResponse = await wallet.getTransactions();

        setBalance(balanceResponse.data || {
          gc_balance: 0,
          sc_balance: 0,
          currency: 'USD'
        });

        const txList = Array.isArray(transactionsResponse?.data) ? transactionsResponse.data : [];
        setTransactions(txList.slice(0, 10));
        setLastUpdate(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Failed to load wallet:', error);
        toast.error('Failed to load wallet');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadWalletData();
    }
  }, [user]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await wallet.getBalance();
      setBalance(response.data);
      setLastUpdate(new Date().toLocaleTimeString());
      toast.success('Wallet updated');
    } catch (error) {
      toast.error('Failed to refresh wallet');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const gcBalance = balance?.gc_balance || 0;
  const scBalance = balance?.sc_balance || 0;
  const totalBalance = gcBalance + scBalance;

  return (
    <div className="space-y-4">
      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gold Coins */}
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-yellow-600">Gold Coins</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-yellow-600">
              {showBalance ? `${gcBalance.toFixed(2)}` : '••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">GC Balance</p>
          </CardContent>
        </Card>

        {/* Sweep Coins */}
        <Card className="border-purple-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-purple-600">Sweep Coins</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-600">
              {showBalance ? `${scBalance.toFixed(2)}` : '••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">SC Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Balance */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <div className="text-3xl font-black">
                {showBalance ? `${totalBalance.toFixed(2)}` : '••••'} Balance
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Last updated: {lastUpdate}</p>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${tx.type.includes('win') || tx.type.includes('bonus') ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type.includes('win') || tx.type.includes('bonus') ? '+' : '-'}
                      {Math.abs(tx.amount).toFixed(2)}
                    </div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {tx.status || 'completed'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletLiveWidget;
