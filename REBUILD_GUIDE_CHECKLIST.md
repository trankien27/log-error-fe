# Huong Dan Code Tay Lai Du An Tu Dau

Tai lieu nay dung de lam quen va code lai frontend tu dau theo kien truc hien tai: React frontend goi backend REST API that tai `http://localhost:7000`.

## 1) Tong Quan Kien Truc

- Stack frontend: React 19, TypeScript, Vite 6, TailwindCSS v4, Zustand, React Router, Lucide, Motion.
- App: he thong IT Admin dashboard gom `overview`, `error logs`, `tasks`, `users`, `roles`, `booths`, `notifications`, `schedule`, `settings`.
- State: Zustand stores theo domain trong `src/stores`.
- Data layer: `src/services/api/*` goi backend bang `fetch` thong qua `apiClient`.
- Backend base URL mac dinh: `http://localhost:7000`.
- Env override: `VITE_API_BASE_URL`.

## 2) Nguyen Tac Code Lai

- UI component chi nen xu ly hien thi, form state cuc bo va event UI.
- Store chiu trach nhiem state domain, loading/error, modal state va action.
- Service chiu trach nhiem goi API that.
- Backend tao `id`, `createdAt/reportTime`, token va persistence; frontend khong sinh mock data cho luong chinh.
- Khong dung localStorage lam database. Chi dung localStorage de luu auth token neu backend tra ve.
- Khong duy tri 2 luong API song song. Nen chon `stores + services/api` lam luong chinh.

---

## Giai Doan 0 - Chuan Bi Moi Truong

### Checklist

- [ ] Cai Node.js LTS.
- [ ] Co backend chay tai `http://localhost:7000`.
- [ ] Tao project Vite React + TypeScript.
- [ ] Cai dependencies:
  - [ ] `react`
  - [ ] `react-dom`
  - [ ] `react-router-dom`
  - [ ] `zustand`
  - [ ] `lucide-react`
  - [ ] `motion`
  - [ ] `tailwindcss`
  - [ ] `@tailwindcss/vite`
  - [ ] `@vitejs/plugin-react`
- [ ] Cai dev dependencies:
  - [ ] `typescript`
  - [ ] `@types/react`
  - [ ] `@types/react-dom`
  - [ ] `@types/node`
- [ ] Tao `.env.local` neu can:

```env
VITE_API_BASE_URL="http://localhost:7000"
```

- [ ] Chay `npm run dev`.
- [ ] Chay `npm run lint`.

### Dau Ra

- Project rong chay duoc.
- TypeScript nhan `react/jsx-runtime` va `import.meta.env`.

---

## Giai Doan 1 - Scaffold Source

### Checklist

