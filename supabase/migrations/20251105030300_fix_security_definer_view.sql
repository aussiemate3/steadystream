/*
  # Fix Security Definer View

  1. Changes
    - Recreate user_invite_summary view without SECURITY DEFINER
    - Use SECURITY INVOKER instead (default and more secure)
    - This ensures the view runs with the permissions of the current user

  2. Security
    - SECURITY DEFINER can be dangerous if view accesses sensitive data
    - SECURITY INVOKER is safer and more transparent
    - RLS policies on invites table still apply

  3. Impact
    - Users will only see invite summaries for their own invites
    - Maintains same functionality with better security
*/

-- Drop and recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS user_invite_summary;

CREATE VIEW user_invite_summary
WITH (security_invoker = true) AS
SELECT
  created_by,
  count(*) as total_invites,
  sum(case when used_count < max_uses and active then 1 else 0 end) as available_invites
FROM invites
GROUP BY created_by;
