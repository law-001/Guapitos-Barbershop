-- 0012_seed_reviews.sql — real reviews copied from Guapito's Google Maps listing.
-- Forward-only. Apply in the Supabase SQL Editor after 0011.
--
-- Replaces the placeholder sample row from 0011 with the 22 actual reviews.
-- Google only shows relative dates ("a year ago"), so review_date stays null and
-- relative_time holds that label. Ratings 1-5; body is '' for star-only reviews.

delete from public.reviews where id = 'sample1';

insert into public.reviews (id, author, rating, body, relative_time, source) values
  ('g1',  'Charlie Santiago', 5, 'The best service i ever had,especially the one guy make my hair,i forgot to ask his name but he have long hair 👍👍👍nice cut and perm 😍😍', 'a year ago', 'google'),
  ('g2',  'Gian Francisco', 4, 'Great service and very professional styling. A little expensive at P250 per haircut, but they throw in shaving, shampooing, and a little massage as well.', '6 years ago', 'google'),
  ('g3',  'Calvin Dalisay', 4, 'Service was great! Parking is terrible. Always look for Francis. He knows what he is doing. Pulido gumawa.', '3 years ago', 'google'),
  ('g4',  'rodolfo marcial', 5, 'napaka elegante at napaka linis...i highly recomend guapitos barbershop', '5 years ago', 'google'),
  ('g5',  'Louelle Bernardez', 5, 'Lupet dito☺️🤩', '5 years ago', 'google'),
  ('g6',  'John Vincent Hersalia (2E)', 5, 'Dabest', '3 years ago', 'google'),
  ('g7',  'Tony Conforti', 5, '', '3 years ago', 'google'),
  ('g8',  'Geline Allyson Tallara', 5, '', '2 months ago', 'google'),
  ('g9',  'Gemille Carreon / Toyota Marilao', 5, '', '11 months ago', 'google'),
  ('g10', 'Raul Jr Mendoza', 5, '', '2 years ago', 'google'),
  ('g11', 'Clarence Macapagal', 5, '', '3 years ago', 'google'),
  ('g12', 'EJ-Jalen Abanggan', 5, '', '3 years ago', 'google'),
  ('g13', 'Mendoza Raul Jr', 5, '', '3 years ago', 'google'),
  ('g14', 'Arjenn Enriquez', 5, '', '5 years ago', 'google'),
  ('g15', 'Jeramaine Torres', 5, '', '5 years ago', 'google'),
  ('g16', 'Adrian Aracelli Anderson', 5, '', '5 years ago', 'google'),
  ('g17', 'John Laya', 5, '', '5 years ago', 'google'),
  ('g18', 'Frederick Fabian', 5, '', '5 years ago', 'google'),
  ('g19', 'Jem Mariano', 5, '', '6 years ago', 'google'),
  ('g20', 'Pranc Michael Banluta', 5, '', '6 years ago', 'google'),
  ('g21', 'Richard King', 1, '', '3 years ago', 'google'),
  ('g22', 'Liberty Bernal', 4, '', '2 years ago', 'google')
on conflict (id) do nothing;
