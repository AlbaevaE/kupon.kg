# Tasks

Задачи по устранению проблем из аудита `needtofix.md`.

---

## 🔴 Критические (безопасность)

### TASK-01 — Валидация загрузки логотипа — done
**Файл:** `app/api/business/settings/route.ts`

Сейчас любой файл принимается и сохраняется в `public/logos/` — XSS через SVG/HTML.

- [ ] Добавить whitelist MIME-типов: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- [ ] Проверять MIME через `logo.type`, а не расширение из имени файла
- [ ] Ограничить размер файла: отклонять если `logo.size > 2 * 1024 * 1024` (2 MB)
- [ ] Принудительно выставлять расширение из MIME-типа, игнорируя `logo.name`

---

### TASK-02 — Сменить `NEXTAUTH_SECRET` — done
**Файл:** `.env`

Текущее значение — публичный placeholder из документации.

- [ ] Сгенерировать секрет: `openssl rand -base64 32`
- [ ] Заменить значение `NEXTAUTH_SECRET` в `.env`
- [ ] Убедиться, что в проде переменная выставлена через хостинг, не через `.env` файл

---

### TASK-03 — Atomic погашение купона (race condition) — done
**Файл:** `app/api/coupons/[code]/redeem/route.ts`

Два параллельных запроса могут оба погасить один купон.

- [ ] Убрать предварительный `findUnique` для проверки статуса
- [ ] Заменить на `prisma.coupon.updateMany({ where: { code, status: 'ACTIVE', expiresAt: { gt: new Date() }, template: { businessId: user.businessId } }, data: { status: 'REDEEMED', redeemedAt: new Date(), redeemedById: user.id } })`
- [ ] Если `count === 0` — запросить текущее состояние купона и вернуть точную причину (не найден / уже погашен / истёк / чужой бизнес)
- [ ] Сохранить создание `ScanEvent` в том же `$transaction`

---

### TASK-04 — Починить self-claim — done
**Файлы:** `app/claim/[templateId]/self-claim-form.tsx`, `app/api/templates/[id]/coupons/route.ts`

Self-claim вызывает endpoint, требующий авторизацию — всегда 401.

- [ ] Создать отдельный публичный endpoint `POST /api/claim/[templateId]` без проверки `session`
- [ ] В новом endpoint: проверить что `template.allowSelfClaim === true` и `template.isActive === true`
- [ ] Проверить что шаблон не истёк (для `FIXED_DATE`)
- [ ] Обновить `SelfClaimForm` чтобы вызывал `/api/claim/${templateId}` вместо `/api/templates/${templateId}/coupons`
- [ ] Старый endpoint `/api/templates/[id]/coupons` оставить только для авторизованного персонала

---

### TASK-05 — Применить ограничение `maxUses` — done
**Файл:** `app/api/templates/[id]/coupons/route.ts` (и новый endpoint из TASK-04)

`maxUses` хранится, но никогда не проверяется.

- [ ] Перед созданием купона считать `prisma.coupon.count({ where: { templateId: template.id } })`
- [ ] Если `count >= template.maxUses` — вернуть `409` с понятным сообщением
- [ ] Обернуть `count` + `create` в `$transaction` чтобы избежать race condition при одновременных запросах
- [ ] Применить ту же проверку в публичном self-claim endpoint (TASK-04)

---

## 🟠 Архитектурные

### TASK-06 — Типизировать session.user, убрать `as any` — done
**Файлы:** `auth.ts`, все файлы в `app/api/**`

`(user as any)` в 15+ местах — TypeScript не ловит опечатки в `businessId`, `role`.

- [ ] Расширить типы NextAuth в `auth.ts`: добавить `declare module 'next-auth'` с полями `id`, `businessId`, `businessName`, `businessSlug`, `role`
- [ ] Заменить все `session.user as any` на типизированный `session.user`
- [ ] Убедиться, что TypeScript ловит обращение к несуществующим полям

---

### TASK-07 — Удалить `Business.passwordHash`
**Файлы:** `prisma/schema.prisma`, `app/api/auth/register/route.ts`

Поле хранится, но никогда не используется для аутентификации.

- [ ] Удалить поле `passwordHash` из модели `Business` в схеме
- [ ] Убрать `passwordHash` из `data` при `prisma.business.create` в `register/route.ts`
- [ ] Создать и применить миграцию: `prisma migrate dev --name remove-business-password-hash`

---

