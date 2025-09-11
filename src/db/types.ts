export type ID = number;

export type Folder = {
  id: ID;
  name: string;
  user_id: ID;
  created_at: string;
  updated_at: string | null;
};

export type Note = {
  id: ID;
  title: string;
  content: string;
  folder_id: ID | null;
  is_favorite: 0 | 1;
  is_deleted: 0 | 1;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  remote_id?: string | null;
  version: number;
};

export type NoteAsset = {
  id: ID;
  note_id: ID;
  type: 'image';
  path: string;     // relative path in local FS
  created_at: string;
};