- [ ] Tao `src/main.tsx`.
- [ ] Tao `src/App.tsx`.
- [ ] Tao `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] Tao cau truc thu muc:
  - [ ] `src/components/Layout`
  - [ ] `src/features/auth/components`
  - [ ] `src/features/dashboard/components`
  - [ ] `src/features/logs/components`
  - [ ] `src/features/tasks/components`
  - [ ] `src/features/users/components`
  - [ ] `src/features/booths/components`
  - [ ] `src/features/notifications/components`
  - [ ] `src/features/schedule/components`
  - [ ] `src/features/settings/components`
  - [ ] `src/services/api`
  - [ ] `src/stores`
  - [ ] `src/shared/types`

### Dau Ra

- Source tree ro rang, dung de tach UI, store va API.

---

## Giai Doan 2 - Type Domain

### Checklist

- [ ] Tao type `ErrorLog`.
- [ ] Tao type `User`.
- [ ] Tao type `Role`.
- [ ] Tao type `Booth`.
- [ ] Tao type `Task`.
- [ ] Tao type `TaskAttachment`.
- [ ] Tao type `SystemNotification`.
- [ ] Tao type `Activity`.
- [ ] Tao type `TabType`.

### Type Can Co

```ts
export interface ErrorLog {
  id: string;
  title: string;
  reporter: string;
  reportTime: string;
  store: string;
  booth: string;
  attachment: boolean;
  status: 'Moi' | 'Dang xu ly' | 'Da dong' | string;
  severity: 'Loi nghiem trong' | 'Binh thuong' | 'Canh bao' | string;
}
```

Ghi chu: du an hien tai dang dung text tieng Viet co dau trong union type. Khi code lai tu dau, ban co the giu nguyen de khop UI, hoac chuan hoa backend enum thanh `new`, `in_progress`, `closed` roi map ra label tai frontend.

### Dau Ra

- Type du dung cho component, store va service.

---

## Giai Doan 3 - API Client That

### Checklist

- [ ] Tao `src/services/api/apiClient.ts`.
- [ ] Doc base URL tu `import.meta.env.VITE_API_BASE_URL`.
- [ ] Mac dinh base URL la `http://localhost:7000`.
- [ ] Them helper `get`, `post`, `put`, `patch`, `delete`.
- [ ] Tu dong parse response.
- [ ] Ho tro response dang `{ data: ... }` hoac tra truc tiep object/array.
- [ ] Doc token tu localStorage va gui `Authorization: Bearer <token>`.
- [ ] Neu response loi, nem `Error` voi `message` tu backend.

### Mau API Client

```ts
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000').replace(/\/$/, '');
export const AUTH_TOKEN_KEY = 'auth_token';
```

### Dau Ra

- Moi service dung chung 1 client.
- Doi backend URL chi can sua env.

---

## Giai Doan 4 - Backend Contract

Backend nen tra response theo 1 trong 2 dang:

```json
{ "data": { "id": "USR-001", "name": "Admin" } }
```

hoac:

```json
{ "id": "USR-001", "name": "Admin" }
```

### Endpoint Can Co

- [ ] `POST /auth/login`
- [ ] `POST /auth/register`
- [ ] `GET /users`
- [ ] `POST /users`
- [ ] `PUT /users/:id`
- [ ] `DELETE /users/:id`
- [ ] `GET /roles`
- [ ] `POST /roles`
- [ ] `PUT /roles/:name`
- [ ] `GET /logs`
- [ ] `POST /logs`
- [ ] `PATCH /logs/:id`
- [ ] `DELETE /logs/:id`
- [ ] `GET /tasks`
- [ ] `POST /tasks`
- [ ] `PUT /tasks/:id`
- [ ] `PATCH /tasks/:id/status`
- [ ] `PATCH /tasks/:id/notes`
- [ ] `POST /tasks/:id/attachments`
- [ ] `DELETE /tasks/:id/attachments/:attachmentName`
- [ ] `GET /booths`
- [ ] `POST /booths`
- [ ] `PUT /booths/:id`
- [ ] `DELETE /booths/:id`
- [ ] `GET /notifications`
- [ ] `POST /notifications`
- [ ] `PATCH /notifications/:id/read-state`
- [ ] `DELETE /notifications/:id`
- [ ] `GET /shifts`
- [ ] `POST /shifts`
- [ ] `PUT /shifts/:id`
- [ ] `DELETE /shifts/:id`
- [ ] `GET /activities/recent`

### Auth Response

Backend login/register nen tra:

```json
{
  "user": {
    "id": "USR-001",
    "name": "Admin User",
    "email": "admin@company.vn",
    "role": "Admin",
    "status": "Hoat dong"
  },
  "token": "jwt-or-session-token"
}
```

Frontend chap nhan ca `token` va `accessToken`.

---

## Giai Doan 5 - Service Theo Domain

### Checklist

- [ ] `authService`
  - [ ] `login(email, password)` -> `POST /auth/login`
  - [ ] `register(name, email, password)` -> `POST /auth/register`
  - [ ] luu token neu backend tra ve
  - [ ] `logout()` xoa token
