require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN missing in .env');
}

const bot = new TelegramBot(token, { polling: true });

const registeredUsers = new Map(); // email -> { telegramId, registeredAt }
const otpStore = new Map(); // email -> otpCode

console.log('🤖 @gadaap2p_bot started successfully in English...');

// 1. Command /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'User';

  const text = 
    `👋 *Welcome, \${firstName}!*\n\n` +
    `This is the official **GadaaP2P Exchange** Bot.\n\n` +
    `📌 *Registration Step:*\n` +
    `To register on the GadaaP2P website, please send your **Email address** in this chat first.\n\n` +
    `*Example:* \`example@gmail.com\``;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// 2. Email Verification via Message
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;
  if (emailRegex.test(text)) {
    const email = text.toLowerCase();
    registeredUsers.set(email, { telegramId: chatId, registeredAt: new Date() });

    bot.sendMessage(
      chatId,
      `✅ *Email Registered Successfully!*\n\n` +
      `Email: \`\${email}\` \n` +
      `Telegram ID: \`\${chatId}\` \n\n` +
      `Now you can return to the GadaaP2P website and sign up using this email!`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Helper: Send OTP via Bot
async function sendTelegramOTP(email, otpCode) {
  const userData = registeredUsers.get(email.toLowerCase());
  if (!userData) {
    return { success: false, message: 'This email is not registered on the bot yet!' };
  }

  try {
    const message = 
      `🔐 *GadaaP2P Security Code*\n\n` +
      `Your OTP Verification Code is: *${otpCode}*\n\n` +
      `This code expires in 5 minutes. Do not share it with anyone!`;

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
