import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RotateCw, Volume2, VolumeX, Pause2, Play2 } from 'lucide-react';
import { toast } from 'sonner';

interface Player {
  id: string;
  username: string;
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
  color: string;
}

interface Pocket {
  x: number;
  y: number;
}

const ImprovedPoolGameEngine: React.FC<{
  gameId: number;
  players: Player[];
  currentPlayerId: string;
  onGameEnd: (winner: Player) => void;
  onRaise?: (amount: number) => void;
}> = ({ gameId, players, currentPlayerId, onGameEnd, onRaise }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameTime, setGameTime] = useState(0);
  const [ballsHit, setBallsHit] = useState<string[]>([]);
  const [cuePower, setCuePower] = useState(0);
  const [cueAngle, setCueAngle] = useState(45);
  const [gameStarted, setGameStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [gameInfo, setGameInfo] = useState({
    breaks: 0,
    fouls: 0,
    instructions: 'Set cue angle and power, then shoot!'
  });

  const gameStateRef = useRef({
    balls: [] as Ball[],
    friction: 0.985,
    cueFriction: 0.015,
    gravity: 0,
    lastCollision: 0,
    ballsInPlay: 15
  });

  const POCKETS: Pocket[] = [
    { x: 30, y: 30 },
    { x: 750, y: 30 },
    { x: 1470, y: 30 },
    { x: 30, y: 600 },
    { x: 1470, y: 600 },
    { x: 30, y: 1170 },
    { x: 750, y: 1170 },
    { x: 1470, y: 1170 }
  ];

  const POCKET_RADIUS = 40;
  const TABLE_WIDTH = 1500;
  const TABLE_HEIGHT = 1200;

  useEffect(() => {
    initializeBalls();
  }, []);

  useEffect(() => {
    if (!gameStarted || isPaused) return;

    const timer = setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!isPaused) {
        updatePhysics();
      }
      drawGame(ctx, canvas);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isPaused, cueAngle, cuePower, gameStarted]);

  const initializeBalls = () => {
    const newBalls: Ball[] = [];

    // Cue ball (white)
    newBalls.push({
      x: 300,
      y: TABLE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: 8,
      type: 'cue',
      sunk: false,
      color: '#ffffff'
    });

    // Create rack of balls (triangle formation)
    const rackX = TABLE_WIDTH - 300;
    const rackY = TABLE_HEIGHT / 2;
    const ballRadius = 8;
    const spacing = ballRadius * 2 + 1;

    let ballIndex = 1;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const x = rackX + row * spacing;
        const y = rackY - (row * spacing) / 2 + col * spacing;

        if (ballIndex === 8) {
          // 8-ball (black, center of rack)
          newBalls.push({
            x,
            y,
            vx: 0,
            vy: 0,
            radius: ballRadius,
            type: '8ball',
            number: 8,
            sunk: false,
            color: '#000000'
          });
        } else if (ballIndex <= 7) {
          // Solid balls (1-7)
          newBalls.push({
            x,
            y,
            vx: 0,
            vy: 0,
            radius: ballRadius,
            type: 'solid',
            number: ballIndex,
            sunk: false,
            color: `hsl(${(ballIndex - 1) * 50}, 100%, 50%)`
          });
        } else {
          // Stripe balls (9-15)
          newBalls.push({
            x,
            y,
            vx: 0,
            vy: 0,
            radius: ballRadius,
            type: 'stripe',
            number: ballIndex,
            sunk: false,
            color: `hsl(${(ballIndex - 9) * 50}, 80%, 60%)`
          });
        }

        ballIndex++;
      }
    }

    gameStateRef.current.balls = newBalls;
  };

  const updatePhysics = () => {
    const state = gameStateRef.current;
    const balls = state.balls;

    // Update ball positions and velocities
    balls.forEach(ball => {
      if (ball.sunk) return;

      // Apply friction
      ball.vx *= state.friction;
      ball.vy *= state.friction;

      // Stop if very slow
      if (Math.abs(ball.vx) < 0.05 && Math.abs(ball.vy) < 0.05) {
        ball.vx = 0;
        ball.vy = 0;
      }

      // Update position
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions with bounce
      if (ball.x - ball.radius < 30) {
        ball.x = 30 + ball.radius;
        ball.vx *= -0.85;
      }
      if (ball.x + ball.radius > TABLE_WIDTH - 30) {
        ball.x = TABLE_WIDTH - 30 - ball.radius;
        ball.vx *= -0.85;
      }
      if (ball.y - ball.radius < 30) {
        ball.y = 30 + ball.radius;
        ball.vy *= -0.85;
      }
      if (ball.y + ball.radius > TABLE_HEIGHT - 30) {
        ball.y = TABLE_HEIGHT - 30 - ball.radius;
        ball.vy *= -0.85;
      }

      // Check pockets
      POCKETS.forEach(pocket => {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < POCKET_RADIUS) {
          ball.sunk = true;
          if (soundOn) playSound('sink');
          if (ball.number && ball.type !== 'cue') {
            setBallsHit(prev => [...prev, `${ball.number}`]);
          }
        }
      });
    });

    // Ball-to-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];

        if (b1.sunk || b2.sunk) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b1.radius + b2.radius && Date.now() - state.lastCollision > 10) {
          if (soundOn) playSound('collision');
          state.lastCollision = Date.now();

          // Collision response
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);

          // Relative velocity
          const vx = b2.vx - b1.vx;
          const vy = b2.vy - b1.vy;
          const dotProduct = vx * cos + vy * sin;

          // Only collide if balls are moving toward each other
          if (dotProduct < 0) {
            // Transfer velocity along collision normal
            b1.vx += dotProduct * cos * 0.95;
            b1.vy += dotProduct * sin * 0.95;
            b2.vx -= dotProduct * cos * 0.95;
            b2.vy -= dotProduct * sin * 0.95;

            // Separate balls
            const overlap = (b1.radius + b2.radius - dist) / 2 + 0.5;
            b1.x -= overlap * cos;
            b1.y -= overlap * sin;
            b2.x += overlap * cos;
            b2.y += overlap * sin;
          }
        }
      }
    }
  };

  const shootCue = () => {
    if (!gameStarted || cuePower === 0) {
      toast.error('Set power and shoot!');
      return;
    }

    const cueBall = gameStateRef.current.balls[0];
    const rad = (cueAngle * Math.PI) / 180;
    const force = (cuePower / 100) * 25;

    cueBall.vx = Math.cos(rad) * force;
    cueBall.vy = Math.sin(rad) * force;

    setCuePower(0);
    setGameInfo(prev => ({ ...prev, breaks: prev.breaks + 1 }));
    if (soundOn) playSound('shoot');
  };

  const drawGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pool table
    ctx.fillStyle = '#0d5f3f';
    ctx.fillRect(30, 30, TABLE_WIDTH - 60, TABLE_HEIGHT - 60);

    // Draw table border/rails
    ctx.strokeStyle = '#2a4a3a';
    ctx.lineWidth = 30;
    ctx.strokeRect(30, 30, TABLE_WIDTH - 60, TABLE_HEIGHT - 60);

    // Draw center line (faint)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH / 2, 30);
    ctx.lineTo(TABLE_WIDTH / 2, TABLE_HEIGHT - 30);
    ctx.stroke();

    // Draw center spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw pockets
    ctx.fillStyle = '#000000';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    POCKETS.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowColor = 'transparent';

    // Draw balls
    gameStateRef.current.balls.forEach(ball => {
      if (ball.sunk) return;

      // Ball shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ball
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ball shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(ball.x - 2, ball.y - 2, ball.radius / 3, 0, Math.PI * 2);
      ctx.fill();

      // Ball number
      if (ball.number && ball.number !== 8) {
        ctx.fillStyle = ball.type === 'solid' ? '#ffffff' : '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), ball.x, ball.y);
      } else if (ball.number === 8) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('8', ball.x, ball.y);
      }
    });

    // Draw cue
    if (gameStarted && cuePower > 0 && !isPaused) {
      const cueBall = gameStateRef.current.balls[0];
      const rad = (cueAngle * Math.PI) / 180;
      const power = (cuePower / 100) * 80;

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(
        cueBall.x + Math.cos(rad) * 25,
        cueBall.y + Math.sin(rad) * 25
      );
      ctx.lineTo(
        cueBall.x + Math.cos(rad) * (25 + power),
        cueBall.y + Math.sin(rad) * (25 + power)
      );
      ctx.stroke();

      // Cue tip
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(
        cueBall.x + Math.cos(rad) * (25 + power),
        cueBall.y + Math.sin(rad) * (25 + power),
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  };

  const playSound = (type: 'shoot' | 'collision' | 'sink') => {
    if (!soundOn) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    switch (type) {
      case 'shoot':
        osc.frequency.value = 300;
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        osc.start();
        osc.stop(audioContext.currentTime + 0.15);
        break;
      case 'collision':
        osc.frequency.value = 700;
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        osc.start();
        osc.stop(audioContext.currentTime + 0.08);
        break;
      case 'sink':
        osc.frequency.value = 900;
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        osc.start();
        osc.stop(audioContext.currentTime + 0.25);
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
      {/* Game Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3">
            <p className="text-xs text-slate-400 font-bold uppercase">Time</p>
            <p className="text-2xl font-black text-white mt-1">{formatTime(gameTime)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3">
            <p className="text-xs text-slate-400 font-bold uppercase">Balls Hit</p>
            <p className="text-2xl font-black text-green-400 mt-1">{ballsHit.length}</p>
            {ballsHit.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">{ballsHit.join(', ')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3">
            <p className="text-xs text-slate-400 font-bold uppercase">Breaks</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{gameInfo.breaks}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Sound</p>
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
            width={1500}
            height={1200}
            className="w-full border-2 border-slate-700 rounded-lg bg-slate-950 cursor-crosshair"
            style={{ maxHeight: '600px' }}
          />
        </CardContent>
      </Card>

      {/* Game Info */}
      <Alert className="bg-blue-500/10 border-blue-500 text-blue-300">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{gameInfo.instructions}</AlertDescription>
      </Alert>

      {/* Game Controls */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6 space-y-4">
          {!gameStarted ? (
            <Button
              size="lg"
              onClick={() => setGameStarted(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold"
            >
              <Play2 className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Cue Power */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300 font-bold">Cue Power</label>
                  <span className="text-blue-400 font-bold">{cuePower}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cuePower}
                  onChange={(e) => setCuePower(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Cue Angle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300 font-bold">Cue Angle</label>
                  <span className="text-blue-400 font-bold">{cueAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={cueAngle}
                  onChange={(e) => setCueAngle(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={shootCue}
                  className="bg-green-600 hover:bg-green-700 font-bold"
                >
                  Shoot
                </Button>
                <Button
                  onClick={() => setIsPaused(!isPaused)}
                  variant="outline"
                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-900"
                >
                  {isPaused ? <Play2 className="w-4 h-4" /> : <Pause2 className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={() => {
                    initializeBalls();
                    setGameTime(0);
                    setBallsHit([]);
                    setCuePower(0);
                  }}
                  variant="outline"
                  className="border-slate-600 hover:bg-slate-800"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImprovedPoolGameEngine;
