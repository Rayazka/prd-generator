insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'alice@example.test', '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.test', '{"display_name":"Bob"}');

insert into public.projects (id, user_id, title, idea_raw, updated_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Alice project', repeat('a', 50), '2000-01-01'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Bob project', repeat('b', 50), '2000-01-01');

insert into public.qa_batches (id, project_id, questions) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '["Who?","Why?","What?","When?","Limits?"]'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '["Who?","Why?","What?","When?","Limits?"]');

insert into public.prd_parts (id, project_id, summary_plain) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Alice summary'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Bob summary');

insert into public.phases (id, project_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'MVP'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'MVP');

insert into public.features (id, phase_id, project_id, title, desc_plain, priority) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Alice feature', 'Explain Alice feature', 'P0'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Bob feature', 'Explain Bob feature', 'P0');

insert into public.exports (id, project_id, type, content_text) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'md', '# Alice PRD'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'md', '# Bob PRD');

insert into public.user_keys (user_id, provider, key_enc) values
  ('00000000-0000-0000-0000-000000000001', 'openai', 'fixture-ciphertext-alice'),
  ('00000000-0000-0000-0000-000000000002', 'openai', 'fixture-ciphertext-bob');
