-- Seed snapshot: public.staff
insert into public.staff (id, name, role, username, active, barber_id) values
  ('st_manager','Guapito Reyes','manager','manager',true,null),
  ('st_b1','Marco Cano','barber','marco',true,'b1'),
  ('st_b2','Rico Delgado','barber','rico',true,'b2'),
  ('st_b3','Tonio Reyes','barber','tonio',true,'b3'),
  ('st_b4','JP Salcedo','barber','jp',true,'b4')
on conflict (id) do nothing;
