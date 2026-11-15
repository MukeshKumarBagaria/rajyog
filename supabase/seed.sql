-- ════════════════════════════════════════════════════════════════════════════
-- Rajyog · Seed data (shared content only)
--
-- • Subjects + chapters follow the broad RAS (RPSC) syllabus. Everything is
--   configurable from /admin because RPSC can change the pattern at any time.
-- • Lectures are NOT seeded: add your own YouTube lectures from
--   /admin/lectures (single or bulk import).
-- • Historical cutoffs are NOT seeded on purpose — enter only officially
--   published figures with their source URL from /admin/cutoffs.
-- • Motivational messages are original Rajyog writing. Nothing is attributed to
--   a historical personality; history appears only as factual context.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.subjects (name, slug, description, syllabus_stage, sort_order) values
  ('Rajasthan History',              'rajasthan-history',      'Ancient sites, dynasties, freedom movement and integration of Rajasthan.', 'BOTH', 1),
  ('Rajasthan Geography',            'rajasthan-geography',    'Physiography, climate, rivers, resources, population and agriculture of Rajasthan.', 'BOTH', 2),
  ('Rajasthan Polity',               'rajasthan-polity',       'State executive, legislature, judiciary, commissions and local self-government.', 'BOTH', 3),
  ('Rajasthan Economy',              'rajasthan-economy',      'State economy, budget, agriculture, industry, infrastructure and welfare schemes.', 'BOTH', 4),
  ('Rajasthan Art and Culture',      'rajasthan-art-culture',  'Architecture, paintings, music, dance, fairs, handicrafts, saints and folk deities.', 'BOTH', 5),
  ('Indian History',                 'indian-history',         'Ancient, medieval and modern India with the national movement.', 'BOTH', 6),
  ('Indian Constitution and Polity', 'indian-polity',          'Constitution, institutions, federalism, governance and public policy.', 'BOTH', 7),
  ('Indian Geography',               'indian-geography',       'Physical, economic and human geography of India with world basics.', 'BOTH', 8),
  ('Indian Economy',                 'indian-economy',         'Macro concepts, banking, fiscal policy, sectors and welfare economics.', 'BOTH', 9),
  ('General Science',                'general-science',        'Everyday physics, chemistry, biology, health and agriculture science.', 'BOTH', 10),
  ('Science and Technology',         'science-technology',     'Space, defence, ICT, biotechnology, energy and emerging technologies.', 'BOTH', 11),
  ('Environment and Ecology',        'environment-ecology',    'Ecosystems, biodiversity, pollution, climate change and protected areas.', 'BOTH', 12),
  ('Reasoning and Mental Ability',   'reasoning',              'Logical reasoning, analytical ability and basic numeracy.', 'PRELIMS', 13),
  ('Current Affairs',                'current-affairs',        'Rajasthan, national and international events, schemes and reports.', 'BOTH', 14)
on conflict (slug) do nothing;

