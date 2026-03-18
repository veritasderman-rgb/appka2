import { useState, useCallback } from 'react';
import { getRandomQuote } from '../data/faerunQuotes';
import type { FaerunQuote } from '../data/faerunQuotes';

interface QuoteDisplayProps {
  /** Pokud true, zobrazí tlačítko pro nový citát */
  refreshable?: boolean;
  className?: string;
}

export function QuoteDisplay({ refreshable = true, className = '' }: QuoteDisplayProps) {
  const [quote, setQuote] = useState<FaerunQuote>(getRandomQuote);

  const refresh = useCallback(() => {
    setQuote(getRandomQuote());
  }, []);

  return (
    <div className={`bg-dark-surface border border-dark-border/60 rounded-lg px-5 py-4 ${className}`}>
      <blockquote className="text-parchment text-sm italic leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-xs text-parchment-dark">
          <span className="text-gold font-medium">— {quote.author}</span>
          {' '}
          <span className="opacity-60">· {quote.source}</span>
        </div>
        {refreshable && (
          <button
            onClick={refresh}
            title="Nový citát"
            className="text-parchment-dark/50 hover:text-gold transition-colors text-xs shrink-0"
          >
            ↻
          </button>
        )}
      </div>
    </div>
  );
}
