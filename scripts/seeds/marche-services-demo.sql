-- ============================================================================
-- DEMO SEED — /marche/services grid (feat/marche-services-figma-100)
-- Idempotent (ON CONFLICT DO NOTHING). SAFE TO WIPE before launch (see §WIPE).
-- Creates 9 demo freelancer accounts (auth.users → profile via handle_new_user
-- trigger) + 12 named services (120 TND each, staggered created_at so they land
-- on grid page 1 newest-first, in table order). NO passwords set → the demo
-- accounts cannot log in; they exist only to satisfy the freelancer FK chain.
-- Existing "sahbeni" data is untouched (its 9 services fill grid page 2).
-- ============================================================================
begin;

-- §1  9 demo freelancer auth users (no encrypted_password → non-loginable).
insert into auth.users
  (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
   is_sso_user, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000001','authenticated','authenticated','demo.yassine.benali@servyou.invalid',    '{"provider":"email","providers":["email"]}','{"full_name":"Yassine Ben Ali","date_of_birth":"1993-04-12","city":"Tunis","language":"fr"}',    false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000002','authenticated','authenticated','demo.sarra.mansouri@servyou.invalid',     '{"provider":"email","providers":["email"]}','{"full_name":"Sarra Mansouri","date_of_birth":"1995-08-03","city":"Ariana","language":"fr"}',     false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000003','authenticated','authenticated','demo.karim.trabelsi@servyou.invalid',     '{"provider":"email","providers":["email"]}','{"full_name":"Karim Trabelsi","date_of_birth":"1990-11-21","city":"Sousse","language":"fr"}',     false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000004','authenticated','authenticated','demo.amel.bensalem@servyou.invalid',      '{"provider":"email","providers":["email"]}','{"full_name":"Amel Ben Salem","date_of_birth":"1994-02-17","city":"Sfax","language":"fr"}',       false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000005','authenticated','authenticated','demo.mehdi.chaabane@servyou.invalid',     '{"provider":"email","providers":["email"]}','{"full_name":"Mehdi Chaabane","date_of_birth":"1992-06-09","city":"Ben Arous","language":"fr"}',  false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000006','authenticated','authenticated','demo.ines.ferchichi@servyou.invalid',     '{"provider":"email","providers":["email"]}','{"full_name":"Ines Ferchichi","date_of_birth":"1996-01-25","city":"Bizerte","language":"fr"}',    false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000007','authenticated','authenticated','demo.anis.bouazizi@servyou.invalid',      '{"provider":"email","providers":["email"]}','{"full_name":"Anis Bouazizi","date_of_birth":"1991-09-30","city":"Tunis","language":"fr"}',      false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000008','authenticated','authenticated','demo.rania.ghariani@servyou.invalid',     '{"provider":"email","providers":["email"]}','{"full_name":"Rania Ghariani","date_of_birth":"1989-12-05","city":"Manouba","language":"fr"}',    false,false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','de300001-0000-4000-a000-000000000009','authenticated','authenticated','demo.mohamedamine.bouzid@servyou.invalid','{"provider":"email","providers":["email"]}','{"full_name":"Mohamed Amine Bouzid","date_of_birth":"1988-03-14","city":"Sousse","language":"fr"}',false,false,now(),now())
on conflict (id) do nothing;

-- §2  mark them freelancers (service-role bypasses the age-gate/admin-lock triggers)
update public.profiles set seller_type = 'freelancer'
where id in (
  'de300001-0000-4000-a000-000000000001','de300001-0000-4000-a000-000000000002','de300001-0000-4000-a000-000000000003',
  'de300001-0000-4000-a000-000000000004','de300001-0000-4000-a000-000000000005','de300001-0000-4000-a000-000000000006',
  'de300001-0000-4000-a000-000000000007','de300001-0000-4000-a000-000000000008','de300001-0000-4000-a000-000000000009'
) and seller_type is distinct from 'freelancer';

-- §3  freelancer_profiles (city lives here — powers the Ville filter; unique on profile_id)
insert into public.freelancer_profiles (profile_id, headline, city, years_experience, languages)
values
  ('de300001-0000-4000-a000-000000000001','Développeur web WordPress','Tunis',6,'Français, Arabe, Anglais'),
  ('de300001-0000-4000-a000-000000000002','Designer graphique & branding','Ariana',5,'Français, Arabe'),
  ('de300001-0000-4000-a000-000000000003','Designer produit UI/UX','Sousse',7,'Français, Arabe, Anglais'),
  ('de300001-0000-4000-a000-000000000004','Spécialiste Google Ads','Sfax',4,'Français, Arabe'),
  ('de300001-0000-4000-a000-000000000005','Community manager','Ben Arous',5,'Français, Arabe'),
  ('de300001-0000-4000-a000-000000000006','Rédactrice SEO','Bizerte',6,'Français, Arabe'),
  ('de300001-0000-4000-a000-000000000007','Monteur vidéo & motion','Tunis',8,'Français, Arabe'),
  ('de300001-0000-4000-a000-000000000008','Consultante business','Manouba',9,'Français, Arabe, Anglais'),
  ('de300001-0000-4000-a000-000000000009','Comédien voix off FR/AR','Sousse',10,'Français, Arabe')
on conflict (profile_id) do nothing;

-- §4  the 12 named services — 120 TND, active, staggered created_at (row 1 = newest → grid
--     page-1 top-left; owner resolved by profile_id → freelancer_profiles.id).
insert into public.service_listings
  (id, freelancer_profile_id, category_id, title, description, starting_price_tnd,
   delivery_time, status, tags, created_at)
select
  v.id::uuid, fp.id, v.category_id::uuid, v.title, v.description, 120,
  v.delivery_time, 'active', v.tags, now() - (v.ord || ' minutes')::interval
from (values
  ('de5e0001-0000-4000-a000-000000000001',0, 'de300001-0000-4000-a000-000000000001','31266016-7fce-4998-a202-521bdb58a939','Site vitrine WordPress clé en main','Sites vitrines rapides, responsive et optimisés SEO.','5 jours', array['WordPress','Responsive','SEO']),
  ('de5e0001-0000-4000-a000-000000000002',1, 'de300001-0000-4000-a000-000000000002','05c0c95f-d843-41ea-9394-8c360e7cd270','Logo & identité visuelle premium','Logos mémorables et chartes graphiques complètes.','3 jours', array['Logo','Branding','Charte']),
  ('de5e0001-0000-4000-a000-000000000003',2, 'de300001-0000-4000-a000-000000000003','05c0c95f-d843-41ea-9394-8c360e7cd270','Maquette d''application mobile','UI/UX claire et prototypes interactifs sous Figma.','7 jours', array['Figma','Prototype','UI/UX']),
  ('de5e0001-0000-4000-a000-000000000004',3, 'de300001-0000-4000-a000-000000000004','c63a1386-ca01-42cf-8b46-1dda2c8c7e92','Campagne Google Ads optimisée','Search, Shopping et YouTube gérés pour votre ROI.','4 jours', array['Google Ads','SEO','GA4']),
  ('de5e0001-0000-4000-a000-000000000005',4, 'de300001-0000-4000-a000-000000000005','c63a1386-ca01-42cf-8b46-1dda2c8c7e92','Gestion Instagram & TikTok','Contenu, calendrier éditorial et modération quotidienne.','7 jours', array['Instagram','TikTok','Contenu']),
  ('de5e0001-0000-4000-a000-000000000006',5, 'de300001-0000-4000-a000-000000000006','7cbe8501-1260-4cf3-8312-367453d773c9','Articles de blog optimisés SEO','Contenu qui vous positionne durablement sur Google.','3 jours', array['Blog','SEO','Copywriting']),
  ('de5e0001-0000-4000-a000-000000000007',6, 'de300001-0000-4000-a000-000000000007','1b98819b-7218-4eb7-8ce3-7db7f1d4cff2','Montage vidéo YouTube & Reels','Montage dynamique, motion design et étalonnage.','4 jours', array['Montage','Motion','Reels']),
  ('de5e0001-0000-4000-a000-000000000008',7, 'de300001-0000-4000-a000-000000000008','cf25cfcb-202d-4db1-9e89-a8bcde17d78e','Business plan & dossier bancaire','Étude de marché et dossier ANETI / BFPME complet.','6 jours', array['Business plan','ANETI','Étude']),
  ('de5e0001-0000-4000-a000-000000000009',8, 'de300001-0000-4000-a000-000000000001','c63a1386-ca01-42cf-8b46-1dda2c8c7e92','Personal branding LinkedIn','Positionnement, ligne éditoriale et profil optimisé.','5 jours', array['LinkedIn','Branding','Bio']),
  ('de5e0001-0000-4000-a000-000000000010',9, 'de300001-0000-4000-a000-000000000002','c63a1386-ca01-42cf-8b46-1dda2c8c7e92','Coaching Meta Ads débutant','Initiation, Business Manager et scaling de campagnes.','2 jours', array['Meta Ads','BM','Scaling']),
  ('de5e0001-0000-4000-a000-000000000011',10,'de300001-0000-4000-a000-000000000003','cf25cfcb-202d-4db1-9e89-a8bcde17d78e','Coaching lancement boutique Shopify','Dropshipping, produit gagnant et logistique COD.','5 jours', array['Shopify','Dropshipping','COD']),
  ('de5e0001-0000-4000-a000-000000000012',11,'de300001-0000-4000-a000-000000000009','1b98819b-7218-4eb7-8ce3-7db7f1d4cff2','Voix off publicité FR & AR','Voix chaleureuse pour pubs, IVR et narration.','2 jours', array['Voix off','FR-AR','Pub'])
) as v(id, ord, profile_id, category_id, title, description, delivery_time, tags)
join public.freelancer_profiles fp on fp.profile_id = v.profile_id::uuid
on conflict (id) do nothing;

commit;

-- ============================================================================
-- §WIPE (run to remove ALL demo data — cascades users→profiles→freelancer_profiles
--        →service_listings; does NOT touch sahbeni):
-- delete from auth.users where id in (
--   'de300001-0000-4000-a000-000000000001','de300001-0000-4000-a000-000000000002','de300001-0000-4000-a000-000000000003',
--   'de300001-0000-4000-a000-000000000004','de300001-0000-4000-a000-000000000005','de300001-0000-4000-a000-000000000006',
--   'de300001-0000-4000-a000-000000000007','de300001-0000-4000-a000-000000000008','de300001-0000-4000-a000-000000000009');
-- ============================================================================
