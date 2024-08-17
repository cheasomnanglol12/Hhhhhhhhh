const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const EVENTS_DELAY = 20000;
// Telegram Bot Token
const token = '7155340212:AAEr9LvlU-dRJHjGff62c1zH1SaQ0E1Lo9A';
const bot = new TelegramBot(token, { polling: true });

const games = {
    1: {
        name: 'Riding Extreme 3D',
        appToken: 'd28721be-fd2d-4b45-869e-9f253b554e50',
        promoId: '43e35910-c168-4634-ad4f-52fd764a843f',
    },
    2: {
        name: 'Chain Cube 2048',
        appToken: 'd1690a07-3780-4068-810f-9b5bbf2931b2',
        promoId: 'b4170868-cef0-424f-8eb9-be0622e8e8e3',
    },
    3: {
        name: 'My Clone Army',
        appToken: '74ee0b5b-775e-4bee-974f-63e7f4d5bacb',
        promoId: 'fe693b26-b342-4159-8808-15e3ff7f8767',
    },
    4: {
        name: 'Train Miner',
        appToken: '82647f43-3f87-402d-88dd-09a90025313f',
        promoId: 'c4480ac7-e178-4973-8061-9ed5b2e17954',
    },
    5: {
        name: 'Merge Away',
        appToken: '8d1cc2ad-e097-4b86-90ef-7a27e19fb833',
        promoId: 'dc128d28-c45b-411c-98ff-ac7726fbaea4'
    },
    6: {
        name: 'Twerk Race 3D',
        appToken: '61308365-9d16-4040-8bb0-2f4a4c69074c',
        promoId: '61308365-9d16-4040-8bb0-2f4a4c69074c'
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const gameOptions = Object.entries(games).map(
        ([id, game]) => `${id}. ${game.name}`
    ).join('\n');
    bot.sendMessage(chatId, `Select a game by number:\n${gameOptions}`);
});

bot.onText(/^\d+$/, async (msg) => {
    const chatId = msg.chat.id;
    const gameChoice = parseInt(msg.text);
    const game = games[gameChoice];

    if (!game) {
        bot.sendMessage(chatId, 'Invalid selection. Please try again.');
        return;
    }

    bot.sendMessage(chatId, `You selected: ${game.name}. How many keys do you want (1-4)?`);
    bot.once('message', async (response) => {
        const keyCount = parseInt(response.text);
        if (isNaN(keyCount) || keyCount < 1 || keyCount > 4) {
            bot.sendMessage(chatId, 'Invalid number of keys. Please select a number between 1 and 4.');
            return;
        }

        bot.sendMessage(chatId, `Generating ${keyCount} promo keys for ${game.name}...`);

        try {
            let promoKeys = [];
            for (let i = 0; i < keyCount; i++) { // Generate the requested number of promo codes
                const clientId = generateClientId();
                const clientToken = await login(clientId, game.appToken);
                
                for (let j = 0; j < 11; j++) {
                    await sleep(EVENTS_DELAY * delayRandom());
                    const hasCode = await emulateProgress(clientToken, game.promoId);
                    if (hasCode) break;
                }
                
                const key = await generateKey(clientToken, game.promoId);
                promoKeys.push(key);
            }

            bot.sendMessage(chatId, `Here are your promo keys for ${game.name}:\n` + promoKeys.join('\n'));
        } catch (error) {
            bot.sendMessage(chatId, `Failed to generate keys: ${error.message}`);
        }
    });
});

const generateClientId = () => {
    const timestamp = Date.now();
    const randomNumbers = Array.from({ length: 19 }, () => Math.floor(Math.random() * 10)).join('');
    return `${timestamp}-${randomNumbers}`;
};

const login = async (clientId, appToken) => {
    const response = await fetch('https://api.gamepromo.io/promo/login-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appToken, clientId, clientOrigin: 'deviceid' })
    });
    if (!response.ok) throw new Error('Failed to login');
    return (await response.json()).clientToken;
};

const emulateProgress = async (clientToken, promoId) => {
    const response = await fetch('https://api.gamepromo.io/promo/register-event', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            promoId,
            eventId: generateUUID(),
            eventOrigin: 'undefined'
        })
    });
    return response.ok && (await response.json()).hasCode;
};

const generateKey = async (clientToken, promoId) => {
    const response = await fetch('https://api.gamepromo.io/promo/create-code', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ promoId })
    });
    if (!response.ok) throw new Error('Failed to generate key');
    return (await response.json()).promoCode;
};

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const delayRandom = () => Math.random() / 3 + 1;
