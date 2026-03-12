import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { adminV2 } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Import admin sub-components
import AdminMasterDashboard from '@/components/admin/AdminMasterDashboard';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminSalesDashboard from '@/components/admin/AdminSalesDashboard';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminPlayers from '@/components/admin/AdminPlayers';
import AdminKYC from '@/components/admin/AdminKYC';
import AdminWallet from '@/components/admin/AdminWallet';
import AdminFinancial from '@/components/admin/AdminFinancial';
import AdminGamesSports from '@/components/admin/AdminGamesSports';
import AdminOperations from '@/components/admin/AdminOperations';
import AdminAdvanced from '@/components/admin/AdminAdvanced';
import AdminStore from '@/components/admin/AdminStore';
import AIGameEditor from '@/pages/admin/AIGameEditor';

const Admin = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
      return;
    }

    if (isAdmin) {
      setIsLoading(false);
    }
  }, [isAdmin, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-black tracking-tight mb-2">ADMIN DASHBOARD</h1>
        <p className="text-muted-foreground">Manage the CoinKrazy AI platform</p>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-6 md:grid-cols-12 mb-6 overflow-x-auto">
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="players" className="text-xs">Players</TabsTrigger>
          <TabsTrigger value="kyc" className="text-xs">KYC</TabsTrigger>
          <TabsTrigger value="wallet" className="text-xs">Wallet</TabsTrigger>
          <TabsTrigger value="store" className="text-xs">Store</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
          <TabsTrigger value="games" className="text-xs">Games</TabsTrigger>
          <TabsTrigger value="ai-editor" className="text-xs font-black text-orange-500">✨ AI Editor</TabsTrigger>
          <TabsTrigger value="operations" className="text-xs">Operations</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <AdminDashboard />
        </TabsContent>

        {/* Sales Analytics */}
        <TabsContent value="sales">
          <AdminSalesDashboard />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <AdminNotifications />
        </TabsContent>

        {/* Player Management */}
        <TabsContent value="players">
          <AdminPlayers />
        </TabsContent>

        {/* KYC Settings */}
        <TabsContent value="kyc">
          <AdminKYC />
        </TabsContent>

        {/* Wallet Management */}
        <TabsContent value="wallet">
          <AdminWallet />
        </TabsContent>

        {/* Store Management */}
        <TabsContent value="store">
          <AdminStore />
        </TabsContent>

        {/* Financial Management */}
        <TabsContent value="financial">
          <AdminFinancial />
        </TabsContent>

        {/* Games & Sports */}
        <TabsContent value="games">
          <AdminGamesSports />
        </TabsContent>

        {/* AI Game Editor */}
        <TabsContent value="ai-editor">
          <AIGameEditor />
        </TabsContent>

        {/* Operations */}
        <TabsContent value="operations">
          <AdminOperations />
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced">
          <AdminAdvanced />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
