require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN missing in .env');
}

const bot = new TelegramBot(token, { polling: true });

// Memory Database (Production irratti Supabase/PostgreSQL'n bakka bu'a)
const registeredUsers = new Map(); // telegramId -> { email, verified }
const otpStore = new Map(); // email -> otpCode

console.log('🤖 @gadaap2p_bot milkaa\'inaan hojii jalqabeera...');

// 1. Command /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'User';

  const text = 
    `👋 *Baga Nagaan Dhufte, \${firstName}!*\n\n` +
    `Kun Official Bot **GadaaP2P Exchange** ti.\n\n` +
    `📌 *Tarkaanfii Galmee (Registration Step):*\n` +
    `Webisaayitii GadaaP2P irratti galmaa'uuf, dursa **Email** kee chat kana keessatti ergi.\n\n` +
    `*Fakkeenya:* \`example@gmail.com\``;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// 2. Email Verification via Message
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  // Check if text is a valid email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;
  if (emailRegex.test(text)) {
    const email = text.toLowerCase();
    registeredUsers.set(email, { telegramId: chatId, registeredAt: new Date() });

    bot.sendMessage(
      chatId,
      `✅ *Email Galmeeffameera!*\n\n` +
      `Email: \`\${email}\` \n` +
      `Telegram ID: \`\${chatId}\` \n\n` +
      `Amma gara Webisaayitii GadaaP2P deebi'uudhaan Email kanaan galmaa'uu dandeessa!`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Send OTP Helper
async function sendTelegramOTP(email, otpCode) {
  const userData = registeredUsers.get(email.toLowerCase());
  if (!userData) {
    return { success: false, message: 'Email kun bot irratti galmaa\'ee hin jiru!' };
  }

  try {
    const message = 
      `🔐 *GadaaP2P Security Code*\n\n` +
      `Koodii Verification OTP keessan: *${otpCode}*\n\n` +
      `Koodiin kun daqiiqaa 5 qofaf tura. Nama kamiyyuuf hin kenninaa!`;

    await bot.sendMessage(userData.telegramId, message, { parse_mode: 'Markdown' });
    otpStore.set(email.toLowerCase(), otpCode);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function isEmailRegisteredOnBot(email) {
  return registeredUsers.has(email.toLowerCase());
}

function verifyOTP(email, code) {
  const storedCode = otpStore.get(email.toLowerCase());
  return storedCode === code;
}

module.exports = { bot, sendTelegramOTP, isEmailRegisteredOnBot, verifyOTP };
