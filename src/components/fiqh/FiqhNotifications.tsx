import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

export function FiqhNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Realtime subscription for new notifications
      const channel = supabase
        .channel(`fiqh_notifications_${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'fiqh_notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('fiqh_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fiqh_notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('fiqh_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-[10px] border-2 border-background animate-in zoom-in">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-xl border-border/50">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg">
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="my-2" />
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                className={`p-3 rounded-xl cursor-pointer flex gap-3 transition-colors ${!n.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/80'}`}
                onClick={() => markAsRead(n.id)}
                asChild
              >
                <Link to={n.link || '#'} title={n.message}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!n.is_read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className={`text-sm leading-tight ${!n.is_read ? 'font-bold' : 'font-normal'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(n.created_at), 'MMM d, p')}
                    </div>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 self-center" />
                  )}
                </Link>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto opacity-20" />
              <p className="text-sm">No new notifications</p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
