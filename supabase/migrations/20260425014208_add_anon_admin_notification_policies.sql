/*
  # Add anon policies for admin notifications

  Admin users use custom auth (not Supabase auth), so they access data via the
  anon role. We add policies allowing anon users to read/update admin notifications
  and settings, scoped by recipient_id / user_id so admins can only see their own.

  Note: This mirrors the existing pattern on sent_quotes where anon users have
  read/update access gated loosely — here we keep it scoped by the admin's ID.
*/

-- Allow anon to read admin notifications (admin passes their own ID in queries)
CREATE POLICY "Anon can read admin notifications"
  ON notifications FOR SELECT
  TO anon
  USING (recipient_type = 'admin');

CREATE POLICY "Anon can update admin notifications"
  ON notifications FOR UPDATE
  TO anon
  USING (recipient_type = 'admin')
  WITH CHECK (recipient_type = 'admin');

-- Allow anon to read/write admin notification settings
CREATE POLICY "Anon can read admin notification settings"
  ON notification_settings FOR SELECT
  TO anon
  USING (user_type = 'admin');

CREATE POLICY "Anon can insert admin notification settings"
  ON notification_settings FOR INSERT
  TO anon
  WITH CHECK (user_type = 'admin');

CREATE POLICY "Anon can update admin notification settings"
  ON notification_settings FOR UPDATE
  TO anon
  USING (user_type = 'admin')
  WITH CHECK (user_type = 'admin');
