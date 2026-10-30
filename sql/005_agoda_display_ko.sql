UPDATE properties SET city = '서울' WHERE source = 'agoda' AND lower(city) LIKE 'seoul%';
UPDATE properties SET city = '부산' WHERE source = 'agoda' AND (lower(city) LIKE 'busan%' OR lower(city) LIKE 'pusan%');
UPDATE properties SET city = '제주' WHERE source = 'agoda' AND lower(city) LIKE 'jeju%';
UPDATE properties SET category = '호텔' WHERE source = 'agoda' AND lower(coalesce(category,'')) IN ('hotel','hotels');
UPDATE properties SET category = '리조트' WHERE source = 'agoda' AND lower(coalesce(category,'')) LIKE '%resort%';
UPDATE properties SET category = '게스트하우스' WHERE source = 'agoda' AND (lower(coalesce(category,'')) LIKE '%guest%' OR lower(coalesce(category,'')) LIKE '%hostel%');
UPDATE properties SET category = '캠핑·글램핑' WHERE source = 'agoda' AND (lower(coalesce(category,'')) LIKE '%camp%' OR lower(coalesce(category,'')) LIKE '%glamp%');
UPDATE properties SET amenities = category WHERE source = 'agoda' AND amenities ~ '^[A-Za-z]';
UPDATE properties SET tagline = city || ' · ' || coalesce(nullif(category,''), '숙소')
  WHERE source = 'agoda' AND (tagline IS NULL OR tagline = '' OR tagline ~ '[A-Za-z]' AND tagline !~ '[가-힣]');
UPDATE properties SET photo_author = '아고다' WHERE source = 'agoda' AND (photo_author IS NULL OR photo_author = '' OR lower(photo_author) = 'agoda');
UPDATE properties SET photo_license = '아고다 제휴 콘텐츠' WHERE source = 'agoda' AND (photo_license IS NULL OR photo_license = '' OR photo_license ILIKE '%agoda affiliate%');
UPDATE properties SET description = city || '에 있는 ' || coalesce(nullif(category,''), '숙소') || '입니다. 상세 안내는 아고다에서 확인하세요.'
  WHERE source = 'agoda' AND description ~ '[A-Za-z]' AND description !~ '[가-힣]';
UPDATE properties SET area = city WHERE source = 'agoda' AND (area IS NULL OR area = '' OR area ~ '[A-Za-z]' AND area !~ '[가-힣]');
