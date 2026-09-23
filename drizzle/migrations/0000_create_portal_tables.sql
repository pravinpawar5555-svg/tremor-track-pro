-- Engineers / team
CREATE TABLE public.engineers (
  id text PRIMARY KEY,
  name text NOT NULL,
  initials text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'analyst',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineers TO anon, authenticated;
GRANT ALL ON public.engineers TO service_role;
ALTER TABLE public.engineers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "engineers open" ON public.engineers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.plants (
  id text PRIMARY KEY,
  name text NOT NULL,
  customer text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  machines integer NOT NULL DEFAULT 0,
  assets integer NOT NULL DEFAULT 0,
  node6 integer NOT NULL DEFAULT 0,
  node_x integer NOT NULL DEFAULT 0,
  frequencies text[] NOT NULL DEFAULT '{}',
  contact text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  engineer_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO anon, authenticated;
GRANT ALL ON public.plants TO service_role;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plants open" ON public.plants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.daily_updates (
  id text PRIMARY KEY,
  date date NOT NULL,
  engineer_id text NOT NULL DEFAULT '',
  plant_id text NOT NULL DEFAULT '',
  machines_checked integer NOT NULL DEFAULT 0,
  abnormal integer NOT NULL DEFAULT 0,
  repeat_high_risk integer NOT NULL DEFAULT 0,
  new_high_risk integer NOT NULL DEFAULT 0,
  remark text NOT NULL DEFAULT '',
  submitted_at text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_updates TO anon, authenticated;
GRANT ALL ON public.daily_updates TO service_role;
ALTER TABLE public.daily_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_updates open" ON public.daily_updates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.reports (
  id text PRIMARY KEY,
  doc_no text NOT NULL DEFAULT '',
  plant_id text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'weekly',
  period text NOT NULL DEFAULT '',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_date date,
  by_engineer_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports open" ON public.reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.tickets (
  id text PRIMARY KEY,
  ticket_no text NOT NULL DEFAULT '',
  plant_id text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  machine text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  observation text NOT NULL DEFAULT '',
  ask_for text NOT NULL DEFAULT 'both',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  raised_by text NOT NULL DEFAULT '',
  raised_on date NOT NULL,
  raised_at text NOT NULL DEFAULT '',
  assigned_to text NOT NULL DEFAULT '',
  response text,
  responded_on date,
  closed_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO anon, authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets open" ON public.tickets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.messages (
  id text PRIMARY KEY,
  thread text NOT NULL,
  author_id text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  date date NOT NULL,
  at text NOT NULL DEFAULT '',
  read_by text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages open" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------ seed
INSERT INTO public.engineers (id, name, initials, role) VALUES
  ('eng-1','R. Ahuja','RA','analyst'),
  ('eng-2','M. Desai','MD','analyst'),
  ('mgr-1','P. Pawar','PP','manager');

INSERT INTO public.plants (id, name, customer, location, machines, assets, node6, node_x, frequencies, contact, contact_phone, engineer_id) VALUES
  ('pl-1','Tata Steel — Kalinganagar CPP','Tata Steel','Jajpur, Odisha',42,48,26,12,'{weekly,monthly}','S. Mohanty','+91 98200 11223','eng-1'),
  ('pl-2','Reliance — Jamnagar Utilities','Reliance Industries','Jamnagar, Gujarat',36,40,22,9,'{weekly}','A. Trivedi','+91 99040 55117','eng-2'),
  ('pl-3','UltraTech — Awarpur Line 2','UltraTech Cement','Chandrapur, MH',28,31,18,6,'{monthly,on-demand}','R. Kulkarni','+91 98220 47761','eng-1'),
  ('pl-4','Hindalco — Renukoot Smelter','Hindalco','Sonbhadra, UP',24,27,14,5,'{monthly}','V. Singh','+91 94150 30982','eng-2'),
  ('pl-5','Grasim — Nagda Pulp','Grasim Industries','Nagda, MP',18,20,11,4,'{weekly}','D. Jain','+91 94250 66104','eng-1'),
  ('pl-6','Deepak Fertilisers — Taloja','Deepak Fertilisers','Taloja, MH',15,16,9,3,'{on-demand}','N. Shetty','+91 98330 27745','eng-2');

INSERT INTO public.daily_updates (id, date, engineer_id, plant_id, machines_checked, abnormal, repeat_high_risk, new_high_risk, remark, submitted_at) VALUES
  ('up-1','2026-09-22','eng-1','pl-1',14,2,1,1,'Boiler feed pump 2A observed rising, informed site.','09:10'),
  ('up-2','2026-09-22','eng-1','pl-5',8,0,0,0,'All within limits.','11:40'),
  ('up-3','2026-09-21','eng-1','pl-3',12,1,1,0,'Raw mill fan bearing under watch, steady this week.','09:25'),
  ('up-4','2026-09-21','eng-2','pl-2',16,1,0,1,'Cooling tower fan 4 above alert, to be re-checked.','09:05'),
  ('up-5','2026-09-20','eng-2','pl-4',10,0,0,0,'Normal. Two machines were not running.','09:35'),
  ('up-6','2026-09-20','eng-1','pl-1',13,1,1,0,'Observation continued on BFP 2A.','09:15'),
  ('up-7','2026-09-19','eng-2','pl-2',15,0,0,0,'Normal across compressors.','09:20'),
  ('up-8','2026-09-19','eng-1','pl-5',9,1,0,1,'Pulp pump 3 to be re-checked.','10:05'),
  ('up-9','2026-09-18','eng-2','pl-6',7,2,0,2,'On-demand study after site complaint — two high risk machines.','14:10'),
  ('up-10','2026-09-18','eng-1','pl-3',11,0,0,0,'Normal.','09:30');

INSERT INTO public.reports (id, doc_no, plant_id, type, period, due_date, status, sent_date, by_engineer_id) VALUES
  ('rp-1','FM-VM-2026-0101','pl-1','weekly','14–20 Sep 2026','2026-09-21','sent','2026-09-21','eng-1'),
  ('rp-2','FM-VM-2026-0102','pl-2','weekly','14–20 Sep 2026','2026-09-21','sent','2026-09-22','eng-2'),
  ('rp-3','FM-VM-2026-0103','pl-5','weekly','14–20 Sep 2026','2026-09-21','prepared',NULL,'eng-1'),
  ('rp-4','FM-VM-2026-0104','pl-1','weekly','07–13 Sep 2026','2026-09-14','sent','2026-09-14','eng-1'),
  ('rp-5','FM-VM-2026-0105','pl-2','weekly','07–13 Sep 2026','2026-09-14','sent','2026-09-16','eng-2'),
  ('rp-6','FM-VM-2026-0106','pl-5','weekly','07–13 Sep 2026','2026-09-14','sent','2026-09-14','eng-1'),
  ('rp-7','FM-VM-2026-0107','pl-3','monthly','August 2026','2026-09-05','sent','2026-09-07','eng-1'),
  ('rp-8','FM-VM-2026-0108','pl-4','monthly','August 2026','2026-09-05','sent','2026-09-05','eng-2'),
  ('rp-9','FM-VM-2026-0109','pl-6','on-demand','Fan study — 18 Sep','2026-09-20','pending',NULL,'eng-2'),
  ('rp-10','FM-VM-2026-0110','pl-1','weekly','21–27 Sep 2026','2026-09-28','pending',NULL,'eng-1'),
  ('rp-11','FM-VM-2026-0111','pl-2','weekly','21–27 Sep 2026','2026-09-28','pending',NULL,'eng-2'),
  ('rp-12','FM-VM-2026-0112','pl-5','weekly','21–27 Sep 2026','2026-09-28','pending',NULL,'eng-1'),
  ('rp-13','FM-VM-2026-0113','pl-3','monthly','September 2026','2026-10-04','pending',NULL,'eng-1'),
  ('rp-14','FM-VM-2026-0114','pl-4','monthly','September 2026','2026-10-04','pending',NULL,'eng-2');

INSERT INTO public.tickets (id, ticket_no, plant_id, area, machine, subject, observation, ask_for, priority, status, raised_by, raised_on, raised_at, assigned_to, response, responded_on) VALUES
  ('tk-1','FM-OBS-2026-001','pl-1','Boiler feed area','Boiler feed pump 2A','Rising vibration on NDE bearing','Overall velocity has risen over three weeks. Indication of possible bearing distress — requires verification. Site wants a view before the weekly report.','both','high','open','eng-1','2026-09-22','09:20','mgr-1',NULL,NULL),
  ('tk-2','FM-OBS-2026-002','pl-2','Cooling tower','CT fan 4','Above alert after gearbox oil change','Suspected looseness at fan hub. Need your recommendation on whether to advise the customer to stop the fan or continue under watch.','recommendation','medium','in-discussion','eng-2','2026-09-21','09:45','mgr-1',NULL,NULL),
  ('tk-3','FM-OBS-2026-003','pl-6','Ammonia compressor house','Compressor 1 — motor DE','On-demand study finding','Two machines abnormal in the on-demand study. Observation needed before the report goes to the customer.','observation','high','responded','eng-2','2026-09-18','15:05','mgr-1','Treat as indication of misalignment; ask site for shim records and re-measure after correction. Do not declare a fault in the report.','2026-09-19');

INSERT INTO public.messages (id, thread, author_id, text, date, at, read_by) VALUES
  ('ms-1','ticket:tk-1','eng-1','Trend and last reading attached in the weekly folder. Please advise wording for the customer.','2026-09-22','09:22','{eng-1}'),
  ('ms-2','ticket:tk-2','eng-2','Site is asking for a decision today.','2026-09-21','09:50','{eng-2}'),
  ('ms-3','ticket:tk-2','mgr-1','Keep it under watch for now, re-measure tomorrow morning and update me here.','2026-09-21','11:15','{mgr-1}'),
  ('ms-4','ticket:tk-3','mgr-1','Responded above. Share the draft before sending to the customer.','2026-09-19','10:05','{mgr-1}'),
  ('ms-5','plant:pl-1','eng-1','Weekly report for 14–20 Sep sent to Mr. Mohanty.','2026-09-21','17:30','{eng-1}'),
  ('ms-6','plant:pl-1','mgr-1','Noted. Keep BFP 2A wording as ''under observation''.','2026-09-21','18:02','{mgr-1}'),
  ('ms-7','plant:pl-2','eng-2','Customer visit planned next week, will cover CT fans.','2026-09-20','12:20','{eng-2}');
