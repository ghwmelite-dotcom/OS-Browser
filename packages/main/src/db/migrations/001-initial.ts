export function up(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      display_name TEXT NOT NULL DEFAULT 'User',
      email TEXT,
      avatar_path TEXT,
      default_model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
      language TEXT NOT NULL DEFAULT 'en',
      sidebar_position TEXT NOT NULL DEFAULT 'right' CHECK (sidebar_position IN ('left', 'right')),
      ad_blocking INTEGER NOT NULL DEFAULT 1,
      privacy_mode INTEGER NOT NULL DEFAULT 0,
      search_engine TEXT NOT NULL DEFAULT 'osbrowser',
      sync_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tabs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Tab',
      url TEXT NOT NULL DEFAULT 'os-browser://newtab',
      favicon_path TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_muted INTEGER NOT NULL DEFAULT 0,
      last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      favicon_path TEXT,
      visit_count INTEGER NOT NULL DEFAULT 1,
      last_visited_at TEXT NOT NULL DEFAULT (datetime('now')),
      ai_summary TEXT,
      page_text_excerpt TEXT,
      UNIQUE(url)
    );

    CREATE TABLE IF NOT EXISTS history_fulltext (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      history_id INTEGER NOT NULL,
      page_text TEXT NOT NULL,
      indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmark_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES bookmark_folders(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      icon TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      folder_id INTEGER REFERENCES bookmark_folders(id) ON DELETE SET NULL,
      favicon_path TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      model TEXT NOT NULL,
      page_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      model TEXT NOT NULL,
      page_context TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 2,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS adblock_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      ads_blocked INTEGER NOT NULL DEFAULT 0,
      trackers_blocked INTEGER NOT NULL DEFAULT 0,
      bytes_saved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_prompt TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      triggers TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS translation_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_text_hash TEXT NOT NULL,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_text_hash, source_lang, target_lang)
    );

    CREATE TABLE IF NOT EXISTS summary_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_hash TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      summary TEXT NOT NULL,
      key_points_json TEXT,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gov_portals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      icon_path TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_pattern TEXT NOT NULL,
      username_encrypted TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      display_name TEXT,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS window_state (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      x INTEGER NOT NULL DEFAULT 100,
      y INTEGER NOT NULL DEFAULT 100,
      width INTEGER NOT NULL DEFAULT 1280,
      height INTEGER NOT NULL DEFAULT 800,
      is_maximized INTEGER NOT NULL DEFAULT 0,
      is_fullscreen INTEGER NOT NULL DEFAULT 0,
      display_id TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
    CREATE INDEX IF NOT EXISTS idx_history_last_visited ON history(last_visited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status, priority);
    CREATE INDEX IF NOT EXISTS idx_translation_cache_hash ON translation_cache(source_text_hash);

    -- Insert defaults
    INSERT OR IGNORE INTO user_profile (id) VALUES (1);
    INSERT OR IGNORE INTO window_state (id) VALUES (1);
  `);
}
