import React from 'react';
import { Sparkles, Hexagon, Circle, Sun, Loader2, Image as ImageIcon } from 'lucide-react';
import { DeckType } from '../types';

interface TarotCardProps {
  card?: { name: string; isReversed: boolean; image?: string; isLoadingImage?: boolean };
  isRevealed: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  index: number;
  deckType: DeckType;
  label?: string; // New prop for position label (e.g. "Past")
}

export const TarotCardComponent: React.FC<TarotCardProps> = ({ card, isRevealed, onClick, isSelected, deckType, label }) => {
  
  // Visual variations based on deck type for the BACK
  const getBackDesign = () => {
    switch (deckType) {
      case 'thoth':
        return (
          <div 
            className="absolute inset-0 w-full h-full backface-hidden rounded-xl border border-emerald-500/30 bg-purple-950 flex items-center justify-center overflow-hidden shadow-2xl"
            style={{ backgroundImage: `conic-gradient(from 0deg at 50% 50%, #581c87 0deg, #10b981 120deg, #581c87 240deg)` }}
          >
             <Hexagon className="text-white/20 animate-spin-slow" size={48} />
             <div className="absolute inset-0 border-[6px] border-double border-emerald-500/20"></div>
          </div>
        );
      case 'marseille':
        return (
          <div 
            className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-[#8B4513] flex items-center justify-center overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-1 border-2 border-[#D2691E] bg-[#F4A460]" 
                 style={{ backgroundImage: 'repeating-linear-gradient(45deg, #DEB887 25%, transparent 25%, transparent 75%, #DEB887 75%, #DEB887), repeating-linear-gradient(45deg, #DEB887 25%, #F4A460 25%, #F4A460 75%, #DEB887 75%, #DEB887)' }}>
            </div>
            <Sun className="relative text-[#8B4513]" size={40} />
          </div>
        );
      case 'rider':
      default:
        return (
          <div 
            className="absolute inset-0 w-full h-full backface-hidden rounded-xl border border-amber-500/30 bg-indigo-950 flex items-center justify-center overflow-hidden shadow-2xl"
            style={{ backgroundImage: `radial-gradient(circle at center, #312e81 0%, #1e1b4b 100%)` }}
          >
            <div className="absolute inset-2 border border-amber-500/20 rounded-lg opacity-50"></div>
            <Sparkles className="text-amber-500/40 animate-pulse" size={32} />
          </div>
        );
    }
  };

  const getFrontStyles = () => {
    // Removed border/padding related classes to allow full bleed
    switch (deckType) {
      case 'thoth':
        return "bg-zinc-900 font-sans text-emerald-200 border-emerald-900/50";
      case 'marseille':
        return "bg-[#fdf6e3] font-serif text-amber-900 border-amber-900/30";
      case 'rider':
      default:
        // Changed to remove white border and use dark bg for seamless look
        return "bg-slate-900 font-serif text-slate-100 border-none";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 group">
      {/* Position Label (Only shown when revealed/selected if provided) */}
      {label && (
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-amber-500/80 font-bold bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {label}
        </span>
      )}

      <div 
        onClick={onClick}
        className={`
          relative w-24 h-40 sm:w-32 sm:h-52 md:w-40 md:h-64 rounded-xl cursor-pointer transition-all duration-500 transform preserve-3d
          ${isSelected ? '-translate-y-4 shadow-[0_0_25px_rgba(251,191,36,0.5)] z-10' : 'hover:-translate-y-2 hover:shadow-xl'}
        `}
        style={{ perspective: '1000px' }}
      >
        <div className={`relative w-full h-full transition-all duration-700 transform style-3d ${isRevealed ? 'rotate-y-180' : ''}`}>
          
          {/* Card Back */}
          {getBackDesign()}

          {/* Card Front */}
          <div 
            className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl overflow-hidden flex flex-col items-center justify-between shadow-2xl ${getFrontStyles()}`}
          >
            {/* Full Bleed Image Container */}
            <div className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-black/10 ${card?.isReversed ? 'rotate-180' : ''}`}>
                
                {card?.image ? (
                  <>
                    <img 
                      src={`data:image/png;base64,${card.image}`} 
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay gradient for text readability */}
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center w-full h-full">
                    {card?.isLoadingImage ? (
                      <>
                          <Loader2 className="animate-spin mb-2 opacity-50" size={24} />
                          <span className="text-[10px] uppercase tracking-widest opacity-50">Conjuring...</span>
                      </>
                    ) : (
                      <div className="text-4xl sm:text-5xl mb-2 drop-shadow-md opacity-30 grayscale">
                        {deckType === 'thoth' ? '👁️' : deckType === 'marseille' ? '⚜️' : '🔮'}
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Floating Label at bottom */}
            <div className={`absolute bottom-0 w-full text-center p-2 backdrop-blur-md bg-black/40 border-t border-white/10 ${card?.isReversed ? 'rotate-180 top-0 bottom-auto border-t-0 border-b' : ''}`}>
                <div className="text-white text-xs sm:text-sm uppercase leading-tight font-bold tracking-widest drop-shadow-md">
                  {card?.name}
                </div>
                {card?.isReversed && (
                  <div className="text-[9px] text-red-300 uppercase font-bold tracking-wide mt-0.5">(Reversed)</div>
                )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
