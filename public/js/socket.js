// Socket.io initialization and real-time event handlers

CoffeePOS.prototype.initSocket = function () {
    this.socket = io();

    this.socket.on('connect',    () => console.log('🔌 Connected to real-time server'));
    this.socket.on('disconnect', () => console.log('🔌 Disconnected from real-time server'));

    this.socket.on('user-status',      data => this.handleUserStatus(data));
    this.socket.on('user-created',     data => this.handleUserCreated(data));
    this.socket.on('user-updated',     data => this.handleUserUpdated(data));
    this.socket.on('user-deleted',     data => this.handleUserDeleted(data));
    this.socket.on('order-created',    data => this.handleOrderCreated(data));
    this.socket.on('order-deleted',    data => this.handleOrderDeleted(data));
    this.socket.on('product-created',  data => this.handleProductCreated(data));
    this.socket.on('product-updated',  data => this.handleProductUpdated(data));
    this.socket.on('product-deleted',  data => this.handleProductDeleted(data));
};

// ── Event handlers ────────────────────────────────────────────────────────────

CoffeePOS.prototype.handleUserStatus = function (data) {
    if (data.type === 'online') {
        this.onlineUsers.set(data.userId, { username: data.username, fullname: data.fullname, online: true });
        this.showToast(`${data.fullname} បានចូលប្រើប្រាស់ (${data.onlineCount} អ្នក)`, 'success');
    } else {
        this.onlineUsers.delete(data.userId);
        console.log(`📊 Online users: ${data.onlineCount}`);
    }
};

CoffeePOS.prototype.handleUserCreated = function (data) {
    console.log('👤 User created:', data);
    this.showToast('អ្នកប្រើប្រាស់ថ្មីត្រូវបានបន្ថែម!', 'success');
    if (this.currentPage === 'users') this.renderUsers();
};

CoffeePOS.prototype.handleUserUpdated = function (data) {
    console.log('👤 User updated:', data);
    this.showToast('អ្នកប្រើប្រាស់ត្រូវបានកែសម្រួល!', 'success');
    if (this.currentPage === 'users') this.renderUsers();
    if (this.currentUser && data.id === this.currentUser.id) {
        this.currentUser.role        = data.role;
        this.currentUser.permissions = data.permissions;
    }
};

CoffeePOS.prototype.handleUserDeleted = function (data) {
    console.log('👤 User deleted:', data);
    this.showToast('អ្នកប្រើប្រាស់ត្រូវបានលុប!', 'warning');
    if (this.currentPage === 'users') this.renderUsers();
};

CoffeePOS.prototype.handleOrderCreated = function (data) {
    console.log('🛒 Order created:', data);
    this.showToast('ការលក់ថ្មីត្រូវបានបង្កើត!', 'success');
    if (this.currentPage === 'orders')  this.renderOrders();
    if (this.currentPage === 'reports') this.generateReports();
};

CoffeePOS.prototype.handleOrderDeleted = function (data) {
    console.log('🗑️ Order deleted:', data);
    this.showToast('ការលក់ត្រូវបានលុប!', 'warning');
    if (this.currentPage === 'orders')  this.renderOrders();
    if (this.currentPage === 'reports') this.generateReports();
};

CoffeePOS.prototype.handleProductCreated = function (data) {
    console.log('📦 Product created:', data);
    this.showToast('មុខម្ហូបថ្មីត្រូវបានបន្ថែម!', 'success');
    if (this.currentPage === 'pos')   this.renderProducts();
    if (this.currentPage === 'items') this.renderItems();
};

CoffeePOS.prototype.handleProductUpdated = function (data) {
    console.log('📦 Product updated:', data);
    this.showToast('មុខម្ហូបត្រូវបានកែសម្រួល!', 'success');
    if (this.currentPage === 'pos')   this.renderProducts();
    if (this.currentPage === 'items') this.renderItems();
};

CoffeePOS.prototype.handleProductDeleted = function (data) {
    console.log('🗑️ Product deleted:', data);
    this.showToast('មុខម្ហូបត្រូវបានលុប!', 'warning');
    if (this.currentPage === 'pos')   this.renderProducts();
    if (this.currentPage === 'items') this.renderItems();
};
