import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  TAB_CREATE: 'tab:create', TAB_CLOSE: 'tab:close', TAB_SWITCH: 'tab:switch',
  TAB_UPDATE: 'tab:update', TAB_LIST: 'tab:list', TAB_NAVIGATE: 'tab:navigate',
  TAB_GO_BACK: 'tab:go-back', TAB_GO_FORWARD: 'tab:go-forward',
  TAB_RELOAD: 'tab:reload', TAB_STOP: 'tab:stop',
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
} as const;

contextBridge.exposeInMainWorld('osBrowser', {
  minimize: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),
  newWindow: () => ipcRenderer.invoke('window:new'),
  newPrivateWindow: () => ipcRenderer.invoke('window:new-private'),
  hideWebViews: () => ipcRenderer.invoke('webviews:hide'),
  showWebViews: () => ipcRenderer.invoke('webviews:show'),
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
  },
});
