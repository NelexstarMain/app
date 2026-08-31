export enum IpcChannel {
  // Workspace & File System
  WORKSPACE_SELECT = 'workspace:select',
  WORKSPACE_INIT = 'workspace:init',
  WORKSPACE_GET_CURRENT = 'workspace:get-current',
  FILE_READ = 'file:read',
  FILE_WRITE_ATOMIC = 'file:write-atomic',
  FILE_DELETE = 'file:delete',
  FILE_CREATE_FOLDER = 'file:create-folder',
  FILE_RENAME = 'file:rename',
  FILE_LIST = 'file:list',

  // SQLite Database & FTS5
  DB_QUERY_FTS = 'db:query-fts',
  DB_GET_GRAPH_DATA = 'db:get-graph-data',
  DB_CREATE_EDGES = 'db:create-edges',
  DB_GET_TASKS = 'db:get-tasks',
  DB_CREATE_TASK = 'db:create-task',
  DB_UPDATE_TASK = 'db:update-task',
  DB_DELETE_TASK = 'db:delete-task',
  DB_GET_SRS_DUE = 'db:get-srs-due',
  DB_RECORD_SRS_REVIEW = 'db:record-srs-review',
  DB_SAVE_SESSION_HISTORY = 'db:save-session-history',
  DB_GET_ANALYTICS = 'db:get-analytics',
  DB_REINDEX_ALL = 'db:reindex-all',
  DB_GET_ORPHANS = 'db:get-orphans',
  DB_APPLY_FEEDBACK = 'db:apply-feedback',

  // Visual Entities & Assets
  ASSET_INGEST = 'asset:ingest',
  ASSET_GET_ENTITY = 'asset:get-entity',
  ASSET_SEARCH_ENTITIES = 'asset:search-entities',
  ASSET_GET_ALL = 'asset:get-all',

  // Crash Recovery & Snapshots
  RECOVERY_SAVE_SNAPSHOT = 'recovery:save-snapshot',
  RECOVERY_CHECK_SNAPSHOT = 'recovery:check-snapshot',
  RECOVERY_CLEAR_SNAPSHOT = 'recovery:clear-snapshot',

  // App Utilities
  APP_GET_VERSION = 'app:get-version',
  SHELL_OPEN_EXTERNAL = 'shell:open-external'
}

export enum IpcEvent {
  FILE_MUTATED = 'event:file-mutated',
  ENTITY_MUTATED = 'event:entity-mutated',
  CANVAS_MUTATED = 'event:canvas-mutated',
  SESSION_TICK = 'event:session-tick'
}