### TASK-08 — Синхронизировать статус EXPIRED в БД — done
**Вариант A (минимальный):** не хранить в БД, но фиксировать это как намеренное решение.
**Вариант B (полный):** cron-джоб для обновления статуса.

- [ ] Решить: нужна ли аналитика по просроченным купонам в БД?
- [ ] Если да — добавить cron через Vercel Cron Jobs или внешний планировщик: `prisma.coupon.updateMany({ where: { status: 'ACTIVE', expiresAt: { lt: new Date() } }, data: { status: 'EXPIRED' } })`
- [ ] Если нет — задокументировать в `CLAUDE.md` что статус вычисляется на лету и запросы по `status: 'EXPIRED'` некорректны

---

### TASK-09 — Пагинация списка купонов — done
**Файл:** `app/dashboard/templates/[id]/page.tsx`

Все купоны шаблона загружаются без ограничения.

- [ ] Добавить параметр `page` из `searchParams`
- [ ] Ограничить запрос: `take: 50, skip: page * 50`
- [ ] Добавить кнопки «Следующая страница» / «Предыдущая страница» в UI
- [ ] Считать общее количество через `prisma.coupon.count` для отображения страниц

---

### TASK-10 — Кэшировать QR-код купона — done
**Файл:** `app/c/[code]/page.tsx`

`QRCode.toDataURL()` вызывается при каждом запросе; результат всегда одинаковый.

- [ ] Перенести генерацию QR в момент создания купона: сохранять `qrDataUrl` в поле `Coupon.qrCode` (или генерировать в `/api/coupons/[code]/qr` и кэшировать через Next.js `unstable_cache`)
- [ ] Либо добавить `export const revalidate = 3600` на страницу `/c/[code]` — данные статичны после выдачи купона

---

### TASK-11 — Убрать `uniqueSlug` N+1 запросов или удалить slug — done
**Файл:** `app/api/auth/register/route.ts`

`uniqueSlug` делает последовательные запросы в цикле; сам slug нигде не используется.

- [ ] **Если slug нужен в будущем:** заменить цикл на одиночный запрос с `findFirst` по `startsWith` и `LIKE` паттерну, или добавить случайный суффикс без проверки коллизий
- [ ] **Если slug не планируется использовать:** удалить поле `slug` из схемы и генерацию из `register/route.ts`

---

### TASK-12 — Заменить `NEXT_PUBLIC_APP_URL` на серверную переменную — done
**Файлы:** `app/api/coupons/[code]/qr/route.ts`, `.env`

`NEXT_PUBLIC_` переменные запекаются в клиентский бандл; в серверных роутах нужна обычная переменная.

- [ ] Добавить в `.env` серверную переменную `APP_URL` (без `NEXT_PUBLIC_`)
- [ ] В `qr/route.ts` заменить `process.env.NEXT_PUBLIC_APP_URL` на `process.env.APP_URL`
- [ ] Проверить другие серверные файлы на использование `NEXT_PUBLIC_APP_URL`

---

## 🟡 Мелочи

### TASK-13 — Валидация входных данных при регистрации — done
**Файл:** `app/api/auth/register/route.ts`

- [ ] Валидировать формат email (regex или библиотека `zod`)
- [ ] Установить минимальную длину пароля: не менее 8 символов
- [ ] Установить максимальную длину всех строковых полей (защита от огромных запросов)

---

### TASK-14 — Rate limiting на эндпоинты аутентификации
**Файлы:** `app/api/auth/register/route.ts`, `/auth/login` (NextAuth handler)

- [ ] Подключить `@upstash/ratelimit` + Upstash Redis, или использовать заголовки от хостинга (Vercel Edge Middleware)
- [ ] Ограничить `/api/auth/...` и `/api/auth/register`: не более 5 попыток в минуту с одного IP
- [ ] Вернуть `429 Too Many Requests` при превышении

---

### TASK-15 — Фильтровать `VIEWED` scan-события — done
**Файл:** `app/api/coupons/[code]/validate/route.ts`

Событие пишется при каждом вызове validate, включая сканы ботов.

- [ ] Добавить опциональный параметр `?intent=scan` в запрос
- [ ] Писать `ScanEvent` только если `intent === 'scan'`, иначе пропускать
- [ ] Обновить `ScannerClient` чтобы передавал `?intent=scan`

---

### TASK-16 — Лимит размера тела запроса — done
**Файлы:** все `route.ts` которые вызывают `req.json()`

- [ ] Настроить `export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }` либо проверять `Content-Length` заголовок вручную
- [ ] Либо настроить лимит на уровне `next.config.ts`
