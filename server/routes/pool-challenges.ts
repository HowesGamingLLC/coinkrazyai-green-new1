import { RequestHandler } from 'express';
import { query } from '../db/connection';
import * as dbQueries from '../db/queries';

// Send a challenge to another player
export const handleSendChallenge: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { opponentId, buyInAmount, message } = req.body;

    if (!opponentId || !buyInAmount || buyInAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid opponent or buy-in amount'
      });
    }

    // Verify challenger has sufficient balance
    const challengerResult = await query(
      'SELECT sweeps_coins FROM players WHERE id = $1',
      [req.user.playerId]
    );

    if (challengerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const challengerBalance = parseFloat(challengerResult.rows[0].sweeps_coins);
    if (challengerBalance < buyInAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance for challenge'
      });
    }

    // Verify opponent exists
    const opponentResult = await query(
      'SELECT id, username FROM players WHERE id = $1',
      [opponentId]
    );

    if (opponentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Opponent not found' });
    }

    // Check for pending challenges between these players
    const existingChallenge = await query(
      `SELECT id FROM pool_challenges 
       WHERE (challenger_id = $1 AND opponent_id = $2) OR (challenger_id = $2 AND opponent_id = $1)
       AND status IN ('pending', 'accepted')
       LIMIT 1`,
      [req.user.playerId, opponentId]
    );

    if (existingChallenge.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Challenge already exists with this player'
      });
    }

    // Create challenge (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const challengeResult = await query(
      `INSERT INTO pool_challenges (challenger_id, opponent_id, buy_in_amount, message, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, challenger_id, opponent_id, buy_in_amount, status, created_at`,
      [req.user.playerId, opponentId, buyInAmount, message || null, expiresAt]
    );

    res.json({
      success: true,
      challenge: challengeResult.rows[0],
      message: `Challenge sent to ${opponentResult.rows[0].username}`
    });
  } catch (error) {
    console.error('[Pool] Send challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send challenge'
    });
  }
};

// Get pending challenges for current player
export const handleGetChallenges: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { type = 'all' } = req.query;

    let whereClause = '';
    if (type === 'sent') {
      whereClause = 'WHERE pc.challenger_id = $1 AND pc.status IN (\'pending\', \'accepted\')';
    } else if (type === 'received') {
      whereClause = 'WHERE pc.opponent_id = $1 AND pc.status = \'pending\'';
    } else {
      whereClause = 'WHERE (pc.challenger_id = $1 OR pc.opponent_id = $1) AND pc.status IN (\'pending\', \'accepted\')';
    }

    const result = await query(
      `SELECT 
        pc.id,
        pc.challenger_id,
        pc.opponent_id,
        challenger.username as challenger_username,
        opponent.username as opponent_username,
        pc.buy_in_amount,
        pc.status,
        pc.message,
        pc.expires_at,
        pc.created_at,
        CASE 
          WHEN pc.challenger_id = $1 THEN 'sent'
          ELSE 'received'
        END as direction
      FROM pool_challenges pc
      LEFT JOIN players challenger ON pc.challenger_id = challenger.id
      LEFT JOIN players opponent ON pc.opponent_id = opponent.id
      ${whereClause}
      ORDER BY pc.created_at DESC`,
      [req.user.playerId]
    );

    res.json({
      success: true,
      challenges: result.rows || []
    });
  } catch (error) {
    console.error('[Pool] Get challenges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve challenges'
    });
  }
};

// Accept a challenge
export const handleAcceptChallenge: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ success: false, error: 'Challenge ID required' });
    }

    // Get challenge
    const challengeResult = await query(
      `SELECT * FROM pool_challenges WHERE id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    const challenge = challengeResult.rows[0];

    // Verify opponent accepting challenge
    if (challenge.opponent_id !== req.user.playerId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot accept another player\'s challenge'
      });
    }

    // Check challenge hasn't expired
    if (new Date(challenge.expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'Challenge has expired' });
    }

    // Verify opponent has sufficient balance
    const opponentResult = await query(
      'SELECT sweeps_coins FROM players WHERE id = $1',
      [req.user.playerId]
    );

    const opponentBalance = parseFloat(opponentResult.rows[0].sweeps_coins);
    if (opponentBalance < challenge.buy_in_amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance to accept challenge'
      });
    }

    // Create pool game from challenge
    const tableResult = await query(
      `INSERT INTO pool_tables (name, min_buy_in, max_buy_in, max_players, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        `Challenge: ${challenge.challenger_id} vs ${challenge.opponent_id}`,
        challenge.buy_in_amount,
        challenge.buy_in_amount,
        2,
        'active'
      ]
    );

    const tableId = tableResult.rows[0].id;

    // Create game
    const gameResult = await query(
      `INSERT INTO pool_games (table_id, creator_id, status, total_pot, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id`,
      [tableId, challenge.challenger_id, 'waiting', challenge.buy_in_amount * 2]
    );

    const gameId = gameResult.rows[0].id;

    // Add both players to game
    await query(
      `INSERT INTO pool_game_players (game_id, player_id, username, buy_in, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [gameId, challenge.challenger_id, '', challenge.buy_in_amount, 'active']
    );

    await query(
      `INSERT INTO pool_game_players (game_id, player_id, username, buy_in, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [gameId, req.user.playerId, '', challenge.buy_in_amount, 'active']
    );

    // Deduct from both players' balances
    const challengerNewBalance = parseFloat((await query(
      'SELECT sweeps_coins FROM players WHERE id = $1',
      [challenge.challenger_id]
    )).rows[0].sweeps_coins) - challenge.buy_in_amount;

    const opponentNewBalance = opponentBalance - challenge.buy_in_amount;

    await query(
      'UPDATE players SET sweeps_coins = $1 WHERE id = $2',
      [challengerNewBalance, challenge.challenger_id]
    );

    await query(
      'UPDATE players SET sweeps_coins = $1 WHERE id = $2',
      [opponentNewBalance, req.user.playerId]
    );

    // Record transactions
    await dbQueries.recordWalletTransaction(
      challenge.challenger_id,
      'sweeps_coins',
      -challenge.buy_in_amount,
      'pool_challenge_buy_in',
      `Pool Challenge Buy-in: ${challenge.buy_in_amount} SC`
    );

    await dbQueries.recordWalletTransaction(
      req.user.playerId,
      'sweeps_coins',
      -challenge.buy_in_amount,
      'pool_challenge_buy_in',
      `Pool Challenge Buy-in: ${challenge.buy_in_amount} SC`
    );

    // Update challenge status
    await query(
      `UPDATE pool_challenges SET status = $1, game_id = $2, accepted_at = CURRENT_TIMESTAMP WHERE id = $3`,
      ['accepted', gameId, challengeId]
    );

    res.json({
      success: true,
      gameId,
      message: 'Challenge accepted! Game starting...'
    });
  } catch (error) {
    console.error('[Pool] Accept challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept challenge'
    });
  }
};

