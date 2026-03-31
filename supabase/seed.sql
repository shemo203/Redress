begin;

do $$
declare
  auth_user_count integer;
begin
  select count(*) into auth_user_count from auth.users;

  if auth_user_count = 0 then
    raise notice 'No auth.users rows found. Create at least one dev user first, then re-run supabase/seed.sql.';
  elsif auth_user_count < 10 then
    raise notice 'Only % auth.users rows found. Seed data will use the available users and create fewer than 10 profiles.', auth_user_count;
  else
    raise notice 'Using the first 10 auth.users rows for deterministic dev seed content.';
  end if;
end $$;

with seed_users as (
  select
    id,
    row_number() over (order by id) as slot
  from auth.users
  order by id
  limit 10
),
profile_seed(slot, username, avatar_url, bio) as (
  values
    (1, 'seed_alex01', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80', 'Neutral tailoring, clean layers, city fits.'),
    (2, 'seed_maya02', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=512&q=80', 'Soft tones, vintage denim, and everyday styling ideas.'),
    (3, 'seed_omar03', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&q=80', 'Techwear details, archival sneakers, muted palettes.'),
    (4, 'seed_lina04', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=512&q=80', 'Minimal silhouettes and sharp accessories.'),
    (5, 'seed_nico05', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=512&q=80', 'Layer-heavy fall looks and relaxed menswear.'),
    (6, 'seed_sara06', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=512&q=80', 'Streetwear rotation, statement outerwear, easy color pops.'),
    (7, 'seed_junaid07', 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=512&q=80', 'Daily campus fits with affordable pieces.'),
    (8, 'seed_zoe08', 'https://images.unsplash.com/photo-1491349174775-aaafddd81942?auto=format&fit=crop&w=512&q=80', 'Structured basics, monochrome looks, polished edges.'),
    (9, 'seed_isaac09', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=512&q=80', 'Sneaker-first outfits with clean basics.'),
    (10, 'seed_nora10', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=512&q=80', 'Warm neutrals, oversized coats, weekend styling.')
)
insert into public.profiles as p (
  id,
  username,
  avatar_url,
  bio,
  created_at,
  updated_at
)
select
  su.id,
  ps.username,
  ps.avatar_url,
  ps.bio,
  '2026-03-01 09:00:00+00'::timestamptz + make_interval(days => ps.slot - 1),
  now()
from seed_users su
join profile_seed ps on ps.slot = su.slot
on conflict (id) do update
set
  username = excluded.username,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  updated_at = now();

delete from public.clothing_tags
where id in (
  '22222222-2222-4222-8222-222222222001',
  '22222222-2222-4222-8222-222222222002',
  '22222222-2222-4222-8222-222222222003',
  '22222222-2222-4222-8222-222222222004',
  '22222222-2222-4222-8222-222222222005',
  '22222222-2222-4222-8222-222222222006',
  '22222222-2222-4222-8222-222222222007',
  '22222222-2222-4222-8222-222222222008',
  '22222222-2222-4222-8222-222222222009',
  '22222222-2222-4222-8222-222222222010',
  '22222222-2222-4222-8222-222222222011',
  '22222222-2222-4222-8222-222222222012',
  '22222222-2222-4222-8222-222222222013',
  '22222222-2222-4222-8222-222222222014',
  '22222222-2222-4222-8222-222222222015',
  '22222222-2222-4222-8222-222222222016',
  '22222222-2222-4222-8222-222222222017',
  '22222222-2222-4222-8222-222222222018',
  '22222222-2222-4222-8222-222222222019',
  '22222222-2222-4222-8222-222222222020',
  '22222222-2222-4222-8222-222222222021',
  '22222222-2222-4222-8222-222222222022',
  '22222222-2222-4222-8222-222222222023',
  '22222222-2222-4222-8222-222222222024',
  '22222222-2222-4222-8222-222222222025',
  '22222222-2222-4222-8222-222222222026',
  '22222222-2222-4222-8222-222222222027',
  '22222222-2222-4222-8222-222222222028',
  '22222222-2222-4222-8222-222222222029',
  '22222222-2222-4222-8222-222222222030',
  '22222222-2222-4222-8222-222222222031',
  '22222222-2222-4222-8222-222222222032',
  '22222222-2222-4222-8222-222222222033',
  '22222222-2222-4222-8222-222222222034',
  '22222222-2222-4222-8222-222222222035',
  '22222222-2222-4222-8222-222222222036',
  '22222222-2222-4222-8222-222222222037',
  '22222222-2222-4222-8222-222222222038',
  '22222222-2222-4222-8222-222222222039',
  '22222222-2222-4222-8222-222222222040',
  '22222222-2222-4222-8222-222222222041',
  '22222222-2222-4222-8222-222222222042',
  '22222222-2222-4222-8222-222222222043',
  '22222222-2222-4222-8222-222222222044',
  '22222222-2222-4222-8222-222222222045',
  '22222222-2222-4222-8222-222222222046',
  '22222222-2222-4222-8222-222222222047',
  '22222222-2222-4222-8222-222222222048',
  '22222222-2222-4222-8222-222222222049',
  '22222222-2222-4222-8222-222222222050'
);

delete from public.video_posts
where id in (
  '11111111-1111-4111-8111-111111111001',
  '11111111-1111-4111-8111-111111111002',
  '11111111-1111-4111-8111-111111111003',
  '11111111-1111-4111-8111-111111111004',
  '11111111-1111-4111-8111-111111111005',
  '11111111-1111-4111-8111-111111111006',
  '11111111-1111-4111-8111-111111111007',
  '11111111-1111-4111-8111-111111111008',
  '11111111-1111-4111-8111-111111111009',
  '11111111-1111-4111-8111-111111111010',
  '11111111-1111-4111-8111-111111111011',
  '11111111-1111-4111-8111-111111111012',
  '11111111-1111-4111-8111-111111111013',
  '11111111-1111-4111-8111-111111111014',
  '11111111-1111-4111-8111-111111111015',
  '11111111-1111-4111-8111-111111111016',
  '11111111-1111-4111-8111-111111111017',
  '11111111-1111-4111-8111-111111111018',
  '11111111-1111-4111-8111-111111111019',
  '11111111-1111-4111-8111-111111111020'
);

with seed_users as (
  select
    id,
    row_number() over (order by id) as slot
  from auth.users
  order by id
  limit 10
),
post_seed(post_id, creator_slot, caption, video_url, published_at, created_at) as (
  values
    ('11111111-1111-4111-8111-111111111001'::uuid, 1, 'Cream overshirt, dark denim, and a simple white tee for an easy city fit.', 'https://cdn.coverr.co/videos/coverr-walking-through-the-city-1560644837543?download=1080p', '2026-03-05 09:10:00+00'::timestamptz, '2026-03-05 08:55:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111002'::uuid, 2, 'Soft beige trench with light-wash jeans and clean leather sneakers.', 'https://cdn.coverr.co/videos/coverr-model-in-the-city-1572522231596?download=1080p', '2026-03-05 14:30:00+00'::timestamptz, '2026-03-05 14:05:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111003'::uuid, 3, 'Muted tech pants, boxy tee, and a crossbody for a low-key campus run.', 'https://cdn.coverr.co/videos/coverr-man-in-the-street-1564384135271?download=1080p', '2026-03-06 11:05:00+00'::timestamptz, '2026-03-06 10:40:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111004'::uuid, 4, 'Structured black blazer over a ribbed tank and tailored trousers.', 'https://cdn.coverr.co/videos/coverr-woman-walking-in-the-city-1563366856041?download=1080p', '2026-03-06 18:20:00+00'::timestamptz, '2026-03-06 18:02:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111005'::uuid, 5, 'Olive field jacket with relaxed cargos and a cream hoodie underneath.', 'https://cdn.coverr.co/videos/coverr-young-man-in-the-city-1581939986247?download=1080p', '2026-03-07 08:45:00+00'::timestamptz, '2026-03-07 08:20:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111006'::uuid, 6, 'Oversized bomber, mini skirt, and tall boots with a red lip.', 'https://cdn.coverr.co/videos/coverr-fashionable-woman-walking-1580049246471?download=1080p', '2026-03-07 16:12:00+00'::timestamptz, '2026-03-07 15:49:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111007'::uuid, 7, 'Grey knit, navy pleated trousers, and retro runners for class.', 'https://cdn.coverr.co/videos/coverr-young-man-walking-1608057758266?download=1080p', '2026-03-08 10:25:00+00'::timestamptz, '2026-03-08 09:58:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111008'::uuid, 8, 'Monochrome espresso set with a cropped coat and slim loafers.', 'https://cdn.coverr.co/videos/coverr-city-fashion-1564384294828?download=1080p', '2026-03-08 19:00:00+00'::timestamptz, '2026-03-08 18:36:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111009'::uuid, 9, 'Straight-leg denim, varsity jacket, and white sneakers done clean.', 'https://cdn.coverr.co/videos/coverr-man-standing-by-a-wall-1564384183225?download=1080p', '2026-03-09 12:45:00+00'::timestamptz, '2026-03-09 12:15:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111010'::uuid, 10, 'Long wool coat, cream scarf, and soft suede boots for a cold day.', 'https://cdn.coverr.co/videos/coverr-woman-in-a-coat-1564384198989?download=1080p', '2026-03-09 17:40:00+00'::timestamptz, '2026-03-09 17:11:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111011'::uuid, 1, 'Weekend coffee run fit with a relaxed cardigan and dark loafers.', 'https://cdn.coverr.co/videos/coverr-walking-and-smiling-1564609163755?download=1080p', '2026-03-10 09:35:00+00'::timestamptz, '2026-03-10 09:04:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111012'::uuid, 2, 'Denim-on-denim balanced with a white tank and silver hoops.', 'https://cdn.coverr.co/videos/coverr-woman-in-denim-1572284814200?download=1080p', '2026-03-10 15:55:00+00'::timestamptz, '2026-03-10 15:28:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111013'::uuid, 3, 'Black nylon shell, carpenter pants, and trail sneakers after rain.', 'https://cdn.coverr.co/videos/coverr-guy-walking-on-the-street-1601901486655?download=1080p', '2026-03-11 11:15:00+00'::timestamptz, '2026-03-11 10:43:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111014'::uuid, 4, 'Sharp grey set with pointed flats and a tiny shoulder bag.', 'https://cdn.coverr.co/videos/coverr-woman-in-business-district-1563366859176?download=1080p', '2026-03-11 18:05:00+00'::timestamptz, '2026-03-11 17:34:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111015'::uuid, 5, 'Relaxed hoodie, straight cargos, and a canvas tote for errands.', 'https://cdn.coverr.co/videos/coverr-young-man-smiling-1577449511964?download=1080p', '2026-03-12 08:55:00+00'::timestamptz, '2026-03-12 08:32:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111016'::uuid, 6, 'Leather jacket with a slip dress and stacked jewelry for dinner.', 'https://cdn.coverr.co/videos/coverr-woman-on-the-go-1580049252963?download=1080p', '2026-03-12 20:10:00+00'::timestamptz, '2026-03-12 19:42:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111017'::uuid, 7, 'Zip fleece, washed jeans, and club c sneakers between lectures.', 'https://cdn.coverr.co/videos/coverr-young-man-on-campus-1608057759524?download=1080p', '2026-03-13 10:40:00+00'::timestamptz, '2026-03-13 10:08:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111018'::uuid, 8, 'Black turtleneck, wide trousers, and a glossy espresso coat.', 'https://cdn.coverr.co/videos/coverr-woman-in-town-1564384188557?download=1080p', '2026-03-13 18:35:00+00'::timestamptz, '2026-03-13 18:02:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111019'::uuid, 9, 'White oxford, loose denim, and suede lows with a knit vest.', 'https://cdn.coverr.co/videos/coverr-young-man-posing-1564609169471?download=1080p', '2026-03-14 13:10:00+00'::timestamptz, '2026-03-14 12:41:00+00'::timestamptz),
    ('11111111-1111-4111-8111-111111111020'::uuid, 10, 'Taupe knit set, oversized coat, and square-toe boots on repeat.', 'https://cdn.coverr.co/videos/coverr-woman-in-neutral-tones-1564384195751?download=1080p', '2026-03-14 17:52:00+00'::timestamptz, '2026-03-14 17:24:00+00'::timestamptz)
)
insert into public.video_posts (
  id,
  creator_id,
  caption,
  video_url,
  status,
  published_at,
  created_at,
  updated_at
)
select
  ps.post_id,
  su.id,
  ps.caption,
  ps.video_url,
  'published',
  ps.published_at,
  ps.created_at,
  now()
from post_seed ps
join seed_users su on su.slot = ps.creator_slot;

with seed_users as (
  select
    id,
    row_number() over (order by id) as slot
  from auth.users
  order by id
  limit 10
),
post_seed(post_id, creator_slot) as (
  values
    ('11111111-1111-4111-8111-111111111001'::uuid, 1),
    ('11111111-1111-4111-8111-111111111002'::uuid, 2),
    ('11111111-1111-4111-8111-111111111003'::uuid, 3),
    ('11111111-1111-4111-8111-111111111004'::uuid, 4),
    ('11111111-1111-4111-8111-111111111005'::uuid, 5),
    ('11111111-1111-4111-8111-111111111006'::uuid, 6),
    ('11111111-1111-4111-8111-111111111007'::uuid, 7),
    ('11111111-1111-4111-8111-111111111008'::uuid, 8),
    ('11111111-1111-4111-8111-111111111009'::uuid, 9),
    ('11111111-1111-4111-8111-111111111010'::uuid, 10),
    ('11111111-1111-4111-8111-111111111011'::uuid, 1),
    ('11111111-1111-4111-8111-111111111012'::uuid, 2),
    ('11111111-1111-4111-8111-111111111013'::uuid, 3),
    ('11111111-1111-4111-8111-111111111014'::uuid, 4),
    ('11111111-1111-4111-8111-111111111015'::uuid, 5),
    ('11111111-1111-4111-8111-111111111016'::uuid, 6),
    ('11111111-1111-4111-8111-111111111017'::uuid, 7),
    ('11111111-1111-4111-8111-111111111018'::uuid, 8),
    ('11111111-1111-4111-8111-111111111019'::uuid, 9),
    ('11111111-1111-4111-8111-111111111020'::uuid, 10)
),
seeded_posts as (
  select
    ps.post_id,
    su.id as creator_id
  from post_seed ps
  join seed_users su on su.slot = ps.creator_slot
),
tag_seed(tag_id, post_id, name, brand, category, url) as (
  values
    ('22222222-2222-4222-8222-222222222001'::uuid, '11111111-1111-4111-8111-111111111001'::uuid, 'Overshirt', 'COS', 'outerwear', 'https://www.cos.com/en_usd/men/menswear/shirts/product.relaxed-fit-overshirt-beige.0000000001.html'),
    ('22222222-2222-4222-8222-222222222002'::uuid, '11111111-1111-4111-8111-111111111001'::uuid, 'White tee', 'Uniqlo', 'tops', 'https://www.uniqlo.com/us/en/products/E000000-000/00'),
    ('22222222-2222-4222-8222-222222222003'::uuid, '11111111-1111-4111-8111-111111111001'::uuid, 'Straight denim', 'Levis', 'bottoms', 'https://www.levi.com/US/en_US/clothing/men/jeans/501-original-fit/p/005010114'),
    ('22222222-2222-4222-8222-222222222004'::uuid, '11111111-1111-4111-8111-111111111002'::uuid, 'Trench coat', 'Arket', 'outerwear', 'https://www.arket.com/en/women/jackets-coats/product.trench-coat-beige.0000000002.html'),
    ('22222222-2222-4222-8222-222222222005'::uuid, '11111111-1111-4111-8111-111111111002'::uuid, 'Light denim', 'AGOLDE', 'bottoms', 'https://www.agolde.com/products/90s-mid-rise-loose-fit-lightwash'),
    ('22222222-2222-4222-8222-222222222006'::uuid, '11111111-1111-4111-8111-111111111003'::uuid, 'Boxy tee', 'Weekday', 'tops', 'https://www.weekday.com/en/men/t-shirts/product.boxy-tee-black.0000000003.html'),
    ('22222222-2222-4222-8222-222222222007'::uuid, '11111111-1111-4111-8111-111111111003'::uuid, 'Tech pants', 'Nike ACG', 'bottoms', 'https://www.nike.com/t/acg-smith-summit-cargo-pants-000000003'),
    ('22222222-2222-4222-8222-222222222008'::uuid, '11111111-1111-4111-8111-111111111003'::uuid, 'Crossbody bag', 'Uniqlo', 'accessories', 'https://www.uniqlo.com/us/en/products/E461053-000/00'),
    ('22222222-2222-4222-8222-222222222009'::uuid, '11111111-1111-4111-8111-111111111004'::uuid, 'Tailored blazer', 'Massimo Dutti', 'outerwear', 'https://www.massimodutti.com/us/women/blazers/tailored-blazer-black-p000000004.html'),
    ('22222222-2222-4222-8222-222222222010'::uuid, '11111111-1111-4111-8111-111111111004'::uuid, 'Rib tank', 'Zara', 'tops', 'https://www.zara.com/us/en/ribbed-tank-top-p000000010.html'),
    ('22222222-2222-4222-8222-222222222011'::uuid, '11111111-1111-4111-8111-111111111004'::uuid, 'Pleated trousers', 'COS', 'bottoms', 'https://www.cos.com/en_usd/women/womenswear/trousers/product.pleated-wide-leg-trousers-black.0000000011.html'),
    ('22222222-2222-4222-8222-222222222012'::uuid, '11111111-1111-4111-8111-111111111005'::uuid, 'Field jacket', 'Barbour', 'outerwear', 'https://www.barbour.com/us/classic-field-jacket-000000012'),
    ('22222222-2222-4222-8222-222222222013'::uuid, '11111111-1111-4111-8111-111111111005'::uuid, 'Cream hoodie', 'Pangaia', 'tops', 'https://www.pangaia.com/products/365-midweight-hoodie-cream'),
    ('22222222-2222-4222-8222-222222222014'::uuid, '11111111-1111-4111-8111-111111111006'::uuid, 'Bomber jacket', 'Alpha Industries', 'outerwear', 'https://www.alphaindustries.com/products/ma-1-bomber-jacket-000000014'),
    ('22222222-2222-4222-8222-222222222015'::uuid, '11111111-1111-4111-8111-111111111006'::uuid, 'Mini skirt', 'Mango', 'bottoms', 'https://shop.mango.com/us/en/p/women/skirts/mini-skirt-black_000000015'),
    ('22222222-2222-4222-8222-222222222016'::uuid, '11111111-1111-4111-8111-111111111006'::uuid, 'Tall boots', 'Aeyde', 'shoes', 'https://www.aeyde.com/products/knee-high-boot-black-000000016'),
    ('22222222-2222-4222-8222-222222222017'::uuid, '11111111-1111-4111-8111-111111111007'::uuid, 'Grey knit', 'Everlane', 'tops', 'https://www.everlane.com/products/mens-cashmere-crew-grey-heather'),
    ('22222222-2222-4222-8222-222222222018'::uuid, '11111111-1111-4111-8111-111111111007'::uuid, 'Pleated trousers', 'Uniqlo', 'bottoms', 'https://www.uniqlo.com/us/en/products/E455493-000/00'),
    ('22222222-2222-4222-8222-222222222019'::uuid, '11111111-1111-4111-8111-111111111007'::uuid, 'Retro runners', 'Adidas', 'shoes', 'https://www.adidas.com/us/samba-og-shoes/B75806.html'),
    ('22222222-2222-4222-8222-222222222020'::uuid, '11111111-1111-4111-8111-111111111008'::uuid, 'Cropped coat', 'The Frankie Shop', 'outerwear', 'https://thefrankieshop.com/products/cropped-coat-espresso'),
    ('22222222-2222-4222-8222-222222222021'::uuid, '11111111-1111-4111-8111-111111111008'::uuid, 'Loafers', 'GH Bass', 'shoes', 'https://www.ghbass.com/products/whitney-loafer-brown-000000021'),
    ('22222222-2222-4222-8222-222222222022'::uuid, '11111111-1111-4111-8111-111111111009'::uuid, 'Varsity jacket', 'Aime Leon Dore', 'outerwear', 'https://www.aimeleondore.com/products/varsity-jacket-000000022'),
    ('22222222-2222-4222-8222-222222222023'::uuid, '11111111-1111-4111-8111-111111111009'::uuid, 'Straight denim', 'Levis', 'bottoms', 'https://www.levi.com/US/en_US/clothing/men/jeans/568-loose-straight/p/290370001'),
    ('22222222-2222-4222-8222-222222222024'::uuid, '11111111-1111-4111-8111-111111111010'::uuid, 'Wool coat', 'Toteme', 'outerwear', 'https://toteme.com/products/double-face-coat-taupe-000000024'),
    ('22222222-2222-4222-8222-222222222025'::uuid, '11111111-1111-4111-8111-111111111010'::uuid, 'Suede boots', 'Dear Frances', 'shoes', 'https://dearfrances.com/products/suede-boot-taupe-000000025'),
    ('22222222-2222-4222-8222-222222222026'::uuid, '11111111-1111-4111-8111-111111111011'::uuid, 'Cardigan', 'Muji', 'tops', 'https://www.muji.us/products/cotton-cardigan-navy-000000026'),
    ('22222222-2222-4222-8222-222222222027'::uuid, '11111111-1111-4111-8111-111111111011'::uuid, 'Loafers', 'Sebago', 'shoes', 'https://www.sebago-usa.com/products/classic-dan-loafer-brown-000000027'),
    ('22222222-2222-4222-8222-222222222028'::uuid, '11111111-1111-4111-8111-111111111012'::uuid, 'Denim jacket', 'Madewell', 'outerwear', 'https://www.madewell.com/the-jean-jacket-medium-wash-000000028.html'),
    ('22222222-2222-4222-8222-222222222029'::uuid, '11111111-1111-4111-8111-111111111012'::uuid, 'White tank', 'Skims', 'tops', 'https://skims.com/products/cotton-rib-tank-white-000000029'),
    ('22222222-2222-4222-8222-222222222030'::uuid, '11111111-1111-4111-8111-111111111012'::uuid, 'Hoop earrings', 'Mejuri', 'accessories', 'https://mejuri.com/products/large-hoops-gold-000000030'),
    ('22222222-2222-4222-8222-222222222031'::uuid, '11111111-1111-4111-8111-111111111013'::uuid, 'Nylon shell', 'Arc''teryx', 'outerwear', 'https://arcteryx.com/us/en/shop/mens/beta-jacket-black'),
    ('22222222-2222-4222-8222-222222222032'::uuid, '11111111-1111-4111-8111-111111111013'::uuid, 'Carpenter pants', 'Carhartt WIP', 'bottoms', 'https://us.carhartt-wip.com/products/double-knee-pant-black-000000032'),
    ('22222222-2222-4222-8222-222222222033'::uuid, '11111111-1111-4111-8111-111111111013'::uuid, 'Trail sneakers', 'Salomon', 'shoes', 'https://www.salomon.com/en-us/shop/product/xt-6-000000033.html'),
    ('22222222-2222-4222-8222-222222222034'::uuid, '11111111-1111-4111-8111-111111111014'::uuid, 'Grey blazer', 'COS', 'outerwear', 'https://www.cos.com/en_usd/women/womenswear/blazers/product.wool-blazer-grey.0000000034.html'),
    ('22222222-2222-4222-8222-222222222035'::uuid, '11111111-1111-4111-8111-111111111014'::uuid, 'Pointed flats', 'Aeyde', 'shoes', 'https://www.aeyde.com/products/pointed-flat-black-000000035'),
    ('22222222-2222-4222-8222-222222222036'::uuid, '11111111-1111-4111-8111-111111111015'::uuid, 'Relaxed hoodie', 'Entire Studios', 'tops', 'https://entirestudios.com/products/hoodie-washed-grey-000000036'),
    ('22222222-2222-4222-8222-222222222037'::uuid, '11111111-1111-4111-8111-111111111015'::uuid, 'Canvas tote', 'Baggu', 'accessories', 'https://www.baggu.com/products/standard-tote-natural-000000037'),
    ('22222222-2222-4222-8222-222222222038'::uuid, '11111111-1111-4111-8111-111111111016'::uuid, 'Leather jacket', 'AllSaints', 'outerwear', 'https://www.allsaints.com/us/women/leather-jackets/balfern-biker-jacket/WL115Y-5.html'),
    ('22222222-2222-4222-8222-222222222039'::uuid, '11111111-1111-4111-8111-111111111016'::uuid, 'Slip dress', 'Reformation', 'dresses', 'https://www.thereformation.com/products/frankie-silk-dress-black-000000039.html'),
    ('22222222-2222-4222-8222-222222222040'::uuid, '11111111-1111-4111-8111-111111111016'::uuid, 'Chain necklace', 'Mejuri', 'accessories', 'https://mejuri.com/products/paperclip-chain-gold-000000040'),
    ('22222222-2222-4222-8222-222222222041'::uuid, '11111111-1111-4111-8111-111111111017'::uuid, 'Zip fleece', 'Patagonia', 'outerwear', 'https://www.patagonia.com/product/synchilla-fleece-jacket-navy-000000041'),
    ('22222222-2222-4222-8222-222222222042'::uuid, '11111111-1111-4111-8111-111111111017'::uuid, 'Washed jeans', 'Abercrombie', 'bottoms', 'https://www.abercrombie.com/shop/us/p/baggy-jean-medium-wash-000000042'),
    ('22222222-2222-4222-8222-222222222043'::uuid, '11111111-1111-4111-8111-111111111017'::uuid, 'Club C sneakers', 'Reebok', 'shoes', 'https://www.reebok.com/us/club-c-85-shoes/AR0456.html'),
    ('22222222-2222-4222-8222-222222222044'::uuid, '11111111-1111-4111-8111-111111111018'::uuid, 'Black turtleneck', 'Theory', 'tops', 'https://www.theory.com/mens-turtleneck-black-000000044'),
    ('22222222-2222-4222-8222-222222222045'::uuid, '11111111-1111-4111-8111-111111111018'::uuid, 'Wide trousers', 'COS', 'bottoms', 'https://www.cos.com/en_usd/women/womenswear/trousers/product.wide-leg-trousers-brown.0000000045.html'),
    ('22222222-2222-4222-8222-222222222046'::uuid, '11111111-1111-4111-8111-111111111018'::uuid, 'Gloss coat', 'Toteme', 'outerwear', 'https://toteme.com/products/wool-coat-espresso-000000046'),
    ('22222222-2222-4222-8222-222222222047'::uuid, '11111111-1111-4111-8111-111111111019'::uuid, 'Oxford shirt', 'Polo Ralph Lauren', 'tops', 'https://www.ralphlauren.com/men-clothing-shirts/classic-fit-oxford-shirt/000000047.html'),
    ('22222222-2222-4222-8222-222222222048'::uuid, '11111111-1111-4111-8111-111111111019'::uuid, 'Knit vest', 'J.Crew', 'tops', 'https://www.jcrew.com/p/mens/categories/clothing/sweaters/vests/cotton-knit-vest/000000048'),
    ('22222222-2222-4222-8222-222222222049'::uuid, '11111111-1111-4111-8111-111111111020'::uuid, 'Taupe knit set', 'Nili Lotan', 'sets', 'https://www.nililotan.com/products/cashmere-knit-set-taupe-000000049'),
    ('22222222-2222-4222-8222-222222222050'::uuid, '11111111-1111-4111-8111-111111111020'::uuid, 'Square-toe boots', 'Vagabond', 'shoes', 'https://www.vagabond.com/us/boots-square-toe-taupe-000000050')
)
insert into public.clothing_tags (
  id,
  post_id,
  creator_id,
  name,
  category,
  brand,
  url,
  created_at,
  updated_at
)
select
  ts.tag_id,
  ts.post_id,
  sp.creator_id,
  ts.name,
  ts.category,
  ts.brand,
  ts.url,
  now(),
  now()
from tag_seed ts
join seeded_posts sp on sp.post_id = ts.post_id;

commit;
