import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { Layout } from "@/components/Layout";
import { PopupManager } from "@/components/PopupManager";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Store from "./pages/Store";
import Admin from "./pages/Admin";
import GamesManagement from "./pages/admin/GamesManagement";
import AIGameEditor from "./pages/admin/AIGameEditor";
import Slots from "./pages/Slots";
import Poker from "./pages/Poker";
import Bingo from "./pages/Bingo";
import Sportsbook from "./pages/Sportsbook";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Wallet from "./pages/Wallet";
import Leaderboards from "./pages/Leaderboards";
import Achievements from "./pages/Achievements";
import Support from "./pages/Support";
import Games from "./pages/Games";
import Casino from "./pages/Casino";
import ExternalGames from "./pages/ExternalGames";
import ScratchTickets from "./pages/ScratchTickets";
import PullTabs from "./pages/PullTabs";
import Dice from "./pages/Dice";
import Plinko from "./pages/Plinko";
import Community from "./pages/Community";
import PoolShark from "./pages/PoolShark";
import PoolGamePage from "./pages/PoolGamePage";
import Referrals from "./pages/Referrals";
import VIP from "./pages/VIP";
import CoinKrazyCoinUp from "./pages/CoinKrazyCoinUp";
import CoinKrazyCoinHot from "./pages/CoinKrazyCoinHot";
import CoinKrazyThunder from "./pages/CoinKrazyThunder";
import CoinKrazy4Wolfs from "./pages/CoinKrazy4Wolfs";
import CoinKrazyChiliCoins from "./pages/CoinKrazyChiliCoins";
import CoinKrazy4EgyptPots from "./pages/CoinKrazy4EgyptPots";

const queryClient = new QueryClient();

// Component that wraps individual routes with Layout (needs to be inside Router AND AuthProvider)
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route
      path="/"
      element={
        <Layout>
          <Index />
        </Layout>
      }
    />
    <Route
      path="/games"
      element={
        <Layout>
          <Games />
        </Layout>
      }
    />
    <Route
      path="/games/:category"
      element={
        <Layout>
          <Games />
        </Layout>
      }
    />
    <Route
      path="/casino"
      element={
        <Layout>
          <Casino />
        </Layout>
      }
    />
    <Route
      path="/external-games"
      element={
        <Layout>
          <ExternalGames />
        </Layout>
      }
    />
    <Route
      path="/store"
      element={
        <Layout>
          <Store />
        </Layout>
      }
    />
    <Route
      path="/slots"
      element={
        <Layout>
          <Slots />
        </Layout>
      }
    />
    <Route
      path="/poker"
      element={
        <Layout>
          <Poker />
        </Layout>
      }
    />
    <Route
      path="/bingo"
      element={
        <Layout>
          <Bingo />
        </Layout>
      }
    />
    <Route
      path="/sportsbook"
      element={
        <Layout>
          <Sportsbook />
        </Layout>
      }
    />
    <Route
      path="/scratch-tickets"
      element={
        <Layout>
          <ScratchTickets />
        </Layout>
      }
    />
    <Route
      path="/pull-tabs"
      element={
        <Layout>
          <PullTabs />
        </Layout>
      }
    />
    <Route
      path="/dice"
      element={
        <Layout>
          <Dice />
        </Layout>
      }
    />
    <Route
      path="/plinko"
      element={
        <Layout>
          <Plinko />
        </Layout>
      }
    />
    <Route
      path="/community"
      element={
        <Layout>
          <Community />
        </Layout>
      }
    />
    <Route
      path="/pool-shark"
      element={
        <Layout>
          <PoolShark />
        </Layout>
      }
    />
    <Route
      path="/pool/game/:gameId"
      element={
        <Layout>
          <PoolGamePage />
        </Layout>
      }
    />
    <Route
      path="/referrals"
      element={
        <Layout>
          <Referrals />
        </Layout>
      }
    />
    <Route
      path="/vip"
      element={
        <Layout>
          <VIP />
        </Layout>
      }
    />
    <Route
      path="/coin-krazy-coin-up"
      element={
        <Layout>
          <CoinKrazyCoinUp />
        </Layout>
      }
    />
    <Route
      path="/coin-krazy-coin-hot"
      element={
        <Layout>
          <CoinKrazyCoinHot />
        </Layout>
      }
    />
    <Route
      path="/coinkrazy-thunder"
      element={
        <Layout>
          <CoinKrazyThunder />
        </Layout>
      }
    />
    <Route
      path="/coin-krazy-4wolfs"
      element={
        <Layout>
          <CoinKrazy4Wolfs />
        </Layout>
      }
    />
    <Route
      path="/coinkrazy-chilicoins"
      element={
        <Layout>
          <CoinKrazyChiliCoins />
        </Layout>
      }
    />
    <Route
      path="/coinkrazy-4egypt-pots"
      element={
        <Layout>
          <CoinKrazy4EgyptPots />
        </Layout>
      }
    />
    <Route
      path="/profile"
      element={
        <Layout>
          <Profile />
        </Layout>
      }
    />
    <Route
      path="/account"
      element={
        <Layout>
          <Account />
        </Layout>
      }
    />
    <Route
      path="/wallet"
      element={
        <Layout>
          <Wallet />
        </Layout>
      }
    />
    <Route
      path="/leaderboards"
      element={
        <Layout>
          <Leaderboards />
        </Layout>
      }
    />
    <Route
      path="/achievements"
      element={
        <Layout>
          <Achievements />
        </Layout>
      }
    />
    <Route
      path="/support"
      element={
        <Layout>
          <Support />
        </Layout>
      }
    />
    <Route
      path="/admin"
      element={
        <Layout>
          <Admin />
        </Layout>
      }
    />
    <Route
      path="/admin/games"
      element={
        <Layout>
          <GamesManagement />
        </Layout>
      }
    />
    <Route
      path="/admin/ai-game-editor"
      element={
        <Layout>
          <AIGameEditor />
        </Layout>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <PopupManager />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