- [ ] `usersService`
  - [ ] `getUsers()` -> `GET /users`
  - [ ] `saveUser()` -> `POST /users` hoac `PUT /users/:id`
  - [ ] `deleteUser()` -> `DELETE /users/:id`
  - [ ] `getRoles()` -> `GET /roles`
  - [ ] `saveRole()` -> `POST /roles` hoac `PUT /roles/:name`
- [ ] `logsService`
  - [ ] `getAll()` -> `GET /logs`
  - [ ] `create()` -> `POST /logs`
  - [ ] `update()` -> `PATCH /logs/:id`
  - [ ] `delete()` -> `DELETE /logs/:id`
- [ ] `tasksService`
  - [ ] `getAll()` -> `GET /tasks`
  - [ ] `save()` -> `POST /tasks` hoac `PUT /tasks/:id`
  - [ ] `updateStatus()` -> `PATCH /tasks/:id/status`
  - [ ] `updateNotes()` -> `PATCH /tasks/:id/notes`
  - [ ] `addAttachment()` -> `POST /tasks/:id/attachments`
  - [ ] `deleteAttachment()` -> `DELETE /tasks/:id/attachments/:attachmentName`
- [ ] `boothsService`
- [ ] `notificationsService`
- [ ] `scheduleService`
- [ ] `activitiesService`

### Dau Ra

- Service khong con mock data.
- Service khong doc/ghi localStorage tru token auth.

---

## Giai Doan 6 - Zustand Stores

### Checklist

- [ ] Store chi goi service, khong goi `fetch` truc tiep.
- [ ] Moi store co `isLoading` va `error`.
- [ ] Moi action async bat loi va set `error`.
- [ ] Store giu state UI neu state do dung nhieu component:
  - [ ] modal open/close
  - [ ] selected item
  - [ ] filter/search
- [ ] Auth store:
  - [ ] `isLoggedIn`
  - [ ] `currentUser`
  - [ ] `login`
  - [ ] `register`
  - [ ] `logout`
- [ ] Logs store:
  - [ ] fetch/add/update/delete
  - [ ] filter/search helper
- [ ] Tasks store:
  - [ ] fetch/save/update status/update notes
  - [ ] attachment actions
- [ ] Users store:
  - [ ] fetch users + roles
  - [ ] save/delete user
  - [ ] save role
- [ ] Notifications store:
  - [ ] fetch/send/toggle/delete
- [ ] Schedule store:
  - [ ] fetch/save/delete shift

### Dau Ra

- UI co the render toan bo bang state tu stores.

---

## Giai Doan 7 - Routing Va Layout

### Checklist

- [ ] `main.tsx` render `BrowserRouter`.
- [ ] `App.tsx` khai bao routes.
- [ ] Public route:
  - [ ] `/auth`
- [ ] Protected routes:
  - [ ] `/overview`
  - [ ] `/error-logs`
  - [ ] `/tasks`
  - [ ] `/users`
  - [ ] `/roles`
  - [ ] `/booths`
  - [ ] `/notifications`
  - [ ] `/schedule`
  - [ ] `/settings`
- [ ] `ProtectedRoute` dung `useAuthStore().isLoggedIn`.
- [ ] `MainLayout` co:
  - [ ] `Sidebar`
  - [ ] `TopHeader`
  - [ ] `Outlet`
  - [ ] global notification modal
- [ ] Khi mount `MainLayout`, fetch baseline data:
  - [ ] users/roles
  - [ ] logs
  - [ ] tasks
  - [ ] booths
  - [ ] shifts
  - [ ] notifications neu can header hien ngay

---

## Giai Doan 8 - Module UI Theo Thu Tu De Den Kho

### Checklist

- [ ] Auth
  - [ ] login form
  - [ ] register form gui password
  - [ ] hien loi tu backend
  - [ ] redirect sau login/register
- [ ] Booths
  - [ ] list
  - [ ] search
  - [ ] create/update/delete
  - [ ] copy remote id
- [ ] Logs
  - [ ] list
  - [ ] filter store/booth
  - [ ] create/update/delete
