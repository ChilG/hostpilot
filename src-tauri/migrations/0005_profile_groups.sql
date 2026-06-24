-- Migration: Add profile_groups table
CREATE TABLE IF NOT EXISTS profile_groups (
    profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, group_id)
);
