/**
 * CallButton — Audio/Video call buttons for DM chat headers.
 *
 * Renders a phone icon and a video icon that initiate calls via WebRTCService.
 */
import React, { useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { WebRTCService } from '@/services/WebRTCService';

interface CallButtonProps {
  peerId: string;
  peerName: string;
}

export function CallButton({ peerId, peerName }: CallButtonProps) {
  const [starting, setStarting] = useState(false);

  const handleCall = async (isVideo: boolean) => {
    if (starting || WebRTCService.call) return;
    setStarting(true);
    try {
      await WebRTCService.startCall(peerId, peerName, isVideo);
    } catch (err) {
      console.error('[CallButton] Failed to start call:', err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={() => handleCall(false)}
        disabled={starting}
        className="p-1.5 rounded-md transition-colors"
        style={{ opacity: starting ? 0.5 : 1 }}
        title="Audio call"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 107, 63, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Phone size={14} style={{ color: '#006B3F' }} />
      </button>
      <button
        onClick={() => handleCall(true)}
        disabled={starting}
        className="p-1.5 rounded-md transition-colors"
        style={{ opacity: starting ? 0.5 : 1 }}
        title="Video call"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 107, 63, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Video size={14} style={{ color: '#006B3F' }} />
      </button>
    </div>
  );
}
