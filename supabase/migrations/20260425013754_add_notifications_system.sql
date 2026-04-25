/*
  # Add Notifications System

  ## Overview
  Creates a platform notification system for installers (partners) and admins.
  Notifications are triggered by key events (quote accepted, application submitted, etc.)
  and displayed in the dashboard.

  ## New Tables

  ### notifications
  - id: UUID primary key
  - recipient_type: 'installer' | 'admin'
  - recipient_id: UUID — for installers this equals installer_users.id (= auth.uid()); for admins it equals admin_users.id
  - type: event type string (e.g. 'quote_accepted', 'application_submitted')
  - title: Short display title
  - body: Longer description
  - quote_id: Optional FK to sent_quotes
  - read_at: NULL = unread
  - created_at: Creation timestamp

  ### notification_settings
  Per-user delivery preferences.
  - user_type: 'installer' | 'admin'
  - user_id: UUID of the user
  - email_notifications: boolean (default true)
  - platform_notifications: boolean (default true)
  - notify_quote_accepted, notify_application_submitted, notify_document_uploaded, notify_large_proposal: boolean toggles

  ## Security
  - RLS enabled on both tables
  - Installers: auth.uid() = recipient_id (installer_users.id IS the auth UUID)
  - Admins: managed via edge function using service role key (admin auth is custom/localStorage)
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL CHECK (recipient_type IN ('installer', 'admin')),
  recipient_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  quote_id uuid REFERENCES sent_quotes(id) ON DELETE SET NULL,
  read_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(recipient_id, read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Installers: installer_users.id = auth.uid(), so recipient_id = auth.uid()
CREATE POLICY "Installers can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    recipient_type = 'installer' AND recipient_id = auth.uid()
  );

CREATE POLICY "Installers can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (recipient_type = 'installer' AND recipient_id = auth.uid())
  WITH CHECK (recipient_type = 'installer' AND recipient_id = auth.uid());

-- notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type text NOT NULL CHECK (user_type IN ('installer', 'admin')),
  user_id uuid NOT NULL,
  email_notifications boolean NOT NULL DEFAULT true,
  platform_notifications boolean NOT NULL DEFAULT true,
  notify_quote_accepted boolean NOT NULL DEFAULT true,
  notify_application_submitted boolean NOT NULL DEFAULT true,
  notify_document_uploaded boolean NOT NULL DEFAULT true,
  notify_large_proposal boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_type, user_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Installers can read own notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (user_type = 'installer' AND user_id = auth.uid());

CREATE POLICY "Installers can insert own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_type = 'installer' AND user_id = auth.uid());

CREATE POLICY "Installers can update own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (user_type = 'installer' AND user_id = auth.uid())
  WITH CHECK (user_type = 'installer' AND user_id = auth.uid());
