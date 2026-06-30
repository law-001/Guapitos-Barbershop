-- Seed snapshot: public.staff
-- `email` is the staff sign-in address (Supabase email-OTP). Only active rows
-- with an email can log in to the staff console. Add emails for the barbers as
-- they need console access.
insert into public.staff (id, name, role, username, email, active, barber_id) values
  ('st_manager','Guapito Reyes','manager','manager','migoyporciuncula@gmail.com',true,null),
  ('st_b1','Marco Cano','barber','marco',null,true,'b1'),
  ('st_b2','Rico Delgado','barber','rico',null,true,'b2'),
  ('st_b3','Tonio Reyes','barber','tonio',null,true,'b3'),
  ('st_b4','JP Salcedo','barber','jp',null,true,'b4')
on conflict (id) do nothing;