// Decline a challenge
export const handleDeclineChallenge: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ success: false, error: 'Challenge ID required' });
    }

    const challengeResult = await query(
      'SELECT * FROM pool_challenges WHERE id = $1',
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    const challenge = challengeResult.rows[0];

    // Verify player is opponent
    if (challenge.opponent_id !== req.user.playerId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot decline someone else\'s challenge'
      });
    }

    await query(
      'UPDATE pool_challenges SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['declined', challengeId]
    );

    res.json({
      success: true,
      message: 'Challenge declined'
    });
  } catch (error) {
    console.error('[Pool] Decline challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline challenge'
    });
  }
};

// Get player's pool statistics
export const handleGetPoolStats: RequestHandler = async (req, res) => {
  try {
    const { playerId } = req.params;
    const id = playerId || (req.user ? req.user.playerId : null);

    if (!id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    let result = await query(
      'SELECT * FROM pool_player_stats WHERE player_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      // Create default stats if they don't exist
      await query(
        `INSERT INTO pool_player_stats (player_id, total_games_played, total_games_won, win_rate, elo_rating)
         VALUES ($1, 0, 0, 0, 1000)`,
        [id]
      );

      result = await query(
        'SELECT * FROM pool_player_stats WHERE player_id = $1',
        [id]
      );
    }

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('[Pool] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve player statistics'
    });
  }
};

// Get pool leaderboard
export const handleGetPoolLeaderboard: RequestHandler = async (req, res) => {
  try {
    const { period = 'alltime', limit = 100 } = req.query;

    const result = await query(
      `SELECT 
        id,
        player_id,
        username,
        elo_rating,
        wins,
        losses,
        rank,
        win_percentage,
        total_earnings,
        period
      FROM pool_leaderboard
      WHERE period = $1
      ORDER BY rank ASC
      LIMIT $2`,
      [period, limit]
    );

    res.json({
      success: true,
      leaderboard: result.rows || [],
      period
    });
  } catch (error) {
    console.error('[Pool] Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve leaderboard'
    });
  }
};

// Find match opponents (for matchmaking)
export const handleFindOpponents: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { buyInAmount, skillLevel } = req.body;

    if (!buyInAmount || buyInAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid buy-in amount'
      });
    }

    // Get current player's skill level and ELO if not provided
    const playerStatsResult = await query(
      'SELECT skill_level, elo_rating FROM pool_player_stats WHERE player_id = $1',
      [req.user.playerId]
    );

    const playerSkill = skillLevel || (playerStatsResult.rows[0]?.skill_level || 'beginner');
    const playerElo = playerStatsResult.rows[0]?.elo_rating || 1000;

    // Find opponents with similar skill level and ELO (within 200 points)
    // And who are currently available (not in a game)
    const result = await query(
      `SELECT 
        p.id,
        p.username,
        pps.elo_rating,
        pps.skill_level,
        pps.win_percentage,
        pps.total_games_won,
        p.sweeps_coins
      FROM players p
      JOIN pool_player_stats pps ON p.id = pps.player_id
      WHERE p.id != $1
      AND p.sweeps_coins >= $2
      AND pps.skill_level = $3
      AND ABS(pps.elo_rating - $4) <= 200
      AND p.id NOT IN (
        SELECT player_id FROM pool_game_players
        WHERE game_id IN (
          SELECT id FROM pool_games WHERE status IN ('waiting', 'in-progress')
        )
      )
      AND p.status = 'Active'
      ORDER BY ABS(pps.elo_rating - $4) ASC
      LIMIT 10`,
      [req.user.playerId, buyInAmount, playerSkill, playerElo]
    );

    res.json({
      success: true,
      opponents: result.rows || []
    });
  } catch (error) {
    console.error('[Pool] Find opponents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find opponents'
    });
  }
};
