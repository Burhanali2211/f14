import { Link } from 'react-router-dom';
import { Heart, Settings, BookOpen, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { QuickLinksProps } from './types';

export const QuickLinksCard = ({ role }: QuickLinksProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          asChild
        >
          <Link to="/favorites" title="View my favorites">
            <Heart className="w-4 h-4 mr-2" />
            My Favorites
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          asChild
        >
          <Link to="/settings" title="App settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          asChild
        >
          <Link to="/" title="Browse content">
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Content
          </Link>
        </Button>
        {role === 'admin' && (
          <Button
            variant="ghost"
            className="w-full justify-start"
            asChild
          >
            <Link to="/admin" title="Admin Panel">
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel
            </Link>
          </Button>
        )}
        {(role === 'uploader' || role === 'admin') && (
          <Button
            variant="ghost"
            className="w-full justify-start"
            asChild
          >
            <Link to="/uploader" title="Upload content">
              <BookOpen className="w-4 h-4 mr-2" />
              Upload Content
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

