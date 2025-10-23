// Finance AI - Firebase Integration
// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
         signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, where, 
         deleteDoc, doc, updateDoc, serverTimestamp, orderBy, limit } 
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCumuUK1krB4TiE7fZaOxD0fuNTNUGKrVs",
  authDomain: "finance-ai-da771.firebaseapp.com",
  projectId: "finance-ai-da771",
  storageBucket: "finance-ai-da771.firebasestorage.app",
  messagingSenderId: "300753775543",
  appId: "1:300753775543:web:fd6789aa87ed4bf55d1632",
  measurementId: "G-DK9WZHR20D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Current user
let currentUser = null;

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log('User logged in:', user.email);
        updateUserUI(user);
        if (!document.getElementById('dashboard-page').classList.contains('active')) {
            showPage('dashboard-page');
        }
        loadDashboardData();
    } else {
        currentUser = null;
        console.log('User logged out');
    }
});

// Update UI with user info
function updateUserUI(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    const firstName = displayName.split(' ')[0];
    const initials = displayName.substring(0, 2).toUpperCase();

    document.getElementById('user-name').textContent = displayName;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-avatar').textContent = initials;
    document.getElementById('dashboard-greeting').textContent = `Welcome back, ${firstName}!`;
}

// Authentication Functions
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        showToast('Account created successfully!', 'success');
        showPage('dashboard-page');
    } catch (error) {
        console.error('Signup error:', error);
        showToast(getErrorMessage(error.code), 'error');
    }
});

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        showToast('Welcome back!', 'success');
        showPage('dashboard-page');
    } catch (error) {
        console.error('Login error:', error);
        showToast(getErrorMessage(error.code), 'error');
    }
});

// Google Sign-In
const setupGoogleAuth = () => {
    const provider = new GoogleAuthProvider();

    const handleGoogleSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            showToast('Signed in with Google successfully!', 'success');
            showPage('dashboard-page');
        } catch (error) {
            console.error('Google sign-in error:', error);
            showToast(getErrorMessage(error.code), 'error');
        }
    };

    document.getElementById('google-login-btn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('google-signup-btn')?.addEventListener('click', handleGoogleSignIn);
};

setupGoogleAuth();

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Logged out successfully', 'success');
        showPage('landing-page');
    } catch (error) {
        showToast('Error logging out', 'error');
    }
});

// Load Dashboard Data
async function loadDashboardData() {
    if (!currentUser) return;

    try {
        await Promise.all([
            loadTransactions(),
            loadEmployees(),
            calculateDashboardStats()
        ]);
        initializeCharts();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Transaction Management
document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }

    const description = document.getElementById('txn-description').value;
    let amount = parseFloat(document.getElementById('txn-amount').value);
    const category = document.getElementById('txn-category').value;
    const type = document.getElementById('txn-type').value;

    if (type === 'expense') {
        amount = -Math.abs(amount);
    } else {
        amount = Math.abs(amount);
    }

    try {
        await addDoc(collection(db, 'transactions'), {
            userId: currentUser.uid,
            description,
            amount,
            category,
            type,
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
        });

        showToast('Transaction added successfully!', 'success');
        closeModal('transaction-modal');
        document.getElementById('transaction-form').reset();
        loadTransactions();
        calculateDashboardStats();
    } catch (error) {
        console.error('Error adding transaction:', error);
        showToast('Error adding transaction', 'error');
    }
});

// Load Transactions
async function loadTransactions() {
    if (!currentUser) return;

    try {
        const q = query(
            collection(db, 'transactions'), 
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const querySnapshot = await getDocs(q);

        const transactions = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });

        renderTransactions(transactions);
        renderDashboardTransactions(transactions.slice(0, 5));

        return transactions;
    } catch (error) {
        console.error('Error loading transactions:', error);
        return [];
    }
}

