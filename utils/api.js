import randomUseragent from 'random-useragent';
import axios from 'axios';
import log from './logger.js';
import {
    newAgent
} from './helper.js'

const userAgent = randomUseragent.getRandom();
const headers = {
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": userAgent,
}

export const registerUser = async (email, password) => {
    const url = 'https://api.depined.org/api/user/register';

    try {
        const response = await axios.post(url, { email, password }, {
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        });
        log.info('User registered successfully:', response.data.message);
        return response.data;
    } catch (error) {
        log.error('Error registering user:', error.response ? error.response.data : error.message);
        return null;
    }
};

export const loginUser = async (email, password) => {
    const url = 'https://api.depined.org/api/user/login';

    try {
        const response = await axios.post(url, { email, password }, {
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        });
        log.info('User Login successfully:', response.data.message);
        return response.data;
    } catch (error) {
        log.error('Error Login user:', error.response ? error.response.data : error.message);
        return null;
    }
};

export const createUserProfile = async (token, payload) => {
    const url = 'https://api.depined.org/api/user/profile-creation';

    try {
        const response = await axios.post(url, payload, {
            headers: {
                ...headers,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        log.info('Profile created successfully:', payload);
        return response.data;
    } catch (error) {
        log.error('Error creating profile:', error.response ? error.response.data : error.message);
        return null;
    }
};

export const confirmUserReff = async (token, referral_code) => {
    const url = 'https://api.depined.org/api/access-code/referal';

    try {
        const response = await axios.post(url, { referral_code }, {
            headers: {
                ...headers,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        log.info('Confirm User referral successfully:', response.data.message);
        return response.data;
    } catch (error) {
        log.error('Error Confirm User referral:', error.response ? error.response.data : error.message);
        return null;
    }
};

export async function getUserInfo(token, proxy) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://api.depined.org/api/user/details', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });

        return response.data;
    } catch (error) {
        log.error('Error fetching user info:', error.message || error);
        return null;
    }
}
export async function getUserRef(token, proxy) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://api.depined.org/api/referrals/stats', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });

        return response.data;
    } catch (error) {
        log.error('Error fetching user info:', error.message || error);
        return null;
    }
}
export async function getEarnings(token, proxy) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.get('https://api.depined.org/api/stats/epoch-earnings', {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });

        return response.data;
    } catch (error) {
        log.error('Error fetching user info:', error.message || error);
        return null;
    }
}
export async function connect(token, proxy) {
    const agent = newAgent(proxy);
    try {
        const payload = { connected: true }
        const response = await axios.post('https://api.depined.org/api/user/widget-connect', payload, {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });

        return response.data;
    } catch (error) {
        log.error(`Error when update connection: ${error.message}`);
        return null;
    }
} 

export async function claimPoints(token, proxy) {
    const agent = newAgent(proxy);
    try {
        const payload = {}
        const response = await axios.post('https://api.depined.org/api/referrals/claim_points', payload, {
            headers: {
                ...headers,
                'Authorization': 'Bearer ' + token
            },
            httpsAgent: agent,
            httpAgent: agent
        });

        return response.data;
    } catch (error) {
        log.error(`Error when claiming points: ${error.message}`);
        return null;
    }
}