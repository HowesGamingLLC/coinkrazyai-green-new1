import React, { useState, useEffect } from 'react';
import { messaging, leaderboards, socialSharing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircle, Users, Trophy, Share2, Heart, Send, Search } from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

interface Friend {
  id: number;
  username: string;
  name: string;
  status: 'online' | 'offline' | 'in-game';
  last_seen?: string;
  avatar?: string;
}

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
  thread_id?: string;
}

interface LeaderboardEntry {
  id: number;
  rank: number;
  username: string;
  name: string;
  score: number;
  games_played: number;
  wins: number;
}

const SocialHub: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Socket.io for real-time updates
  useEffect(() => {
    const socket = io();

    // Listen for new messages
    socket.on('message:new', (data) => {
      if (data.recipient_id === user?.id) {
        setMessages(prev => [data, ...prev]);
        toast.success(`New message from ${data.sender_name}`);
      }
    });

    // Listen for friend status changes
    socket.on('friend:status', (data) => {
      setFriends(prev => prev.map(f =>
        f.id === data.friend_id ? { ...f, status: data.status } : f
      ));
    });

    // Listen for leaderboard updates
    socket.on('leaderboard:update', (data) => {
      setLeaderboard(data.leaderboard || []);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load leaderboard
        try {
          const leaderboardResponse = await leaderboards.getLeaderboard();
          const leaderboardData = leaderboardResponse.data?.entries || [];
          setLeaderboard(leaderboardData);
        } catch (error) {
          console.error('Failed to load leaderboard:', error);
        }

        // Load messages
        try {
          const messagesResponse = await messaging.getMessages();
          const messagesData = Array.isArray(messagesResponse?.data) ? messagesResponse.data : [];
          setMessages(messagesData);
        } catch (error) {
          console.error('Failed to load messages:', error);
        }

        // Mock friends data (would come from API)
        setFriends([
          { id: 1, username: 'player_pro', name: 'Pro Player', status: 'online', avatar: '👤' },
          { id: 2, username: 'lucky_luke', name: 'Lucky Luke', status: 'in-game', avatar: '👤' },
          { id: 3, username: 'mega_wins', name: 'Mega Wins', status: 'offline', avatar: '👤' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedFriend) {
      toast.error('Enter a message');
      return;
    }

    try {
      await messaging.sendMessage(selectedFriend.id, messageText);
      setMessages([{
        id: Date.now(),
        sender_id: user?.id || 0,
        sender_name: user?.name || 'You',
        content: messageText,
        created_at: new Date().toISOString(),
      }, ...messages]);
      setMessageText('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleShare = async (platform: string) => {
    try {
      await socialSharing.recordShare(platform);
      toast.success(`Shared on ${platform}`);
    } catch (error) {
      toast.error('Failed to share');
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

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="friends">
            <Users className="w-4 h-4 mr-2" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageCircle className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="share">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </TabsTrigger>
        </TabsList>

        {/* LEADERBOARD */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
              <CardDescription>Top players this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No leaderboard data</p>
                ) : (
                  leaderboard.slice(0, 10).map((entry, idx) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-lg font-black w-8 text-center">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${entry.rank}`}
                        </div>
                        <div>
                          <p className="font-bold">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">@{entry.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-lg">{entry.score.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">{entry.wins} wins</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FRIENDS */}
        <TabsContent value="friends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Friends</CardTitle>
              <CardDescription>Your friends and their status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button>Add</Button>
              </div>

              <div className="space-y-2">
                {filteredFriends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-2xl">{friend.avatar}</div>
                      <div>
                        <p className="font-bold">{friend.name}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        friend.status === 'online' ? 'default' :
                        friend.status === 'in-game' ? 'secondary' :
                        'outline'
                      }>
                        {friend.status === 'in-game' ? '🎮 In Game' : friend.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedFriend(friend)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MESSAGES */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Direct Messages</CardTitle>
              {selectedFriend && (
                <CardDescription>Chatting with {selectedFriend.name}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedFriend ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Select a friend to message</p>
                  <p className="text-sm text-muted-foreground">Go to Friends tab to select someone</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Messages Display */}
                  <div className="max-h-64 overflow-y-auto space-y-2 bg-slate-50 p-4 rounded-lg">
                    {messages
                      .filter(m => m.sender_id === selectedFriend.id || (m.sender_id === user?.id))
                      .slice(0, 10)
                      .reverse()
                      .map(msg => (
                        <div
                          key={msg.id}
                          className={`p-2 rounded text-sm ${
                            msg.sender_id === user?.id
                              ? 'bg-blue-500 text-white ml-auto w-fit max-w-xs'
                              : 'bg-white text-black mr-auto w-fit max-w-xs'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-20"
                    />
                    <Button onClick={handleSendMessage} className="h-20">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SHARE */}
        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Share Your Wins</CardTitle>
              <CardDescription>Share with friends on social media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Facebook', icon: '👍', color: 'bg-blue-600' },
                  { name: 'Twitter', icon: '𝕏', color: 'bg-black' },
                  { name: 'TikTok', icon: '♪', color: 'bg-pink-600' },
                  { name: 'WhatsApp', icon: '💬', color: 'bg-green-600' },
                ].map(platform => (
                  <Button
                    key={platform.name}
                    className={`${platform.color} h-24 flex flex-col items-center justify-center gap-2`}
                    onClick={() => handleShare(platform.name.toLowerCase())}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="text-xs">{platform.name}</span>
                  </Button>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Share this message:</p>
                <p className="text-sm text-muted-foreground">
                  🎉 Just won big on CoinKrazy! Join me and win amazing prizes! 💰
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialHub;
