import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="py-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-emerald-light p-8 md:p-12">
        <div className="relative z-10 text-center">
          <Star className="w-12 h-12 text-primary-foreground/80 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
            Contribute to Our Collection
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-6">
            Help preserve and share islamic poetry. Add your favorite recitations to our growing library.
          </p>
          <Button asChild size="lg" className="rounded-xl bg-card text-foreground hover:bg-card/90 shadow-elevated">
            <Link to="/auth">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
        
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
      </div>
    </section>
  );
}
