require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN missing in .env');
}

const bot = new TelegramBot(token, { polling: true });

// Registered Users Storage
const registeredUsers = new Map(); // email -> { telegramId, registeredAt }

console.log('🤖 @gadaap2p_bot is running with enhanced email parser...');

// 1. Command /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from && msg.from.first_name ? msg.from.first_name : 'User';

  const text = 
    `👋 *Welcome, \${firstName}!*\n\n` +
    `This is the official **GadaaP2P Exchange Bot**.\n\n` +
    `📌 *Registration Step:*\n` +
    `Please type and send your **Email Address** in this chat to enable web registration.\n\n` +
    `*Example:* \`example@gmail.com\``;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// 2. Flexible & Smart Email Handler
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const rawText = msg.text ? msg.text.trim() : '';

  if (!rawText || rawText.startsWith('/')) return;

  // Smart Regex to extract valid email even if user types extra text
  const extractedEmail = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  if (extractedEmail) {
    const email = extractedEmail[0].toLowerCase();
    
    // Save email into Bot memory
    registeredUsers.set(email, { telegramId: chatId, registeredAt: new Date() });

    const confirmationMsg = 
      `🎉 *Registration Successful!*\n\n` +
      `✅ *Registered Email:* \`${email}\`\n` +
      `🆔 *Telegram ID:* \`${chatId}\`\n\n` +
      `Your email is now registered on GadaaP2P! You can proceed to login on the website.`;

    bot.sendMessage(chatId, confirmationMsg, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(
      chatId, 
      `⚠️ *Invalid Email Format!*\n\nPlease make sure your input contains a valid email address.\n*Example:* \`name@gmail.com\``, 
      { parse_mode: 'Markdown' }
    );
  }
});

// Helper Function
function isEmailRegisteredOnBot(email) {
  return registeredUsers.has(email.toLowerCase());
}

module.exports = { bot, isEmailRegisteredOnBot };
