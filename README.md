# 여행갈지도 · YEOHAENG GALJIDO

v2 브랜드 디자인을 기준으로 한 대한민국 숙박 탐색 데모. Neon Postgres + Neon Auth(Google) + Vercel.

| 항목 | 값 |
|------|-----|
| 사이트 | https://yeohang.lexid.site |
| 리포 | https://github.com/skvive/yeohang |
| Neon | 프로젝트 `yeohang` (ap-southeast-1) |
| 로그인 | `/auth/sign-in` Google (Neon Auth 공유 OAuth) |

## 로컬

```powershell
copy .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` 필요. 시크릿은 커밋하지 않습니다.

## 배포

```powershell
vercel --prod --yes
```

Trusted domain: `https://yeohang.lexid.site`

현재 빌드는 시연용입니다. 실시간 요금·재고·실결제·상표 확정은 포함하지 않습니다.
