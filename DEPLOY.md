# Деплой relay-сервера на Render.com (бесплатно)

## 1. Создай аккаунт
https://render.com — войди через GitHub

## 2. Создай репо
Закинь папку relay-server/ в отдельный GitHub репозиторий
(или в подпапку основного — Render умеет деплоить подпапку)

## 3. Создай Web Service
- Dashboard → New → Web Service
- Connect GitHub repo
- Root Directory: `relay-server` (если подпапка)
- Environment: Node
- Build Command: `npm install`
- Start Command: `node server.js`
- Plan: **Free**

## 4. Получи URL
После деплоя Render даёт URL вида:
`https://meshtalk-relay-xxxx.onrender.com`

## 5. Обнови Android приложение
В файле `RelayManager.kt` замени:
```kotlin
private const val RELAY_WS_URL = "wss://meshtalk-relay.onrender.com/ws"
```
На твой URL:
```kotlin
private const val RELAY_WS_URL = "wss://meshtalk-relay-xxxx.onrender.com/ws"
```

## Готово!
Теперь приложение работает везде — через WiFi, Bluetooth и через интернет
даже если оба телефона за мобильными данными МТС/Билайн.

## Важно про Free tier Render.com
- Сервер засыпает после 15 минут неактивности
- Первое подключение после сна занимает ~30 секунд (cold start)
- Трафик: 750 часов/месяц бесплатно (всегда хватает)
- Для production — план Starter $7/месяц (нет cold start)
