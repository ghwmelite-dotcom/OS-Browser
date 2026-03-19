import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { MatrixClientService } from '@/services/MatrixClientService';
import { useGovChatStore } from '@/store/govchat';
import { GovChatNotificationService } from '@/services/GovChatNotificationService';
import { RetentionService } from '@/services/RetentionService';
import { AuditService } from '@/services/AuditService';

interface GovChatContextValue {
  isReady: boolean;
  matrixService: typeof MatrixClientService;
}

const GovChatContext = createContext<GovChatContextValue>({
  isReady: false,
  matrixService: MatrixClientService,
});

export function useGovChat(): GovChatContextValue {
  return useContext(GovChatContext);
}

export function GovChatProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Initialize all services
    const init = async () => {
      // 1. Initialize audit service (load stored entries)
      AuditService.initialize();

      // 2. Initialize notification service
      await GovChatNotificationService.initialize();

      // 3. Initialize store (handles /auth/me fetch + Matrix connection)
      // Do NOT pre-load credentials into MatrixClientService — let enrichAndConnect
      // fetch the correct matrixToken from /auth/me before touching the SDK
      useGovChatStore.getState().initialize();

      // 5. Start retention service
      RetentionService.start();

      setIsReady(true);
    };

    init();

    // Track window focus/blur for presence
    const handleFocus = () => MatrixClientService.setPresence(true).catch(() => {});
    const handleBlur = () => MatrixClientService.setPresence(false).catch(() => {});
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      MatrixClientService.setPresence(false).catch(() => {});
      RetentionService.stop();
      MatrixClientService.destroy();
    };
  }, []);

  return React.createElement(
    GovChatContext.Provider,
    { value: { isReady, matrixService: MatrixClientService } },
    children,
  );
}
