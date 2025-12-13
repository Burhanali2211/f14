import { Link } from 'react-router-dom';
import { BookOpen, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-20">
        <div className="max-w-md mx-auto text-center animate-fade-in">
          {/* Icon */}
          <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-8">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
          
          {/* Content */}
          <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl w-full sm:w-auto">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
