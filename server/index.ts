import dotenv from "dotenv";
import path from "path";

// Load .env from project root
const envPath = path.join(process.cwd(), ".env");
console.log('[DB] Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log('[DB] dotenv error:', result.error.message);
} else {
  console.log('[DB] dotenv loaded', Object.keys(result.parsed || {}).length, 'variables');
  // Explicitly set all variables from .env into process.env
  if (result.parsed) {
    Object.assign(process.env, result.parsed);
    console.log('[DB] DATABASE_URL now:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
  }
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { initializeDatabase } from "./db/init";
import { query } from "./db/connection";
import { errorHandler } from "./middleware/error-handler";
import { handleDemo } from "./routes/demo";
import {
  handleRegister,
  handleLogin,
  handleGetProfile,
  handleUpdateProfile,
  handleLogout,
  handleAdminLogin,
  handleDebugCheckUsers,
  handleDebugReseedUsers
} from "./routes/auth";
import { verifyPlayer, verifyAdmin } from "./middleware/auth";
import { validate } from "./middleware/validate";
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  updateProfileSchema
} from "./validation/auth-schema";
import { updateWalletSchema } from "./validation/wallet-schema";
import { handleGetWallet, handleUpdateWallet, handleGetTransactions } from "./routes/wallet";
import {
  handleGetPacks,
  handlePurchase,
  handleSquareWebhook,
  handleGetPurchaseHistory,
  handleUpdatePack,
  handleAddPack,
  handleDeletePack,
  handleStripeWebhook as handleStoreWebhook
} from "./routes/store";
import { getStoreConfig } from "./routes/store-config";
import {
  handleGetAdminStats,
  handleUpdateGameConfig,
  handleUpdateStorePack,
  handleAssignAIDuty,
  handleGetGameConfig as handleGetAdminGameConfig,
  handleGetAIEmployees,
  handleUpdateAIStatus,
  handleGetStorePacks,
  handleSetMaintenanceMode,
  handleGetSystemHealth as handleGetAdminSystemHealth,
  handleGenerateGameWithAI,
  handleCreateGameFromAI
} from "./routes/admin";
import { handleSpin, handleGetConfig as getSlotsConfig, handleUpdateConfig as updateSlotsConfig } from "./routes/slots";
import { handleImportGames } from "./routes/game-import";
import { handlePlayCasinoGame, handleGetSpinHistory as handleGetCasinoSpinHistory, handleGetSpinStats, handleSlotsSpin } from "./routes/casino";
import {
  handleGetPokerTables,
  handleJoinTable,
  handleFold,
  handleCashOut,
  handleGetConfig as getPokerConfig,
  handleUpdateConfig as updatePokerConfig
} from "./routes/poker";
import {
  handleGetPoolTables,
  handleCreatePoolTable,
  handleJoinPoolTable,
  handleGetPoolGame,
  handleRaiseBet,
  handleEndPoolGame
} from "./routes/pool";
import {
  handleGetBingoRooms,
  handleBuyBingoTicket,
  handleMarkNumber,
  handleBingoWin,
  handleGetConfig as getBingoConfig,
  handleUpdateConfig as updateBingoConfig
} from "./routes/bingo";
import {
  handleGetGames,
  handleGetGameById,
  handleDebugGetGames
} from "./routes/games";
import {
  handleGetGameTemplates,
  handleGetGameTemplate,
  handleCreateGameTemplate,
  handleCreateGameFromTemplate,
  handleCloneGame,
  handleUpdateGameConfig as handleUpdateGameFactoryConfig,
  handleGetGameDetails,
  handleGetGameAnalytics,
  handleGetGameEngines,
  handleGetDefaultTemplates
} from "./routes/game-factory";
import {
  handleGetGameConfig,
  handleProcessSpin,
  handleGetSpinHistory,
  handleGetExternalGames,
  handleUpdateGameMaxWin,
  handleGetAllGameConfigs
} from "./routes/external-games";
import {
  handleGetLiveGames,
  handlePlaceParlay,
  handleSingleBet,
  handleGetConfig as getSportsbookConfig,
  handleUpdateConfig as updateSportsbookConfig
} from "./routes/sportsbook";
import {
  handleGetLeaderboard,
  handleGetPlayerRank,
  handleUpdateLeaderboards
} from "./routes/leaderboards";
import {
  handleGetAchievements,
  handleGetPlayerAchievements,
  handleAwardAchievement,
  handleCheckAchievements,
  handleGetAchievementStats
} from "./routes/achievements";
import * as adminDb from "./routes/admin-db";
import { AIService } from "./services/ai-service";

// ===== NEW COMPREHENSIVE ADMIN ROUTES =====
import {
  getAdminDashboardStats,
  getDailyMetrics,
  getSystemHealth,
  getRevenueAnalytics,
  getPlayerDemographics
} from "./routes/dashboard";
import {
  listPlayers,
  getPlayerDetails,
  updatePlayerStatus,
  updatePlayerBalance,
  getPlayerTransactions,
  getPlayerTransactionsByUsername,
  updatePlayerBalanceByUsername,
  updatePlayerStatusByUsername,
  submitKYC,
  approveKYC,
  rejectKYC,
  searchPlayersPublic
} from "./routes/player-management";
import {
  listBonuses,
  createBonus,
  updateBonus,
  deleteBonus,
  listJackpots,
  createJackpot,
  updateJackpotAmount,
  recordJackpotWin,
  listMakeItRainCampaigns,
  createMakeItRainCampaign,
  distributeMakeItRainRewards,
  listRedemptionRequests,
  approveRedemption,
  rejectRedemption
} from "./routes/financial";
import {
  listGames,
  createGame,
  updateGame,
  deleteGame,
  clearAllGames,
  listPokerTables,
  createPokerTable,
  updatePokerTable,
  getPokerStats,
  listBingoGames,
  createBingoGame,
  updateBingoGame,
  getBingoStats,
  listSportsEvents,
  createSportsEvent,
  updateSportsEvent,
  getSportsbookStats,
  ingestGameData,
  crawlSlots,
  locateThumbnail,
  bulkUpdateGames,
  buildGameFromTemplate,
  handleSaveCrawledGame,
  generateGameWithAI,
  createGameFromAI
} from "./routes/games-sports";
import {
  listGameFeatures,
  createGameFeature,
  addFeatureToGame,
  removeFeatureFromGame,
  getGameFeatures,
  listGameThemes,
  createGameTheme,
  addThemeToGame,
  getGameThemes,
  rateGame,
  getGameRatings,
  getGameStatistics,
  getGameMetadata,
  updateGameMetadata,
} from "./routes/game-metadata";
import {
  getAvailableProviders,
  createProviderConfig,
  getProviderConfig,
  listProviderConfigs,
  updateProviderConfig,
  testProviderConnection,
  syncProviderGames,
  getProviderGames,
  getImportHistory,
  getImportHistoryDetails,
  getProviderStats,
} from "./routes/provider-management";
import {
  getProviders,
  syncProvider,
  syncAllProviders,
  getStats as getAggregationStats,
  bulkImportGames,
  exportGames,
  getGamesByProvider,
  deleteProviderGames
} from "./routes/game-aggregation";
import {
  listSecurityAlerts,
  resolveSecurityAlert,
  listCMSPages,
  createCMSPage,
  updateCMSPage,
  deleteCMSPage,
  listCMSBanners,
  createCMSBanner,
  getCasinoSettings,
  updateCasinoSettings,
  listSocialGroups,
  getSocialGroupMembers,
  handleCreateSocialGroup,
  handleJoinSocialGroup,
  listRetentionCampaigns,
  createRetentionCampaign,
  updateRetentionCampaign
} from "./routes/operations";
import {
  listVIPTiers,
  createVIPTier,
  promotePlayerToVIP,
  getVIPPlayers,
  listFraudPatterns,
  createFraudPattern,
  listFraudFlags,
  resolveFraudFlag,
  listAffiliatePartners,
  createAffiliatePartner,
  approveAffiliatePartner,
  getAffiliateStats,
  listSupportTickets,
  getTicketMessages,
  assignTicket,
  closeTicket,
  listSystemLogs,
  listAPIKeys,
  createAPIKey,
  revokeAPIKey,
  listNotificationTemplates,
  createNotificationTemplate,
  listComplianceLogs,
  listAMLChecks,
  verifyAMLCheck
} from "./routes/advanced";
import {
  getStorePackages,
  createStorePackage,
  updateStorePackage,
  deleteStorePackage,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getStoreSettings,
  updateStoreSettings
} from "./routes/store-management";
import {
  getAvailableDesigns,
  purchaseTicket,
  revealSlot,
  claimPrize,
  getTicket,
  getMyTickets,
  getTransactionHistory as getScratchTransactionHistory
} from "./routes/scratch-tickets";
import {
  getDesigns as getScratchDesigns,
  getDesign as getScratchDesign,
  createDesign as createScratchDesign,
  updateDesign as updateScratchDesign,
  deleteDesign as deleteScratchDesign,
  getStatistics as getScratchStatistics,
  getTransactionHistory as getScratchAdminTransactionHistory,
  getTicketResults as getScratchTicketResults
} from "./routes/scratch-tickets-admin";
import {
  getAvailableDesigns as getPullTabDesigns,
  purchaseTicket as purchasePullTabTicket,
  revealTab as revealPullTab,
  claimPrize as claimPullTabPrize,
  getTicket as getPullTabTicket,
  getMyTickets as getMyPullTabTickets,
  getTransactionHistory as getPullTabTransactionHistory
} from "./routes/pull-tabs";

import {
  getDesigns as getPullTabAdminDesigns,
  getDesign as getPullTabAdminDesign,
  createDesign as createPullTabDesign,
  updateDesign as updatePullTabDesign,
  deleteDesign as deletePullTabDesign,
  getStatistics as getPullTabStatistics,
  getTransactionHistory as getPullTabAdminTransactionHistory,
  getResults as getPullTabResults
} from "./routes/pull-tabs-admin";

// ===== NEW FEATURE ROUTES =====
import {
  handleRecordShare,
  handleGetShareHistory,
  handleRecordShareResponse,
  handleGetShareStats
} from "./routes/social-sharing";
import {
  handleGetDailyBonus,
  handleClaimDailyBonus,
  handleGetBonusStreak
} from "./routes/daily-login-bonus";
import {
  handleGetOrCreateReferralLink,
  handleRegisterWithReferral,
  handleCompleteReferralClaim,
  handleGetReferralStats,
  handleGetRecentReferrals
} from "./routes/referral-system";
import {
  handleCreatePaymentMethod,
  handleGetPaymentMethods,
  handleSetPrimaryPaymentMethod,
  handleDeletePaymentMethod,
  handleVerifyPaymentMethod
} from "./routes/payment-methods";
import {
  handleCreateNotification,
  handleGetNotifications,
  handleGetAllNotifications,
  handleMarkAsRead,
  handleUpdateNotificationStatus,
  handleApproveNotification,
  handleDenyNotification,
  handleAssignNotification,
  handleResolveNotification
} from "./routes/admin-notifications";
import {
  handleGetOnboardingProgress,
  handleUpdateOnboardingStep,
  handleCompleteOnboarding,
  handleSkipOnboarding,
  handleGetOnboardingSteps,
  handleUploadKYCDocument,
  upload as kycUpload
} from "./routes/kyc-onboarding";
import {
  handleRecordSale,
  handleGetSalesStats,
  handleGetTotalRevenue,
  handleGetGameTypeStats,
  handleGetPlayerSalesHistory,
  handleGetDailyRevenueSummary,
  handleGetTopPerformingGames
} from "./routes/sales-tracking";
import {
  handleGetBettingLimits,
  handleUpdateBettingLimits,
  handleValidateBet,
  handleValidateWin,
  handleValidateRedemption
} from "./routes/betting-limits";
import {
  handleSendMessage,
  handleGetMessages,
  handleGetUnreadMessages,
  handleMarkMessageAsRead,
  handleGetConversation,
  handleGetMessageThreads,
  handleDeleteMessage,
  handleGetMessageStats
} from "./routes/user-messaging";

import { getChallenges, claimChallengeReward } from "./routes/challenges";
import { getPlatformStats, getRecentWinners } from "./routes/platform";
import { handleCoinKrazyThunderSpin, handleGetThunderStats } from "./routes/coinkrazy-thunder";
import { handleCoinKrazyCoinUpSpin } from "./routes/coinkrazy-coinup";
import { handleCoinKrazyCoinHotSpin } from "./routes/coinkrazy-coinhot";
import { handleCoinKrazy4WolfsSpin } from "./routes/coinkrazy-4wolfs";
import { handleCoinKrazy4EgyptPotsSpin } from "./routes/coinkrazy-4egypt-pots";
import {
  listPlayerTickets,
  createPlayerTicket,
  getTicketDetails,
  addTicketMessage
} from "./routes/support";
import {
  handleAIChat,
  handleGetAIStatus,
  handleGetConversationHistory,
  handleGetSessions
} from "./routes/ai";
import {
  createGameBuilderProject,
  getGameBuilderProjects,
  getGameBuilderProject,
  updateGameBuilderProject,
  deleteGameBuilderProject,
  saveGameVersion,
  getGameVersion,
  restoreGameVersion
} from "./routes/ai-game-builder";
import {
  createAdminNotification,
  getAdminNotifications,
  getAdminNotification,
  updateAdminNotification,
  approveAdminNotification,
  denyAdminNotification,
  getNotificationsByType,
  bulkUpdateAdminNotifications
} from "./routes/admin-notifications-queue";

export function createServer() {
  const app = express();

  // Initialize database
  initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
    // Continue anyway, some features will fail but the app will still run
  });

  // Start AI processes
  AIService.startAIProcesses();

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Vite handles CSP in dev
  }));
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);

  // Log all requests
  app.use((req, _res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  // ===== AUTH ROUTES =====
  app.post("/api/auth/register", validate(registerSchema), handleRegister);
  app.post("/api/auth/login", validate(loginSchema), handleLogin);
  app.post("/api/auth/admin/login", validate(adminLoginSchema), handleAdminLogin);
  app.get("/api/auth/profile", verifyPlayer, handleGetProfile);
  app.put("/api/auth/profile", verifyPlayer, validate(updateProfileSchema), handleUpdateProfile);
  app.post("/api/auth/logout", verifyPlayer, handleLogout);
  app.get("/api/auth/debug/check-users", handleDebugCheckUsers);
  app.post("/api/auth/debug/reseed-users", handleDebugReseedUsers);

  // ===== WALLET ROUTES =====
  app.get("/api/wallet", verifyPlayer, handleGetWallet);
  app.post("/api/wallet/update", verifyPlayer, validate(updateWalletSchema), handleUpdateWallet);
  app.get("/api/wallet/transactions", verifyPlayer, handleGetTransactions);

  // ===== STORE ROUTES =====
  app.get("/api/store/packs", handleGetPacks);
  app.get("/api/store/config", getStoreConfig);
  app.get("/api/store/payment-methods", getPaymentMethods);
  app.post("/api/store/purchase", verifyPlayer, handlePurchase);
  app.post("/api/store/webhook", handleStoreWebhook);
  app.get("/api/store/history", verifyPlayer, handleGetPurchaseHistory);
  app.post("/api/store/pack/update", verifyAdmin, handleUpdatePack);
  app.post("/api/store/pack/add", verifyAdmin, handleAddPack);
  app.post("/api/store/pack/delete", verifyAdmin, handleDeletePack);

  // ===== SLOTS ROUTES =====
  app.post("/api/slots/spin", verifyPlayer, handleSpin);
  app.get("/api/slots/config", getSlotsConfig);
  app.post("/api/slots/config/update", verifyAdmin, updateSlotsConfig);

  // ===== CASINO ROUTES =====
  app.post("/api/casino/play", verifyPlayer, handlePlayCasinoGame);
  app.post("/api/casino/slots/spin", verifyPlayer, handleSlotsSpin);
  app.get("/api/casino/spins", verifyPlayer, handleGetCasinoSpinHistory);
  app.get("/api/casino/stats", verifyPlayer, handleGetSpinStats);

  // ===== POKER ROUTES =====
  app.get("/api/poker/tables", handleGetPokerTables);
  app.post("/api/poker/join", verifyPlayer, handleJoinTable);
  app.post("/api/poker/fold", verifyPlayer, handleFold);
  app.post("/api/poker/cash-out", verifyPlayer, handleCashOut);
  app.get("/api/poker/config", getPokerConfig);
  app.post("/api/poker/config/update", verifyAdmin, updatePokerConfig);

  // ===== POOL SHARK ROUTES =====
  app.get("/api/pool/tables", handleGetPoolTables);
  app.post("/api/pool/create-table", verifyPlayer, handleCreatePoolTable);
  app.post("/api/pool/join-table", verifyPlayer, handleJoinPoolTable);
  app.get("/api/pool/game/:gameId", handleGetPoolGame);
  app.post("/api/pool/raise-bet", verifyPlayer, handleRaiseBet);
  app.post("/api/pool/end-game", verifyPlayer, handleEndPoolGame);

  // ===== BINGO ROUTES =====
  app.get("/api/bingo/rooms", handleGetBingoRooms);
  app.post("/api/bingo/buy", verifyPlayer, handleBuyBingoTicket);
  app.post("/api/bingo/mark", verifyPlayer, handleMarkNumber);
  app.post("/api/bingo/win", verifyPlayer, handleBingoWin);
  app.get("/api/bingo/config", getBingoConfig);
  app.post("/api/bingo/config/update", verifyAdmin, updateBingoConfig);

  // ===== SPORTSBOOK ROUTES =====
  app.get("/api/sportsbook/games", handleGetLiveGames);
  app.post("/api/sportsbook/parlay", verifyPlayer, handlePlaceParlay);
  app.post("/api/sportsbook/bet", verifyPlayer, handleSingleBet);
  app.get("/api/sportsbook/config", getSportsbookConfig);
  app.post("/api/sportsbook/config/update", verifyAdmin, updateSportsbookConfig);

  // ===== SCRATCH TICKETS ROUTES =====
  app.get("/api/scratch-tickets/designs", getAvailableDesigns);
  app.post("/api/scratch-tickets/purchase", verifyPlayer, purchaseTicket);
  app.post("/api/scratch-tickets/reveal", verifyPlayer, revealSlot);
  app.post("/api/scratch-tickets/claim", verifyPlayer, claimPrize);
  app.get("/api/scratch-tickets/history/transactions", verifyPlayer, getScratchTransactionHistory);
  app.get("/api/scratch-tickets", verifyPlayer, getMyTickets);
  app.get("/api/scratch-tickets/:ticketId", verifyPlayer, getTicket);

  // ===== PULL TAB LOTTERY TICKETS ROUTES =====
  app.get("/api/pull-tabs/designs", getPullTabDesigns);
  app.post("/api/pull-tabs/purchase", verifyPlayer, purchasePullTabTicket);
  app.post("/api/pull-tabs/reveal", verifyPlayer, revealPullTab);
  app.post("/api/pull-tabs/claim", verifyPlayer, claimPullTabPrize);
  app.get("/api/pull-tabs/history/transactions", verifyPlayer, getPullTabTransactionHistory);
  app.get("/api/pull-tabs", verifyPlayer, getMyPullTabTickets);
  app.get("/api/pull-tabs/:ticketId", verifyPlayer, getPullTabTicket);

  // ===== GAMES ROUTES =====
  app.get("/api/games/debug", handleDebugGetGames);
  app.get("/api/games", handleGetGames);
  app.get("/api/games/:id", handleGetGameById);

  // ===== EXTERNAL GAMES ROUTES (Sweepstake/Social Casino) =====
  app.get("/api/external-games", handleGetExternalGames);
  app.get("/api/games/:gameId/config", handleGetGameConfig);
  app.post("/api/games/spin", verifyPlayer, handleProcessSpin);
  app.get("/api/games/history", verifyPlayer, handleGetSpinHistory);
  app.get("/api/admin/v2/games/configs", verifyAdmin, handleGetAllGameConfigs);
  app.put("/api/admin/v2/games/:gameId/max-win", verifyAdmin, handleUpdateGameMaxWin);

  // ===== COINKRAZY GAME ROUTES =====
  app.post("/api/coinkrazy-coinup/spin", verifyPlayer, handleCoinKrazyCoinUpSpin);
  app.post("/api/coinkrazy-coinhot/spin", verifyPlayer, handleCoinKrazyCoinHotSpin);
  app.post("/api/coinkrazy-thunder/spin", verifyPlayer, handleCoinKrazyThunderSpin);
  app.get("/api/coinkrazy-thunder/stats", verifyPlayer, handleGetThunderStats);
  app.post("/api/coinkrazy-4wolfs/spin", verifyPlayer, handleCoinKrazy4WolfsSpin);
  app.post("/api/coinkrazy-4egypt-pots/spin", verifyPlayer, handleCoinKrazy4EgyptPotsSpin);

  // ===== ADMIN ROUTES =====
  app.post("/api/admin/login", handleAdminLogin);
  app.get("/api/admin/stats", verifyAdmin, handleGetAdminStats);
  app.get("/api/admin/game-config", verifyAdmin, handleGetAdminGameConfig);
  app.post("/api/admin/game-config", verifyAdmin, handleUpdateGameConfig);
  app.get("/api/admin/ai-employees", verifyAdmin, handleGetAIEmployees);
  app.post("/api/admin/ai-duty", verifyAdmin, handleAssignAIDuty);
  app.post("/api/admin/ai-status", verifyAdmin, handleUpdateAIStatus);
  app.get("/api/admin/store-packs", verifyAdmin, handleGetStorePacks);
  app.post("/api/admin/store-pack", verifyAdmin, handleUpdateStorePack);
  app.post("/api/admin/maintenance", verifyAdmin, handleSetMaintenanceMode);
  app.get("/api/admin/health", verifyAdmin, handleGetAdminSystemHealth);
  app.post("/api/admin/logout", verifyAdmin, handleLogout);

  // ===== DATABASE-DRIVEN ADMIN ROUTES =====
  // Dashboard
  app.get("/api/admin/dashboard/stats", verifyAdmin, adminDb.getAdminDashboardStats);

  // Players
  app.get("/api/admin/players", verifyAdmin, adminDb.getPlayersList);
  app.get("/api/admin/players/:id", verifyAdmin, adminDb.getPlayer);
  app.post("/api/admin/players/balance", verifyAdmin, adminDb.updatePlayerBalance);
  app.post("/api/admin/players/status", verifyAdmin, adminDb.updatePlayerStatus);

  // Games
  app.get("/api/admin/games", verifyAdmin, adminDb.getGamesList);
  app.post("/api/admin/games/rtp", verifyAdmin, adminDb.updateGameRTP);
  app.post("/api/admin/games/toggle", verifyAdmin, adminDb.toggleGame);

  // AI Game Generation
  app.post("/api/admin/v2/games/generate-with-ai", verifyAdmin, handleGenerateGameWithAI);
  app.post("/api/admin/v2/games/create-from-ai", verifyAdmin, handleCreateGameFromAI);

  // Bonuses
  app.get("/api/admin/bonuses", verifyAdmin, adminDb.getBonusesList);
  app.post("/api/admin/bonuses/create", verifyAdmin, adminDb.createBonus);

  // Transactions
  app.get("/api/admin/transactions", verifyAdmin, adminDb.getTransactionsList);

  // Security
  app.get("/api/admin/alerts", verifyAdmin, adminDb.getSecurityAlerts);

  // KYC
  app.get("/api/admin/kyc/:playerId", verifyAdmin, adminDb.getKYCDocs);
  app.post("/api/admin/kyc/approve", verifyAdmin, adminDb.approveKYC);

  // Poker
  app.get("/api/admin/poker/tables", verifyAdmin, adminDb.getPokerTablesList);

  // Bingo
  app.get("/api/admin/bingo/games", verifyAdmin, adminDb.getBingoGamesList);

  // Sports
  app.get("/api/admin/sports/events", verifyAdmin, adminDb.getSportsEventsList);

  // ===== LEADERBOARD ROUTES =====
  app.get("/api/leaderboards", handleGetLeaderboard);
  app.get("/api/leaderboards/my-rank", verifyPlayer, handleGetPlayerRank);
  app.post("/api/leaderboards/update", verifyAdmin, handleUpdateLeaderboards);

  // ===== ACHIEVEMENTS ROUTES =====
  app.get("/api/achievements", handleGetAchievements);
  app.get("/api/achievements/my-achievements", verifyPlayer, handleGetPlayerAchievements);
  app.post("/api/achievements/award", verifyAdmin, handleAwardAchievement);
  app.post("/api/achievements/check", verifyPlayer, handleCheckAchievements);
  app.get("/api/achievements/stats", handleGetAchievementStats);

  // ===== COMPREHENSIVE ADMIN DASHBOARD ROUTES =====
  app.get("/api/admin/v2/dashboard/stats", verifyAdmin, getAdminDashboardStats);
  app.get("/api/admin/v2/dashboard/metrics", verifyAdmin, getDailyMetrics);
  app.get("/api/admin/v2/dashboard/health", verifyAdmin, getSystemHealth);
  app.get("/api/admin/v2/dashboard/revenue", verifyAdmin, getRevenueAnalytics);
  app.get("/api/admin/v2/dashboard/demographics", verifyAdmin, getPlayerDemographics);

  // ===== PLAYER MANAGEMENT ROUTES =====
  app.get("/api/admin/v2/players", verifyAdmin, listPlayers);
  app.get("/api/admin/v2/players/:playerId", verifyAdmin, getPlayerDetails);
  app.put("/api/admin/v2/players/:playerId/status", verifyAdmin, updatePlayerStatus);
  app.put("/api/admin/v2/players/:playerId/balance", verifyAdmin, updatePlayerBalance);
  app.get("/api/admin/v2/players/:playerId/transactions", verifyAdmin, getPlayerTransactions);

  // Username-based routes
  app.put("/api/admin/v2/players/username/:username/status", verifyAdmin, updatePlayerStatusByUsername);
  app.put("/api/admin/v2/players/username/:username/balance", verifyAdmin, updatePlayerBalanceByUsername);
  app.get("/api/admin/v2/players/username/:username/transactions", verifyAdmin, getPlayerTransactionsByUsername);

  // Player Management (Public)
  app.get("/api/players/search", verifyPlayer, searchPlayersPublic);

  app.post("/api/admin/v2/kyc/submit", verifyAdmin, submitKYC);
  app.post("/api/admin/v2/kyc/:documentId/approve", verifyAdmin, approveKYC);
  app.post("/api/admin/v2/kyc/:documentId/reject", verifyAdmin, rejectKYC);

  // ===== FINANCIAL ROUTES =====
  // Bonuses
  app.get("/api/admin/v2/bonuses", verifyAdmin, listBonuses);
  app.post("/api/admin/v2/bonuses", verifyAdmin, createBonus);
  app.put("/api/admin/v2/bonuses/:bonusId", verifyAdmin, updateBonus);
  app.delete("/api/admin/v2/bonuses/:bonusId", verifyAdmin, deleteBonus);

  // Jackpots
  app.get("/api/admin/v2/jackpots", verifyAdmin, listJackpots);
  app.post("/api/admin/v2/jackpots", verifyAdmin, createJackpot);
  app.put("/api/admin/v2/jackpots/:jackpotId", verifyAdmin, updateJackpotAmount);
  app.post("/api/admin/v2/jackpots/win", verifyAdmin, recordJackpotWin);

  // Make It Rain
  app.get("/api/admin/v2/make-it-rain", verifyAdmin, listMakeItRainCampaigns);
  app.post("/api/admin/v2/make-it-rain", verifyAdmin, createMakeItRainCampaign);
  app.post("/api/admin/v2/make-it-rain/:campaignId/distribute", verifyAdmin, distributeMakeItRainRewards);

  // Redemptions
  app.get("/api/admin/v2/redemptions", verifyAdmin, listRedemptionRequests);
  app.post("/api/admin/v2/redemptions/:requestId/approve", verifyAdmin, approveRedemption);
  app.post("/api/admin/v2/redemptions/:requestId/reject", verifyAdmin, rejectRedemption);

  // ===== GAMES & SPORTS ROUTES =====
  // Games
  app.get("/api/admin/v2/games", verifyAdmin, listGames);
  app.post("/api/admin/v2/games", verifyAdmin, createGame);
  app.put("/api/admin/v2/games/:gameId", verifyAdmin, updateGame);
  app.delete("/api/admin/v2/games/:gameId", verifyAdmin, deleteGame);
  app.patch("/api/admin/v2/games/bulk-update", verifyAdmin, bulkUpdateGames);
  app.post("/api/admin/v2/games/build-from-template", verifyAdmin, buildGameFromTemplate);
  app.post("/api/admin/v2/games/:gameId/ingest", verifyAdmin, ingestGameData);
  app.post("/api/admin/v2/games/clear-all", verifyAdmin, clearAllGames);
  app.post("/api/admin/v2/games/crawl", verifyAdmin, crawlSlots);
  app.post("/api/admin/v2/games/save-crawled", verifyAdmin, handleSaveCrawledGame);
  app.get("/api/admin/v2/games/locate-thumbnail", verifyAdmin, locateThumbnail);
  app.post("/api/admin/v2/games/import-slots", verifyAdmin, handleImportGames);
  app.post("/api/admin/v2/games/generate-with-ai", verifyAdmin, generateGameWithAI);
  app.post("/api/admin/v2/games/create-from-ai", verifyAdmin, createGameFromAI);

  // Game Metadata & Features
  app.get("/api/admin/v2/games/:gameId/metadata", getGameMetadata);
  app.put("/api/admin/v2/games/:gameId/metadata", verifyAdmin, updateGameMetadata);

  // Game Features
  app.get("/api/admin/v2/features", listGameFeatures);
  app.post("/api/admin/v2/features", verifyAdmin, createGameFeature);
  app.post("/api/admin/v2/games/:gameId/features", verifyAdmin, addFeatureToGame);
  app.delete("/api/admin/v2/games/:gameId/features/:featureId", verifyAdmin, removeFeatureFromGame);
  app.get("/api/admin/v2/games/:gameId/features", getGameFeatures);

  // Game Themes
  app.get("/api/admin/v2/themes", listGameThemes);
  app.post("/api/admin/v2/themes", verifyAdmin, createGameTheme);
  app.post("/api/admin/v2/games/:gameId/themes", verifyAdmin, addThemeToGame);
  app.get("/api/admin/v2/games/:gameId/themes", getGameThemes);

  // Game Ratings
  app.post("/api/admin/v2/games/:gameId/rate", verifyPlayer, rateGame);
  app.get("/api/admin/v2/games/:gameId/ratings", getGameRatings);

  // Game Statistics
  app.get("/api/admin/v2/games/:gameId/statistics", getGameStatistics);

  // Poker
  app.get("/api/admin/v2/poker/tables", verifyAdmin, listPokerTables);
  app.post("/api/admin/v2/poker/tables", verifyAdmin, createPokerTable);
  app.put("/api/admin/v2/poker/tables/:tableId", verifyAdmin, updatePokerTable);
  app.get("/api/admin/v2/poker/stats", verifyAdmin, getPokerStats);

  // Bingo
  app.get("/api/admin/v2/bingo/games", verifyAdmin, listBingoGames);
  app.post("/api/admin/v2/bingo/games", verifyAdmin, createBingoGame);
  app.put("/api/admin/v2/bingo/games/:gameId", verifyAdmin, updateBingoGame);
  app.get("/api/admin/v2/bingo/stats", verifyAdmin, getBingoStats);

  // Sportsbook
  app.get("/api/admin/v2/sportsbook/events", verifyAdmin, listSportsEvents);
  app.post("/api/admin/v2/sportsbook/events", verifyAdmin, createSportsEvent);
  app.put("/api/admin/v2/sportsbook/events/:eventId", verifyAdmin, updateSportsEvent);
  app.get("/api/admin/v2/sportsbook/stats", verifyAdmin, getSportsbookStats);

  // Provider Management
  app.get("/api/admin/v2/providers/available", getAvailableProviders);
  app.get("/api/admin/v2/providers", listProviderConfigs);
  app.post("/api/admin/v2/providers", verifyAdmin, createProviderConfig);
  app.get("/api/admin/v2/providers/:providerId", getProviderConfig);
  app.put("/api/admin/v2/providers/:providerId", verifyAdmin, updateProviderConfig);
  app.post("/api/admin/v2/providers/:providerId/test", verifyAdmin, testProviderConnection);
  app.post("/api/admin/v2/providers/:providerId/sync", verifyAdmin, syncProviderGames);
  app.get("/api/admin/v2/providers/:providerId/games", getProviderGames);
  app.get("/api/admin/v2/providers/:providerId/stats", getProviderStats);

  // Import History
  app.get("/api/admin/v2/import-history", getImportHistory);
  app.get("/api/admin/v2/import-history/:importId", getImportHistoryDetails);

  // Game Aggregation (Legacy)
  app.get("/api/admin/v2/aggregation/providers", verifyAdmin, getProviders);
  app.post("/api/admin/v2/aggregation/sync/:providerId", verifyAdmin, syncProvider);
  app.post("/api/admin/v2/aggregation/sync-all", verifyAdmin, syncAllProviders);
  app.get("/api/admin/v2/aggregation/stats", verifyAdmin, getAggregationStats);
  app.post("/api/admin/v2/aggregation/bulk-import", verifyAdmin, bulkImportGames);
  app.get("/api/admin/v2/aggregation/export", verifyAdmin, exportGames);
  app.get("/api/admin/v2/aggregation/provider/:provider/games", verifyAdmin, getGamesByProvider);
  app.delete("/api/admin/v2/aggregation/provider/:provider/games", verifyAdmin, deleteProviderGames);

  // Scratch Tickets
  app.get("/api/admin/v2/scratch-tickets/designs", verifyAdmin, getScratchDesigns);
  app.get("/api/admin/v2/scratch-tickets/designs/:designId", verifyAdmin, getScratchDesign);
  app.post("/api/admin/v2/scratch-tickets/designs", verifyAdmin, createScratchDesign);
  app.put("/api/admin/v2/scratch-tickets/designs/:designId", verifyAdmin, updateScratchDesign);
  app.delete("/api/admin/v2/scratch-tickets/designs/:designId", verifyAdmin, deleteScratchDesign);
  app.get("/api/admin/v2/scratch-tickets/stats", verifyAdmin, getScratchStatistics);
  app.get("/api/admin/v2/scratch-tickets/transactions", verifyAdmin, getScratchAdminTransactionHistory);
  app.get("/api/admin/v2/scratch-tickets/results", verifyAdmin, getScratchTicketResults);

  // Pull Tab Lottery Tickets
  app.get("/api/admin/v2/pull-tabs/designs", verifyAdmin, getPullTabAdminDesigns);
  app.get("/api/admin/v2/pull-tabs/designs/:designId", verifyAdmin, getPullTabAdminDesign);
  app.post("/api/admin/v2/pull-tabs/designs", verifyAdmin, createPullTabDesign);
  app.put("/api/admin/v2/pull-tabs/designs/:designId", verifyAdmin, updatePullTabDesign);
  app.delete("/api/admin/v2/pull-tabs/designs/:designId", verifyAdmin, deletePullTabDesign);
  app.get("/api/admin/v2/pull-tabs/stats", verifyAdmin, getPullTabStatistics);
  app.get("/api/admin/v2/pull-tabs/transactions", verifyAdmin, getPullTabAdminTransactionHistory);
  app.get("/api/admin/v2/pull-tabs/results", verifyAdmin, getPullTabResults);

  // ===== OPERATIONS ROUTES =====
  // Security
  app.get("/api/admin/v2/security/alerts", verifyAdmin, listSecurityAlerts);
  app.post("/api/admin/v2/security/alerts/:alertId/resolve", verifyAdmin, resolveSecurityAlert);

  // Content Management
  app.get("/api/admin/v2/cms/pages", verifyAdmin, listCMSPages);
  app.post("/api/admin/v2/cms/pages", verifyAdmin, createCMSPage);
  app.put("/api/admin/v2/cms/pages/:pageId", verifyAdmin, updateCMSPage);
  app.delete("/api/admin/v2/cms/pages/:pageId", verifyAdmin, deleteCMSPage);

  app.get("/api/admin/v2/cms/banners", verifyAdmin, listCMSBanners);
  app.post("/api/admin/v2/cms/banners", verifyAdmin, createCMSBanner);

  // Casino Settings
  app.get("/api/admin/v2/casino/settings", verifyAdmin, getCasinoSettings);
  app.put("/api/admin/v2/casino/settings", verifyAdmin, updateCasinoSettings);

  // Social
  app.get("/api/admin/v2/social/groups", verifyAdmin, listSocialGroups);
  app.post("/api/social/groups", verifyPlayer, handleCreateSocialGroup);
  app.post("/api/social/groups/:groupId/join", verifyPlayer, handleJoinSocialGroup);
  app.get("/api/admin/v2/social/groups/:groupId/members", verifyAdmin, getSocialGroupMembers);

  // Player Retention
  app.get("/api/admin/v2/retention/campaigns", verifyAdmin, listRetentionCampaigns);
  app.post("/api/admin/v2/retention/campaigns", verifyAdmin, createRetentionCampaign);
  app.put("/api/admin/v2/retention/campaigns/:campaignId", verifyAdmin, updateRetentionCampaign);

  // ===== ADVANCED ROUTES =====
  // VIP Management
  app.get("/api/admin/v2/vip/tiers", verifyAdmin, listVIPTiers);
  app.post("/api/admin/v2/vip/tiers", verifyAdmin, createVIPTier);
  app.post("/api/admin/v2/vip/promote", verifyAdmin, promotePlayerToVIP);
  app.get("/api/admin/v2/vip/players", verifyAdmin, getVIPPlayers);

  // Fraud Detection
  app.get("/api/admin/v2/fraud/patterns", verifyAdmin, listFraudPatterns);
  app.post("/api/admin/v2/fraud/patterns", verifyAdmin, createFraudPattern);
  app.get("/api/admin/v2/fraud/flags", verifyAdmin, listFraudFlags);
  app.post("/api/admin/v2/fraud/flags/:flagId/resolve", verifyAdmin, resolveFraudFlag);

  // Affiliate Management
  app.get("/api/admin/v2/affiliates", verifyAdmin, listAffiliatePartners);
  app.post("/api/admin/v2/affiliates", verifyAdmin, createAffiliatePartner);
  app.post("/api/admin/v2/affiliates/:partnerId/approve", verifyAdmin, approveAffiliatePartner);
  app.get("/api/admin/v2/affiliates/:partnerId/stats", verifyAdmin, getAffiliateStats);

  // Support & Tickets
  app.get("/api/admin/v2/support/tickets", verifyAdmin, listSupportTickets);
  app.get("/api/admin/v2/support/tickets/:ticketId/messages", verifyAdmin, getTicketMessages);
  app.post("/api/admin/v2/support/tickets/:ticketId/assign", verifyAdmin, assignTicket);
  app.post("/api/admin/v2/support/tickets/:ticketId/close", verifyAdmin, closeTicket);

  // System Logs
  app.get("/api/admin/v2/system/logs", verifyAdmin, listSystemLogs);

  // API Management
  app.get("/api/admin/v2/api/keys", verifyAdmin, listAPIKeys);
  app.post("/api/admin/v2/api/keys", verifyAdmin, createAPIKey);
  app.post("/api/admin/v2/api/keys/:keyId/revoke", verifyAdmin, revokeAPIKey);

  // Notifications
  app.get("/api/admin/v2/notifications/templates", verifyAdmin, listNotificationTemplates);
  app.post("/api/admin/v2/notifications/templates", verifyAdmin, createNotificationTemplate);

  // Compliance
  app.get("/api/admin/v2/compliance/logs", verifyAdmin, listComplianceLogs);
  app.get("/api/admin/v2/compliance/aml-checks", verifyAdmin, listAMLChecks);
  app.post("/api/admin/v2/compliance/aml-checks/:checkId/verify", verifyAdmin, verifyAMLCheck);

  // ===== STORE MANAGEMENT ROUTES =====
  // Gold Coin Packages
  app.get("/api/admin/v2/store/packages", verifyAdmin, getStorePackages);
  app.post("/api/admin/v2/store/packages", verifyAdmin, createStorePackage);
  app.put("/api/admin/v2/store/packages/:id", verifyAdmin, updateStorePackage);
  app.delete("/api/admin/v2/store/packages/:id", verifyAdmin, deleteStorePackage);

  // Payment Methods
  app.get("/api/admin/v2/store/payment-methods", verifyAdmin, getPaymentMethods);
  app.post("/api/admin/v2/store/payment-methods", verifyAdmin, createPaymentMethod);
  app.put("/api/admin/v2/store/payment-methods/:id", verifyAdmin, updatePaymentMethod);
  app.delete("/api/admin/v2/store/payment-methods/:id", verifyAdmin, deletePaymentMethod);

  // Store Settings
  app.get("/api/admin/v2/store/settings", verifyAdmin, getStoreSettings);
  app.put("/api/admin/v2/store/settings", verifyAdmin, updateStoreSettings);

  // ===== NEW FEATURE ROUTES =====

  // Social Sharing
  app.post("/api/social/share", verifyPlayer, handleRecordShare);
  app.get("/api/social/history", verifyPlayer, handleGetShareHistory);
  app.post("/api/social/response", handleRecordShareResponse);
  app.get("/api/admin/v2/social/stats", verifyAdmin, handleGetShareStats);

  // Daily Login Bonus
  app.get("/api/daily-bonus", verifyPlayer, handleGetDailyBonus);
  app.post("/api/daily-bonus/claim", verifyPlayer, handleClaimDailyBonus);
  app.get("/api/daily-bonus/streak", verifyPlayer, handleGetBonusStreak);

  // Referral System
  app.get("/api/referral/link", verifyPlayer, handleGetOrCreateReferralLink);
  app.get("/api/referral/recent", verifyPlayer, handleGetRecentReferrals);
  app.post("/api/referral/register", handleRegisterWithReferral);
  app.post("/api/referral/claim/complete", handleCompleteReferralClaim);
  app.get("/api/referral/stats", verifyPlayer, handleGetReferralStats);

  // Payment Methods
  app.post("/api/payment-methods", verifyPlayer, handleCreatePaymentMethod);
  app.get("/api/payment-methods", verifyPlayer, handleGetPaymentMethods);
  app.post("/api/payment-methods/primary", verifyPlayer, handleSetPrimaryPaymentMethod);
  app.delete("/api/payment-methods/:methodId", verifyPlayer, handleDeletePaymentMethod);
  app.post("/api/payment-methods/verify", verifyPlayer, handleVerifyPaymentMethod);

  // Admin Notifications
  app.post("/api/admin/notifications", verifyAdmin, handleCreateNotification);
  app.get("/api/admin/notifications", verifyAdmin, handleGetNotifications);
  app.get("/api/admin/v2/notifications/all", verifyAdmin, handleGetAllNotifications);
  app.post("/api/admin/notifications/read", verifyAdmin, handleMarkAsRead);
  app.post("/api/admin/notifications/status", verifyAdmin, handleUpdateNotificationStatus);
  app.post("/api/admin/notifications/approve", verifyAdmin, handleApproveNotification);
  app.post("/api/admin/notifications/deny", verifyAdmin, handleDenyNotification);
  app.post("/api/admin/notifications/assign", verifyAdmin, handleAssignNotification);
  app.post("/api/admin/notifications/resolve", verifyAdmin, handleResolveNotification);

  // KYC Onboarding
  app.get("/api/kyc/progress", verifyPlayer, handleGetOnboardingProgress);
  app.post("/api/kyc/progress", verifyPlayer, handleUpdateOnboardingStep);
  app.post("/api/kyc/upload", verifyPlayer, kycUpload.single('file'), handleUploadKYCDocument);
  app.post("/api/kyc/complete", verifyPlayer, handleCompleteOnboarding);
  app.post("/api/kyc/skip", verifyPlayer, handleSkipOnboarding);
  app.get("/api/kyc/steps", handleGetOnboardingSteps);

  // Sales Tracking
  app.post("/api/sales/record", verifyPlayer, handleRecordSale);
  app.get("/api/admin/v2/sales/stats", verifyAdmin, handleGetSalesStats);
  app.get("/api/admin/v2/sales/revenue", verifyAdmin, handleGetTotalRevenue);
  app.get("/api/admin/v2/sales/by-game", verifyAdmin, handleGetGameTypeStats);
  app.get("/api/sales/history", verifyPlayer, handleGetPlayerSalesHistory);
  app.get("/api/admin/v2/sales/daily", verifyAdmin, handleGetDailyRevenueSummary);
  app.get("/api/admin/v2/sales/top-games", verifyAdmin, handleGetTopPerformingGames);

  // Betting Limits
  app.get("/api/betting/limits", handleGetBettingLimits);
  app.put("/api/admin/v2/betting/limits", verifyAdmin, handleUpdateBettingLimits);
  app.post("/api/betting/validate-bet", handleValidateBet);
  app.post("/api/betting/validate-win", handleValidateWin);
  app.post("/api/betting/validate-redemption", handleValidateRedemption);

  // User Messaging
  app.post("/api/messages/send", verifyPlayer, handleSendMessage);
  app.get("/api/messages", verifyPlayer, handleGetMessages);
  app.get("/api/messages/unread", verifyPlayer, handleGetUnreadMessages);
  app.post("/api/messages/read", verifyPlayer, handleMarkMessageAsRead);
  app.get("/api/messages/conversation", verifyPlayer, handleGetConversation);
  app.get("/api/messages/threads", verifyPlayer, handleGetMessageThreads);
  app.delete("/api/messages/:messageId", verifyPlayer, handleDeleteMessage);
  app.get("/api/messages/stats", verifyPlayer, handleGetMessageStats);

  // Challenges
  app.get("/api/challenges", verifyPlayer, getChallenges);
  app.post("/api/challenges/claim", verifyPlayer, claimChallengeReward);

  // Platform Stats (Public)
  app.get("/api/platform/stats", getPlatformStats);
  app.get("/api/platform/winners", getRecentWinners);

  // Support & Tickets (Player Facing)
  app.get("/api/support/tickets", verifyPlayer, listPlayerTickets);
  app.post("/api/support/tickets", verifyPlayer, createPlayerTicket);
  app.get("/api/support/tickets/:ticketId", verifyPlayer, getTicketDetails);
  app.post("/api/support/tickets/:ticketId/messages", verifyPlayer, addTicketMessage);

  // AI Chat
  app.post("/api/ai/chat", verifyPlayer, handleAIChat);
  app.get("/api/ai/status", handleGetAIStatus);
  app.get("/api/ai/conversation/history", verifyPlayer, handleGetConversationHistory);
  app.get("/api/ai/conversation/sessions", verifyPlayer, handleGetSessions);

  // ===== AI GAME BUILDER ROUTES =====
  app.post("/api/admin/v2/games/builder/projects", verifyAdmin, createGameBuilderProject);
  app.get("/api/admin/v2/games/builder/projects", verifyAdmin, getGameBuilderProjects);
  app.get("/api/admin/v2/games/builder/projects/:projectId", verifyAdmin, getGameBuilderProject);
  app.put("/api/admin/v2/games/builder/projects/:projectId", verifyAdmin, updateGameBuilderProject);
  app.delete("/api/admin/v2/games/builder/projects/:projectId", verifyAdmin, deleteGameBuilderProject);
  app.post("/api/admin/v2/games/builder/projects/:projectId/versions", verifyAdmin, saveGameVersion);
  app.get("/api/admin/v2/games/builder/versions/:versionId", verifyAdmin, getGameVersion);
  app.post("/api/admin/v2/games/builder/projects/:projectId/versions/:versionId/restore", verifyAdmin, restoreGameVersion);

  // ===== ADMIN NOTIFICATIONS QUEUE ROUTES =====
  app.post("/api/admin/v2/notifications", verifyAdmin, createAdminNotification);
  app.get("/api/admin/v2/notifications", verifyAdmin, getAdminNotifications);
  app.get("/api/admin/v2/notifications/:notificationId", verifyAdmin, getAdminNotification);
  app.put("/api/admin/v2/notifications/:notificationId", verifyAdmin, updateAdminNotification);
  app.post("/api/admin/v2/notifications/:notificationId/approve", verifyAdmin, approveAdminNotification);
  app.post("/api/admin/v2/notifications/:notificationId/deny", verifyAdmin, denyAdminNotification);
  app.get("/api/admin/v2/notifications/type/:type", verifyAdmin, getNotificationsByType);
  app.post("/api/admin/v2/notifications/bulk-update", verifyAdmin, bulkUpdateAdminNotifications);

  // ===== DEBUG ROUTES =====
  app.get("/api/debug/store-packs", async (_req, res) => {
    try {
      const result = await query('SELECT * FROM store_packs LIMIT 1');
      const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
      res.json({
        success: true,
        message: 'Store packs table exists',
        columns,
        sampleRow: result.rows[0],
        totalRows: result.rows.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: error.code
      });
    }
  });

  // ===== EXAMPLE ROUTES =====
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Global Error Handler - Must be last
  app.use(errorHandler);

  return app;
}
