import React, { useState } from 'react';
import { Download, ZoomIn, Eye, Sparkles } from 'lucide-react';

export default function ImageMessageBubble({ imageUrl, caption = '', isMe = false, onOpenLightbox }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="mt-1.5 mb-1 max-w-[280px] sm:max-w-xs overflow-hidden rounded-2xl border border-slate-700/60 shadow-lg relative group/img select-none bg-slate-950/40">
      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="w-full h-48 bg-slate-800/60 animate-pulse flex items-center justify-center text-slate-500 text-xs">
          ছবি লোড হচ্ছে...
        </div>
      )}

      {/* Image Element */}
      <img
        src={imageUrl}
        alt="ছবি"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        onClick={() => onOpenLightbox && onOpenLightbox(imageUrl)}
        className={`w-full max-h-64 sm:max-h-72 object-cover rounded-2xl cursor-zoom-in group-hover/img:scale-[1.02] transition duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0 absolute'
        }`}
        referrerPolicy="no-referrer"
      />

      {/* Hover Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5 pointer-events-none">
        {/* Top Badges */}
        <div className="flex items-center justify-between pointer-events-auto">
          <span className="text-[10px] font-bold text-white/90 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>ছবি প্রিভিউ</span>
          </span>

          <a
            href={imageUrl}
            download={`chat-image-${Date.now()}.jpg`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur border border-white/20 transition active:scale-95 shadow-md"
            title="ছবি ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Bottom Zoom hint */}
        <div 
          onClick={() => onOpenLightbox && onOpenLightbox(imageUrl)}
          className="pointer-events-auto cursor-pointer flex items-center justify-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm py-1 px-2.5 rounded-xl border border-white/10 hover:bg-black/60 transition"
        >
          <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
          <span>বড় করে দেখতে ক্লিক করুন</span>
        </div>
      </div>
    </div>
  );
}
