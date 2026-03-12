import { RequestHandler } from "express";
import { recordSlotsResult, recordWalletTransaction, getPlayerById, getBettingLimits, updateBettingLimits } from "../db/queries";

export const handleSpin: RequestHandler = async (req, res) => {
  const { gameId, betAmount } = req.body;
  const playerId = (req as any).user?.playerId;

  if (!playerId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (!gameId || betAmount === undefined) {
    return res.status(400).json({ error: "Missing gameId or betAmount" });
  }

  try {
    const playerResult = await getPlayerById(playerId);
    if (!playerResult.rows.length) {
      return res.status(404).json({ error: "Player not found" });
    }

    const player = playerResult.rows[0];
    const currentSc = parseFloat(player.sc_balance);
    const bet = parseFloat(betAmount);

    // Validate bet amount
    if (bet < 0.10 || bet > 100) {
      return res.status(400).json({ error: "Bet amount out of range" });
    }

    if (currentSc < bet) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // 1. Deduct bet from balance
    await recordWalletTransaction(
      playerId,
      "slot_spin_bet",
      0,
      -bet,
      `Spin bet on game ${gameId}`
    );

    // 2. Calculate win server-side for fairness (use RNG on server)
    // This ensures players cannot manipulate win outcomes
    const winCalculation = calculateFairSlotWin(bet);
    const win = winCalculation.win;
    const symbols = winCalculation.symbols;

    // 3. Add win if any
    if (win > 0) {
      await recordWalletTransaction(
        playerId,
        "slot_spin_win",
        0,
        win,
        `Win on game ${gameId}`
      );
    }

    // 4. Log the spin result
    const result = await recordSlotsResult(
      playerId,
      gameId,
      bet,
      win,
      symbols
    );

    // 5. Get updated balance
    const updatedPlayerResult = await getPlayerById(playerId);
    const updatedPlayer = updatedPlayerResult.rows[0];

    res.json({
      success: true,
      balance: {
        gc: parseFloat(updatedPlayer.gc_balance),
        sc: parseFloat(updatedPlayer.sc_balance)
      },
      win: win,
      symbols: symbols,
      resultId: result.rows[0]?.id
    });

  } catch (error) {
    console.error("Spin error:", error);
    res.status(500).json({ error: "Failed to process spin" });
  }
};

/**
 * Calculate fair slot spin result server-side
 * This ensures the game cannot be cheated from the client
 */
function calculateFairSlotWin(bet: number): { win: number; symbols: string } {
  const SYMBOLS = ['🍎', '🍊', '🍋', '🍌', '🍇', '💎', '👑', '7️⃣'];
  const MULTIPLIERS = [2, 2.5, 3, 3.5, 4, 5, 7.5, 10];
  const REELS = 3;
  const ROWS = 3;
  const MIDDLE_ROW = 1;

  // Generate random reels
  const reels: string[][] = [];
  for (let i = 0; i < REELS; i++) {
    const reel: string[] = [];
    for (let j = 0; j < ROWS; j++) {
      reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }
    reels.push(reel);
  }

  let win = 0;

  // Check middle row match (pays 3:1)
  const middleRow = reels.map(reel => reel[MIDDLE_ROW]);
  if (middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2]) {
    const symbolIndex = SYMBOLS.indexOf(middleRow[0]);
    const multiplier = MULTIPLIERS[symbolIndex];
    win += bet * multiplier;
  }

  // Check diagonal matches (pay 1:1 each)
  if (reels[0][0] === reels[1][1] && reels[1][1] === reels[2][2]) {
    const symbolIndex = SYMBOLS.indexOf(reels[1][1]);
    const multiplier = MULTIPLIERS[symbolIndex];
    win += bet * multiplier * 0.5;
  }

  if (reels[0][2] === reels[1][1] && reels[1][1] === reels[2][0]) {
    const symbolIndex = SYMBOLS.indexOf(reels[1][1]);
    const multiplier = MULTIPLIERS[symbolIndex];
    win += bet * multiplier * 0.5;
  }

  // Cap win at 10 SC for compliance
  const cappedWin = Math.min(Math.round(win * 100) / 100, 10.0);

  // Store symbols as JSON string
  const symbols = JSON.stringify(reels.map(r => r[MIDDLE_ROW]));

  return { win: cappedWin, symbols };
}

export const handleGetConfig: RequestHandler = async (req, res) => {
  try {
    const result = await getBettingLimits("slots");
    res.json({
      success: true,
      config: result.rows[0] || {
        min_bet_sc: 0.01,
        max_bet_sc: 5.00,
        max_win_per_spin_sc: 10.00
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch slots config" });
  }
};

export const handleUpdateConfig: RequestHandler = async (req, res) => {
  try {
    const { minBetSc, maxBetSc, maxWinPerSpinSc } = req.body;
    const result = await updateBettingLimits("slots", {
      minBetSc,
      maxBetSc,
      maxWinPerSpinSc,
      minRedemptionSc: 50
    });
    res.json({
      success: true,
      config: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update slots config" });
  }
};
