import { saveToFile, delay, readFile } from './utils/helper.js';
import log from './utils/logger.js'
import Mailjs from '@cemalgnlts/mailjs';
import banner from './utils/banner.js';
import TelegramBot from 'node-telegram-bot-api';
import { BOT_TOKEN, CHAT_ID } from './config/botConfig.js';

import {
    registerUser,
    createUserProfile,
    confirmUserReff,
    getUserRef
} from './utils/api.js'

const mailjs = new Mailjs();
let messageResolver = null;
let botInstance = null;
let currentToken = null;

// Add send message function
const sendTelegramMessage = async (message) => {
    try {
        if (botInstance) {
            await botInstance.sendMessage(CHAT_ID, message);
        }
    } catch (error) {
        log.error('Failed to send Telegram message:', error.message);
    }
};

// Add bot initialization function with retry
const initBot = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const bot = new TelegramBot(BOT_TOKEN, {
                polling: true,
                webHook: false,
                testEnvironment: false, // Add this to ensure production environment
                baseApiUrl: "https://api.telegram.org", // Explicitly set API URL
            });

            // Test connection
            const botInfo = await bot.getMe();
            log.info(`Bot connected successfully: @${botInfo.username}`);
            
            // Set up message handlers
            bot.on('message', (msg) => {
                log.info('Received message:', msg.text);
                log.info('From chat ID:', msg.chat.id);
                handleMessage(msg);
            });

            bot.on('polling_error', (error) => {
                log.error('Polling error:', error.message);
            });

            bot.on('error', (error) => {
                log.error('Bot error:', error.message);
            });

            botInstance = bot; // Store bot instance globally
            await sendTelegramMessage('🚀 Bot is online and ready to receive referral codes');
            return bot;

        } catch (error) {
            log.error(`Bot initialization attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) {
                throw new Error('Failed to initialize bot after multiple attempts');
            }
            await delay(5); // Wait 5 seconds before retry
        }
    }
};

// Initialize bot before starting main process
const startApp = async () => {
    try {
        await initBot(); // Initialize bot first
        await main(); // Then start main process
    } catch (error) {
        log.error('Fatal error:', error.message);
        process.exit(1);
    }
};

const waitForNewReffCode = () => {
    return new Promise((resolve) => {
        messageResolver = resolve; // Store resolver for use in message handler
        sendTelegramMessage('🤖 Ready to receive referral code. Please send it now...');
    });
};

// Add helper function for referral confirmation
const confirmReferralCode = async (token, refCode, taskIndex) => {
    try {
        const confirm = await confirmUserReff(token, refCode);
        if (confirm?.code === 200 && confirm?.data?.token) {
            return {
                success: true,
                token: confirm.data.token,
                userId: confirm.data.user_id,
                message: confirm.message
            };
        }
        
        // Handle null response or error cases
        const errorMessage = confirm?.error || confirm?.message || "Unknown error";
        return {
            success: false,
            error: errorMessage
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
};

// Update message handler to only resolve the promise
const handleMessage = async (msg) => {
    log.info('Processing message:', msg.text, 'from chat:', msg.chat.id);
    log.info('MessageResolver status:', messageResolver ? 'active' : 'inactive');
    log.info('Current token status:', currentToken ? 'available' : 'not available');
    
    if (msg.chat.id.toString() === CHAT_ID) {
        const newReffCode = msg.text.trim();
        
        if (!messageResolver) {
            await sendTelegramMessage('⚠️ Not waiting for referral code yet. Please wait for the prompt.');
            return;
        }
        
        if (!currentToken) {
            await sendTelegramMessage('⚠️ Account token not ready. Please wait...');
            return;
        }

        log.info('✅ Received referral code:', newReffCode);
        messageResolver(newReffCode);
        messageResolver = null;
    }
};

const processReferralCode = async (email, password, taskIndex) => {
    while (true) {
        log.info(`Task [${taskIndex}] - Waiting for Telegram referral code...`);
        messageResolver = null;
        const newReffCode = await waitForNewReffCode();
        
        await sendTelegramMessage(`🔄 Attempting to use referral code: ${newReffCode}`);
        const result = await confirmReferralCode(currentToken, newReffCode, taskIndex);
        
        if (result.success) {
            await saveToFile("./result/accounts_ref.txt", `${email}|${password}`);
            await saveToFile("./result/tokens_ref.txt", `${result.token}`);
            await sendTelegramMessage(`✅ Successfully used referral code!\nEmail: ${email}\nPassword: ${password}\nMessage: ${result.message}`);
            
            // Create new account for next task
            let newAccount = await mailjs.createOneAccount();
            while (!newAccount?.data?.username) {
                log.warn('Failed To Generate New Email, Retrying...');
                await delay(3)
                newAccount = await mailjs.createOneAccount();
            }

            const newEmail = newAccount.data.username;
            const newPassword = newAccount.data.password;

            log.info(`Created new account for next task: ${newEmail}|${newPassword}`);
            await sendTelegramMessage(`🔄 Created new account for next task: ${newEmail}|${newPassword}`);
            
            return {
                success: true,
                newAccount: {
                    email: newEmail,
                    password: newPassword
                }
            };
        } else {
            await sendTelegramMessage(`❌ Failed to use referral code: ${result.error}\n🔄 Please send another code...`);
            continue;
        }
    }
};

const main = async () => {
    log.info(banner);
    log.info(`proccesing run auto register (CTRL + C to exit)`);
    await delay(3);
    const tokens = await readFile("tokens.txt")
    const reffCodes = await readFile("reffCodes.txt")
    let taskIndex = 1;
    if (false) {
        for (let i = 0; i < 5; i++) {
            for (const token of tokens) {
                const response = await getUserRef(token);
                if (!response?.data?.is_referral_active) continue;
                const reffCode = response?.data?.referral_code;
                log.info(`Found new active referral code:`, reffCode);
                if (reffCode) {
                    try {
                        let account = await mailjs.createOneAccount();
                        while (!account?.data?.username) {
                            log.warn('Failed To Generate New Email, Retrying...');
                            await delay(3)
                            account = await mailjs.createOneAccount();
                        }

                        const email = account.data.username;
                        const password = account.data.password;

                        log.info(`Trying to register email: ${email}`);
                        let regResponse = await registerUser(email, password, null);
                        while (!regResponse?.data?.token) {
                            log.warn('Failed To Register, Retrying...');
                            await delay(3)
                            regResponse = await registerUser(email, password, null);
                        }
                        const token = regResponse.data.token;

                        log.info(`Trying to create profile for ${email}`);
                        await createUserProfile(token, { step: 'username', username: email });
                        await createUserProfile(token, { step: 'description', description: "AI Startup" });


                        let confirm = await confirmUserReff(token, reffCode);
                        while (!confirm?.data?.token) {
                            log.warn('Failed To Confirm Referral, Retrying...');
                            await delay(3)
                            confirm = await confirmUserReff(token, reffCode);
                        }

                        await saveToFile("accounts.txt", `${email}|${password}`)
                        await saveToFile("tokens.txt", `${confirm.data.token}`)

                    } catch (err) {
                        log.error('Error creating account:', err.message);
                    }
                }
            };
        }
    }


    try {
        let account = await mailjs.createOneAccount();
        while (!account?.data?.username) {
            log.warn('Failed To Generate New Email, Retrying...');
            await delay(3)
            account = await mailjs.createOneAccount();
        }

        while (true) { // Continue with new accounts
            const email = account.data.username;
            const password = account.data.password;

            log.info(`Processing task ${taskIndex} with email: ${email}`);
            let regResponse = await registerUser(email, password, null);
            while (!regResponse?.data?.token) {
                log.warn('Failed To Register, Retrying...');
                await delay(3)
                regResponse = await registerUser(email, password, null);
            }
            currentToken = regResponse.data.token; // Update global token

            log.info(`Trying to create profile for ${email}`);
            await createUserProfile(currentToken, { step: 'username', username: email });
            await createUserProfile(currentToken, { step: 'description', description: "AI Startup" });

            const result = await processReferralCode(email, password, taskIndex);
            if (result.success) {
                taskIndex++;
                account = {
                    data: {
                        username: result.newAccount.email,
                        password: result.newAccount.password
                    }
                };
            }
        }
    } catch (err) {
        log.error('Error in main process:', err.message);
    }
};

// Handle CTRL+C (SIGINT)
process.on('SIGINT', () => {
    log.info('SIGINT received. Exiting...');
    process.exit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    log.error('Uncaught exception:', err);
    process.exit(1);
});

// Replace main() call with startApp()
startApp();
