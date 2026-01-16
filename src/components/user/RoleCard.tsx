import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RoleCardProps } from './types';

export const RoleCard = ({ role, getRoleBadgeVariant, getRoleLabel }: RoleCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Account Role
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant={getRoleBadgeVariant(role)} className="text-sm py-1.5 px-3">
          {getRoleLabel(role)}
        </Badge>
        <p className="text-xs text-muted-foreground mt-3">
          Your role determines what features you can access on the platform.
        </p>
      </CardContent>
    </Card>
  );
};

