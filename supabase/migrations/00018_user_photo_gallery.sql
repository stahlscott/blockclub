-- Add photo gallery to user profiles
-- Allows users to upload multiple photos (pets, kids, gardens, etc.)

ALTER TABLE users ADD COLUMN photo_urls TEXT[] DEFAULT '{}';
