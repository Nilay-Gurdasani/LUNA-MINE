import React, { useState, useEffect } from 'react';
import { PITCH_DECK_SLIDES } from '../data/lunarData';
import { Presentation, ChevronLeft, ChevronRight, X, Maximize2, Minimize2, CheckCircle2 } from 'lucide-react';

interface PitchDeckModalProps {
  onClose: () => void;
}

export const PitchDeckModal: React.FC<PitchDeckModalProps> = ({ onClose }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slide = PITCH_DECK_SLIDES[currentSlideIndex];

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlideIndex((prev) => Math.min(prev + 1, PITCH_DECK_SLIDES.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 md:p-6 select-none">
      <div className="bg-[#080b0e] border border-white/20 rounded-xl max-w-5xl w-full aspect-video flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden relative">
        {/* Subtle decorative aerospace grid background */}
        <div className="absolute inset-0 scanline opacity-30 pointer-events-none" />

        {/* Top Slide Header */}
        <div className="p-4 md:px-8 border-b border-white/10 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <span className="font-montserrat font-black text-lg text-white tracking-wider">
              LUNA<span className="text-[#a7d9df]">-MINE</span>
            </span>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
              ASTRA 2026 HACKATHON PITCH
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-[#a7d9df] font-bold">
              SLIDE {slide.id} OF {PITCH_DECK_SLIDES.length}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Body */}
        <div className="p-6 md:p-12 flex-1 flex flex-col justify-center z-10 max-w-4xl mx-auto w-full">
          {/* Slide Tag / Subtitle */}
          <div className="flex items-center space-x-2 text-xs font-mono text-[#a7d9df] uppercase tracking-wider mb-2">
            <span>{slide.subtitle}</span>
          </div>

          {/* Slide Title */}
          <h2 className="font-montserrat font-black text-2xl md:text-4xl text-white tracking-tight leading-tight mb-2">
            {slide.title}
          </h2>

          {/* Tagline */}
          <p className="text-sm md:text-base text-gray-300 font-medium italic mb-6 border-l-2 border-[#a7d9df] pl-3">
            "{slide.tagline}"
          </p>

          {/* Bullet Points */}
          <div className="space-y-3.5 my-auto">
            {slide.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start space-x-3 text-xs md:text-sm text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#191f22] border border-[#a7d9df]/40 text-[#a7d9df] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="font-mono text-[10px] font-bold">{idx + 1}</span>
                </div>
                <p className="leading-relaxed">{bullet}</p>
              </div>
            ))}
          </div>

          {/* Special note for Slide 1 or 6 */}
          {slide.id === 1 && (
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-[11px] font-mono text-gray-400">
              <span>Theme: From Lunar Data to Intelligent Mission Decisions</span>
              <span className="text-[#a7d9df]">Team Size: 4 Functional Streams</span>
            </div>
          )}
          {slide.id === 6 && (
            <div className="mt-6 p-2.5 bg-[#111619] rounded border border-amber-500/30 text-[10px] font-mono text-amber-300">
              *Scientific Status: Software digital twin prototype. Remote-sensing indicators and simulated material estimates are not confirmed commercial reserves.
            </div>
          )}
        </div>

        {/* Slide Footer with Navigation */}
        <div className="p-4 md:px-8 border-t border-white/10 flex items-center justify-between z-10 bg-[#111619]/60 backdrop-blur-sm">
          {/* Step dots */}
          <div className="flex items-center space-x-2">
            {PITCH_DECK_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlideIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  currentSlideIndex === i ? 'w-8 bg-[#a7d9df]' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentSlideIndex === 0}
              className="px-3 py-1.5 rounded bg-[#191f22] border border-[#293235] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#293235] transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.min(prev + 1, PITCH_DECK_SLIDES.length - 1))}
              disabled={currentSlideIndex === PITCH_DECK_SLIDES.length - 1}
              className="px-4 py-1.5 rounded bg-[#a7d9df] text-[#080b0e] font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#75d8cc] transition-colors flex items-center gap-1 text-xs"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