- [ ] Users + Roles
  - [ ] user table
  - [ ] profile detail
  - [ ] role table
  - [ ] create/update actions
- [ ] Notifications
  - [ ] list
  - [ ] read/unread
  - [ ] broadcast
  - [ ] detail modal
- [ ] Schedule
  - [ ] calendar grid
  - [ ] create shift
  - [ ] filter mode/search/role
- [ ] Tasks
  - [ ] kanban board
  - [ ] drag-drop
  - [ ] create/update task
  - [ ] notes
  - [ ] attachments
- [ ] Overview
  - [ ] metrics tu stores
  - [ ] recent activities tu `/activities/recent`
- [ ] Settings
  - [ ] password stage
  - [ ] OTP stage
  - [ ] success stage

---

## Giai Doan 9 - Xu Ly Loi Va UX API

### Checklist

- [ ] Khi backend tat, UI khong crash.
- [ ] Store set `error` khi API fail.
- [ ] Form submit disable khi `isLoading` neu can.
- [ ] Backend message hien ra duoc qua alert/toast.
- [ ] Sau create/update/delete, state UI duoc cap nhat khong can reload trang.
- [ ] Sau logout, token bi xoa.
- [ ] Neu token het han, backend tra `401`; frontend nen redirect ve `/auth` trong giai doan nang cap.

---

## Giai Doan 10 - Test Thu Cong

### Checklist Backend

- [ ] Backend chay tai `http://localhost:7000`.
- [ ] CORS cho phep frontend Vite (`http://localhost:3000` hoac port dang dung).
- [ ] Tat ca endpoint tra JSON.
- [ ] Error response co `message` hoac `error`.

### Checklist Frontend

- [ ] `npm run lint` pass.
- [ ] `npm run build` pass.
- [ ] Login thanh cong.
- [ ] Register thanh cong.
- [ ] Reload app sau login van co token trong request tiep theo.
- [ ] CRUD users.
- [ ] CRUD roles.
- [ ] CRUD booths.
- [ ] CRUD logs.
- [ ] CRUD tasks.
- [ ] Update task status bang click va drag-drop.
- [ ] Update task notes.
- [ ] Add/delete task attachment metadata.
- [ ] Send notification.
- [ ] Toggle notification read state.
- [ ] Create shift.
- [ ] Dashboard load recent activities tu API.

---

## Giai Doan 11 - Refactor Va Don Dep

### Checklist

- [ ] Bo cac file mock API khong dung.
- [ ] Khong import `INITIAL_*` trong service/UI chinh.
- [ ] Chi giu initial data neu can lam seed backend rieng.
- [ ] Gom type ve mot noi.
- [ ] Khong duplicate `useAuthStore`, `useTasksStore` giua `stores` va `features/hooks`.
- [ ] Modal lon co the tach component rieng.
- [ ] Dat ten endpoint va service nhat quan.

---

## Thu Tu Commit De Xuat

- [ ] Commit 1: scaffold Vite, Tailwind, Router.
- [ ] Commit 2: domain types.
- [ ] Commit 3: `apiClient` + env config.
- [ ] Commit 4: services goi backend.
- [ ] Commit 5: Zustand stores.
- [ ] Commit 6: layout + routing + auth.
- [ ] Commit 7: booths + logs.
- [ ] Commit 8: users + roles.
- [ ] Commit 9: tasks + notifications + schedule.
- [ ] Commit 10: overview + settings.
- [ ] Commit 11: cleanup + build/lint.

---

## Ghi Chu Khi Backend Chua Hoan Thien

- Neu backend chua co endpoint nao, frontend se hien data rong hoac bao loi.
- Khong nen quay lai localStorage mock trong service chinh.
- Neu can demo tam, hay tao backend seed data hoac mock server rieng tai `localhost:7000`.
- Cach nay giu frontend gan voi hanh vi thuc te va tranh sai lech khi tich hop backend that.