function renderTransactions(transactions) {
    const transactionList = document.getElementById('all-transactions');
    if (!transactionList) return;

    if (transactions.length === 0) {
        transactionList.innerHTML = '<p class="empty-state">No transactions yet. Add your first transaction!</p>';
        return;
    }

    transactionList.innerHTML = transactions.map(txn => {
        const iconClass = txn.type === 'income' ? 'income' : getIconClass(txn.category);
        const amountClass = txn.amount >= 0 ? 'positive' : 'negative';
        const amountSign = txn.amount >= 0 ? '+' : '';
        const icon = getIcon(txn.category, txn.type);
        const date = txn.date ? new Date(txn.date).toLocaleDateString() : 'N/A';

        return `
            <div class="transaction-item">
                <div class="transaction-icon ${iconClass}">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-name">${txn.description}</div>
                    <div class="transaction-category">${txn.category}</div>
                    <div class="transaction-date">${date}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}$${Math.abs(txn.amount).toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

function renderDashboardTransactions(transactions) {
    const dashboardList = document.getElementById('dashboard-transactions');
    if (!dashboardList) return;

    if (transactions.length === 0) {
        dashboardList.innerHTML = '<p class="empty-state">No recent transactions</p>';
        return;
    }

    dashboardList.innerHTML = transactions.map(txn => {
        const iconClass = txn.type === 'income' ? 'income' : getIconClass(txn.category);
        const amountClass = txn.amount >= 0 ? 'positive' : 'negative';
        const amountSign = txn.amount >= 0 ? '+' : '';
        const icon = getIcon(txn.category, txn.type);

        return `
            <div class="transaction-item">
                <div class="transaction-icon ${iconClass}">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-name">${txn.description}</div>
                    <div class="transaction-category">${txn.category}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}$${Math.abs(txn.amount).toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

// Employee Management
document.getElementById('employee-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }

    const name = document.getElementById('emp-name').value;
    const position = document.getElementById('emp-position').value;
    const department = document.getElementById('emp-department').value;
    const salary = parseFloat(document.getElementById('emp-salary').value);
    const email = document.getElementById('emp-email').value;

    try {
        await addDoc(collection(db, 'employees'), {
            userId: currentUser.uid,
            name,
            position,
            department,
            salary,
            email,
            performance: 85 + Math.floor(Math.random() * 15),
            attendance: 90 + Math.floor(Math.random() * 10),
            createdAt: serverTimestamp()
        });

        showToast('Employee added successfully!', 'success');
        closeModal('employee-modal');
        document.getElementById('employee-form').reset();
        loadEmployees();
    } catch (error) {
        console.error('Error adding employee:', error);
        showToast('Error adding employee', 'error');
    }
});

// Load Employees
async function loadEmployees() {
    if (!currentUser) return;

    try {
        const q = query(
            collection(db, 'employees'), 
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        const employees = [];
        querySnapshot.forEach((doc) => {
            employees.push({ id: doc.id, ...doc.data() });
        });

        renderEmployees(employees);
        updateEmployeeStats(employees);

        return employees;
    } catch (error) {
        console.error('Error loading employees:', error);
        return [];
    }
}

function renderEmployees(employees) {
    const employeeList = document.getElementById('employee-list');
    if (!employeeList) return;

    if (employees.length === 0) {
        employeeList.innerHTML = '<p class="empty-state">No employees yet. Add your first employee!</p>';
        return;
    }

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

    employeeList.innerHTML = employees.map((emp, index) => {
        const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const color = colors[index % colors.length];

        return `
            <div class="employee-card">
                <div class="employee-avatar" style="background: ${color}">${initials}</div>
                <div class="employee-info">
                    <h4>${emp.name}</h4>
                    <p>${emp.position}</p>
                    <p>Department: ${emp.department}</p>
                    <p>Salary: $${emp.salary.toLocaleString()}</p>
                    <p>Performance: ${emp.performance}%</p>
                </div>
            </div>
        `;
    }).join('');
}

function updateEmployeeStats(employees) {
    document.getElementById('total-employees').textContent = employees.length;

    const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);
    document.getElementById('total-payroll').textContent = `$${totalPayroll.toLocaleString()}`;

    const avgSalary = employees.length > 0 ? totalPayroll / employees.length : 0;
    document.getElementById('avg-salary').textContent = `$${Math.round(avgSalary).toLocaleString()}`;
}

// Calculate Dashboard Stats
async function calculateDashboardStats() {
    if (!currentUser) return;

    try {
        const transactions = await loadTransactions();

        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach(txn => {
            if (txn.amount >= 0) {
                totalIncome += txn.amount;
            } else {
                totalExpenses += Math.abs(txn.amount);
            }
        });

        const totalBalance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;
        const avgDaily = totalExpenses / 30;

        document.getElementById('total-balance').textContent = `$${totalBalance.toFixed(2)}`;
        document.getElementById('monthly-income').textContent = `$${totalIncome.toFixed(2)}`;
        document.getElementById('monthly-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
        document.getElementById('savings-rate').textContent = `${savingsRate.toFixed(1)}%`;
        document.getElementById('avg-daily').textContent = `$${avgDaily.toFixed(2)}`;
        document.getElementById('total-txns').textContent = transactions.length;
    } catch (error) {
        console.error('Error calculating stats:', error);
    }
}

// Initialize Charts
function initializeCharts() {
    const spendingCanvas = document.getElementById('spending-chart');
    if (spendingCanvas && !spendingCanvas.chart) {
        const ctx = spendingCanvas.getContext('2d');
        spendingCanvas.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Utilities', 'Other'],
                datasets: [{
                    data: [850, 420, 680, 290, 380, 230],
                    backgroundColor: ['#F59E0B', '#06B6D4', '#8B5CF6', '#10B981', '#EF4444', '#6B7280'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }

    const trendsCanvas = document.getElementById('trends-chart');
    if (trendsCanvas && !trendsCanvas.chart) {
        const ctx = trendsCanvas.getContext('2d');
        trendsCanvas.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                datasets: [
                    {
                        label: 'Income',
                        data: [4100, 4200, 4150, 4300, 4200],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses',
                        data: [3200, 3100, 3300, 3180, 3180],
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { size: 12 } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 3000,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    const analyticsCanvas = document.getElementById('analytics-chart');
    if (analyticsCanvas && !analyticsCanvas.chart) {
        const ctx = analyticsCanvas.getContext('2d');
        analyticsCanvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Income',
                        data: [4100, 4200, 4150, 4300, 4200, 4400],
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderRadius: 6
                    },
                    {
                        label: 'Expenses',
                        data: [3200, 3100, 3300, 3180, 3180, 3250],
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 3000,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Helper Functions
function getIconClass(category) {
    const classes = {
        'Food & Dining': 'food',
        'Transportation': 'transport',
        'Shopping': 'shopping',
        'Income': 'income',
        'Entertainment': 'entertainment',
        'Utilities': 'utilities'
    };
    return classes[category] || 'shopping';
}

function getIcon(category, type) {
    if (type === 'income') return 'arrow-up';
    const icons = {
        'Food & Dining': 'utensils',
        'Transportation': 'car',
        'Shopping': 'shopping-bag',
        'Entertainment': 'film',
        'Utilities': 'bolt'
    };
    return icons[category] || 'receipt';
}

function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/popup-closed-by-user': 'Sign-in popup was closed'
    };
    return messages[code] || 'An error occurred. Please try again.';
}

// Navigation Functions
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId)?.classList.add('active');

    if (pageId === 'dashboard-page' && currentUser) {
        loadDashboardData();
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const activeNavItem = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeNavItem) activeNavItem.classList.add('active');

    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        if (sectionId === 'analytics') {
            setTimeout(initializeCharts, 100);
        }
    }
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// Event Listeners
document.getElementById('add-transaction-btn')?.addEventListener('click', () => {
    openModal('transaction-modal');
});

document.getElementById('add-employee-btn')?.addEventListener('click', () => {
    openModal('employee-modal');
});

// Close modals when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Toast Notification
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const colors = {
        'info': '#1E40AF',
        'success': '#10B981',
        'error': '#EF4444',
        'warning': '#F59E0B'
    };

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${colors[type]};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    if (!document.querySelector('style[data-toast]')) {
        style.setAttribute('data-toast', 'true');
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Global functions
window.showPage = showPage;
window.showSection = showSection;
window.showToast = showToast;
window.closeModal = closeModal;

console.log('Finance AI with Firebase initialized successfully');
