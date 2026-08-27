import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Download, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export default function VoiceMessageBubble({ audioSrc, duration = 0, isMe = false, isDarkMode = true }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Generate 24 static bar heights for the visualizer waveform
  const waveformBars = [
    30, 45, 75, 55, 90, 65, 40, 85, 100, 70, 45, 90, 80, 60, 95, 75, 50, 85, 60, 40, 70, 55, 35, 20
  ];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioSrc]);

  const togglePlayPause = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackRate;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error:', err);
      });
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackRate(nextSpeed);
    if (audio) {
      audio.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const remainingSecs = s % 60;
    return `${m}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`rounded-2xl p-2.5 sm:p-3 my-1 max-w-[300px] sm:max-w-xs select-none transition-all shadow-sm border ${
      isMe
        ? 'bg-blue-700/80 border-blue-400/30 text-white'
        : isDarkMode
        ? 'bg-slate-900/90 border-slate-700/80 text-slate-100'
        : 'bg-slate-50 border-slate-200 text-slate-800'
    }`}>
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Top Header info */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`p-1.5 rounded-full ${
            isMe ? 'bg-blue-500/40 text-blue-100' : 'bg-rose-500/20 text-rose-400'
          }`}>
            <Mic className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-[11px] font-bold tracking-wide uppercase opacity-90">
            ভয়েস মেসেজ
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Speed badge */}
          <button
            type="button"
            onClick={cycleSpeed}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition active:scale-95 ${
              isMe
                ? 'bg-blue-600/60 hover:bg-blue-600 text-blue-100'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="প্লেব্যাক স্পিড পরিবর্তন করুন"
          >
            {playbackRate}x
          </button>

          {/* Download button */}
          <a
            href={audioSrc}
            download={`voice-note-${Date.now()}.webm`}
            onClick={(e) => e.stopPropagation()}
            className={`p-1 rounded transition opacity-70 hover:opacity-100 ${
              isMe ? 'hover:bg-blue-600' : 'hover:bg-slate-800'
            }`}
            title="ভয়েস রেকর্ড ডাউনলোড করুন"
          >
            <Download className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Waveform and Play Controls Bar */}
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlayPause}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 flex-shrink-0 shadow-md ${
            isMe
              ? 'bg-white text-blue-600 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
          title={isPlaying ? 'থামান' : 'শুনুন'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Dynamic Waveform Visualizer */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center justify-between gap-[2px] h-6 cursor-pointer py-1 relative">
            {waveformBars.map((heightPercent, idx) => {
              const barProgress = (idx / waveformBars.length) * 100;
              const isPlayed = barProgress <= progressPercent;

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    const audio = audioRef.current;
                    if (audio && totalDuration > 0) {
                      const seekTime = (idx / waveformBars.length) * totalDuration;
                      audio.currentTime = seekTime;
                      setCurrentTime(seekTime);
                    }
                  }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isPlayed
                      ? isMe
                        ? 'bg-white shadow-sm'
                        : 'bg-blue-400 shadow-sm'
                      : isMe
                      ? 'bg-blue-400/40'
                      : isDarkMode
                      ? 'bg-slate-700'
                      : 'bg-slate-300'
                  }`}
                  style={{
                    height: `${Math.max(20, heightPercent * (isPlaying ? 0.9 + Math.random() * 0.2 : 0.8))}%`
                  }}
                />
              );
            })}
          </div>

          {/* Time tracker */}
          <div className="flex items-center justify-between text-[10px] font-mono opacity-85 mt-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
