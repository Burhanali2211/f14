import { Link } from 'react-router-dom';
import { BookOpen, Heart, Github, Mail, ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 mt-auto print:hidden">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">
                Kalam Reader
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Your spiritual companion for reading and reciting islamic poetry. 
              Access Naat, Noha, Manqabat, Dua, and more — beautifully designed 
              for reciters and readers.
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> for the community
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="text-muted-foreground hover:text-foreground transition-colors">
                  Favorites
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/category/naat" className="text-muted-foreground hover:text-foreground transition-colors">
                  Naat
                </Link>
              </li>
              <li>
                <Link to="/category/noha" className="text-muted-foreground hover:text-foreground transition-colors">
                  Noha
                </Link>
              </li>
              <li>
                <Link to="/category/dua" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dua
                </Link>
              </li>
              <li>
                <Link to="/category/manqabat" className="text-muted-foreground hover:text-foreground transition-colors">
                  Manqabat
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Kalam Reader. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Offline ready • PWA enabled
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
