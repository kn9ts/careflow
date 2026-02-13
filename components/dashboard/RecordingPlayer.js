'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Trash2,
  X,
  Download,
  Volume2,
  VolumeX,
  Clock,
  Calendar,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function RecordingPlayer({ recording, isOpen, onClose, onDelete, onDownload }) {
  const { token } = useAuth();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  // Fetch recording URL when modal opens
  useEffect(() => {
    if (isOpen && recording && recording.sid) {
      fetchRecordingUrl();
    }
  }, [isOpen, recording]);

  // Update progress while playing
  useEffect(() => {
    let interval;
    if (isPlaying && audioRef.current) {
      interval = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const fetchRecordingUrl = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get signed URL from our API for Backblaze B2 recordings
      if (recording.accessUrl) {
        setAudioUrl(recording.accessUrl);
      } else if (recording.id) {
        // Fetch signed URL from API
        const response = await fetch(`/api/recordings/${recording.id}?includeUrl=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.data?.recording?.downloadUrl) {
          setAudioUrl(data.data.recording.downloadUrl);
        } else {
          throw new Error('No access URL available');
        }
      } else {
        throw new Error('Invalid recording');
      }
    } catch (err) {
      setError('Failed to load recording');
      console.error('Error fetching recording URL:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error('Error playing audio:', err);
          setError('Failed to play recording');
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const progress = e.target.value;
    if (audioRef.current) {
      audioRef.current.currentTime = progress;
      setCurrentTime(parseFloat(progress));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(recording._id || recording.sid);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Error deleting recording:', err);
      setError('Failed to delete recording');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl && recording) {
      onDownload(recording);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-background-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Recording</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white" />
            </div>
          ) : (
            <>
              {/* Recording Info */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone className="w-5 h-5 text-primary-red" />
                  <span>{recording.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Clock className="w-5 h-5 text-primary-blue" />
                  <span>Duration: {formatDuration(recording.duration || 0)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="w-5 h-5 text-primary-cyan" />
                  <span>{formatDate(recording.recordedAt)}</span>
                </div>
              </div>

              {/* Audio Player */}
              <div className="bg-background-input rounded-xl p-4 mb-6">
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    disabled={!audioUrl}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    disabled={!audioUrl}
                    className="p-4 rounded-full bg-primary-red text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>

                  {/* Volume */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    disabled={!audioUrl}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    disabled={!audioUrl}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                    title="Download recording"
                  >
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Hidden Audio Element */}
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  onEnded={handleEnded}
                  onError={() => setError('Failed to load audio')}
                  muted={isMuted}
                />
              </div>

              {/* Delete Section */}
              {showDeleteConfirm ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-white mb-4">
                    Are you sure you want to delete this recording? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Recording
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inline styles for slider */}
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #ff3366;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          background: #ff6b9d;
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #ff3366;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
