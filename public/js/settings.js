// Settings Module - Logo Management
class SettingsModule {
    constructor(pos) {
        this.pos = pos;
        this.currentLogo = '/assets/mt_logo.png';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadLogoOnStartup();
    }

    bindEvents() {
        const logoFileInput = document.getElementById('logoFileInput');
        if (logoFileInput) {
            logoFileInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        }
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            
            if (!response.ok) {
                if (response.status === 429) {
                    this.pos.showToast('សូមរង់ចាំបន្តិច រួចសាកម្តងទត', 'warning');
                }
                return;
            }
            
            const data = await response.json();

            if (data.success && data.settings) {
                if (data.settings.systemLogo) {
                    this.currentLogo = data.settings.systemLogo;
                    this.updateAllLogos(this.currentLogo);
                    const logoName = data.settings.systemLogoName || 'custom-logo.png';
                    const logoNameEl = document.getElementById('currentLogoName');
                    if (logoNameEl) {
                        logoNameEl.textContent = logoName;
                    }
                }
            }
        } catch (error) {
            this.pos.showToast('កំហុសក្នុងការទាញយកទិន្ននយ', 'error');
        }
    }

    async loadLogoOnStartup() {
        try {
            const response = await fetch('/api/settings');
            
            if (!response.ok) {
                return;
            }
            
            const data = await response.json();

            if (data.success && data.settings && data.settings.systemLogo) {
                this.updateAllLogos(data.settings.systemLogo);
            }
        } catch (error) {
            // Silently fail on startup
        }
    }

    async handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            alert('សូមជ្រើសរើសឯកសាររូបភាព (PNG, JPG, SVG, ឬ GIF)');
            event.target.value = '';
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('ទំហំឯកសារត្រូវតែតូចជាង 2MB');
            event.target.value = '';
            return;
        }

        try {
            // Convert to base64
            const base64 = await this.fileToBase64(file);
            
            // Update preview
            document.getElementById('logoPreview').src = base64;
            document.getElementById('currentLogoName').textContent = file.name;

            // Save to server
            await this.saveLogo(base64, file.name);

            // Update all logo instances
            this.updateAllLogos(base64);

            // Success message
            this.showNotification('ឡូហគោត្រូវបានផ្ទុកើង និងអាប់ដេតដោយជោគជ័យ!', 'success');
        } catch (error) {
            alert('មានកំហុសក្នុងការផ្ទុកឡើងឡូហ្គោ។ សូមព្យាយាមម្តងទៀត។');
        }

        // Reset file input
        event.target.value = '';
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async saveLogo(base64, filename) {
        try {
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    settings: {
                        systemLogo: base64,
                        systemLogoName: filename
                    }
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to save logo');
            }

            this.currentLogo = base64;
        } catch (error) {
            throw error;
        }
    }

    updateAllLogos(base64) {
        // Update favicon
        let favicon = document.querySelector("link[rel='icon']");
        if (!favicon) {
            favicon = document.querySelector("link[rel='shortcut icon']");
        }
        
        if (favicon) {
            favicon.href = base64;
            if (!favicon.getAttribute('rel').includes('icon')) {
                favicon.setAttribute('rel', 'icon');
            }
        } else {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.type = 'image/png';
            favicon.href = base64;
            document.head.appendChild(favicon);
        }

        // Update login screen logo
        const loginLogo = document.querySelector('.login-logo img');
        if (loginLogo) {
            loginLogo.src = base64;
        }

        // Update sidebar logo
        const sidebarLogo = document.querySelector('.sidebar-header .sidebar-logo');
        if (sidebarLogo) {
            sidebarLogo.src = base64;
        }

        // Update preview
        const logoPreview = document.getElementById('logoPreview');
        if (logoPreview) {
            logoPreview.src = base64;
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
            color: white;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModule;
}
