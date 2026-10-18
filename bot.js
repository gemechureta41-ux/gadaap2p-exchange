require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN missing in .env');
}

const bot = new TelegramBot(token, { polling: true });

// Registered Users Storage
const registeredUsers = new Map(); // email -> { telegramId, registeredAt }
const otpStore = new Map(); // email -> otpCode

console.log('🤖 @gadaap2p_bot is live and responsive...');

// 1. Command /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from && msg.from.first_name ? msg.from.first_name : 'User';

  const text = 
    `👋 *Welcome, \${firstName}!*\n\n` +
    `This is the official **GadaaP2P Exchange Bot**.\n\n` +
    `📌 *Registration Requirement:*\n` +
    `Please type and send your **Email Address** in this chat to enable web registration.\n\n` +
    `*Example:* \`example@gmail.com\``;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// 2. Email Registration Handler with Instant Bot Reply
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  if (!text || text.startsWith('/')) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;
  if (emailRegex.test(text)) {
    const email = text.toLowerCase();
    
    // Save email to Bot memory
    registeredUsers.set(email, { telegramId: chatId, registeredAt: new Date() });

    const confirmationMsg = 
      `🎉 *Registration Successful!*\n\n` +
      `✅ *Email:* \`\${email}\`\n` +
      `🆔 *Telegram ID:* \`\${chatId}\`\n\n` +
      `Your email has been successfully saved on GadaaP2P! You can now proceed to login on the website.`;

    bot.sendMessage(chatId, confirmationMsg, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, `⚠️ *Invalid Email Format!* Please enter a valid email address (e.g. name@gmail.com).`, { parse_mode: 'Markdown' });
  }
});

// Helper: Check Email
function isEmailRegisteredOnBot(email) {
  return registeredUsers.has(email.toLowerCase());
}

module.exports = { bot, isEmailRegisteredOnBot };
