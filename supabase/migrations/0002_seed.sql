-- 0002_seed.sql — seed reference data + demo bookings
-- Idempotent via ON CONFLICT. Booking dates are relative to CURRENT_DATE at
-- insert time, so a fresh seed looks "live" (today's schedule + recent history).
-- Re-run this migration any day to refresh the demo dates.

-- ---------- barbers ----------
insert into public.barbers (id, name, spec, initials, color) values
  ('b1','Marco Cano','Skin fades & tapers','MC','#D6C3A0'),
  ('b2','Rico Delgado','Classic cuts & hot-towel shaves','RD','#A8B59A'),
  ('b3','Tonio Reyes','Color, highlights & perms','TR','#9FB4C2'),
  ('b4','JP Salcedo','Beard sculpting & kids cuts','JP','#C89B72')
on conflict (id) do update set
  name=excluded.name, spec=excluded.spec, initials=excluded.initials, color=excluded.color;

-- ---------- services ----------
insert into public.services (id, cat, name, sub, price, dur) values
  ('hc','Cuts & Shave','Haircut','with shampoo',300,45),
  ('sig','Cuts & Shave','Guapito''s Signature','shampoo + face massage',350,60),
  ('shave','Cuts & Shave','Signature Shave','',300,30),
  ('wcut','Cuts & Shave','Women''s Cut','',400,60),
  ('deepcon','Treatments','Deep Conditioning','',900,45),
  ('dryscalp','Treatments','Dry Scalp Treatment','',950,45),
  ('antidan','Treatments','Anti Dandruff','',950,45),
  ('massage','Treatments','Massage','scalp / back / hand · 15 min',300,15),
  ('hcolO','Color','Hair Color — Ordinary','',750,90),
  ('hcolG','Color','Hair Color — Organic','',1050,90),
  ('bcolO','Color','Beard Color — Ordinary','',550,45),
  ('bcolG','Color','Beard Color — Organic','',850,45),
  ('pkgCS','Packages','Cut & Shave','',550,75),
  ('pkgDC','Packages','Cut & Treatment','Deep Conditioning',1200,90),
  ('pkgAD','Packages','Cut & Treatment','Anti Dandruff / Dry Scalp',1250,90),
  ('pkgCO','Packages','Cut & Color — Ordinary','',1100,120),
  ('pkgCOg','Packages','Cut & Color — Organic','',1400,120),
  ('perm','Packages','Perm','',2000,120),
  ('hlO','Packages','Highlights — Only','',1200,150),
  ('hlB','Packages','Highlights — w/ Base Color','',1900,150),
  ('bleach','Packages','Bleach / Fashion Color','',1800,150)
on conflict (id) do update set
  cat=excluded.cat, name=excluded.name, sub=excluded.sub, price=excluded.price, dur=excluded.dur;

-- ---------- bookings ----------
-- date = current_date + offset_days. mine=false unless noted.
insert into public.bookings
  (id, date, barber, start_min, dur, service, price, customer, status, mine, pay, notes, follow_up) values
  -- today's schedule
  ('seed0',  current_date + 0, 'b1', 600, 45, 'Haircut', 300, 'Diego Ramos', 'completed', false, 'shop', '', false),
  ('seed1',  current_date + 0, 'b1', 720, 75, 'Cut & Shave', 550, 'Paolo Cruz', 'confirmed', false, 'shop', '', false),
  ('seed2',  current_date + 0, 'b1', 900, 45, 'Haircut', 300, 'Migs Tan', 'confirmed', false, 'shop', '', false),
  ('seed3',  current_date + 0, 'b2', 630, 60, 'Guapito''s Signature', 350, 'Andro Lim', 'completed', false, 'shop', '', false),
  ('seed4',  current_date + 0, 'b2', 810, 90, 'Hair Color — Organic', 1050, 'Kiko Vera', 'confirmed', false, 'shop', '', false),
  ('seed5',  current_date + 0, 'b3', 660, 120, 'Perm', 2000, 'Bea Santos', 'confirmed', false, 'shop', '', false),
  ('seed6',  current_date + 0, 'b3', 900, 45, 'Beard Color — Ordinary', 550, 'Tom Aquino', 'no-show', false, 'shop', '', false),
  ('seed7',  current_date + 0, 'b4', 600, 30, 'Signature Shave', 300, 'Rafa Diaz', 'completed', false, 'shop', '', false),
  ('seed8',  current_date + 0, 'b4', 690, 45, 'Haircut', 300, 'Leo Mercado', 'confirmed', false, 'shop', '', false),
  ('seed9',  current_date + 0, 'b4', 840, 60, 'Women''s Cut', 400, 'Nina Cho', 'confirmed', false, 'shop', '', false),
  -- upcoming days
  ('seed10', current_date + 1, 'b1', 600, 45, 'Haircut', 300, 'Walk-in', 'confirmed', false, 'shop', '', false),
  ('seed11', current_date + 1, 'b2', 660, 90, 'Cut & Color — Ordinary', 1100, 'Erik Pena', 'confirmed', false, 'shop', '', false),
  ('seed12', current_date + 1, 'b3', 720, 150, 'Highlights — Only', 1200, 'Sam Ong', 'confirmed', false, 'shop', '', false),
  ('seed13', current_date + 1, 'b4', 780, 75, 'Cut & Shave', 550, 'Jepoy Reyes', 'confirmed', false, 'shop', '', false),
  ('seed14', current_date + 2, 'b2', 630, 45, 'Haircut', 300, 'Carlo Yu', 'confirmed', false, 'shop', '', false),
  ('seed15', current_date + 2, 'b3', 900, 120, 'Cut & Color — Organic', 1400, 'Vince Lao', 'confirmed', false, 'shop', '', false),
  -- history
  ('hist0',  current_date - 2,  'b1', 600, 45, 'Haircut', 300, 'Migs Tan', 'completed', false, 'online', '', false),
  ('hist1',  current_date - 2,  'b3', 900, 90, 'Hair Color — Organic', 1050, 'Kiko Vera', 'completed', false, 'shop', '', false),
  ('hist2',  current_date - 3,  'b2', 720, 75, 'Cut & Shave', 550, 'Paolo Cruz', 'completed', false, 'shop', '', false),
  ('hist3',  current_date - 3,  'b4', 780, 60, 'Women''s Cut', 400, 'Nina Cho', 'no-show', false, 'online', '', false),
  ('hist4',  current_date - 5,  'b1', 660, 45, 'Haircut', 300, 'Leo Mercado', 'completed', false, 'shop', '', false),
  ('hist5',  current_date - 6,  'b3', 600, 120, 'Perm', 2000, 'Bea Santos', 'completed', false, 'shop', '', false),
  ('hist6',  current_date - 7,  'b2', 840, 30, 'Signature Shave', 300, 'Rafa Diaz', 'completed', false, 'online', '', false),
  ('hist7',  current_date - 9,  'b1', 600, 45, 'Haircut', 300, 'Diego Ramos', 'completed', false, 'shop', '', false),
  ('hist8',  current_date - 10, 'b4', 690, 45, 'Beard Color — Ordinary', 550, 'Tom Aquino', 'completed', false, 'shop', '', false),
  ('hist9',  current_date - 12, 'b2', 720, 120, 'Cut & Color — Ordinary', 1100, 'Erik Pena', 'completed', false, 'online', '', false),
  ('hist10', current_date - 14, 'b3', 840, 150, 'Highlights — Only', 1200, 'Sam Ong', 'completed', false, 'shop', '', false),
  ('hist11', current_date - 15, 'b1', 660, 75, 'Cut & Shave', 550, 'Jepoy Reyes', 'completed', false, 'shop', '', false),
  ('hist12', current_date - 18, 'b2', 630, 45, 'Haircut', 300, 'Carlo Yu', 'completed', false, 'online', '', false),
  ('hist13', current_date - 20, 'b1', 600, 45, 'Haircut', 300, 'Migs Tan', 'completed', false, 'shop', '', false),
  ('hist14', current_date - 22, 'b3', 810, 90, 'Hair Color — Organic', 1050, 'Kiko Vera', 'completed', false, 'shop', '', false),
  ('hist15', current_date - 25, 'b2', 720, 75, 'Cut & Shave', 550, 'Paolo Cruz', 'cancelled', false, 'online', '', false),
  ('hist16', current_date - 28, 'b1', 660, 60, 'Guapito''s Signature', 350, 'Andro Lim', 'completed', false, 'shop', '', false),
  -- the demo user's own bookings
  ('mine1',    current_date + 3, 'b1', 660, 45, 'Haircut', 300, 'You', 'confirmed', true, 'online', 'Mid skin fade, scissor on top', false),
  ('minepast', current_date - 7, 'b2', 720, 75, 'Cut & Shave', 550, 'You', 'completed', true, 'shop', '', false)
on conflict (id) do nothing;
