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

      // 3. Check for stored credentials and try to restore session
      const stored = MatrixClientService.loadStoredCredentials();
      if (stored) {
        try {
          await MatrixClientService.loginWithCredentials(stored);
          AuditService.log('login', stored.userId, { method: 'stored_credentials' });
        } catch (e) {
          console.warn('[GovChat] Failed to restore session:', e);
        }
      }

      // 4. Initialize store
      useGovChatStore.getState().initialize();

      // 5. Start retention service
      RetentionService.start();

      setIsReady(true);
    };

    init();

    return () => {
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