with data (slug, titles) as (values
  ('rajasthan-history', array[
    'Ancient Rajasthan & Archaeological Sites', 'Major Dynasties of Rajasthan', 'Rajput Kingdoms & Mughal Relations',
    'Major Battles', 'Rajasthan and the British (Treaties of 1818)', 'The 1857 Revolt in Rajasthan',
    'Peasant & Tribal Movements', 'Praja Mandal Movements', 'Integration of Rajasthan', 'Important Personalities']),
  ('rajasthan-geography', array[
    'Location, Extent & Physiography', 'Climate of Rajasthan', 'Rivers, Lakes & Drainage', 'Soils & Natural Vegetation',
    'Agriculture & Irrigation Projects', 'Minerals & Energy Resources', 'Population & Tribes', 'Industries & Transport',
    'Desertification & Drought Management']),
  ('rajasthan-polity', array[
    'Governor', 'Chief Minister & Council of Ministers', 'State Legislative Assembly', 'High Court & Subordinate Judiciary',
    'Rajasthan Public Service Commission', 'State Human Rights Commission & Lokayukta', 'State Election Commission',
    'Panchayati Raj & Urban Local Bodies', 'Administrative Structure: Division, District & Tehsil']),
  ('rajasthan-economy', array[
    'Overview & State Budget', 'Agriculture & Animal Husbandry', 'Industries & Industrial Policy',
    'Infrastructure & Energy', 'Tourism', 'Flagship Schemes & Welfare Programmes', 'Economic Review Highlights']),
  ('rajasthan-art-culture', array[
    'Forts & Palaces', 'Temples & Architecture', 'Schools of Painting', 'Folk Music & Instruments', 'Folk Dances & Folk Drama',
    'Fairs & Festivals', 'Handicrafts', 'Language & Literature', 'Saints, Sects & Folk Deities', 'Costumes & Jewellery']),
  ('indian-history', array[
    'Harappan & Vedic Period', 'Mauryan to Gupta Age', 'Delhi Sultanate & Mughal Empire', 'Bhakti & Sufi Movements',
    'Advent of Europeans & British Expansion', 'Socio-Religious Reform Movements', 'Indian National Movement',
    'Post-Independence Consolidation']),
  ('indian-polity', array[
    'Making & Salient Features of the Constitution', 'Preamble, Fundamental Rights & Duties', 'Directive Principles of State Policy',
    'Union Executive', 'Parliament', 'Judiciary', 'Federalism & Centre-State Relations', 'Constitutional & Statutory Bodies',
    'Amendments & Emergency Provisions', 'Public Policy & Good Governance']),
  ('indian-geography', array[
    'Physiography of India', 'Drainage System', 'Climate & Monsoon', 'Soils & Natural Vegetation', 'Agriculture',
    'Minerals & Industries', 'Population & Urbanisation', 'World Geography Basics']),
  ('indian-economy', array[
    'Basic Economic Concepts', 'Planning & NITI Aayog', 'Banking & Monetary Policy', 'Fiscal Policy & Union Budget',
    'Inflation', 'Agriculture & Food Security', 'Industry & Services', 'External Sector',
    'Poverty, Unemployment & Welfare Schemes']),
  ('general-science', array[
    'Physics in Everyday Life', 'Basic Chemistry', 'Human Body Systems', 'Health, Diseases & Nutrition',
    'Agriculture Science & Animal Husbandry', 'Genetics & Heredity']),
  ('science-technology', array[
    'Space Technology', 'Defence Technology', 'Information & Communication Technology', 'Biotechnology',
    'Nanotechnology & New Materials', 'Energy Technologies', 'Science & Technology in Rajasthan']),
  ('environment-ecology', array[
    'Ecosystems & Biodiversity', 'Environmental Pollution', 'Climate Change', 'Protected Areas of Rajasthan',
    'Environmental Laws & Conventions', 'Sustainable Development']),
  ('reasoning', array[
    'Analytical & Deductive Reasoning', 'Statements, Assumptions & Conclusions', 'Series, Coding-Decoding & Analogies',
    'Blood Relations, Directions & Ranking', 'Ratio, Percentage & Averages', 'Profit-Loss & Interest',
    'Data Interpretation', 'Basic Mensuration']),
  ('current-affairs', array[
    'Rajasthan Current Affairs', 'National Current Affairs', 'International Affairs',
    'Sports, Awards & Persons in News', 'Government Schemes & Reports'])
)
insert into public.chapters (subject_id, title, sort_order)
select s.id, t.title, t.ord::integer
from data d
join public.subjects s on s.slug = d.slug
cross join lateral unnest(d.titles) with ordinality as t(title, ord)
where not exists (select 1 from public.chapters c where c.subject_id = s.id and c.title = t.title);

