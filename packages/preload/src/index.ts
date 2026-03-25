import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  TAB_CREATE: 'tab:create', TAB_CLOSE: 'tab:close', TAB_SWITCH: 'tab:switch',
  TAB_UPDATE: 'tab:update', TAB_LIST: 'tab:list', TAB_NAVIGATE: 'tab:navigate',
  TAB_GO_BACK: 'tab:go-back', TAB_GO_FORWARD: 'tab:go-forward',
  TAB_RELOAD: 'tab:reload', TAB_STOP: 'tab:stop',
  TAB_REORDER: 'tab:reorder', TAB_DUPLICATE: 'tab:duplicate',
  TAB_CLOSE_OTHERS: 'tab:close-others', TAB_CLOSE_TO_RIGHT: 'tab:close-to-right',
  TAB_MOVE_LEFT: 'tab:move-left', TAB_MOVE_RIGHT: 'tab:move-right',
  TAB_PIN: 'tab:pin', TAB_UNPIN: 'tab:unpin',
  TAB_MUTE: 'tab:mute', TAB_UNMUTE: 'tab:unmute',
  TAB_REOPEN_CLOSED: 'tab:reopen-closed', TAB_GET_STATE: 'tab:get-state',
  GROUP_CREATE: 'group:create', GROUP_ADD_TAB: 'group:add-tab',
  GROUP_REMOVE_TAB: 'group:remove-tab', GROUP_UPDATE: 'group:update',
  GROUP_COLLAPSE: 'group:collapse', GROUP_EXPAND: 'group:expand',
  GROUP_DELETE: 'group:delete',
  HISTORY_LIST: 'history:list', HISTORY_ADD: 'history:add',
  HISTORY_DELETE: 'history:delete', HISTORY_CLEAR: 'history:clear',
  HISTORY_SEARCH: 'history:search',
  BOOKMARK_LIST: 'bookmark:list', BOOKMARK_ADD: 'bookmark:add',
  BOOKMARK_UPDATE: 'bookmark:update', BOOKMARK_DELETE: 'bookmark:delete',
  BOOKMARK_FOLDER_CREATE: 'bookmark:folder:create',
  BOOKMARK_FOLDER_DELETE: 'bookmark:folder:delete',
  BOOKMARK_IS_BOOKMARKED: 'bookmark:is-bookmarked',
  AI_CHAT: 'ai:chat', AI_CHAT_STREAM: 'ai:chat:stream',
  AI_SUMMARIZE: 'ai:summarize', AI_TRANSLATE: 'ai:translate',
  AI_SEARCH: 'ai:search',
  SETTINGS_GET: 'settings:get', SETTINGS_UPDATE: 'settings:update',
  CONVERSATION_LIST: 'conversation:list', CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_DELETE: 'conversation:delete', CONVERSATION_MESSAGES: 'conversation:messages',
  CONVERSATION_ADD_MESSAGE: 'conversation:add-message',
  AGENT_LIST: 'agent:list', AGENT_CREATE: 'agent:create',
  AGENT_UPDATE: 'agent:update', AGENT_DELETE: 'agent:delete',
  AGENT_EXECUTE: 'agent:execute',
  STATS_GET: 'stats:get', ADBLOCK_STATS_UPDATE: 'adblock:stats:update',
  GOV_PORTAL_LIST: 'gov-portal:list', GOV_PORTAL_UPDATE: 'gov-portal:update',
  CONNECTIVITY_STATUS: 'connectivity:status', CONNECTIVITY_CHANGED: 'connectivity:changed',
  OFFLINE_QUEUE_COUNT: 'offline-queue:count', OFFLINE_QUEUE_STATUS: 'offline-queue:status',
  WINDOW_MINIMIZE: 'window:minimize', WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close', WINDOW_FULLSCREEN: 'window:fullscreen',
  APP_GET_VERSION: 'app:version', APP_CHECK_UPDATE: 'app:check-update',
  APP_SET_DEFAULT_BROWSER: 'app:set-default-browser', APP_IS_DEFAULT_BROWSER: 'app:is-default-browser',
} as const;

