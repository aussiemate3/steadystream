/*
  # Add Invites System

  1. New Table
    - `invites`
      - `id` (uuid, primary key) - Unique identifier for the invite
      - `code` (text, unique) - The invite code string
      - `created_by` (uuid) - References the profile who created the invite
      - `max_uses` (integer) - Maximum number of times this code can be used (default 5)
      - `used_count` (integer) - Current number of times this code has been used (default 0)
      - `expires_at` (timestamptz) - Optional expiration timestamp
      - `active` (boolean) - Whether this invite is currently active (default true)
      - `created_at` (timestamptz) - When the invite was created

  2. Security
    - Enable RLS on `invites` table
    - Authenticated users can view all active invites
    - Users can create their own invites
    - Users can update their own invites
    - Users can view their own invites including inactive ones

  3. Notes
    - This table supports optional invite-only signup
    - Invite codes can be toggled on/off via the `active` flag
    - Can set usage limits and expiration dates per invite
*/

-- Create invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  max_uses integer DEFAULT 5,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invites

-- Anyone can view active, non-expired invites to validate codes during signup
CREATE POLICY "Active invites are viewable for validation"
  ON invites FOR SELECT
  TO authenticated
  USING (
    active = true 
    AND (expires_at IS NULL OR expires_at > now())
    AND used_count < max_uses
  );

-- Users can view all their own invites (including inactive/expired)
CREATE POLICY "Users can view their own invites"
  ON invites FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Users can create invites
CREATE POLICY "Users can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own invites
CREATE POLICY "Users can update their own invites"
  ON invites FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON invites(created_by);
