/*
  # Add User Invite Summary View

  1. New View
    - `user_invite_summary`
      - `created_by` (uuid) - User who created the invites
      - `total_invites` (bigint) - Total number of invites created by user
      - `available_invites` (bigint) - Number of invites still available for use

  2. Purpose
    - Makes it easier to count and display invite statistics per user
    - Used for showing invite metrics on profile pages
    - Helps track viral growth metrics

  3. Notes
    - Available invites are those that are active and haven't reached max uses
    - This is a helper view to simplify queries
*/

-- Create view for user invite summary
CREATE OR REPLACE VIEW user_invite_summary AS
SELECT
  created_by,
  count(*) as total_invites,
  sum(case when used_count < max_uses and active then 1 else 0 end) as available_invites
FROM invites
GROUP BY created_by;
