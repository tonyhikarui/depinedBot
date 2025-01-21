import { saveToFile, delay, readFile } from './utils/helper.js';
import log from './utils/logger.js'
import Mailjs from '@cemalgnlts/mailjs';
import banner from './utils/banner.js';

import {
    registerUser,
    createUserProfile,
    confirmUserReff,
    getUserRef
} from './utils/api.js'
const mailjs = new Mailjs();

const main = async () => {
    log.info(banner);
    log.info(`proccesing run auto register (CTRL + C to exit)`);
    await delay(3);
    const tokens = await readFile("tokens.txt")
    for (let i = 0; i < 5; i++) {
        for (const token of tokens) {
            const response = await getUserRef(token);
            if (!response?.data?.is_referral_active) continue;
            const reffCode = response?.data?.referral_code;
            log.info(`Found new active referral code:`, reffCode);
            if (reffCode) {
                await saveToFile('reffCode.txt', reffCode + '\n', true);
                //log.info('Appended referral code to reffCode.txt');
                console.log(`Referral code: ${reffCode}`);
      
            }
        };
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

main();
