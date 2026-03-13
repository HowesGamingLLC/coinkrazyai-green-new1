import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface Player {
  id: string;
  name: string;
  buyIn: number;
  ballsHit: string[];
  balls: 'solid' | 'stripe' | null;
  score: number;
  isCurrentTurn: boolean;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'cue' | 'solid' | 'stripe' | '8ball';
  number?: number;
  sunk: boolean;
}

interface PoolGameEngineProps {
  gameId: number;
  players: Player[];
  currentPlayerId: string;
  onGameEnd: (winner: Player) => void;
  onRaise?: (amount: number) => void;
  soundEnabled?: boolean;
}

const PoolGameEngine: React.FC<PoolGameEngineProps> = ({
  gameId,
  players,
  currentPlayerId,
  onGameEnd,
  onRaise,
  soundEnabled = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameTime, setGameTime] = useState(0);
  const [ballsHit, setBallsHit] = useState<string[]>([]);
  const [cuePower, setCuePower] = useState(0);
  const [cueAngle, setCueAngle] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'ended'>('setup');
  const gameStateRef = useRef({
    balls: [] as Ball[],
    friction: 0.98,
    cueFriction: 0.015,
    gravity: 0,
  });

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const otherPlayers = players.filter(p => p.id !== currentPlayerId);

  // Initialize balls on mount
  useEffect(() => {
    initializeBalls();
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gamePhase === 'ended') return;

    const gameTimer = setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(gameTimer);
  }, [gameStarted, gamePhase]);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      updatePhysics();
      drawGame(ctx, canvas);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [gameStarted, cueAngle, cuePower]);

  const initializeBalls = () => {
    const newBalls: Ball[] = [];

    // Cue ball (white)
    newBalls.push({
      x: 100,
      y: 300,
      vx: 0,
      vy: 0,
      radius: 7,
      type: 'cue',
      sunk: false
    });

    // Solid balls (1-7)
    let ballIndex = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col <= row; col++) {
        const x = 600 + row * 16;
        const y = 300 - (row * 8) + (col * 16);
        const number = ballIndex + 1;
        
        newBalls.push({
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 7,
          type: number === 8 ? '8ball' : 'solid',
          number: number,
          sunk: false
        });
        ballIndex++;
      }
    }

    gameStateRef.current.balls = newBalls;
    setBalls(newBalls);
  };

  const updatePhysics = () => {
    const state = gameStateRef.current;
    
    state.balls.forEach(ball => {
      if (ball.sunk || ball.type === 'cue') return;

      // Apply friction
      ball.vx *= state.friction;
      ball.vy *= state.friction;

      // Stop if very slow
      if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
        ball.vx = 0;
        ball.vy = 0;
      }

      // Update position
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x - ball.radius < 10) {
        ball.x = 10 + ball.radius;
        ball.vx *= -0.8;
      }
      if (ball.x + ball.radius > 700) {
        ball.x = 700 - ball.radius;
        ball.vx *= -0.8;
      }
      if (ball.y - ball.radius < 10) {
        ball.y = 10 + ball.radius;
        ball.vy *= -0.8;
      }
      if (ball.y + ball.radius > 590) {
        ball.y = 590 - ball.radius;
        ball.vy *= -0.8;
      }

      // Check pocket (sink) holes at corners and sides
      const pockets = [
        { x: 10, y: 10 },
        { x: 360, y: 10 },
        { x: 700, y: 10 },
        { x: 10, y: 300 },
        { x: 700, y: 300 },
        { x: 10, y: 590 },
        { x: 360, y: 590 },
        { x: 700, y: 590 }
      ];

      pockets.forEach(pocket => {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) {
          ball.sunk = true;
          if (soundOn) playSound('sink');
          if (ball.number) {
            setBallsHit(prev => [...prev, `${ball.number}`]);
          }
        }
      });
    });

    // Ball-to-ball collisions
    for (let i = 0; i < state.balls.length; i++) {
      for (let j = i + 1; j < state.balls.length; j++) {
        const b1 = state.balls[i];
        const b2 = state.balls[j];

        if (b1.sunk || b2.sunk) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b1.radius + b2.radius) {
          if (soundOn) playSound('collision');

          // Collision response
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);

          // Swap velocities
          const tempVx = b1.vx;
          const tempVy = b1.vy;
          b1.vx = b2.vx;
          b1.vy = b2.vy;
          b2.vx = tempVx;
          b2.vy = tempVy;

          // Separate balls
          const overlap = (b1.radius + b2.radius - dist) / 2;
          b1.x -= overlap * cos;
          b1.y -= overlap * sin;
          b2.x += overlap * cos;
          b2.y += overlap * sin;
        }
      }
    }
  };

  const shootCue = () => {
    if (!gameStarted || cuePower === 0) {
      toast.error('Set power and fire!');
      return;
    }

    const cueBall = gameStateRef.current.balls[0];
    const rad = (cueAngle * Math.PI) / 180;
    const force = (cuePower / 100) * 50;

    cueBall.vx = Math.cos(rad) * force;
    cueBall.vy = Math.sin(rad) * force;

    setCuePower(0);
    if (soundOn) playSound('shoot');
  };

  const drawGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pool table
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(10, 10, 700, 580);

    // Draw rails
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 700, 580);

    // Draw center spot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(360, 300, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw pockets
    ctx.fillStyle = '#000000';
    const pockets = [
      { x: 10, y: 10 },
      { x: 360, y: 10 },
      { x: 700, y: 10 },
      { x: 10, y: 300 },
      { x: 700, y: 300 },
      { x: 10, y: 590 },
      { x: 360, y: 590 },
      { x: 700, y: 590 }
    ];

    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw balls
    gameStateRef.current.balls.forEach(ball => {
      if (ball.sunk) return;

      ctx.fillStyle =
        ball.type === 'cue'
          ? '#ffffff'
          : ball.type === '8ball'
          ? '#000000'
          : ball.type === 'solid'
          ? '#ff6b6b'
          : '#4ecdc4';

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw ball number
      if (ball.number && ball.number !== 8) {
        ctx.fillStyle = ball.type === 'solid' ? '#ffffff' : '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), ball.x, ball.y);
      } else if (ball.number === 8) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('8', ball.x, ball.y);
      }
    });

    // Draw cue
    if (!gameStarted && cuePower > 0) {
      const cueBall = gameStateRef.current.balls[0];
      const rad = (cueAngle * Math.PI) / 180;
      const power = (cuePower / 100) * 100;

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cueBall.x + Math.cos(rad) * 20, cueBall.y + Math.sin(rad) * 20);
      ctx.lineTo(
        cueBall.x + Math.cos(rad) * (20 + power),
        cueBall.y + Math.sin(rad) * (20 + power)
      );
      ctx.stroke();
    }
  };

  const playSound = (type: 'shoot' | 'collision' | 'sink') => {
    if (!soundOn) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'shoot':
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'collision':
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
      case 'sink':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Game Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400 font-bold uppercase">Game Time</p>
            <p className="text-3xl font-black text-white">{formatTime(gameTime)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400 font-bold uppercase">Your Balls</p>
            <p className="text-lg text-red-400 font-bold">{ballsHit.length} Hit</p>
            {ballsHit.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">{ballsHit.join(', ')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 font-bold uppercase">Sound</p>
              <Badge variant={soundOn ? 'default' : 'secondary'} className="mt-1">
                {soundOn ? 'On' : 'Off'}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSoundOn(!soundOn)}
              className="border-slate-600"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Game Canvas */}
      <Card className="bg-slate-900 border-slate-700 overflow-hidden">
        <CardContent className="p-4">
          <canvas
            ref={canvasRef}
            width={720}
            height={600}
            className="w-full border-2 border-slate-700 rounded-lg bg-green-900"
          />
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6 space-y-4">
          {!gameStarted ? (
            <Button
              size="lg"
              onClick={() => {
                setGameStarted(true);
                setGamePhase('playing');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold"
            >
              Start Game
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 font-bold block mb-2">
                  Cue Power: {cuePower}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cuePower}
                  onChange={(e) => setCuePower(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 font-bold block mb-2">
                  Cue Angle: {cueAngle}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={cueAngle}
                  onChange={(e) => setCueAngle(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={shootCue}
                  className="bg-green-600 hover:bg-green-700 font-bold"
                  size="lg"
                >
                  Shoot
                </Button>
                {onRaise && (
                  <Button
                    onClick={() => onRaise(5)}
                    variant="outline"
                    className="border-yellow-600 text-yellow-400 hover:bg-yellow-900"
                    size="lg"
                  >
                    Raise 5 SC
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {otherPlayers.map(player => (
          <Card key={player.id} className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-400 font-bold uppercase">{player.name}</p>
              <p className="text-lg text-slate-300 font-bold">{player.ballsHit.length} Balls</p>
              <p className="text-xs text-slate-500 mt-2">Buy-in: {player.buyIn} SC</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PoolGameEngine;