contextBridge.exposeInMainWorld('osBrowser', {
  minimize: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),
  newWindow: () => ipcRenderer.invoke('window:new'),
  newPrivateWindow: () => ipcRenderer.invoke('window:new-private'),
  hideWebViews: () => ipcRenderer.invoke('webviews:hide'),
  showWebViews: () => ipcRenderer.invoke('webviews:show'),
  captureScreenshot: () => ipcRenderer.invoke('screenshot:capture'),
  screenshot: {
    captureVisible: () => ipcRenderer.invoke('screenshot:capture-visible'),
    captureFull: () => ipcRenderer.invoke('screenshot:capture-full'),
    captureRegion: (rect: { x: number; y: number; width: number; height: number }) => ipcRenderer.invoke('screenshot:capture-region', rect),
    save: (dataUrl: string) => ipcRenderer.invoke('screenshot:save', dataUrl),
  },
  close: () => ipcRenderer.invoke(IPC.WINDOW_CLOSE),
  fullscreen: () => ipcRenderer.invoke(IPC.WINDOW_FULLSCREEN),

  tabs: {
    create: (url?: string) => ipcRenderer.invoke(IPC.TAB_CREATE, url),
    close: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE, id),
    switch: (id: string) => ipcRenderer.invoke(IPC.TAB_SWITCH, id),
    update: (id: string, data: any) => ipcRenderer.invoke(IPC.TAB_UPDATE, id, data),
    list: () => ipcRenderer.invoke(IPC.TAB_LIST),
    navigate: (id: string, url: string) => ipcRenderer.invoke(IPC.TAB_NAVIGATE, id, url),
    goBack: (id: string) => ipcRenderer.invoke(IPC.TAB_GO_BACK, id),
    goForward: (id: string) => ipcRenderer.invoke(IPC.TAB_GO_FORWARD, id),
    reload: (id: string) => ipcRenderer.invoke(IPC.TAB_RELOAD, id),
    stop: (id: string) => ipcRenderer.invoke(IPC.TAB_STOP, id),
    getContent: (id: string) => ipcRenderer.invoke('tab:get-content', id),
    pip: (id: string) => ipcRenderer.invoke('tab:pip', id),
    onLoading: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tab:loading', listener);
      return () => ipcRenderer.removeListener('tab:loading', listener);
    },
    onUrlUpdated: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tab:url-updated', listener);
      return () => ipcRenderer.removeListener('tab:url-updated', listener);
    },
    onTitleUpdated: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tab:title-updated', listener);
      return () => ipcRenderer.removeListener('tab:title-updated', listener);
    },
    onFaviconUpdated: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tab:favicon-updated', listener);
      return () => ipcRenderer.removeListener('tab:favicon-updated', listener);
    },
    onTabsRefresh: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tabs:refresh', listener);
      return () => ipcRenderer.removeListener('tabs:refresh', listener);
    },
    reorder: (id: string, newIndex: number) => ipcRenderer.invoke(IPC.TAB_REORDER, id, newIndex),
    duplicate: (id: string) => ipcRenderer.invoke(IPC.TAB_DUPLICATE, id),
    closeOthers: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE_OTHERS, id),
    closeToRight: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE_TO_RIGHT, id),
    moveLeft: (id: string) => ipcRenderer.invoke(IPC.TAB_MOVE_LEFT, id),
    moveRight: (id: string) => ipcRenderer.invoke(IPC.TAB_MOVE_RIGHT, id),
    pin: (id: string) => ipcRenderer.invoke(IPC.TAB_PIN, id),
    unpin: (id: string) => ipcRenderer.invoke(IPC.TAB_UNPIN, id),
    mute: (id: string) => ipcRenderer.invoke(IPC.TAB_MUTE, id),
    unmute: (id: string) => ipcRenderer.invoke(IPC.TAB_UNMUTE, id),
    reopenClosed: () => ipcRenderer.invoke(IPC.TAB_REOPEN_CLOSED),
    getState: () => ipcRenderer.invoke(IPC.TAB_GET_STATE),
    printToPdf: (id: string) => ipcRenderer.invoke('tab:print-to-pdf', id),
    onStateUpdated: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tabs:state-updated', listener);
      return () => ipcRenderer.removeListener('tabs:state-updated', listener);
    },
  },

  memorySaver: {
    stats: () => ipcRenderer.invoke('memory-saver:stats'),
    tabInfo: (tabId: string) => ipcRenderer.invoke('memory-saver:tab-info', tabId),
    excludeAdd: (domain: string) => ipcRenderer.invoke('memory-saver:exclude-add', domain),
    excludeRemove: (domain: string) => ipcRenderer.invoke('memory-saver:exclude-remove', domain),
    excludeList: () => ipcRenderer.invoke('memory-saver:exclude-list'),
    onTabSuspended: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tab:suspended', listener);
      return () => ipcRenderer.removeListener('tab:suspended', listener);
    },
    onTabRestored: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tab:restored', listener);
      return () => ipcRenderer.removeListener('tab:restored', listener);
    },
  },

  groups: {
    create: (tabIds: string[], name?: string) => ipcRenderer.invoke(IPC.GROUP_CREATE, tabIds, name),
    addTab: (tabId: string, groupId: string) => ipcRenderer.invoke(IPC.GROUP_ADD_TAB, tabId, groupId),
    removeTab: (tabId: string) => ipcRenderer.invoke(IPC.GROUP_REMOVE_TAB, tabId),
    update: (groupId: string, data: any) => ipcRenderer.invoke(IPC.GROUP_UPDATE, groupId, data),
    collapse: (groupId: string) => ipcRenderer.invoke(IPC.GROUP_COLLAPSE, groupId),
    expand: (groupId: string) => ipcRenderer.invoke(IPC.GROUP_EXPAND, groupId),
    delete: (groupId: string, closeTabs: boolean) => ipcRenderer.invoke(IPC.GROUP_DELETE, groupId, closeTabs),
  },

  history: {
    list: (page?: number) => ipcRenderer.invoke(IPC.HISTORY_LIST, page),
    add: (entry: any) => ipcRenderer.invoke(IPC.HISTORY_ADD, entry),
    delete: (id: number) => ipcRenderer.invoke(IPC.HISTORY_DELETE, id),
    clear: () => ipcRenderer.invoke(IPC.HISTORY_CLEAR),
    search: (query: string) => ipcRenderer.invoke(IPC.HISTORY_SEARCH, query),
  },

  bookmarks: {
    list: () => ipcRenderer.invoke(IPC.BOOKMARK_LIST),
    add: (bookmark: any) => ipcRenderer.invoke(IPC.BOOKMARK_ADD, bookmark),
    update: (id: number, data: any) => ipcRenderer.invoke(IPC.BOOKMARK_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.BOOKMARK_DELETE, id),
    isBookmarked: (url: string) => ipcRenderer.invoke(IPC.BOOKMARK_IS_BOOKMARKED, url),
    createFolder: (folder: any) => ipcRenderer.invoke(IPC.BOOKMARK_FOLDER_CREATE, folder),
    deleteFolder: (id: number) => ipcRenderer.invoke(IPC.BOOKMARK_FOLDER_DELETE, id),
    updateFolder: (id: number, data: any) => ipcRenderer.invoke('bookmark:folder:update', id, data),
    import: () => ipcRenderer.invoke('bookmark:import'),
    export: () => ipcRenderer.invoke('bookmark:export'),
    onRefresh: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('bookmarks:refresh', listener);
      return () => ipcRenderer.removeListener('bookmarks:refresh', listener);
    },
  },

  ai: {
    chat: (request: any) => ipcRenderer.invoke(IPC.AI_CHAT, request),
    onChatStream: (callback: (chunk: string) => void) => {
      const listener = (_event: any, chunk: string) => callback(chunk);
      ipcRenderer.on(IPC.AI_CHAT_STREAM, listener);
      return () => ipcRenderer.removeListener(IPC.AI_CHAT_STREAM, listener);
    },
    summarize: (request: any) => ipcRenderer.invoke(IPC.AI_SUMMARIZE, request),
    translate: (request: any) => ipcRenderer.invoke(IPC.AI_TRANSLATE, request),
    search: (query: string) => ipcRenderer.invoke(IPC.AI_SEARCH, query),
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (data: any) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, data),
  },

  conversations: {
    list: () => ipcRenderer.invoke(IPC.CONVERSATION_LIST),
    create: (data: any) => ipcRenderer.invoke(IPC.CONVERSATION_CREATE, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.CONVERSATION_DELETE, id),
    messages: (id: number) => ipcRenderer.invoke(IPC.CONVERSATION_MESSAGES, id),
    addMessage: (data: any) => ipcRenderer.invoke(IPC.CONVERSATION_ADD_MESSAGE, data),
  },

  agents: {
    list: () => ipcRenderer.invoke(IPC.AGENT_LIST),
    create: (data: any) => ipcRenderer.invoke(IPC.AGENT_CREATE, data),
    update: (id: number, data: any) => ipcRenderer.invoke(IPC.AGENT_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.AGENT_DELETE, id),
    execute: (id: number, input: string) => ipcRenderer.invoke(IPC.AGENT_EXECUTE, id, input),
  },

  stats: { get: () => ipcRenderer.invoke(IPC.STATS_GET) },

  govPortals: {
    list: () => ipcRenderer.invoke(IPC.GOV_PORTAL_LIST),
    update: (id: number, data: any) => ipcRenderer.invoke(IPC.GOV_PORTAL_UPDATE, id, data),
  },

  connectivity: {
    getStatus: () => ipcRenderer.invoke(IPC.CONNECTIVITY_STATUS),
    onStatusChanged: (callback: (status: string) => void) => {
      const listener = (_event: any, status: string) => callback(status);
      ipcRenderer.on(IPC.CONNECTIVITY_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC.CONNECTIVITY_CHANGED, listener);
    },
  },

  offlineQueue: {
    count: () => ipcRenderer.invoke(IPC.OFFLINE_QUEUE_COUNT),
    onStatus: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.OFFLINE_QUEUE_STATUS, listener);
      return () => ipcRenderer.removeListener(IPC.OFFLINE_QUEUE_STATUS, listener);
    },
  },

  app: {
    getVersion: () => ipcRenderer.invoke(IPC.APP_GET_VERSION),
    checkUpdate: () => ipcRenderer.invoke(IPC.APP_CHECK_UPDATE),
    setDefaultBrowser: () => ipcRenderer.invoke(IPC.APP_SET_DEFAULT_BROWSER),
    isDefaultBrowser: () => ipcRenderer.invoke(IPC.APP_IS_DEFAULT_BROWSER),
    onUpdateAvailable: (cb: (info: any) => void) => {
      const l = (_e: any, info: any) => cb(info);
      ipcRenderer.on('update:available', l);
      return () => ipcRenderer.removeListener('update:available', l);
    },
    onUpdateDownloaded: (cb: (info: any) => void) => {
      const l = (_e: any, info: any) => cb(info);
      ipcRenderer.on('update:downloaded', l);
      return () => ipcRenderer.removeListener('update:downloaded', l);
    },
    onUpdateError: (cb: (msg: string) => void) => {
      const l = (_e: any, msg: string) => cb(msg);
      ipcRenderer.on('update:error', l);
      return () => ipcRenderer.removeListener('update:error', l);
    },
  },

  govchatCredentials: {
    store: (credentials: Record<string, unknown>) => ipcRenderer.invoke('govchat:store-credentials', credentials),
    load: () => ipcRenderer.invoke('govchat:load-credentials'),
    clear: () => ipcRenderer.invoke('govchat:clear-credentials'),
  },

  pwa: {
    onInstallable: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('pwa:installable', handler);
      return () => ipcRenderer.removeListener('pwa:installable', handler);
    },
    install: (data: { name: string; startUrl: string; iconUrl: string }) =>
      ipcRenderer.invoke('pwa:install', data),
  },

  notification: {
    show: (data: { title: string; body: string; type?: string }) =>
      ipcRenderer.invoke('notification:show', data),
    setBadge: (count: number) =>
      ipcRenderer.invoke('notification:badge', count),
    onClicked: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('notification:clicked', listener);
      return () => ipcRenderer.removeListener('notification:clicked', listener);
    },
  },

  adblock: {
    getStatus: () => ipcRenderer.invoke('adblock:get-status'),
    toggleGlobal: () => ipcRenderer.invoke('adblock:toggle-global'),
    toggleSite: (hostname: string) => ipcRenderer.invoke('adblock:toggle-site', hostname),
    isSiteEnabled: (hostname: string) => ipcRenderer.invoke('adblock:is-site-enabled', hostname),
    getBlockedCount: () => ipcRenderer.invoke('adblock:get-blocked-count'),
  },

  downloads: {
    list: () => ipcRenderer.invoke('download:list'),
    pause: (id: string) => ipcRenderer.invoke('download:pause', id),
    resume: (id: string) => ipcRenderer.invoke('download:resume', id),
    cancel: (id: string) => ipcRenderer.invoke('download:cancel', id),
    retry: (id: string) => ipcRenderer.invoke('download:retry', id),
    clearCompleted: () => ipcRenderer.invoke('download:clear-completed'),
    onStarted: (cb: (data: any) => void) => { const l = (_e: any, d: any) => cb(d); ipcRenderer.on('download:started', l); return () => ipcRenderer.removeListener('download:started', l); },
    onProgress: (cb: (data: any) => void) => { const l = (_e: any, d: any) => cb(d); ipcRenderer.on('download:progress', l); return () => ipcRenderer.removeListener('download:progress', l); },
    onComplete: (cb: (data: any) => void) => { const l = (_e: any, d: any) => cb(d); ipcRenderer.on('download:complete', l); return () => ipcRenderer.removeListener('download:complete', l); },
    onFailed: (cb: (data: any) => void) => { const l = (_e: any, d: any) => cb(d); ipcRenderer.on('download:failed', l); return () => ipcRenderer.removeListener('download:failed', l); },
  },

  dataTracker: {
    getUsage: () => ipcRenderer.invoke('data:get-usage'),
    getPageCost: (url: string) => ipcRenderer.invoke('data:get-page-cost', url),
    reset: () => ipcRenderer.invoke('data:reset'),
  },

  session: {
    save: () => ipcRenderer.invoke('session:save'),
    restore: () => ipcRenderer.invoke('session:restore'),
  },

  power: {
    getStatus: () => ipcRenderer.invoke('power:get-status'),
    toggleSaver: () => ipcRenderer.invoke('power:toggle-saver'),
    onStatusChanged: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d);
      ipcRenderer.on('power:status-changed', l);
      return () => ipcRenderer.removeListener('power:status-changed', l);
    },
  },

  totp: {
    generate: (secret: string) => ipcRenderer.invoke('totp:generate', secret),
    parseUri: (uri: string) => ipcRenderer.invoke('totp:parse-uri', uri),
    generateBackupCodes: () => ipcRenderer.invoke('totp:generate-backup-codes'),
    saveTotp: (id: number | string, secret: string) => ipcRenderer.invoke('credential:save-totp', id, secret),
    getTotp: (id: number | string) => ipcRenderer.invoke('credential:get-totp', id),
    checkBreach: (password: string) => ipcRenderer.invoke('credential:check-breach', password),
  },

  passwordVault: {
    encrypt: (plaintext: string) => ipcRenderer.invoke('password:encrypt', plaintext),
    decrypt: (encrypted: string) => ipcRenderer.invoke('password:decrypt', encrypted),
  },

  profiles: {
    list: () => ipcRenderer.invoke('profile:list'),
    create: (name: string, color: string, pin: string) => ipcRenderer.invoke('profile:create', name, color, pin),
    verifyPin: (id: string, pin: string) => ipcRenderer.invoke('profile:verify-pin', id, pin),
    switchProfile: (id: string) => ipcRenderer.invoke('profile:switch', id),
    delete: (id: string, pin: string) => ipcRenderer.invoke('profile:delete', id, pin),
    getActive: () => ipcRenderer.invoke('profile:get-active'),
    updateAvatar: (id: string, avatarUrl: string) => ipcRenderer.invoke('profile:update-avatar', id, avatarUrl),
    updateName: (id: string, name: string) => ipcRenderer.invoke('profile:update-name', id, name),
    updateUnread: (id: string, count: number) => ipcRenderer.invoke('profile:update-unread', id, count),
  },

  recordings: {
    save: (base64Data: string, metadata: { title?: string; duration: number; mimeType: string; quality?: string; hasMic?: boolean }) =>
      ipcRenderer.invoke('recording:save', base64Data, metadata),
    list: () => ipcRenderer.invoke('recording:list'),
    get: (id: string) => ipcRenderer.invoke('recording:get', id),
    delete: (id: string) => ipcRenderer.invoke('recording:delete', id),
    rename: (id: string, newTitle: string) => ipcRenderer.invoke('recording:rename', id, newTitle),
    showInFolder: (id: string) => ipcRenderer.invoke('recording:show-in-folder', id),
    openExternal: (id: string) => ipcRenderer.invoke('recording:open-external', id),
  },

  vault: {
    capture: (pageAction?: string) => ipcRenderer.invoke('vault:capture-page', pageAction),
    list: (search?: string, dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('vault:list', search, dateFrom, dateTo),
    getImage: (id: string) => ipcRenderer.invoke('vault:get-image', id),
    delete: (id: string) => ipcRenderer.invoke('vault:delete', id),
    getStats: () => ipcRenderer.invoke('vault:get-stats'),
    isGovSite: (url: string) => ipcRenderer.invoke('vault:is-gov-site', url),
    onCaptured: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('vault:captured', listener);
      return () => ipcRenderer.removeListener('vault:captured', listener);
    },
  },

  exchange: {
    injectOverlay: (id: string, rates: Record<string, number>) =>
      ipcRenderer.invoke('exchange:inject-overlay', id, rates),
    removeOverlay: (id: string) =>
      ipcRenderer.invoke('exchange:remove-overlay', id),
  },

  browserImport: {
    detect: () => ipcRenderer.invoke('browser-import:detect'),
    run: (browserId: string) => ipcRenderer.invoke('browser-import:run', browserId),
  },

  watcher: {
    add: (url: string, interval: number, selector?: string, title?: string) =>
      ipcRenderer.invoke('watcher:add', url, interval, selector, title),
    remove: (id: string) => ipcRenderer.invoke('watcher:remove', id),
    list: () => ipcRenderer.invoke('watcher:list'),
    getDiff: (id: string) => ipcRenderer.invoke('watcher:get-diff', id),
    checkNow: (id: string) => ipcRenderer.invoke('watcher:check-now', id),
    updateConfig: (id: string, config: { interval?: number; selector?: string; title?: string }) =>
      ipcRenderer.invoke('watcher:update-config', id, config),
    markRead: (id: string) => ipcRenderer.invoke('watcher:mark-read', id),
    getUnreadCount: () => ipcRenderer.invoke('watcher:unread-count'),
    onChangeDetected: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('watcher:change-detected', listener);
      return () => ipcRenderer.removeListener('watcher:change-detected', listener);
    },
  },
});
