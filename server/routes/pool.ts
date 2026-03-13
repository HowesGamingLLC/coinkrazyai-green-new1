import { RequestHandler } from 'express';
import { query } from '../db/connection';
import * as dbQueries from '../db/queries';

const HOUSE_FEE = 0.50;
const MIN_BUY_IN = 5;
const MAX_BUY_IN = 1000;

// Get all available pool tables
export const handleGetPoolTables: RequestHandler = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        pt.id,
        pt.name,
        pt.min_buy_in as "minBuyIn",
        pt.max_buy_in as "maxBuyIn",
        pt.max_players as "maxPlayers",
        (SELECT COUNT(*) FROM pool_game_players WHERE game_id IN 
          (SELECT id FROM pool_games WHERE table_id = pt.id AND status = 'in-progress')) as "playersInGame",
        COALESCE((SELECT SUM(buy_in) FROM pool_games WHERE table_id = pt.id AND status = 'in-progress'), 0) as "currentPot",
        pt.status,
        pt.created_at as "createdAt"
      FROM pool_tables pt
      WHERE pt.status = 'active'
      ORDER BY pt.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        minBuyIn: parseFloat(row.minBuyIn),
        maxBuyIn: parseFloat(row.maxBuyIn),
        maxPlayers: row.maxPlayers,
        playersInGame: parseInt(row.playersInGame) || 0,
        currentPot: parseFloat(row.currentPot) || 0,
        status: row.status,
        createdAt: row.createdAt
      }))
    });
  } catch (error) {
    console.error('[Pool] Get tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pool tables'
    });
  }
};

