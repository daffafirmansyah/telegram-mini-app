# ⚡ Kudaw Toolkit — Telegram Mini App

<p align="center">
  <img src="https://img.shields.io/badge/Telegram-Mini_App-blue?style=for-the-badge&logo=telegram" alt="Telegram">
  <img src="https://img.shields.io/badge/Features-4-purple?style=for-the-badge" alt="Features">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

<p align="center">
  <strong>🌐 <a href="https://daffafirmansyah.github.io/telegram-mini-app/">Open Mini App →</a></strong>
</p>

---

All-in-one crypto toolkit inside Telegram. Track NFT drops, manage airdrops, generate test cards, and schedule cron jobs — all from your chat.

## ⚡ Features

| Feature | Description |
|---------|-------------|
| 🎯 **NFT Drop Tracker** | Browse upcoming/live/ended drops from OpenSea |
| 🪂 **Airdrop Dashboard** | Track tasks, progress, wallet per project |
| 💳 **CC Generator** | BIN-based generation with Luhn validation, address, name, phone |
| ⏰ **Cron Manager** | Schedule jobs with provider/model selection |

## 🚀 Quick Start

### 1. Deploy Frontend (GitHub Pages)

```bash
git clone https://github.com/YOUR_USERNAME/telegram-mini-app.git
cd telegram-mini-app
# Push to GitHub → enable Pages
```

### 2. Setup Bot

```bash
pip install -r requirements.txt

# Edit bot.py — set BOT_TOKEN and MINI_APP_URL
python bot.py
```

### 3. Configure Bot in Telegram

1. Open @BotFather
2. `/mybots` → select your bot
3. Bot Settings → Menu Button → configure URL to your GitHub Pages URL

## 💳 CC Generator

Supports BIN-based generation with:
- Luhn-valid card numbers
- Network auto-detection (Visa, MC, Amex, Discover, UnionPay, JCB)
- Country-specific names, addresses, phone numbers
- Export to clipboard

**Supported Countries:** US, UK, DE, JP, KR, ID, BR

## 📱 Screenshots

The app uses a dark "Neon Cyber" theme optimized for Telegram:
- Purple/cyan accent colors
- JetBrains Mono + Inter fonts
- Bottom tab navigation
- Slide-up modals
- Mobile-first responsive design

## 🏗️ Architecture

```
telegram-mini-app/
├── index.html          # Main app (Telegram WebApp)
├── style.css           # Neon Cyber theme
├── app.js              # Frontend logic
├── bot.py              # Telegram bot (launches Mini App)
├── requirements.txt    # Python deps
└── README.md
```

## 📝 License

MIT — use freely, modify freely, ship freely.

---

<p align="center">
  <strong>Built by <a href="https://github.com/daffafirmansyah">daffafirmansyah</a></strong>
</p>
