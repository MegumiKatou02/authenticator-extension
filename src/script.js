class TOTP {
    constructor(secret, options = {}) {
        this.secret = this.preprocessSecret(secret);
        this.digits = options.digits || 6;
        this.period = options.period || 30;
    }

    preprocessSecret(secret) {
        let cleaned = secret.replace(/\s/g, '').toUpperCase();
        cleaned = cleaned.replace(/[^A-Z2-7]/g, '');
        const padding = '='.repeat((8 - cleaned.length % 8) % 8);
        return cleaned + padding;
    }

    base32ToBuffer(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        let buffer = new Uint8Array(Math.ceil(base32.length * 5 / 8));

        for (let i = 0; i < base32.length; i++) {
            const val = alphabet.indexOf(base32[i]);
            if (val === -1) continue;
            bits += val.toString(2).padStart(5, '0');
        }

        for (let i = 0; i < buffer.length; i++) {
            const byteString = bits.slice(i * 8, (i + 1) * 8) || '0'.repeat(8);
            buffer[i] = parseInt(byteString, 2);
        }

        return buffer;
    }

    async generateToken() {
        try {
            const counter = Math.floor(Date.now() / 1000 / this.period);
            const counterBuffer = new ArrayBuffer(8);
            const view = new DataView(counterBuffer);
            view.setBigUint64(0, BigInt(counter), false);

            const keyBuffer = this.base32ToBuffer(this.secret);
            
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                {
                    name: 'HMAC',
                    hash: { name: 'SHA-1' }
                },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign(
                'HMAC',
                cryptoKey,
                counterBuffer
            );

            const hmac = new Uint8Array(signature);
            const offset = hmac[hmac.length - 1] & 0xf;
            
            const truncatedHash = ((hmac[offset] & 0x7f) << 24) |
                                ((hmac[offset + 1] & 0xff) << 16) |
                                ((hmac[offset + 2] & 0xff) << 8) |
                                (hmac[offset + 3] & 0xff);

            const token = truncatedHash % Math.pow(10, this.digits);
            return token.toString().padStart(this.digits, '0');
        } catch (error) {
            console.error('TOTP generation error:', error);
            throw error;
        }
    }

    getRemainingSeconds() {
        return this.period - (Math.floor(Date.now() / 1000) % this.period);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const addNewBtn = document.getElementById('addNewBtn');
    const addTokenForm = document.getElementById('addTokenForm');
    const tokenForm = document.getElementById('tokenForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const tokenList = document.getElementById('tokenList');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');

    searchInput.addEventListener('input', () => {
        filterTokens(searchInput.value);
    });

    sortSelect.addEventListener('change', () => {
        sortTokens(sortSelect.value);
    });

    async function generateTOTP(secret) {
        const totp = new TOTP(secret);
        return await totp.generateToken();
    }

    addNewBtn.addEventListener('click', () => {
        addTokenForm.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        addTokenForm.classList.add('hidden');
        tokenForm.reset();
    });

    tokenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceName = document.getElementById('serviceName').value;
        const secretKey = document.getElementById('secretKey').value;

        try {
            await addToken(serviceName, secretKey);
            addTokenForm.classList.add('hidden');
            tokenForm.reset();
        } catch (error) {
            console.error('Error adding token:', error);
            alert('Invalid secret key');
        }
    });

    async function addToken(serviceName, secretKey) {
        const tokenItem = document.createElement('div');
        tokenItem.className = 'token-item';
        tokenItem.dataset.timestamp = Date.now(); 
        
        const code = await generateTOTP(secretKey);
        
        tokenItem.innerHTML = `
            <div class="token-header">
                <span>${serviceName}</span>
                <button class="delete-btn">×</button>
            </div>
            <div class="token-content">
                <div class="token-code">${code}</div>
                <button class="copy-btn">Copy</button>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: 100%"></div>
            </div>
        `;

        tokenList.appendChild(tokenItem);
        updateToken(tokenItem, secretKey);

        const copyButton = tokenItem.querySelector('.copy-btn');
        copyButton.addEventListener('click', () => {
            const tokenCode = tokenItem.querySelector('.token-code').textContent;
            navigator.clipboard.writeText(tokenCode)
                .then(() => {
                    copyButton.textContent = '✔';
                    copyButton.style.backgroundColor = '#4CAF50';

                    setTimeout(() => {
                        copyButton.textContent = 'Copy';
                        copyButton.style.backgroundColor = ''; 
                    }, 4000);
                })
                .catch(err => {
                    console.error('Error copying to clipboard: ', err);
                });
        });

        saveToken(serviceName, secretKey);
    }

    function updateToken(tokenItem, secretKey) {
        const totp = new TOTP(secretKey);
        const progressBar = tokenItem.querySelector('.progress');
        const codeElement = tokenItem.querySelector('.token-code');

        async function update() {
            try {
                const timeLeft = totp.getRemainingSeconds();
                progressBar.style.width = `${(timeLeft / 30) * 100}%`;

                if (timeLeft === 30) {
                    const newCode = await generateTOTP(secretKey);
                    codeElement.textContent = newCode;
                }
            } catch (error) {
                console.error('Error updating token:', error);
            }
        }

        setInterval(update, 1000);
        update();
    }

    function saveToken(name, secret) {
        chrome.storage.sync.get(['tokens'], function(result) {
            const tokens = result.tokens || [];
            tokens.push({ name, secret });
            chrome.storage.sync.set({ tokens });
        });
    }

    chrome.storage.sync.get(['tokens'], async function(result) {
        if (result.tokens) {
            for (const token of result.tokens) {
                try {
                    await addToken(token.name, token.secret);
                } catch (error) {
                    console.error('Error loading token:', error);
                }
            }
        }
    });

    tokenList.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) {
            const tokenItem = e.target.closest('.token-item');
            const serviceName = tokenItem.querySelector('.token-header span').textContent;
            
            tokenItem.remove();
            
            chrome.storage.sync.get(['tokens'], function(result) {
                const tokens = result.tokens.filter(t => t.name !== serviceName);
                chrome.storage.sync.set({ tokens });
            });
        }
    });
    const searchHTML = `
    <div class="search-bar">
        <input type="text" id="searchInput" placeholder="Search tokens...">
        <select id="sortSelect">
            <option value="name">Sort by name</option>
            <option value="recent">Sort by recent</option>
        </select>
    </div>
    `;

function filterTokens(searchTerm) {
    const tokens = document.querySelectorAll('.token-item');
    tokens.forEach(token => {
        const name = token.querySelector('.token-header span').textContent.toLowerCase();
        if (name.includes(searchTerm.toLowerCase())) {
            token.style.display = '';
        } else {
            token.style.display = 'none';
        }
    });
}

function sortTokens(criteria) {
    const tokenList = document.getElementById('tokenList');
    const tokens = Array.from(tokenList.children);
    
    tokens.sort((a, b) => {
        if (criteria === 'name') {
            const nameA = a.querySelector('.token-header span').textContent.toLowerCase();
            const nameB = b.querySelector('.token-header span').textContent.toLowerCase();
            return nameA.localeCompare(nameB);
        } else if (criteria === 'recent') {
            const timeA = parseInt(a.dataset.timestamp);
            const timeB = parseInt(b.dataset.timestamp);
            return timeB - timeA;
        }
    });
    
    tokens.forEach(token => tokenList.appendChild(token));
}
});