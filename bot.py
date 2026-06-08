"""Telegram Bot — launches the Kudaw Toolkit Mini App."""

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

# Config
BOT_TOKEN = "8632579153:AAEzGFC5hqH4BUOvyJGjLUFCJSEEI0wyYRc"
MINI_APP_URL = "https://YOUR_USERNAME.github.io/telegram-mini-app/"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command — show Mini App button."""
    keyboard = [[
        InlineKeyboardButton(
            text="⚡ Open Kudaw Toolkit",
            web_app=WebAppInfo(url=MINI_APP_URL)
        )
    ]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "🔥 *Kudaw Toolkit*\n\n"
        "Your all-in-one crypto toolkit:\n"
        "🎯 NFT Drop Tracker\n"
        "🪂 Airdrop Dashboard\n"
        "💳 CC Generator\n"
        "⏰ Cron Job Manager\n\n"
        "Tap the button below to open:",
        reply_markup=reply_markup,
        parse_mode="Markdown"
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    await update.message.reply_text(
        "📋 *Available Commands:*\n\n"
        "/start — Open Mini App\n"
        "/help — Show this help\n"
        "/drops — Quick NFT drops summary\n"
        "/ccgen <BIN> — Quick CC generate\n",
        parse_mode="Markdown"
    )


async def drops(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Quick drops summary."""
    import urllib.request, json
    try:
        req = urllib.request.Request(
            "https://api.opensea.io/api/v2/drops?limit=5",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        data = json.loads(urllib.request.urlopen(req, timeout=10).read())
        drops = data.get("drops", data) if isinstance(data, dict) else data
        
        text = "🎯 *Recent NFT Drops:*\n\n"
        for d in drops[:5]:
            status = "🔴" if d.get("is_minting") else "🟡"
            text += f"{status} {d.get('name', 'Unknown')} — {d.get('total_supply', '?')} supply\n"
        
        await update.message.reply_text(text, parse_mode="Markdown")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")


def main():
    """Start the bot."""
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("drops", drops))

    logger.info("Bot starting...")
    app.run_polling()


if __name__ == "__main__":
    main()
