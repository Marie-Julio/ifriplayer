import './styles.css';
import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, FastForward, Rewind, 
  ChevronLeft, ChevronRight, Grid, Download, Settings,
  Maximize, Minimize, ChevronsUp, ChevronsDown, RotateCw, BookmarkPlus,
  ThumbsUp, ThumbsDown, Share, List, MoreVertical, Subtitles, Headphones, Camera, RotateCcw,
  Link2, Link2Off, Lock, Unlock
} from 'lucide-react';

const PRELOAD_COUNT = 3;

const LoadingIndicator = () => (
  <div className="flex items-center justify-center h-full w-full bg-black">
    <div className="h-8 w-8">
      <svg viewBox="0 0 100 100" className="animate-spin h-full w-full">
        <circle
          cx="50"
          cy="50"
          fill="none"
          stroke="#FF0000"
          strokeWidth="8"
          r="35"
          strokeDasharray="164.93361431346415 56.97787143782138"
        />
      </svg>
    </div>
  </div>
);

const MultiVideoPlayer = ({ videos, initialVideoIndex = 0, syncByDefault = false }) => {
  const apiUrl = import.meta.env.VITE_API_URI_BASE || '';
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [syncMode, setSyncMode] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState([]);
  const [buffering, setBuffering] = useState(false);
  const [timeMarkers, setTimeMarkers] = useState([]);
  const [showChapters, setShowChapters] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [editingMarkerId, setEditingMarkerId] = useState(null);
  const [markerEditText, setMarkerEditText] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [likes, setLikes] = useState(videos[initialVideoIndex]?.likes || 0);
  const [dislikes, setDislikes] = useState(videos[initialVideoIndex]?.dislikes || 0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [showBigPlayPause, setShowBigPlayPause] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [subtitlesAvailable, setSubtitlesAvailable] = useState(false);
  const [audioEnhancementAvailable, setAudioEnhancementAvailable] = useState(false);
  const [audioEnhanced, setAudioEnhanced] = useState(false);
  const [subtitlesText, setSubtitlesText] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(syncByDefault);
  const [rotation, setRotation] = useState(0);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const containerRef = useRef(null);
  const videoRefs = useRef(videos.map(() => React.createRef()));
  const progressBarRef = useRef(null);
  const playerRef = useRef(null);
  const volumeControlTimeout = useRef(null);
  const bigPlayPauseTimeout = useRef(null);
  
  const currentVideo = videos[currentVideoIndex];

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    const checkFeatures = async () => {
      try {
        const subtitlesResponse = await fetch(`${apiUrl}/api/videos/${currentVideo.id}/subtitles`);
        if (subtitlesResponse.ok) {
          setSubtitlesAvailable(true);
          const data = await subtitlesResponse.json();
          setSubtitlesText(data.text || '');
        } else {
          setSubtitlesAvailable(false);
        }

        const audioResponse = await fetch(`${apiUrl}/api/videos/${currentVideo.id}/audio-enhancement`);
        setAudioEnhancementAvailable(audioResponse.ok);
      } catch (error) {
        console.error("Erreur de vérification des fonctionnalités:", error);
        setSubtitlesAvailable(false);
        setAudioEnhancementAvailable(false);
      }
    };

    checkFeatures();
  }, [currentVideoIndex, apiUrl, currentVideo?.id]);

  const videosToPreload = useMemo(() => {
    const result = [];
    const totalVideos = Math.min(videos.length, PRELOAD_COUNT);

    for (let i = 0; i < totalVideos; i++) {
      const index = (currentVideoIndex + i) % videos.length;
      result.push(index);
    }

    return result;
  }, [currentVideoIndex, videos.length]);

  const formatTime = useCallback((time) => {
    if (isNaN(time)) return '0:00';
    
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleVideoLoaded = useCallback((index) => {
    setLoadedVideos(prev => {
      if (!prev.includes(index)) {
        return [...prev, index];
      }
      return prev;
    });

    if (index === currentVideoIndex) {
      setIsLoading(false);
    }
  }, [currentVideoIndex]);

  const syncAllVideos = useCallback((time) => {
    videoRefs.current.forEach(ref => {
      if (ref.current && Math.abs(ref.current.currentTime - time) > 0.5) {
        ref.current.currentTime = time;
      }
    });
  }, []);

  const handlePlay = useCallback(() => {
    if (isLoading) return;

    const promises = loadedVideos.map(index => {
      const ref = videoRefs.current[index];
      if (ref.current) {
        return ref.current.play().catch(e => {
          console.log("Lecture automatique bloquée", e);
          return Promise.resolve();
        });
      }
      return Promise.resolve();
    });

    Promise.all(promises).then(() => {
      setIsPlaying(true);
      setShowBigPlayPause(true);
      if (bigPlayPauseTimeout.current) {
        clearTimeout(bigPlayPauseTimeout.current);
      }
      bigPlayPauseTimeout.current = setTimeout(() => {
        setShowBigPlayPause(false);
      }, 1000);
    });
  }, [isLoading, loadedVideos]);

  const handlePause = useCallback(() => {
    videoRefs.current.forEach(ref => {
      if (ref.current) {
        ref.current.pause();
      }
    });
    setIsPlaying(false);
    setShowBigPlayPause(true);
    if (bigPlayPauseTimeout.current) {
      clearTimeout(bigPlayPauseTimeout.current);
    }
    bigPlayPauseTimeout.current = setTimeout(() => {
      setShowBigPlayPause(false);
    }, 1000);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRefs.current[currentVideoIndex].current;
    if (!video) return;

    const time = video.currentTime;
    setCurrentTime(time);

    if (progressBarRef.current) {
      const progress = (time / duration) * 100;
      progressBarRef.current.style.width = `${progress}%`;
    }

    if (syncEnabled) {
      syncAllVideos(time);
    }
  }, [currentVideoIndex, duration, syncEnabled, syncAllVideos]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRefs.current[currentVideoIndex].current;
    if (!video) return;

    setDuration(video.duration);
    handleVideoLoaded(currentVideoIndex);
  }, [currentVideoIndex, handleVideoLoaded]);

  const handleSeek = useCallback((e) => {
    const seekTime = parseFloat(e.target.value);

    loadedVideos.forEach(index => {
      const ref = videoRefs.current[index];
      if (ref.current) {
        ref.current.currentTime = seekTime;
      }
    });

    setCurrentTime(seekTime);
  }, [loadedVideos]);

  const changeVideo = useCallback((index) => {
    if (index === currentVideoIndex) return;

    const wasPlaying = isPlaying;
    handlePause();
    setIsLoading(true);

    if (loadedVideos.includes(index)) {
      setCurrentVideoIndex(index);
      setCurrentTime(syncEnabled ? (videoRefs.current[index].current?.currentTime || 0) : 0);
      setIsLoading(false);
      setLikes(videos[index]?.likes || 0);
      setDislikes(videos[index]?.dislikes || 0);

      if (wasPlaying) {
        setTimeout(() => handlePlay(), 100);
      }
    } else {
      setCurrentVideoIndex(index);
      setLikes(videos[index]?.likes || 0);
      setDislikes(videos[index]?.dislikes || 0);
      if (!syncEnabled) {
        setCurrentTime(0);
      }
    }
  }, [currentVideoIndex, isPlaying, loadedVideos, handlePause, handlePlay, videos, syncEnabled]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Erreur lors du passage en plein écran: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const addTimeMarker = useCallback(() => {
    const newMarker = {
      time: currentTime,
      formattedTime: formatTime(currentTime),
      label: `Marqueur ${timeMarkers.length + 1}`,
      id: Date.now()
    };

    setTimeMarkers(prev => [...prev, newMarker]);
  }, [currentTime, formatTime, timeMarkers.length]);

  const goToTimeMarker = useCallback((time) => {
    loadedVideos.forEach(index => {
      const ref = videoRefs.current[index];
      if (ref.current) {
        ref.current.currentTime = time;
      }
    });

    setCurrentTime(time);
  }, [loadedVideos]);

  const deleteTimeMarker = useCallback((id) => {
    setTimeMarkers(prev => prev.filter(marker => marker.id !== id));
  }, []);

  const startEditingMarker = useCallback((marker) => {
    setEditingMarkerId(marker.id);
    setMarkerEditText(marker.label);
  }, []);

  const saveMarkerEdit = useCallback(() => {
    setTimeMarkers(prev => prev.map(marker => 
      marker.id === editingMarkerId 
        ? { ...marker, label: markerEditText } 
        : marker
    ));
    setEditingMarkerId(null);
  }, [editingMarkerId, markerEditText]);

  const handleWaiting = useCallback(() => {
    setBuffering(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setBuffering(false);
  }, []);

  const handleLike = useCallback(() => {
    if (userLiked) {
      setUserLiked(false);
      setLikes(likes - 1);
    } else {
      setUserLiked(true);
      setLikes(likes + 1);
      if (userDisliked) {
        setUserDisliked(false);
        setDislikes(dislikes - 1);
      }
    }
  }, [likes, dislikes, userLiked, userDisliked]);

  const handleDislike = useCallback(() => {
    if (userDisliked) {
      setUserDisliked(false);
      setDislikes(dislikes - 1);
    } else {
      setUserDisliked(true);
      setDislikes(dislikes + 1);
      if (userLiked) {
        setUserLiked(false);
        setLikes(likes - 1);
      }
    }
  }, [likes, dislikes, userLiked, userDisliked]);

  const handleVolumeIconMouseEnter = useCallback(() => {
    if (volumeControlTimeout.current) {
      clearTimeout(volumeControlTimeout.current);
    }
    setIsVolumeSliderVisible(true);
  }, []);

  const handleVolumeControlMouseLeave = useCallback(() => {
    volumeControlTimeout.current = setTimeout(() => {
      setIsVolumeSliderVisible(false);
    }, 2000);
  }, []);

  const handleDownload = useCallback(() => {
    if (!currentVideo?.downloadable) return;
    
    const video = videoRefs.current[currentVideoIndex].current;
    if (!video) return;
    
    const a = document.createElement('a');
    a.href = `${apiUrl}/storage/${currentVideo.file_path}`;
    a.download = currentVideo.title || 'video';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [currentVideoIndex, currentVideo, apiUrl]);

  const toggleSubtitles = useCallback(async () => {
    if (!subtitlesAvailable) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/videos/${currentVideo.id}/subtitles`);
      if (response.ok) {
        const data = await response.json();
        setSubtitlesText(data.text || '');
        setShowSubtitles(!showSubtitles);
      } else {
        setSubtitlesAvailable(false);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des sous-titres:", error);
      setSubtitlesAvailable(false);
    }
  }, [showSubtitles, subtitlesAvailable, currentVideo?.id, apiUrl]);

  const enhanceAudio = useCallback(async () => {
    if (!audioEnhancementAvailable) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/videos/${currentVideo.id}/enhanced-audio`);
      if (response.ok) {
        const enhancedUrl = await response.json();
        videoRefs.current[currentVideoIndex].current.src = enhancedUrl;
        setAudioEnhanced(true);
      } else {
        setAudioEnhancementAvailable(false);
      }
    } catch (error) {
      console.error("Erreur lors de l'amélioration audio:", error);
      setAudioEnhancementAvailable(false);
    }
  }, [audioEnhancementAvailable, currentVideo?.id, currentVideoIndex, apiUrl]);

  const handleScreenshot = useCallback(async () => {
    const video = videoRefs.current[currentVideoIndex].current;
    if (!video) return;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capture-${currentVideo.title || 'video'}-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Error creating screenshot:', error);
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Capture non disponible pour cette vidéo', canvas.width / 2, canvas.height / 2);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capture-${currentVideo.title || 'video'}-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    }
  }, [currentVideoIndex, currentVideo?.title]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: currentVideo.title || 'Vidéo',
          text: 'Regardez cette vidéo',
          url: shareUrl,
        });
      } else {
        setShowShareOptions(true);
      }
    } catch (err) {
      console.log('Erreur de partage:', err);
    }
  }, [currentVideo?.title, shareUrl]);

  const copyShareUrl = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }, [shareUrl]);

  const rotateVideo = useCallback((degrees) => {
    setRotation(prev => (prev + degrees) % 360);
  }, []);

  const videoRotationStyle = useMemo(() => {
    return {
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center',
      transition: 'transform 0.3s ease',
    };
  }, [rotation]);

  const [previewTime, setPreviewTime] = useState(null);
  const [previewPosition, setPreviewPosition] = useState(0);
  
  const handleProgressBarHover = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    setPreviewTime(time);
    setPreviewPosition(pos * 100);
  }, [duration]);

  useEffect(() => {
    const initializePreload = async () => {
      for (const index of videosToPreload) {
        if (!loadedVideos.includes(index)) {
          const video = videoRefs.current[index].current;
          if (video) {
            video.preload = "metadata";
            if (index !== currentVideoIndex) {
              video.preload = "auto";
            }
          }
        }
      }
    };

    initializePreload();
  }, [videosToPreload, loadedVideos, currentVideoIndex]);

  useEffect(() => {
    const video = videoRefs.current[currentVideoIndex].current;
    if (!video) return;

    const events = [
      { name: 'timeupdate', handler: handleTimeUpdate },
      { name: 'loadedmetadata', handler: handleLoadedMetadata },
      { name: 'ended', handler: () => setIsPlaying(false) },
      { name: 'waiting', handler: handleWaiting },
      { name: 'canplay', handler: handleCanPlay }
    ];

    events.forEach(({ name, handler }) => {
      video.addEventListener(name, handler);
    });

    return () => {
      events.forEach(({ name, handler }) => {
        video.removeEventListener(name, handler);
      });
    };
  }, [currentVideoIndex, handleTimeUpdate, handleLoadedMetadata, handleWaiting, handleCanPlay]);

  useEffect(() => {
    if (!loadedVideos.includes(currentVideoIndex)) {
      const video = videoRefs.current[currentVideoIndex].current;
      if (video) {
        video.load();
      }
    } else {
      setIsLoading(false);
    }
  }, [currentVideoIndex, loadedVideos]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!containerRef.current || !containerRef.current.contains(document.activeElement)) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          isPlaying ? handlePause() : handlePlay();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          syncAllVideos(Math.min(duration, currentTime + 5));
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          syncAllVideos(Math.max(0, currentTime - 5));
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(!isMuted);
          break;
        case 'c':
          e.preventDefault();
          if (subtitlesAvailable) toggleSubtitles();
          break;
        case 'a':
          e.preventDefault();
          if (audioEnhancementAvailable) enhanceAudio();
          break;
        case 's':
          e.preventDefault();
          setSyncEnabled(!syncEnabled);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePlay, handlePause, duration, currentTime, syncAllVideos, toggleFullscreen, isMuted, subtitlesAvailable, toggleSubtitles, audioEnhancementAvailable, enhanceAudio, syncEnabled]);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const inactivityTimeout = useRef(null);

  // Ajoutez cette fonction pour gérer l'inactivité
  const resetInactivityTimer = useCallback(() => {
    setControlsVisible(true);
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    inactivityTimeout.current = setTimeout(() => {
      if (!locked) {
        setControlsVisible(false);
      }
    }, 5000);
  }, [locked]);

  // Ajoutez cet effet pour initialiser et nettoyer le timer
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
    };
  }, [resetInactivityTimer]);

  return (
    <div 
      ref={containerRef} 
      className="flex flex-col bg-black text-white w-full max-w-screen-2xl mx-auto relative"
      onMouseEnter={() => {
        setIsHovering(true);
        resetInactivityTimer();
      }}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={resetInactivityTimer}
    >
      <div className="flex">
        <div className="flex-1">
          <div className="relative" ref={playerRef}>
            <Suspense fallback={<LoadingIndicator />}>
              {videos.map((video, index) => (
                <video
                  key={index}
                  ref={videoRefs.current[index]}
                  src={`${video.file_path}`}
                  className={`w-full aspect-video bg-black ${index === currentVideoIndex ? 'block' : 'hidden'}`}
                  style={index === currentVideoIndex ? videoRotationStyle : {}}
                  playsInline
                  preload={videosToPreload.includes(index) ? "auto" : "none"}
                  muted={index !== currentVideoIndex || isMuted}
                  playbackRate={playbackRate}
                  onLoadedMetadata={() => {
                    if (index === currentVideoIndex) {
                      handleLoadedMetadata();
                    } else {
                      handleVideoLoaded(index);
                    }
                  }}
                  onClick={() => isPlaying ? handlePause() : handlePlay()}
                />
              ))}
            </Suspense>

            {(isLoading || buffering) && <LoadingIndicator />}

            {showBigPlayPause && (
              <div 
                className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none ${locked ? 'hidden' : 'block'}`}
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <div className="hover:bg-gray-800 bg-black/70 rounded-full p-6">
                  {isPlaying ? (
                    <Pause size={60} className="text-white" />
                  ) : (
                    <Play size={60} className="text-white" />
                  )}
                </div>
              </div>
            )}

            {showSubtitles && subtitlesAvailable && (
              <div className="absolute bottom-20 left-0 right-0 text-center z-10">
                <div className="inline-block bg-black/70 px-4 py-2 rounded text-white text-lg">
                  {subtitlesText}
                </div>
              </div>
            )}

            <div 
              className={`absolute inset-0 flex flex-col justify-between z-10 transition-opacity duration-300 ${
                (isHovering || !isPlaying || !controlsVisible) ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={(e) => {
                e.target === e.currentTarget && (isPlaying ? handlePause() : handlePlay());
                resetInactivityTimer();
              }}
            >
              <div className="bg-gradient-to-b from-black/70 to-transparent p-2 flex items-center justify-between">
                {locked && (
                  <div className="text-sm text-white/70 ml-2">
                    Lecteur verrouillé - Cliquez pour déverrouiller
                  </div>
                )}
                <button
                  onClick={() => {
                    setLocked(!locked);
                    if (!locked) {
                      setControlsVisible(false);
                    } else {
                      setControlsVisible(true);
                      resetInactivityTimer();
                    }
                  }}
                  className={`hover:bg-gray-800 rounded-full p-2 ${locked ? 'bg-red-600 text-white ' : 'bg-gray-600 text-white '}`}
                  aria-label={locked ? "Déverrouiller" : "Verrouiller"}
                  title={locked ? "Déverrouiller" : "Verrouiller"}
                >
                  {locked ? <Lock size={20} /> : <Unlock size={20} />}
                </button>
              </div>

              <div className={`bg-gradient-to-t from-black/70 to-transparent ${locked ? 'hidden' : 'block'}`}>
                <div 
                  className=" w-[98%] mx-auto relative h-3 group cursor-pointer"
                  onMouseMove={handleProgressBarHover}
                  onMouseLeave={() => setPreviewTime(null)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    const seekTime = pos * duration;
                    syncAllVideos(seekTime);
                  }}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600 group-hover:h-3 transition-all">
                    <div className="absolute top-0 left-0 h-full bg-gray-400" style={{ width: '30%' }}></div>
                    <div ref={progressBarRef} className="absolute top-0 left-0 h-full bg-red-600" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                    
                    {previewTime !== null && (
                      <div 
                        className="absolute -top-8 transform -translate-x-1/2 bg-black px-2 py-1 rounded text-xs"
                        style={{ left: `${previewPosition}%` }}
                      >
                        {formatTime(previewTime)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={isPlaying ? handlePause : handlePlay}
                        className="hover:bg-gray-800 bg-black/70 rounded-full p-2"
                        aria-label={isPlaying ? "Pause" : "Lecture"}
                        title={isPlaying ? "Pause" : "Lecture"}
                      >
                        {isPlaying ? <Pause size={30} /> : <Play size={30} />}
                      </button>
                      
                      <button
                        onClick={() => syncAllVideos(Math.max(0, currentTime - 10))}
                        className="hover:bg-gray-800 bg-black/70 rounded-full p-2"
                        aria-label="Reculer de 10 secondes"
                        title="Reculer de 10 secondes"
                      >
                        <Rewind size={20} />
                      </button>

                      <button
                        onClick={() => changeVideo(Math.max(0, currentVideoIndex - 1))}
                        disabled={currentVideoIndex === 0}
                        className={`bg-black/70 rounded-full p-2 ${currentVideoIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'}`}
                        aria-label="Vidéo précédente"
                        title="Vidéo précédente"
                      >
                        <SkipBack size={20} />
                      </button>
                      
                      <button
                        onClick={() => changeVideo(Math.min(videos.length - 1, currentVideoIndex + 1))}
                        disabled={currentVideoIndex === videos.length - 1}
                        className={`bg-black/70 rounded-full p-2 ${currentVideoIndex === videos.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'}`}
                        aria-label="Vidéo suivante"
                        title="Vidéo suivante"
                      >
                        <SkipForward size={20} />
                      </button>

                      <button
                        onClick={() => syncAllVideos(Math.min(duration, currentTime + 10))}
                        className="hover:bg-gray-800 bg-black/70 rounded-full p-2"
                        aria-label="Avancer de 10 secondes"
                        title="Avancer de 10 secondes"
                      >
                        <FastForward  size={20} />
                      </button>
                      
                      <div className=" bg-black/70 rounded-full py-2 px-3 text-sm font-medium">
                        <span>{formatTime(currentTime)}</span>
                        <span className="mx-1">/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                    
                    <div className="bg-black/70 rounded-full px-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div
                          className="flex items-center relative"
                          onMouseEnter={handleVolumeIconMouseEnter}
                          onMouseLeave={handleVolumeControlMouseLeave}
                        >
                          <button
                            onClick={() => {
                              const newMuted = !isMuted;
                              videoRefs.current.forEach(ref => {
                                if (ref.current) ref.current.muted = newMuted;
                              });
                              setIsMuted(newMuted);
                            }}
                            className={isMuted ? "bg-red-600 rounded-full p-2" : " hover:bg-gray-800 rounded-full p-2"}
                            aria-label={isMuted ? "Activer le son" : "Couper le son"}
                            title="Volume"
                          >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                          </button>
                          
                          <div 
                            className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200 ${
                              isVolumeSliderVisible ? 'opacity-100 h-24' : 'opacity-0 h-0 overflow-hidden'
                            }`}
                          >
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={isMuted ? 0 : volume}
                              onChange={(e) => {
                                const vol = parseFloat(e.target.value);
                                videoRefs.current.forEach(ref => {
                                  if (ref.current) ref.current.volume = vol;
                                });
                                setVolume(vol);
                                setIsMuted(vol === 0);
                              }}
                              className="h-full  w-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white "
                              aria-label="Volume"
                              style={{ 
                                WebkitAppearance: 'slider-vertical',
                                writingMode: 'bt-lr',
                                transform: 'rotate(0deg)'
                              }}
                            />
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setSyncEnabled(!syncEnabled)}
                          className={`hover:bg-gray-800 rounded-full p-2 ${syncEnabled ? 'text-blue-500' : ''}`}
                          aria-label={syncEnabled ? "Désynchroniser les vidéos" : "Synchroniser les vidéos"}
                          title={syncEnabled ? "Les vidéos sont synchronisées" : "Les vidéos sont indépendantes"}
                        >
                          {syncEnabled ? <Link2 size={20} /> : <Link2Off size={20} />}
                        </button>
                        
                        <button
                          onClick={toggleSubtitles}
                          disabled={!subtitlesAvailable}
                          className={`hover:bg-gray-800 rounded-full p-2 ${subtitlesAvailable ? '' : 'opacity-50 cursor-not-allowed'}`}
                          aria-label={showSubtitles ? "Masquer les sous-titres" : "Afficher les sous-titres"}
                          title={!subtitlesAvailable ? "Fonctionnalité indisponible" : ""}
                        >
                          <Subtitles size={20} className={showSubtitles ? "text-red-500" : ""} />
                        </button>
                        
                        <button
                          onClick={enhanceAudio}
                          disabled={!audioEnhancementAvailable}
                          className={`hover:bg-gray-800 rounded-full p-2 ${audioEnhancementAvailable ? '' : 'opacity-50 cursor-not-allowed'}`}
                          aria-label={audioEnhanced ? "Désactiver l'amélioration audio" : "Améliorer l'audio"}
                          title={!audioEnhancementAvailable ? "Fonctionnalité indisponible" : ""}
                        >
                          <Headphones size={20} className={audioEnhanced ? "text-green-500" : ""} />
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="hover:bg-gray-800 rounded-full p-2"
                            aria-label="Paramètres"
                            title="Paramètres"
                          >
                            <Settings size={20} />
                          </button>
                          
                          {showSettings && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-black border border-gray-700 rounded shadow-lg">
                              <div className="relative">
                                <button
                                  onClick={() => setShowSpeedOptions(!showSpeedOptions)}
                                  className="w-full p-3 text-left hover:bg-gray-800 flex items-center justify-between"
                                >
                                  <span>Vitesse</span>
                                  <span>{playbackRate}x</span>
                                </button>
                                
                                {showSpeedOptions && (
                                  <div className="absolute left-full top-0 w-40 bg-black border border-gray-700 rounded shadow-lg">
                                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                                      <button
                                        key={speed}
                                        onClick={() => {
                                          setPlaybackRate(speed);
                                          videoRefs.current.forEach(ref => {
                                            if (ref.current) ref.current.playbackRate = speed;
                                          });
                                          setShowSpeedOptions(false);
                                        }}
                                        className={`w-full p-2 text-left hover:bg-gray-800 ${playbackRate === speed ? 'bg-gray-700' : ''}`}
                                      >
                                        {speed === 1 ? 'Normal' : `${speed}x`}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="relative">
                                <button
                                  onClick={() => setShowQualityOptions(!showQualityOptions)}
                                  className="w-full p-3 text-left hover:bg-gray-800 flex items-center justify-between"
                                >
                                  <span>Qualité</span>
                                  <span>{quality.charAt(0).toUpperCase() + quality.slice(1)}</span>
                                </button>
                                
                                {showQualityOptions && (
                                  <div className="absolute left-full top-0 w-40 bg-black border border-gray-700 rounded shadow-lg">
                                    {['auto', 'faible', 'moyenne', 'haute', '1080p', '720p', '480p', '360p'].map(q => (
                                      <button
                                        key={q}
                                        onClick={() => {
                                          setQuality(q);
                                          setShowQualityOptions(false);
                                        }}
                                        className={`w-full p-2 text-left hover:bg-gray-800 ${quality === q ? 'bg-gray-700' : ''}`}
                                      >
                                        {q.charAt(0).toUpperCase() + q.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleScreenshot}
                          className="flex items-center space-x-1 hover:bg-gray-800 px-3 py-2 rounded-full"
                          title="Prendre une capture d'écran"
                        >
                          <Camera size={18} />
                        </button>

                        <div className="relative">
                          
                          {showShareOptions && (
                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-black border border-gray-700 rounded shadow-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">Partager cette vidéo</span>
                                <button 
                                  onClick={() => setShowShareOptions(false)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="flex items-center bg-gray-800 rounded overflow-hidden">
                                <input
                                  type="text"
                                  value={shareUrl}
                                  readOnly
                                  className="flex-1 bg-transparent p-2 text-sm truncate"
                                />
                                <button
                                  onClick={copyShareUrl}
                                  className="bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm"
                                >
                                  {shareCopied ? 'Copié!' : 'Copier'}
                                </button>
                              </div>
                              <div className="flex justify-around mt-3">
                                <a 
                                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  Facebook
                                </a>
                                <a 
                                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  Twitter
                                </a>
                                <a 
                                  href={`mailto:?body=${encodeURIComponent(shareUrl)}`} 
                                  className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  Email
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => rotateVideo(90)}
                            className="hover:bg-gray-800 p-2 rounded-full"
                            title="Pivoter à droite (R)"
                          >
                            <RotateCw size={18} />
                          </button>
                          <button
                            onClick={() => rotateVideo(-90)}
                            className="hover:bg-gray-800 p-2 rounded-full"
                            title="Pivoter à gauche (Maj+R)"
                          >
                            <RotateCcw size={18} />
                          </button>
                          {rotation !== 0 && (
                            <button
                              onClick={() => setRotation(0)}
                              className="hover:bg-gray-800 p-2 rounded-full text-xs"
                              title="Réinitialiser la rotation (0)"
                            >
                              {rotation}°
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={toggleFullscreen}
                        className="hover:bg-gray-800 rounded-full p-2"
                        aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                        title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                      >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-4">
            <h1 className="text-xl font-bold mb-2">
                    <span className="text-lg bg-red-600 p-2 rounded-lg">
                      {currentVideoIndex + 1}/{videos.length}
                    </span> {currentVideo.title}</h1>
            
            <div className="flex flex-wrap items-center justify-between py-2 border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center space-x-1 hover:bg-gray-800 px-3 py-2 rounded-full ${userLiked ? 'text-blue-400' : ''}`}
                  >
                    <ThumbsUp size={20} />
                    <span>{likes > 0 ? likes : ''}</span>
                  </button>
                  
                  <button 
                    onClick={handleDislike}
                    className={`flex items-center space-x-1 hover:bg-gray-800 px-3 py-2 rounded-full ${userDisliked ? 'text-blue-400' : ''}`}
                  >
                    <ThumbsDown size={20} />
                    <span>{dislikes > 0 ? dislikes : ''}</span>
                  </button>
                </div>
                
                <button onClick={handleShare} className="flex items-center space-x-1 hover:bg-gray-800 px-3 py-2 rounded-full">
                  <Share size={18} />
                  <span>Partager</span>
                </button>
                
                {currentVideo.downloadable && (
                  <button 
                    onClick={handleDownload}
                    className="flex items-center space-x-1 hover:bg-gray-800 px-3 py-2 rounded-full"
                  >
                    <Download size={18} />
                    <span>Télécharger</span>
                  </button>
                )}
                
                <button 
                  onClick={addTimeMarker}
                  className="flex items-center space-x-1 hover:bg-gray-800 px-3 py-2 rounded-full"
                >
                  <BookmarkPlus size={18} />
                  <span>Marquer</span>
                </button>
                
                <button className="hover:bg-gray-800 p-2 rounded-full">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Tous les vidéos</h2>
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className="text-sm text-gray-400 hover:text-white"
              >
                {showThumbnails ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            
            {showThumbnails && (
              <div className="bg-gray-800 p-2 flex overflow-x-auto space-x-2">
                {videos.map((video, index) => (
                  <div 
                    key={index}
                    onClick={() => changeVideo(index)}
                    className={`flex-shrink-0 w-32 h-20 rounded overflow-hidden cursor-pointer relative ${index === currentVideoIndex ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <img 
                      src={video.thumbnail || `https://img.youtube.com/vi/${getYouTubeId(video.url)}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs truncate">
                      {video.title}
                    </div>
                    <div className="absolute top-1 left-1 bg-black/70 rounded px-1 text-xs">
                      {formatTime(videoRefs.current[index].current?.currentTime || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`w-64 bg-gray-900 border-l border-gray-800 transition-all duration-300 ${showChapters ? 'block' : 'hidden'}`}>
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-medium">Marqueurs</h3>
            <button
              onClick={() => setShowChapters(false)}
              className="hover:bg-gray-800 rounded-full p-1"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={addTimeMarker}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-full flex items-center justify-center gap-2"
            >
              <BookmarkPlus size={16} /> 
              <span>Ajouter un marqueur</span>
            </button>
          </div>
          
          <div className="overflow-y-auto h-full pb-24">
            {timeMarkers.length === 0 ? (
              <div className="p-4 text-center text-gray-400">Aucun marqueur</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {timeMarkers.map(marker => (
                  <div 
                    key={marker.id} 
                    className={`p-3 hover:bg-gray-800 ${Math.abs(currentTime - marker.time) < 0.5 ? 'bg-gray-800' : ''}`}
                  >
                    {editingMarkerId === marker.id ? (
                      <div className="flex flex-col space-y-2">
                        <input
                          type="text"
                          value={markerEditText}
                          onChange={(e) => setMarkerEditText(e.target.value)}
                          className="bg-gray-700 text-white text-sm p-2 rounded border border-gray-600"
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => setEditingMarkerId(null)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                          >
                            Annuler
                          </button>
                          <button 
                            onClick={saveMarkerEdit}
                            className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
                          >
                            Sauvegarder
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div 
                          className="flex-1 cursor-pointer" 
                          onClick={() => goToTimeMarker(marker.time)}
                        >
                          <div className="text-xs font-mono text-red-500">{marker.formattedTime}</div>
                          <div className="text-sm mt-1">{marker.label}</div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => startEditingMarker(marker)}
                            className="text-gray-400 hover:text-white p-1"
                            title="Renommer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteTimeMarker(marker.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Supprimer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {!showChapters && timeMarkers.length > 0 && (
        <button
          onClick={() => setShowChapters(true)}
          className="fixed bottom-6 right-6 bg-gray-800 hover:bg-gray-700 rounded-full p-3 shadow-lg z-20 flex items-center gap-2"
        >
          <List size={20} />
          <span className="pr-1">Marqueurs ({timeMarkers.length})</span>
        </button>
      )}
    </div>
  );
};

function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default MultiVideoPlayer;