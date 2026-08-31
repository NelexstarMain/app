export const SQLITE_SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS notes (
    note_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    word_count INTEGER DEFAULT 0,
    char_count INTEGER DEFAULT 0,
    checksum_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visual_entities (
    entity_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    media_asset_id TEXT NOT NULL,
    linked_note_id TEXT,
    description_snippet TEXT,
    entity_type TEXT DEFAULT 'concept',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (linked_note_id) REFERENCES notes(note_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS canvases (
    canvas_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    node_count INTEGER DEFAULT 0,
    edge_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_edges (
    edge_id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    relation_label TEXT,
    origin_context TEXT NOT NULL,
    origin_canvas_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (origin_canvas_id) REFERENCES canvases(canvas_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON graph_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_relation ON graph_edges(relation_label);

CREATE TABLE IF NOT EXISTS assets (
    asset_id TEXT PRIMARY KEY,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks_todo (
    task_id TEXT PRIMARY KEY,
    topic_id TEXT,
    title TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    time_estimate_minutes INTEGER DEFAULT 25,
    assigned_session_id TEXT,
    completed_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks_todo(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks_todo(priority);

CREATE TABLE IF NOT EXISTS session_history (
    session_id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    planned_duration_minutes INTEGER,
    effective_focus_seconds INTEGER NOT NULL,
    idle_seconds INTEGER DEFAULT 0,
    pauses_count INTEGER DEFAULT 0,
    tasks_completed_count INTEGER DEFAULT 0,
    nodes_created_count INTEGER DEFAULT 0,
    edges_created_count INTEGER DEFAULT 0,
    notes_written_count INTEGER DEFAULT 0,
    user_self_eval_score REAL,
    streak_day_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS srs_cards (
    card_id TEXT PRIMARY KEY,
    parent_note_id TEXT,
    parent_entity_id TEXT,
    parent_canvas_id TEXT,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    media_asset_id TEXT,
    stability REAL NOT NULL DEFAULT 1.0,
    difficulty REAL NOT NULL DEFAULT 5.0,
    repetitions INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'NEW',
    last_review_at INTEGER,
    due_date INTEGER NOT NULL,
    FOREIGN KEY (parent_note_id) REFERENCES notes(note_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_entity_id) REFERENCES visual_entities(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (media_asset_id) REFERENCES assets(asset_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_cards(due_date);

CREATE TABLE IF NOT EXISTS tags (
    tag_name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS item_tags (
    tag_name TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    PRIMARY KEY (tag_name, item_id),
    FOREIGN KEY (tag_name) REFERENCES tags(tag_name) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS global_search_fts USING fts5(
    item_id UNINDEXED,
    item_type UNINDEXED,
    title,
    content,
    tags,
    tokenize = 'unicode61 remove_diacritics 1'
);

CREATE TRIGGER IF NOT EXISTS trg_notes_fts_insert AFTER INSERT ON notes
BEGIN
    INSERT INTO global_search_fts (item_id, item_type, title, content, tags)
    VALUES (new.note_id, 'note', new.title, '', '');
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_fts_update AFTER UPDATE ON notes
BEGIN
    DELETE FROM global_search_fts WHERE item_id = old.note_id AND item_type = 'note';
    INSERT INTO global_search_fts (item_id, item_type, title, content, tags)
    VALUES (new.note_id, 'note', new.title, '', '');
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_fts_delete AFTER DELETE ON notes
BEGIN
    DELETE FROM global_search_fts WHERE item_id = old.note_id AND item_type = 'note';
END;
`

export function toFtsQuery(raw: string): string {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["'*()]/g, ''))
    .filter((t) => t.length > 0)
  if (tokens.length === 0) return '""'
  return tokens.map((t) => `${t}*`).join(' AND ')
}
