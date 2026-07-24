'use client';

import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';

export interface MediaSyncPlayerRef {
  seekTo: (seconds: number) => void;
}

interface MediaSyncPlayerProps {
  mediaUrl: string;
  sourceType: 'upload' | 'youtube';
  title?: string;
}

export const MediaSyncPlayer = forwardRef<MediaSyncPlayerRef, MediaSyncPlayerProps>(
  ({ mediaUrl, sourceType, title }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (sourceType === 'youtube') {
          if (iframeRef.current) {
            let ytId = extractYoutubeId(mediaUrl);
            if (ytId) {
              iframeRef.current.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.floor(seconds)}`;
            }
          }
        } else if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          videoRef.current.play().catch(() => { });
        }
      }
    }));

    const extractYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url ? url.match(regExp) : null;
      return (match && match[2].length === 11) ? match[2] : null;
    };

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://clipnote-1-nbeu.onrender.com';
    const isYoutube = sourceType === 'youtube' || mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be');
    const youtubeId = isYoutube ? extractYoutubeId(mediaUrl) : null;
    const fullMediaUrl = mediaUrl.startsWith('http') ? mediaUrl : `${apiBaseUrl}${mediaUrl}`;

    return (
      <div className="warm-card overflow-hidden">
        {/* Player Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-warm)', background: 'var(--bg-card-alt)' }}>
          <div className="flex items-center gap-2">
            <div className="pulse-dot" />
            <h3 className="text-sm font-semibold truncate max-w-xs" style={{ color: 'var(--text-primary)' }}>
              {title || 'Lecture Source Player'}
            </h3>
          </div>
          <span className="badge-olive text-[10px]">
            {isYoutube ? 'YouTube' : 'Uploaded'}
          </span>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video" style={{ background: '#1a1a1a' }}>
          {isYoutube && youtubeId ? (
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
              title="YouTube Video Player"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={fullMediaUrl}
              controls
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          )}
        </div>
      </div>
    );
  }
);

MediaSyncPlayer.displayName = 'MediaSyncPlayer';
