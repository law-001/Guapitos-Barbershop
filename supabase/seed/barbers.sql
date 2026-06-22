-- Seed snapshot: public.barbers
insert into public.barbers (id, name, spec, initials, color) values
  ('b1','Marco Cano','Skin fades & tapers','MC','#D6C3A0'),
  ('b2','Rico Delgado','Classic cuts & hot-towel shaves','RD','#A8B59A'),
  ('b3','Tonio Reyes','Color, highlights & perms','TR','#9FB4C2'),
  ('b4','JP Salcedo','Beard sculpting & kids cuts','JP','#C89B72')
on conflict (id) do nothing;
