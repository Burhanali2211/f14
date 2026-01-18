import { Link } from 'react-router-dom';
import { ChevronLeft, Heart, Moon, BookOpen, Users, Star, ExternalLink, Code } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';

const aboutStructuredData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About Followers of 14 - F14 Islamic Platform",
  "description": "Followers of 14 (F14) is the ultimate Shia Islamic platform for kalaam readers, nauha reciters, and devotees of Ahlul Bayt. Find the best collection of nauhas, marsiyas, manqabats, and Islamic poetry.",
  "url": "https://followersof14.com/about",
  "mainEntity": {
    "@type": "Organization",
    "name": "Followers of 14",
    "alternateName": ["F14", "Followers of Fourteen", "Kalaam Reader", "Shia Poetry Platform"],
    "description": "The #1 platform for Shia Muslims to access nauhas, marsiyas, manqabats, and Islamic spiritual content dedicated to Ahlul Bayt (AS).",
    "url": "https://followersof14.com",
    "founder": {
      "@type": "Person",
      "name": "Ali",
      "url": "https://dmdset.netlify.app"
    },
    "knowsAbout": [
      "Shia Islam",
      "Ahlul Bayt",
      "Nauha recitation",
      "Marsiya poetry",
      "Manqabat",
      "Islamic kalaam",
      "Muharram azadari",
      "Imam Hussain",
      "14 Masumeen"
    ]
  }
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="About Followers of 14 (F14) - Shia Islamic Kalaam Reader Platform"
        description="Followers of 14 (F14) is the #1 Shia Islamic platform for kalaam readers. Access nauhas, marsiyas, manqabats & spiritual content dedicated to Ahlul Bayt (AS). Best collection of Islamic poetry for followers of fourteen masumeen."
        keywords="followers of 14, followers of fourteen, F14, kalaam reader, shia islam, shia poetry, nauha, marsiya, manqabat, ahlul bayt, imam hussain, muharram, azadari, 14 masumeen, fourteen infallibles, islamic recitation, shia kalaam, noha, salam, majlis"
        structuredData={aboutStructuredData}
        canonicalUrl="https://followersof14.com/about"
      />
      <Header />

      <main className="container py-4 sm:py-6 md:py-8 flex-1">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Moon className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
              About Followers of 14
            </h1>
            <p className="text-lg text-muted-foreground">
              The Ultimate Shia Islamic Platform for Kalaam Readers & Devotees
            </p>
          </div>

          <div className="space-y-8">
            <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Our Mission</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Followers of 14 (F14)</strong> is dedicated to preserving and sharing the rich spiritual heritage of <strong>Shia Islam</strong>. 
                We aim to bring the beautiful recitations, poetry, and teachings of the <strong>Ahlul Bayt (AS)</strong> 
                to believers around the world. As the premier <strong>kalaam reader</strong> platform, we foster a deeper connection 
                with our faith, traditions, and the path of the <strong>14 Masumeen</strong> (Fourteen Infallibles).
              </p>
            </section>

            <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">What We Offer</h2>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Nauhas & Nohas</strong> - Heart-wrenching lamentations for Imam Hussain (AS) and Karbala martyrs</span>
                </li>
                <li className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Marsiyas</strong> - Classical elegiac poetry commemorating the tragedy of Karbala</span>
                </li>
                <li className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Manqabats</strong> - Devotional poetry praising the virtues of Ahlul Bayt (AS)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Quran Recitation</strong> - With translation and transliteration for spiritual guidance</span>
                </li>
                <li className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Islamic Calendar</strong> - Important dates, Muharram, Ramadan, and religious events</span>
                </li>
                <li className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Salams & Qasidas</strong> - Greetings and odes for the Holy Prophet (PBUH) and his family</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Our Community - Followers of Fourteen</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We are a community of believers united in our love for the <strong>Ahlul Bayt (AS)</strong>. 
                <strong>Followers of 14</strong> serves as the ultimate spiritual resource for <strong>Shia Muslims</strong> worldwide. 
                Whether you're looking for <strong>azadari</strong> content, <strong>majlis</strong> recitations, or want to 
                be a <strong>kalaam reader</strong>, our platform helps you stay connected to your roots, 
                commemorate <strong>Muharram</strong> and <strong>Ashura</strong>, and deepen your understanding of the path 
                shown by <strong>Imam Hussain (AS)</strong> and the holy household of the Prophet (PBUH).
              </p>
            </section>

            <section className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/20 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Code className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Developer</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>Followers of 14</strong> is developed and maintained by <strong className="text-foreground">Ali</strong>, 
                with the intention of serving the <strong>Shia community</strong> and spreading the message of <strong>Ahlul Bayt (AS)</strong>.
                This platform is built with love for the <strong>followers of fourteen</strong> masumeen.
              </p>
              <a
                href="https://dmdset.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Developer's Website
              </a>
            </section>

            <div className="text-center py-6">
              <p className="text-muted-foreground italic">
                "Indeed, I am leaving among you two weighty things: the Book of Allah and my progeny, the Ahlul Bayt."
              </p>
              <p className="text-sm text-muted-foreground mt-2">— Prophet Muhammad (PBUH)</p>
            </div>

            <article className="sr-only" aria-hidden="true">
              <h2>Followers of 14 - F14 - Kalaam Reader Platform</h2>
              <p>
                Followers of 14 (also known as F14, Followers of Fourteen) is the best kalaam reader platform 
                for Shia Muslims. Our website provides the most comprehensive collection of nauhas, marsiyas, 
                manqabats, salams, qasidas, and other Islamic poetry dedicated to the Ahlul Bayt (AS).
              </p>
              <p>
                Whether you're searching for "followers of 14", "kalaam reader", "F14", "shia nauha", 
                "marsiya collection", "manqabat lyrics", or "azadari content", Followers of 14 is your 
                ultimate destination for all Shia Islamic spiritual content.
              </p>
              <p>
                Join thousands of followers of fourteen masumeen who use our platform daily for 
                Muharram recitations, Ashura commemorations, majlis content, and year-round Islamic devotion.
              </p>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
