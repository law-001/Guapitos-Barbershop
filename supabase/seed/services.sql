-- Seed snapshot: public.services
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
on conflict (id) do nothing;
