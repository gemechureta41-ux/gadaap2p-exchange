require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN missing in .env');
}

const bot = new TelegramBot(token, { polling: true });

// Memory Stores
const registeredUsers = new Map(); // email -> { telegramId, registeredAt }
const otpStore = new Map(); // email -> { code, expiresAt }

console.log('🤖 @gadaap2p_bot with OTP Security Engine is running...');

// 1. Command /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from && msg.from.first_name ? msg.from.first_name : 'User';

  const text = 
    `👋 *Welcome, \${firstName}!*\n\n` +
    `This is the official **GadaaP2P Exchange Bot**.\n\n` +
    `📌 *Registration Requirement:*\n` +
    `Please send your **Email Address** in this chat to enable web registration and receive secure login OTP codes.\n\n` +
    `*Example:* \`example@gmail.com\``;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// 2. Email Registration Handler
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const rawText = msg.text ? msg.text.trim() : '';

  if (!rawText || rawText.startsWith('/')) return;

  const extractedEmail = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  if (extractedEmail) {
    const email = extractedEmail[0].toLowerCase();
    registeredUsers.set(email, { telegramId: chatId, registeredAt: new Date() });

    const confirmationMsg = 
      `🎉 *Registration Successful!*\n\n` +
      `✅ *Registered Email:* \`\${email}\`\n` +
      `🆔 *Telegram ID:* \`\${chatId}\`\n\n` +
      `Your email is connected! When logging in on the GadaaP2P website, verification OTP codes will be sent right here.`;

    bot.sendMessage(chatId, confirmationMsg, { parse_mode: 'Markdown' });
  }
});

// 3. Helper: Generate & Send OTP Code to Telegram Chat
async function sendTelegramOTP(email) {
  const user = registeredUsers.get(email.toLowerCase());
  if (!user) {
    return { 
      success: false, 
      message: 'This email is not registered on @gadaap2p_bot! Please start the bot and send your email first.' 
    };
  }

  // Generate 6-Digit Random OTP Code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // Expire in 5 minutes

  otpStore.set(email.toLowerCase(), { code: otpCode, expiresAt });

  try {
    const message = 
      `🔐 *GadaaP2P Security OTP*\n\n` +
      `Your verification OTP code is: *${otpCode}*\n\n` +
      `Enter this code on the website to complete your login. Valid for 5 minutes. Do not share it!`;

    await bot.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
    return { success: true, message: 'OTP sent to your Telegram bot!' };
  } catch (err) {
    return { success: false, message: 'Failed to send Telegram message: ' + err.message };
  }
}

// 4. Helper: Verify OTP Code
function verifyOTP(email, inputCode) {
  const storedOtp = otpStore.get(email.toLowerCase());
  if (!storedOtp) return { valid: false, message: 'No OTP code requested. Please request a new code.' };

  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: 'OTP code has expired. Please request a new one.' };
  }

  if (storedOtp.code === inputCode) {
    otpStore.delete(email.toLowerCase()); // Clear OTP after success
    return { valid: true };
  }

  return { valid: false, message: 'Invalid OTP code! Check your Telegram bot and try again.' };
}

function isEmailRegisteredOnBot(email) {
  return registeredUsers.has(email.toLowerCase());
}

module.exports = { bot, sendTelegramOTP, verifyOTP, isEmailRegisteredOnBot };
