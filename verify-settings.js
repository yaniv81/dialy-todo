import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const PORT = process.env.PORT || 5000;
const client = wrapper(axios.create({ jar, withCredentials: true, baseURL: `http://localhost:${PORT}` }));

async function runTest() {
    try {
        console.log('1. Registering/Logging in...');
        // Try login first, or register if fails (simplified)
        // Actually, assuming a dev env, let's just register a temp user or login as existing.
        // Let's try to register a unique user for this test.
        const email = `test_settings_${Date.now()}@test.com`;
        const password = 'password123';

        await client.post('/api/auth/register', { email, password });
        const loginRes = await client.post('/api/auth/login', { email, password });
        console.log('Logged in:', loginRes.data.user.email);

        console.log('2. checking initial settings...');
        const meRes1 = await client.get('/api/auth/me');
        console.log('Initial Settings:', meRes1.data.user.settings);

        console.log('3. Updating settings...');
        const updateRes = await client.patch('/api/user/settings', {
            defaultRepeatEveryDay: true,
            defaultRepeatEveryOtherDay: false,
            hideCategories: true
        });
        console.log('Update Response Settings:', updateRes.data.user.settings);

        if (updateRes.data.user.settings.defaultRepeatEveryDay !== true ||
            updateRes.data.user.settings.hideCategories !== true) {
            throw new Error('Update failed to reflect in response');
        }

        console.log('4. Verifying persistence...');
        const meRes2 = await client.get('/api/auth/me');
        console.log('Persisted Settings:', meRes2.data.user.settings);

        if (meRes2.data.user.settings.defaultRepeatEveryDay !== true) {
            throw new Error('Persistence check failed');
        }

        console.log('SUCCESS: Settings API verification passed.');

    } catch (err) {
        console.error('TEST FAILED:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', err.response.data);
        } else if (err.request) {
            console.error('No response received (Possible Network Error)');
        } else {
            console.error('Error setup:', err);
        }
    }
}

runTest();
