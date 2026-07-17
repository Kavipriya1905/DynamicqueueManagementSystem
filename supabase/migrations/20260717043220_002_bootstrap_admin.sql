/*
# Bootstrap admin account

Creates the default admin user via Supabase Auth using the
`auth.users` table directly (with proper password hash). This avoids
requiring the frontend to call signUp with admin role, which would be
insecure. The admin can then sign in with:

  username: admin
  password: admin123

The handle_new_user trigger creates the matching profiles row with
role = 'admin' because we set raw_app_meta_data role = 'admin'.

Re-running this migration is safe: if the admin user already exists we
skip creating it.
*/

DO $$
DECLARE
  admin_id uuid;
  existing uuid;
BEGIN
  SELECT id INTO existing FROM auth.users WHERE email = 'admin@q.local';
  IF existing IS NULL THEN
    -- Create the admin auth user with a bcrypt password hash.
    -- The hash below is for "admin123" (bcrypt, cost 10).
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change_token_current,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@q.local',
      crypt('admin123', gen_salt('bf', 10)),
      now(),
      '{"role":"admin","username":"admin","full_name":"System Administrator"}'::jsonb,
      '{"role":"admin","username":"admin","full_name":"System Administrator"}'::jsonb,
      now(),
      now(),
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;

    -- Also insert into auth.identities so Supabase Auth recognizes the provider.
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      admin_id,
      admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@q.local'),
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;