// Create a new pool table
export const handleCreatePoolTable: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { buyInAmount } = req.body;

    if (!buyInAmount || buyInAmount < MIN_BUY_IN || buyInAmount > MAX_BUY_IN) {
      return res.status(400).json({
        success: false,
        error: `Buy-in must be between ${MIN_BUY_IN} and ${MAX_BUY_IN} SC`
      });
    }

    // Verify player balance
    const playerResult = await query(
      'SELECT sweeps_coins FROM players WHERE id = $1',
      [req.user.playerId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const currentBalance = parseFloat(playerResult.rows[0].sweeps_coins);
    if (currentBalance < buyInAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Create pool table
    const tableResult = await query(
      `INSERT INTO pool_tables (name, min_buy_in, max_buy_in, max_players, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        `Pool Table ${Math.floor(Math.random() * 1000)}`,
        MIN_BUY_IN,
        MAX_BUY_IN,
        2,
        'active'
      ]
    );

    const tableId = tableResult.rows[0].id;

    // Create game on the table
    const gameResult = await query(
      `INSERT INTO pool_games (table_id, creator_id, status, total_pot, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id`,
      [tableId, req.user.playerId, 'waiting', buyInAmount]
    );

    const gameId = gameResult.rows[0].id;

    // Add player to game
    await query(
      `INSERT INTO pool_game_players (game_id, player_id, username, buy_in, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [gameId, req.user.playerId, req.user.username, buyInAmount, 'active']
    );

    // Deduct buy-in from player's balance
    const newBalance = currentBalance - buyInAmount;
    await query(
      'UPDATE players SET sweeps_coins = $1 WHERE id = $2',
      [newBalance, req.user.playerId]
    );

    // Record wallet transaction
    await dbQueries.recordWalletTransaction(
      req.user.playerId,
      'sweeps_coins',
      -buyInAmount,
      'pool_game_buy_in',
      `Pool Game Buy-in: ${buyInAmount} SC`
    );

    res.json({
      success: true,
      gameId,
      tableId,
      message: 'Pool game created successfully'
    });
  } catch (error) {
    console.error('[Pool] Create table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pool game'
    });
  }
};

// Join an existing pool table
export const handleJoinPoolTable: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { tableId, buyInAmount } = req.body;

    if (!tableId || !buyInAmount) {
      return res.status(400).json({ success: false, error: 'Table ID and buy-in required' });
    }

    // Verify player balance
    const playerResult = await query(
      'SELECT sweeps_coins FROM players WHERE id = $1',
      [req.user.playerId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const currentBalance = parseFloat(playerResult.rows[0].sweeps_coins);
    if (currentBalance < buyInAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Get table info
    const tableResult = await query(
      'SELECT * FROM pool_tables WHERE id = $1',
      [tableId]
    );

    if (tableResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const table = tableResult.rows[0];

    if (buyInAmount < table.min_buy_in || buyInAmount > table.max_buy_in) {
      return res.status(400).json({
        success: false,
        error: `Buy-in must be between ${table.min_buy_in} and ${table.max_buy_in} SC`
      });
    }

    // Get waiting game for this table
    const gameResult = await query(
      'SELECT * FROM pool_games WHERE table_id = $1 AND status = $2 LIMIT 1',
      [tableId, 'waiting']
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No waiting game on this table' });
    }

    const game = gameResult.rows[0];

    // Check if player is already in game
    const existingPlayer = await query(
      'SELECT * FROM pool_game_players WHERE game_id = $1 AND player_id = $2',
      [game.id, req.user.playerId]
    );

    if (existingPlayer.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Already in this game' });
    }

    // Add player to game
    await query(
      `INSERT INTO pool_game_players (game_id, player_id, username, buy_in, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [game.id, req.user.playerId, req.user.username, buyInAmount, 'active']
    );

    // Update game pot and status to in-progress
    const newPot = parseFloat(game.total_pot) + buyInAmount;
    await query(
      'UPDATE pool_games SET total_pot = $1, status = $2 WHERE id = $3',
      [newPot, 'in-progress', game.id]
    );

    // Deduct buy-in from player's balance
    const newBalance = currentBalance - buyInAmount;
    await query(
      'UPDATE players SET sweeps_coins = $1 WHERE id = $2',
      [newBalance, req.user.playerId]
    );

    // Record wallet transaction
    await dbQueries.recordWalletTransaction(
      req.user.playerId,
      'sweeps_coins',
      -buyInAmount,
      'pool_game_buy_in',
      `Joined Pool Game: ${buyInAmount} SC`
    );

    res.json({
      success: true,
      gameId: game.id,
      message: 'Joined pool game successfully'
    });
  } catch (error) {
    console.error('[Pool] Join table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join pool game'
    });
  }
};

// Get pool game details
export const handleGetPoolGame: RequestHandler = async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameResult = await query(
      'SELECT * FROM pool_games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    // Get all players in game
    const playersResult = await query(
      `SELECT 
        player_id as "id",
        username,
        buy_in as "buyIn",
        COALESCE(balls_hit, '[]') as "ballsHit",
        balls_type as "balls",
        status,
        is_current_turn as "isCurrentTurn"
      FROM pool_game_players
      WHERE game_id = $1`,
      [gameId]
    );

    const players = playersResult.rows.map(row => ({
      id: row.id,
      username: row.username,
      buyIn: parseFloat(row.buyIn),
      ballsHit: JSON.parse(row.ballsHit),
      balls: row.balls,
      isCurrentTurn: row.isCurrentTurn || false
    }));

    res.json({
      success: true,
      data: {
        id: game.id,
        status: game.status,
        creatorId: game.creator_id,
        players,
        currentPlayerId: players[0]?.id,
        totalPot: parseFloat(game.total_pot),
        createdAt: game.created_at
      }
    });
  } catch (error) {
    console.error('[Pool] Get game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game details'
    });
  }
};

// Raise bet during game
export const handleRaiseBet: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { gameId, raiseAmount } = req.body;

    if (!gameId || !raiseAmount || raiseAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid raise amount' });
    }

    // Verify player balance
    const playerResult = await query(
      'SELECT sweeps_coins FROM players WHERE id = $1',
      [req.user.playerId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const currentBalance = parseFloat(playerResult.rows[0].sweeps_coins);
    if (currentBalance < raiseAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance for raise' });
    }

    // Update game pot
    const gameResult = await query(
      'SELECT total_pot FROM pool_games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const newPot = parseFloat(gameResult.rows[0].total_pot) + raiseAmount;

    await query(
      'UPDATE pool_games SET total_pot = $1 WHERE id = $2',
      [newPot, gameId]
    );

    // Deduct from player balance
    const newBalance = currentBalance - raiseAmount;
    await query(
      'UPDATE players SET sweeps_coins = $1 WHERE id = $2',
      [newBalance, req.user.playerId]
    );

    // Record transaction
    await dbQueries.recordWalletTransaction(
      req.user.playerId,
      'sweeps_coins',
      -raiseAmount,
      'pool_game_raise',
      `Pool Game Raise: ${raiseAmount} SC`
    );

    res.json({
      success: true,
      newPot,
      message: `Raised by ${raiseAmount} SC`
    });
  } catch (error) {
    console.error('[Pool] Raise bet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to raise bet'
    });
  }
};

// End game and determine winner
export const handleEndPoolGame: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { gameId, winnerId } = req.body;

    if (!gameId || !winnerId) {
      return res.status(400).json({ success: false, error: 'Game ID and winner ID required' });
    }

    // Get game details
    const gameResult = await query(
      'SELECT * FROM pool_games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    // Get winner details
    const winnerResult = await query(
      'SELECT player_id, username, buy_in FROM pool_game_players WHERE game_id = $1 AND player_id = $2',
      [gameId, winnerId]
    );

    if (winnerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Winner not found in game' });
    }

    const winner = winnerResult.rows[0];
    const totalPot = parseFloat(game.total_pot);
    const houseFee = Math.min(HOUSE_FEE, totalPot); // Can't charge more than pot
    const winnerPayout = totalPot - houseFee;

    // Update winner's balance
    const winnerBalanceResult = await query(
      'SELECT sweeps_coins FROM players WHERE id = $1',
      [winnerId]
    );

    const winnerNewBalance = parseFloat(winnerBalanceResult.rows[0].sweeps_coins) + winnerPayout;
    await query(
      'UPDATE players SET sweeps_coins = $1 WHERE id = $2',
      [winnerNewBalance, winnerId]
    );

    // Record winner transaction
    await dbQueries.recordWalletTransaction(
      winnerId,
      'sweeps_coins',
      winnerPayout,
      'pool_game_win',
      `Pool Game Win: ${winnerPayout.toFixed(2)} SC (Pot: ${totalPot.toFixed(2)} SC, House Fee: ${houseFee.toFixed(2)} SC)`
    );

    // Update game status
    await query(
      'UPDATE pool_games SET status = $1, winner_id = $2, finished_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['finished', winnerId, gameId]
    );

    // Record game result
    try {
      const gameTypeResult = await query(
        'SELECT id FROM games WHERE name = $1 LIMIT 1',
        ['Pool Shark']
      );

      if (gameTypeResult.rows.length > 0) {
        await query(
          `INSERT INTO game_results (player_id, game_id, bet_amount, win_amount, status, result_data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            winnerId,
            gameTypeResult.rows[0].id,
            parseFloat(winner.buy_in),
            winnerPayout,
            'win',
            JSON.stringify({ poolGameId: gameId, payout: winnerPayout, houseFee })
          ]
        );
      }
    } catch (err) {
      console.error('[Pool] Failed to record game result:', err);
    }

    res.json({
      success: true,
      victoryData: {
        winner: {
          id: winner.player_id,
          username: winner.username,
          buyIn: parseFloat(winner.buy_in)
        },
        payout: totalPot,
        houseFee,
        netWinnings: winnerPayout
      },
      message: `${winner.username} won ${winnerPayout.toFixed(2)} SC!`
    });
  } catch (error) {
    console.error('[Pool] End game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end game'
    });
  }
};
