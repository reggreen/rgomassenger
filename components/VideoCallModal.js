import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  PhoneCall, 
  Camera, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Settings, 
  MonitorUp, 
  Smile, 
  Check, 
  X,
  Radio,
  User,
  Users
} from 'lucide-react';

/**
 * VideoCallModal
 * 
 * Simulates a full video calling workflow:
 * 1. 'preview' stage: Requests camera & mic access via MediaDevices API, renders real-time local camera preview video,
 *    allows toggling camera/mic, testing audio level visualizer before connecting.
 * 2. 'ringing' stage: Calling the target user, simulating connection negotiation with sound & animations.
 * 3. 'connected' stage: Displays simulated remote peer stream / interactive view with live PIP of local video,
 *    call timer, in-call reactions, screen sharing simulation, mic/camera controls, and quality indicators.
 */
export default function VideoCallModal({
  isOpen,
  onClose,
  targetUser = 'ব্যবহারকারী',
  targetAvatar = null,
  currentUsername = 'আমি',
  currentUserAvatar = null,
  isDarkMode = true,
  callType = 'video' // 'video' | 'audio'
}) {
  // Call stages: 'preview' -> 'ringing' -> 'connected' -> 'ended'
  const [callStage, setCallStage] = useState('preview');
  const [hasCameraPermission, setHasCameraPermission] = useState(null); // null | true | false
  const [permissionError, setPermissionError] = useState(null);
  
  // Media tracks state
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  
  // Stats & Visuals
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [pipPosition, setPipPosition] = useState('bottom-right'); // 'bottom-right' | 'top-right' | 'top-left' | 'bottom-left'
  const [activeReaction, setActiveReaction] = useState(null);
  const [isPipSwapped, setIsPipSwapped] = useState(false);
  
  // References
  const localVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const screenShareVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const ringingTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize and request Camera / Mic MediaDevices stream
  const initMediaStream = async (requestedFacing = facingMode) => {
    try {
      setPermissionError(null);
      // Clean up previous stream tracks if any
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: isVideoEnabled ? { facingMode: requestedFacing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: true
      };

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('আপনার ব্রাউজারে MediaDevices API সমর্থিত নয়।');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      setHasCameraPermission(true);

      // Attach stream to local preview video elements
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Setup Web Audio Analyser for real-time mic visualizer
      setupAudioVisualizer(stream);

    } catch (err) {
      console.warn('MediaDevices camera/mic error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('ক্যামেরা অথবা মাইক্রোফোন ব্যবহারের পারমিশন প্রদান করা হয়নি। দয়া করে ব্রাউজার সেটিংসে গিয়ে পারমিশন চালু করুন।');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('কোনো ক্যামেরা বা মাইক্রোফোন ডিভাইস পাওয়া যায়নি।');
      } else {
        setPermissionError(err.message || 'ক্যামেরা চালু করতে সমস্যা হয়েছে।');
      }
    }
  };

  // Setup Audio Visualizer
  const setupAudioVisualizer = (stream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn('Audio analyser init skipped:', e);
    }
  };

  // Lifecycle on modal open/close
  useEffect(() => {
    if (isOpen) {
      setCallStage('preview');
      setCallDuration(0);
      setIsVideoEnabled(callType === 'video');
      setIsAudioEnabled(true);
      initMediaStream(facingMode);
    } else {
      cleanupStreamsAndTimers();
    }

    return () => {
      cleanupStreamsAndTimers();
    };
  }, [isOpen]);

  // Clean up all hardware streams and intervals
  const cleanupStreamsAndTimers = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
  };

  // Re-attach video stream if elements mount or callStage changes
  useEffect(() => {
    if (mediaStreamRef.current) {
      if (callStage === 'preview' && previewVideoRef.current) {
        previewVideoRef.current.srcObject = mediaStreamRef.current;
      }
      if ((callStage === 'connected' || callStage === 'ringing') && localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
    }
  }, [callStage, mediaStreamRef.current]);

  // Handle call timer when connected
  useEffect(() => {
    if (callStage === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStage]);

  // Toggle local video track
  const handleToggleVideo = () => {
    const nextState = !isVideoEnabled;
    setIsVideoEnabled(nextState);

    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach((t) => (t.enabled = nextState));
      } else if (nextState) {
        // Track was missing, re-init with video
        initMediaStream(facingMode);
      }
    }
  };

  // Toggle local audio track
  const handleToggleAudio = () => {
    const nextState = !isAudioEnabled;
    setIsAudioEnabled(nextState);

    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = nextState));
    }
  };

  // Switch camera between front & back
  const handleFlipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    initMediaStream(newFacing);
  };

  // Start Call (transitions to ringing -> connected)
  const handleConnectCall = () => {
    setCallStage('ringing');

    // Simulate peer pickup after 2.5 seconds
    ringingTimeoutRef.current = setTimeout(() => {
      setCallStage('connected');
    }, 2400);
  };

  // End / Dismiss Call
  const handleEndCall = () => {
    setCallStage('ended');
    cleanupStreamsAndTimers();
    setTimeout(() => {
      onClose();
    }, 400);
  };

  // Toggle Screen Share Simulation
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = screenStream;
          setIsScreenSharing(true);

          if (screenShareVideoRef.current) {
            screenShareVideoRef.current.srcObject = screenStream;
          }

          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
          };
        } else {
          setIsScreenSharing(true);
        }
      } catch (e) {
        console.warn('Screen share cancelled or not allowed:', e);
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    }
  };

  // Trigger floating emojis / reactions
  const sendReaction = (emoji) => {
    setActiveReaction(emoji);
    setTimeout(() => {
      setActiveReaction(null);
    }, 2000);
  };

  // Toggle Fullscreen Mode
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Format Duration (mm:ss)
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between text-white select-none overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-4 md:p-6 z-20 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg border border-slate-700">
              {targetAvatar ? (
                <img src={targetAvatar} alt={targetUser} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                '👤'
              )}
            </div>
            {callStage === 'connected' && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base md:text-lg text-white leading-tight">
                {targetUser}
              </h2>
              {callStage === 'connected' && (
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  HD 1080p
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
              {callStage === 'preview' && (
                <span className="text-blue-400 flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  ক্যামেরা প্রিভিউ ও ডিভাইস টেস্টিং
                </span>
              )}
              {callStage === 'ringing' && (
                <span className="text-amber-400 animate-pulse flex items-center gap-1">
                  <PhoneCall className="w-3 h-3 animate-bounce" />
                  রিং হচ্ছে... (Ringing)
                </span>
              )}
              {callStage === 'connected' && (
                <span className="font-mono text-emerald-400 font-bold">
                  {formatTime(callDuration)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Header Right Action Icons */}
        <div className="flex items-center gap-2">
          {callStage === 'connected' && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1 text-xs text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>এন্ড-টু-এন্ড এনক্রিপ্টেড</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition"
            title={isFullscreen ? "ফুলস্ক্রিন থেকে বের হন" : "ফুলস্ক্রিন করুন"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleEndCall}
            className="p-2.5 bg-slate-900/80 hover:bg-rose-900/40 border border-slate-800 hover:border-rose-700/50 text-slate-400 hover:text-rose-400 rounded-xl transition"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STAGE 1: PRE-CALL PREVIEW SCREEN (BEFORE 'CONNECTING') */}
      {callStage === 'preview' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full z-10">
          <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col items-center">
            
            {/* Title Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-300 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>কল শুরু করার আগে নিজের ক্যামেরা চেক করুন</span>
            </div>

            {/* Local Video Camera Preview Box */}
            <div className="relative w-full max-w-lg aspect-video rounded-2xl bg-slate-950 border-2 border-indigo-500/40 overflow-hidden shadow-2xl flex items-center justify-center group">
              {isVideoEnabled && hasCameraPermission ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl shadow-inner">
                    {currentUserAvatar ? (
                      <img src={currentUserAvatar} alt="Me" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      '🧑‍💻'
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-300">ক্যামেরা বর্তমানে বন্ধ রয়েছে</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    কল শুরু করার সময় আপনার ক্যামেরা চালু বা বন্ধ রাখতে পারেন।
                  </p>
                </div>
              )}

              {/* Permission Warning / Error overlay */}
              {permissionError && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-xs font-bold text-slate-200 mb-1">ক্যামেরা চালু করতে সমস্যা হয়েছে</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mb-3">{permissionError}</p>
                  <button
                    type="button"
                    onClick={() => initMediaStream(facingMode)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>আবার চেষ্টা করুন</span>
                  </button>
                </div>
              )}

              {/* Live Audio Visualizer Overlay on Preview */}
              {isAudioEnabled && hasCameraPermission && (
                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2 shadow-lg">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="flex items-center gap-0.5 h-3 w-16">
                    <span className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, audioLevel * 0.9)}%` }} />
                    <span className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, audioLevel * 0.7)}%` }} />
                    <span className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, audioLevel * 1.0)}%` }} />
                    <span className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, audioLevel * 0.8)}%` }} />
                    <span className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, audioLevel * 0.5)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">মাইক সক্রিয়</span>
                </div>
              )}

              {/* Flip camera button */}
              {isVideoEnabled && hasCameraPermission && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="absolute top-3 right-3 p-2 bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl border border-slate-700 backdrop-blur-md transition shadow-md"
                  title="ক্যামেরা ফ্লিপ করুন"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Pre-call Device Controls */}
            <div className="flex items-center gap-3 my-6">
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                  isAudioEnabled
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                <span>{isAudioEnabled ? 'মাইক চালু' : 'মাইক বন্ধ'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleVideo}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                  isVideoEnabled
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {isVideoEnabled ? <Video className="w-4 h-4 text-indigo-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                <span>{isVideoEnabled ? 'ক্যামেরা চালু' : 'ক্যামেরা বন্ধ'}</span>
              </button>
            </div>

            {/* Action Buttons: Connect / Cancel */}
            <div className="flex items-center gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={handleEndCall}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-2xl text-xs border border-slate-700 transition"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConnectCall}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <PhoneCall className="w-4 h-4" />
                <span>কল শুরু করুন</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STAGE 2: RINGING OVERLAY */}
      {callStage === 'ringing' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center">
          <div className="relative mb-6">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-1 shadow-2xl animate-pulse">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-5xl overflow-hidden border-2 border-slate-800">
                {targetAvatar ? <img src={targetAvatar} alt={targetUser} className="w-full h-full object-cover" /> : '👤'}
              </div>
            </div>
            <div className="absolute -inset-4 rounded-full border-2 border-blue-500/40 animate-ping pointer-events-none" />
            <div className="absolute -inset-8 rounded-full border border-indigo-500/20 animate-pulse pointer-events-none" />
          </div>

          <h3 className="text-2xl font-extrabold text-white mb-2">{targetUser}</h3>
          <p className="text-sm font-semibold text-blue-400 animate-pulse flex items-center gap-2">
            <Radio className="w-4 h-4 animate-spin" />
            <span>কল কানেক্ট হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</span>
          </p>

          <div className="mt-12">
            <button
              type="button"
              onClick={handleEndCall}
              className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/50 active:scale-95 transition border-2 border-rose-400"
              title="কল কেটে দিন"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: CONNECTED CALL VIEW */}
      {callStage === 'connected' && (
        <div className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden p-2 md:p-4">
          
          {/* Main Stage: Remote Video / Screen Share View */}
          <div className="relative w-full h-full max-w-6xl max-h-[85vh] rounded-3xl bg-slate-900 border-2 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
            
            {isScreenSharing ? (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative">
                <video
                  ref={screenShareVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 left-4 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-700 text-xs font-bold text-indigo-300 flex items-center gap-2">
                  <MonitorUp className="w-3.5 h-3.5 text-indigo-400" />
                  <span>স্ক্রিন শেয়ার চালু রয়েছে</span>
                </div>
              </div>
            ) : (
              /* Simulated Remote Participant Video Background */
              <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/50 flex flex-col items-center justify-center relative p-6">
                
                {/* Simulated Remote User Avatar & Waveform */}
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 shadow-2xl">
                      <div className="w-full h-full rounded-3xl bg-slate-950 flex items-center justify-center text-5xl overflow-hidden border border-slate-800">
                        {targetAvatar ? <img src={targetAvatar} alt={targetUser} className="w-full h-full object-cover" /> : '👤'}
                      </div>
                    </div>
                    <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-xl shadow-md border-2 border-slate-950">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">{targetUser}</h3>
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-1 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>লাইভ সংযুক্ত • ক্রিস্টাল ক্লিয়ার অডিও/ভিডিও</span>
                    </p>
                  </div>

                  {/* Remote Audio Equalizer Visualizer */}
                  <div className="flex items-center gap-1 h-6 pt-2">
                    {[40, 70, 90, 60, 80, 100, 75, 50, 85, 65, 45, 95, 70].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-full animate-pulse"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${(i % 5) * 0.15}s`,
                          animationDuration: '0.8s'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Target Name Badge in bottom-left */}
                <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-800 flex items-center gap-2 text-xs font-bold">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>{targetUser}</span>
                  <span className="text-[10px] text-slate-400 font-mono"> (রিমোট)</span>
                </div>
              </div>
            )}

            {/* Local Picture-in-Picture (PIP) Camera View */}
            <div 
              onClick={() => setIsPipSwapped(!isPipSwapped)}
              className="absolute top-4 right-4 w-32 h-44 sm:w-44 sm:h-60 rounded-2xl bg-slate-950 border-2 border-indigo-500/60 shadow-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 z-30"
              title="ক্লিক করে ভিউ অদলবদল করুন"
            >
              {isVideoEnabled && hasCameraPermission ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-center p-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg mb-1 border border-slate-700">
                    {currentUserAvatar ? <img src={currentUserAvatar} alt="Me" className="w-full h-full object-cover rounded-full" /> : '🧑‍💻'}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">ক্যামেরা অফ</span>
                </div>
              )}

              {/* PIP Header Tag */}
              <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-slate-800 flex items-center justify-between text-[9px] font-bold text-slate-300">
                <span className="truncate">{currentUsername} (আপনি)</span>
                {!isAudioEnabled && <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
              </div>
            </div>

            {/* Floating Reactions Popup */}
            {activeReaction && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                <span className="text-7xl animate-bounce drop-shadow-2xl">
                  {activeReaction}
                </span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS BAR (IN-CALL OR RINGING) */}
      {(callStage === 'connected' || callStage === 'ringing') && (
        <div className="p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-20 flex flex-col items-center gap-3">
          
          {/* Reaction Emoji Bar */}
          {callStage === 'connected' && (
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg">
              {['❤️', '👍', '👏', '🎉', '🔥', '😂', '👋'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="hover:scale-125 active:scale-95 transition text-base md:text-lg p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="flex items-center gap-3 md:gap-4">
            
            {/* Toggle Mic */}
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`p-3.5 md:p-4 rounded-2xl border text-base font-bold transition active:scale-90 shadow-md ${
                isAudioEnabled
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-750'
                  : 'bg-rose-600/30 border-rose-500 text-rose-400 shadow-rose-600/20'
              }`}
              title={isAudioEnabled ? 'মাইক্রোফোন মিউট করুন' : 'মাইক্রোফোন চালু করুন'}
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Toggle Camera */}
            <button
              type="button"
              onClick={handleToggleVideo}
              className={`p-3.5 md:p-4 rounded-2xl border text-base font-bold transition active:scale-90 shadow-md ${
                isVideoEnabled
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-750'
                  : 'bg-rose-600/30 border-rose-500 text-rose-400 shadow-rose-600/20'
              }`}
              title={isVideoEnabled ? 'ক্যামেরা বন্ধ করুন' : 'ক্যামেরা চালু করুন'}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            {callStage === 'connected' && (
              <button
                type="button"
                onClick={handleToggleScreenShare}
                className={`p-3.5 md:p-4 rounded-2xl border text-base font-bold transition active:scale-90 shadow-md ${
                  isScreenSharing
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-750'
                }`}
                title={isScreenSharing ? "স্ক্রিন শেয়ারিং বন্ধ করুন" : "স্ক্রিন শেয়ার করুন"}
              >
                <MonitorUp className="w-5 h-5" />
              </button>
            )}

            {/* Flip Camera */}
            {isVideoEnabled && hasCameraPermission && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-3.5 md:p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-750 font-bold transition active:scale-90 shadow-md"
                title="ক্যামেরা পরিবর্তন করুন"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}

            {/* Speaker Mute/Unmute */}
            {callStage === 'connected' && (
              <button
                type="button"
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`p-3.5 md:p-4 rounded-2xl border text-base font-bold transition active:scale-90 shadow-md ${
                  isSpeakerMuted
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-750'
                }`}
                title={isSpeakerMuted ? "স্পিকার আনমিউট করুন" : "স্পিকার মিউট করুন"}
              >
                {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}

            {/* Red End Call Button */}
            <button
              type="button"
              onClick={handleEndCall}
              className="p-3.5 md:p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xl shadow-rose-600/40 active:scale-90 transition border border-rose-400 flex items-center gap-2"
              title="কল কেটে দিন"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-extrabold">কল শেষ করুন</span>
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