insert into public.motivational_quotes (quote, language, attribution, category) values
  ('म्हारो लक्ष्य ऊंचो है, तो म्हारी मेहनत भी ऊंची होणी चाहिए।', 'raj', 'Rajyog', 'folk-wisdom'),
  ('रोज़ थोड़ो-थोड़ो पढ़ो, तो पहाड़ भी पार हो जावे।', 'raj', 'Rajyog', 'consistency'),
  ('बूंद-बूंद सूं बावड़ी भरीजे, घड़ी-घड़ी री पढ़ाई सूं सपना पूरा होवे।', 'raj', 'Rajyog', 'folk-wisdom'),
  ('धोरां री रेत हवा सूं रूप बदळे — थारी मेहनत थारो भाग बदळसी।', 'raj', 'Rajyog', 'culture'),
  ('जो मन में ठाण लियो, वो काम पूरो करियां ही चैन आवे।', 'raj', 'Rajyog', 'discipline'),
  ('चित्तौड़ की दीवारें सदियों से इसलिए खड़ी हैं क्योंकि हर पत्थर ने अपनी जगह नहीं छोड़ी। आप भी अपनी दिनचर्या मत छोड़िए।', 'hi', 'Rajyog', 'history'),
  ('थार का रेगिस्तान सिखाता है — कम संसाधनों में भी जीवन फलता-फूलता है। बहाने नहीं, अभ्यास चुनिए।', 'hi', 'Rajyog', 'culture'),
  ('आज का एक अध्याय, कल की एक बेहतर रैंक।', 'hi', 'Rajyog', 'exam'),
  ('निरंतरता प्रतिभा से बड़ी होती है।', 'hi', 'Rajyog', 'consistency'),
  ('जो रोज़ पढ़ता है, वही परीक्षा के दिन शांत रहता है।', 'hi', 'Rajyog', 'exam'),
  ('लक्ष्य स्पष्ट हो, तो रास्ता अपने आप बनने लगता है।', 'hi', 'Rajyog', 'discipline'),
  ('हर दिन का अभ्यास आपकी तैयारी की नींव में एक ईंट है।', 'hi', 'Rajyog', 'consistency'),
  ('मॉक टेस्ट में की गई गलती, परीक्षा में होने वाली गलती से बचाती है।', 'hi', 'Rajyog', 'exam'),
  ('बावड़ियाँ सिखाती हैं — गहराई तक उतरोगे, तभी पानी मिलेगा। विषय की गहराई तक जाइए।', 'hi', 'Rajyog', 'culture'),
  ('विश्राम लीजिए, पर हार मत मानिए।', 'hi', 'Rajyog', 'courage'),
  ('कमज़ोर विषय वह है जिससे अभी आपकी दोस्ती नहीं हुई।', 'hi', 'Rajyog', 'exam'),
  ('मेहनत का कोई विकल्प नहीं, और निरंतरता का कोई शॉर्टकट नहीं।', 'hi', 'Rajyog', 'discipline'),
  ('आज जो पढ़ा, उसे सोने से पहले एक बार दोहराइए।', 'hi', 'Rajyog', 'discipline'),
  ('At Haldighati, Maharana Pratap chose the hard road over an easy surrender. Choose the harder hour of study today.', 'en', 'Rajyog', 'history'),
  ('Mehrangarh was not built in a day. Neither is an RAS officer.', 'en', 'Rajyog', 'history'),
  ('The stepwells of Rajasthan were built one stone at a time. Build your preparation the same way.', 'en', 'Rajyog', 'culture'),
  ('Rana Sanga kept fighting through grave wounds. One weak mock score is not the end of your battle.', 'en', 'Rajyog', 'history'),
  ('Panna Dhai put duty before everything. Put today''s study before today''s distractions.', 'en', 'Rajyog', 'history'),
  ('Jaisalmer''s fort turns golden because it faces the sun every single day. Face your syllabus every single day.', 'en', 'Rajyog', 'culture'),
  ('The desert blooms after rain it waited patiently for. Keep preparing — your season will come.', 'en', 'Rajyog', 'courage'),
  ('Consistency beats intensity. Two focused hours every day outlast ten hours once a week.', 'en', 'Rajyog', 'consistency'),
  ('Your mock score is a mirror, not a verdict.', 'en', 'Rajyog', 'exam'),
  ('Revise before you forget, not after.', 'en', 'Rajyog', 'discipline'),
  ('A calm mind remembers more. Breathe, then begin.', 'en', 'Rajyog', 'courage'),
  ('Every completed lecture is a promise kept to yourself.', 'en', 'Rajyog', 'consistency'),
  ('Small daily wins compound into a selection.', 'en', 'Rajyog', 'consistency'),
  ('Rajyog will count your hours. Your job is to make each one worth counting.', 'en', 'Rajyog', 'discipline'),
  ('The exam rewards the prepared, not the anxious. Prepare today, and let tomorrow be calm.', 'en', 'Rajyog', 'exam'),
  ('One more chapter. One more revision. One step closer.', 'en', 'Rajyog', 'consistency'),
  ('Kumbhalgarh''s walls stretch for kilometres because builders kept adding to them. Keep adding to your preparation.', 'en', 'Rajyog', 'history'),
  ('Phones can wait. Your future officer self cannot.', 'en', 'Rajyog', 'discipline'),
  ('Courage is opening the subject you have been avoiding.', 'en', 'Rajyog', 'courage'),
  ('Folk artists of Rajasthan practise one song for years. Mastery is repetition with attention.', 'en', 'Rajyog', 'culture'),
  ('Do the next right thing: one lecture, one note, one question.', 'en', 'Rajyog', 'discipline'),
  ('Selection is not luck. It is a thousand ordinary days done well.', 'en', 'Rajyog', 'exam');
