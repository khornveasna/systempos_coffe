// Socket.io initialization and real-time event handlers

CoffeePOS.prototype.initSocket = function () {
    this.socket = io();

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
    }
};

CoffeePOS.prototype.handleUserCreated = function (data) {
    this.showToast('អ្នកប្រើបរាស់ថ្មីត្រូវបានបន្ថែម!', 'success');
    if (this.currentPage === 'users') this.renderUsers();
};

CoffeePOS.prototype.handleUserUpdated = function (data) {
    this.showToast('អ្នកបរើប្រាស់ត្រូវបានកែសម្រួល!', 'success');
    if (this.currentPage === 'users') this.renderUsers();
    if (this.currentUser && data.id === this.currentUser.id) {
        this.currentUser.role        = data.role;
        this.currentUser.permissions = data.permissions;
    }
};

CoffeePOS.prototype.handleUserDeleted = function (data) {
    this.showToast('អ្នកប្រើប្រាស់ត្រូវបានលុប!', 'warning');
    if (this.currentPage === 'users') this.renderUsers();
};

CoffeePOS.prototype.handleOrderCreated = function (data) {
    this.showToast('ការលក់ថ្មីត្រូវបានបង្កើត!', 'success');
    if (this.currentPage === 'orders')  this.renderOrders();
    if (this.currentPage === 'reports') this.generateReports();
};

CoffeePOS.prototype.handleOrderDeleted = function (data) {
    this.showToast('ការលក់ត្រូវបានលុប!', 'warning');
    if (this.currentPage === 'orders')  this.renderOrders();
    if (this.currentPage === 'reports') this.generateReports();
};

CoffeePOS.prototype.handleProductCreated = function (data) {
    this.showToast('មុខទំនិញថ្មីត្រូវបានបន្ថែម!', 'success');
    if (this.currentPage === 'pos')   this.renderProducts();
    if (this.currentPage === 'items') this.renderItems();
};

CoffeePOS.prototype.handleProductUpdated = function (data) {
    this.showToast('មុខទំនិញត្រូវបានកែសម្រួល!', 'success');
    if (this.currentPage === 'pos')   this.renderProducts();
    if (this.currentPage === 'items') this.renderItems();
};

CoffeePOS.prototype.handleProductDeleted = function (data) {
    this.showToast('មុខទំនិញត្រូវបានលុប!', 'warning');
    if (this.currentPage === 'pos')   this.renderProducts();
    if (this.currentPage === 'items') this.renderItems();
};
