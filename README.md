# Лабораторно-практична робота №8-9. Full-stack інтеграція: розробка UI на базі професійного бойлерплейту
Цей проєкт — фронтенд-клієнт для роботи з сутністю **Owners** (власники тварин) у ветеринарній системі.  
Стек: **Vite + React + TypeScript + TanStack Router + TanStack Query + Axios + Zod + React Hook Form**.
---

## 1. Реалізований функціонал

- Підключення до REST API через **Axios** з використанням базового URL та токена з `.env`.
- Отримання списку власників (`GET /owners`) за допомогою **TanStack Query**:
  - відображення станів **завантаження**, **помилки**, **успішного отримання** даних;
- Демонстраційна форма створення власника з валідацією через **Zod + React Hook Form**:
  - валідація полів `fullName`, `email`, `phone`, `address`;
  - відображення помилок під кожним полем.
- Вивід стану помилки, якщо бекенд повертає `500` (або інший неуспішний статус).
- Реальні HTTP-запити до бекенда, що підтверджуються у вкладці **Network** DevTools.

> **Примітка:** в якості сутності для демонстрації обрано `owners` замість `products`, але структура відповідає вимогам завдання.

---
## 2. Ключові фрагменти коду

### 2.1. Конфігурація Axios

Файл: `src/lib/axios.ts`

```ts
import axios from 'axios';

const { VITE_API_BASE_URL, VITE_API_AUTH_TOKEN } = import.meta.env;

const apiClient = axios.create({
  baseURL: VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (VITE_API_AUTH_TOKEN) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${VITE_API_AUTH_TOKEN}`;
}

export default apiClient;
```
Змінні оточення задаються в .env (на основі .env.example):
```ts
VITE_API_BASE_URL=http://localhost:4001
VITE_API_AUTH_TOKEN=TEST_TOKEN
```
### 2.2. Хуки для TanStack Query (Owners)
Файл: src/features/owners/api.ts
```ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import apiClient from '@/lib/axios';
import type { Owner, CreateOwnerDto, UpdateOwnerDto } from '@/features/owners/types';

// Запит списку owners
const getOwners = async (): Promise<Array<Owner>> => {
  const response = await apiClient.get<Array<Owner>>('/owners');
  return response.data;
};

export const useOwners = (): UseQueryResult<Array<Owner>, Error> =>
  useQuery<Array<Owner>>({
    queryKey: ['owners'],
    queryFn: getOwners,
  });

// Створення owner 
export const useCreateOwner = (): UseMutationResult<
  Owner,
  Error,
  CreateOwnerDto,
  unknown
> => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<Owner, Error, CreateOwnerDto>({
    mutationFn: async (newOwner: CreateOwnerDto): Promise<Owner> => {
      const response = await apiClient.post<Owner>('/owners', newOwner);
      return response.data;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['owners'] });
      void navigate({ to: '/owners' });
    },
  });
};
```
### 2.3. Схема Zod для валідації форми
Файл: src/features/owners/ownerFormSchema.ts
```ts
import { z } from 'zod';

export const ownerSchema = z.object({
  fullName: z.string().min(3, 'Name is too short'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(5, 'Phone is too short'),
  address: z.string().min(3, 'Address is too short'),
});

export type OwnerFormData = z.infer<typeof ownerSchema>;

```
Використання в компоненті (фрагмент):
```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ownerSchema, type OwnerFormData } from '@/features/owners/ownerFormSchema';

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<OwnerFormData>({
  resolver: zodResolver(ownerSchema),
});

```
---
# 3. Скріншоти, що демонструють роботу
### 3.1. Сторінка зі списком сутностей (Owners)
<img width="1918" height="967" alt="image" src="https://github.com/user-attachments/assets/7abf1228-c024-41ac-bbd7-60478b88950a" />

 - На цьому скріншоті показана сторінка **/owners**:
 - заголовок **Owners demo**;
 - стан помилки **Error loading owners: Request failed with status code 500**
 - (демонстрація обробки помилки від бекенда);
 - при нормальній відповіді API тут відображався б список сутностей.

<img width="1910" height="912" alt="image" src="https://github.com/user-attachments/assets/01e851f3-79bb-4abc-99d2-b232378f9137" />

 - Також на цій сторінці демонструється індикатор завантаження **Loading owners...**, коли запит ще виконується.

### 3.2. Форма з помилками валідації (Zod)
<img width="1896" height="744" alt="Снимок экрана 2025-12-10 233714" src="https://github.com/user-attachments/assets/b60c0cab-1de2-4e1f-9131-1d9dda067ca2" />

 - На цьому скріншоті показано форму створення власника:
 - поля **Full name**,**Email**, **Phone**, **Address**;
 - після натискання кнопки **Create** з порожніми/некоректними полями Zod генерує помилки;
 - помилки відображаються під кожним полем (наприклад, **Name is too short**, **Invalid email** тощо).
 - Форма реалізована за допомогою React Hook Form + Zod.

### 3.3. Вкладка Network (DevTools)
<img width="1916" height="972" alt="Снимок экрана 2025-12-10 233917" src="https://github.com/user-attachments/assets/58e5a0ed-292b-43f6-aab6-b5af11c0629b" />

 - На цьому скріншоті показано вкладку Network → Fetch/XHR:
 - видно HTTP-запит **GET /owners** до **VITE_API_BASE_URL** (наприклад, http://localhost:4001/owners);
 - статус відповіді (у моєму випадку 500 — помилка сервера);
 - ініціатор запиту — файл **api.ts** (Axios-клієнт).
 - Це підтверджує, що фронтенд реально відправляє HTTP-запити до API, а не використовує мок-дані.
---
# 4. Особливості реалізації та труднощі
Під час виконання роботи виникли такі моменти:
### 1. Типізація TanStack Router та navigate.
 - Типи TanStack Router спочатку не приймали рядок '/owners', що вирішувалося або додаванням відповідного маршруту, або явним кастом типу.
 - Також eslint-правило no-floating-promises вимагало використовувати void navigate({ to: '/owners' });.
### 2. ESLint і TypeScript-правила.
Було виправлено попередження:
 - @typescript-eslint/no-floating-promises (через void перед промісами),
 - @typescript-eslint/explicit-function-return-type (явні типи для хуків),
 - робота з типами UseQueryResult, UseMutationResult.
### 3. Валідація форм.
 - Zod дозволив централізовано описати вимоги до полів (мінімальна довжина, формат email тощо).
 - У поєднанні з React Hook Form це дало зручне відображення помилок прямо під інпутами, без ручної перевірки значень.
# 5. Як запустити проєкт локально.
```ts
# Встановити залежності
npm install

# Створити файл .env на основі .env.example
# Приклад:
# VITE_API_BASE_URL=http://localhost:4001
# VITE_API_AUTH_TOKEN=TEST_TOKEN

# Запустити dev-сервер
npm run dev
```
Фронтенд буде доступний за адресою, яку виведе Vite (наприклад, http://localhost:5173).
