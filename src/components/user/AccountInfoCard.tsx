import { Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AccountInfoCardProps } from './types';

export const AccountInfoCard = ({ user, formatDate }: AccountInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Account Information
        </CardTitle>
        <CardDescription>
          Details about your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Account Status</span>
          <Badge variant={user.is_active ? 'default' : 'secondary'}>
            {user.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Member Since</span>
          <span className="text-sm font-medium text-foreground">
            {formatDate(user.created_at)}
          </span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last Updated</span>
          <span className="text-sm font-medium text-foreground">
            {formatDate(user.updated_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

