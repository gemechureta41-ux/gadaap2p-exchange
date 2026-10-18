require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN is missing in .env file!');
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 @gadaap2p_bot milkaa\'inaan hojii jalqabeera...');

// 1. Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'User';

  const welcomeMessage = 
    `👋 *Baga Nagaan Dhufte, ${firstName}!*\n\n` +
    `Kun Bot Official **GadaaP2P Exchange** ti.\n\n` +
    `🆔 *Telegram ID Kee:* \`\${chatId}\` \n\n` +
    `📌 *Hojii Bot Kanaa:*\n` +
    `• Koodii OTP security (Register/Login) erguu.\n` +
    `• Akeekkachiisa bittaa fi gurgurtaa yeruma sanaa (Real-time trade alerts).\n` +
    `• Garee Support waliin wal-qunnamuu.\n\n` +
    `Maaloo ID kana fayyadamtuun Webisaayitii GadaaP2P irratti galmaa'i!`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Helper: Send OTP
async function sendOTPNotification(telegramId, otpCode, actionType = 'REGISTER') {
  try {
    const message = 
      `🔐 *GadaaP2P Security Verification*\n\n` +
      `Koodii OTP keessan [${actionType}]: *${otpCode}*\n\n` +
      `⚠️ *Akeekkachiisa:* Koodiin kun daqiiqaa 5 qofaf tura. Nama kamiyyuuf akka hin kennine!`;

    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP via @gadaap2p_bot:', error);
    return { success: false, error: error.message };
  }
}

// Helper: Support Ticket Notification
async function sendSupportAlert(ticketData) {
  try {
    const message = 
      `🚨 *Support Ticket Haaraa Saaqameera!*\n\n` +
      `👤 User ID: \`\${ticketData.userId}\` \n` +
      `🏷 Category: *${ticketData.category}*\n` +
      `📦 Order ID: *${ticketData.orderId || 'N/A'}*\n` +
      `📝 Description: ${ticketData.description}`;

    if (process.env.ADMIN_CHAT_ID) {
      await bot.sendMessage(process.env.ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    }
    return { success: true };
  } catch (error) {
    console.error('Error sending support alert:', error);
    return { success: false };
  }
}

module.exports = { bot, sendOTPNotification, sendSupportAlert };
