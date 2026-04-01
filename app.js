import { collection, getDocs, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Chart.js instances — kept at module scope so we can destroy and recreate on re-render
const chartInstances = {};

function destroyChart(key) {
    if (chartInstances[key]) {
        chartInstances[key].destroy();
        delete chartInstances[key];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. Login Logic ---
    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');
    const loginForm = document.getElementById('loginForm');
    const loginIdInput = document.getElementById('loginId');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');

    // Check if already logged in
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'block';
    } else {
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = loginIdInput.value.trim();
            const pass = loginPasswordInput.value.trim();

            const expectedId = localStorage.getItem('adminId') || 'library';
            const expectedPass = localStorage.getItem('adminPassword') || 'library123';

            if (id === expectedId && pass === expectedPass) {
                sessionStorage.setItem('isLoggedIn', 'true');
                loginOverlay.style.display = 'none';
                appContainer.style.display = 'block';
                loginError.style.display = 'none';
            } else {
                loginError.style.display = 'block';
            }
        });
    }

    // --- 0.1 Change Password Logic ---
    const navChangePasswordBtn = document.getElementById('navChangePasswordBtn');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const closeChangePasswordBtn = document.getElementById('closeChangePasswordBtn');
    const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
    const changePasswordForm = document.getElementById('changePasswordForm');
    
    // Inputs
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    
    // Feedback
    const changePasswordError = document.getElementById('changePasswordError');
    const changePasswordSuccess = document.getElementById('changePasswordSuccess');

    if (navChangePasswordBtn) {
        navChangePasswordBtn.addEventListener('click', () => {
            changePasswordForm.reset();
            changePasswordError.style.display = 'none';
            changePasswordSuccess.style.display = 'none';
            changePasswordModal.style.display = 'flex';
        });
    }

    function closeChangePasswordModal() {
        if (changePasswordModal) changePasswordModal.style.display = 'none';
    }

    if (closeChangePasswordBtn) closeChangePasswordBtn.addEventListener('click', closeChangePasswordModal);
    if (cancelChangePasswordBtn) cancelChangePasswordBtn.addEventListener('click', closeChangePasswordModal);
    
    if (changePasswordModal) {
        changePasswordModal.addEventListener('click', (e) => {
            if (e.target === changePasswordModal) closeChangePasswordModal();
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            changePasswordError.style.display = 'none';
            changePasswordSuccess.style.display = 'none';

            const currentPass = currentPasswordInput.value.trim();
            const newPass = newPasswordInput.value.trim();
            const confirmPass = confirmNewPasswordInput.value.trim();

            const expectedPass = localStorage.getItem('adminPassword') || 'library123';

            if (currentPass !== expectedPass) {
                changePasswordError.textContent = 'Incorrect current password.';
                changePasswordError.style.display = 'block';
                return;
            }

            if (newPass !== confirmPass) {
                changePasswordError.textContent = 'New passwords do not match.';
                changePasswordError.style.display = 'block';
                return;
            }

            if (newPass.length < 6) {
                changePasswordError.textContent = 'Password must be at least 6 characters.';
                changePasswordError.style.display = 'block';
                return;
            }

            localStorage.setItem('adminPassword', newPass);
            changePasswordSuccess.style.display = 'block';
            
            setTimeout(() => {
                closeChangePasswordModal();
            }, 1000);
        });
    }

    // Ensure Firebase is initialized
    if (!window.db) {
        console.error("Firebase not initialized in window.db");
        return;
    }
    const db = window.db;
    const membershipsCollection = collection(db, "memberships");

    // --- 0.2 Primary Email Logic (Firebase Synced) ---
    let globalPrimarySenderEmail = null;
    const settingsDocRef = doc(db, "settings", "general");
    
    onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            globalPrimarySenderEmail = docSnap.data().primarySenderEmail !== undefined ? docSnap.data().primarySenderEmail : null;
        } else {
            globalPrimarySenderEmail = null;
        }
    });

    const navPrimaryEmailBtn = document.getElementById('navPrimaryEmailBtn');
    if (navPrimaryEmailBtn) {
        navPrimaryEmailBtn.addEventListener('click', () => {
            const currentEmail = globalPrimarySenderEmail !== null ? globalPrimarySenderEmail : (localStorage.getItem('primarySenderEmail') || '');
            const newEmail = window.prompt("Enter the Gmail address you want to use as the primary sender account for reminders. Leave blank to be prompted with the account chooser.", currentEmail);
            if (newEmail !== null) {
                // Save to Firestore so it syncs across devices
                setDoc(settingsDocRef, { primarySenderEmail: newEmail.trim() }, { merge: true });
                // Fallback local cache
                localStorage.setItem('primarySenderEmail', newEmail.trim());
            }
        });
    }
    // 1. Theme Toggling Logic
    const themeToggleBtn = document.getElementById('themeToggle');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');
    const body = document.body;

    // Check localStorage for saved theme, or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply initial theme
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }

    // Toggle theme on button click
    themeToggleBtn.addEventListener('click', () => {
        const isDarkMode = body.classList.contains('dark-mode');
        
        if (isDarkMode) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
        // Re-render charts to pick up new theme colors
        renderAnalytics();
    });

    // --- 2. State & Mock Data ---
    const defaultMemberships = [
        { 
            id: 'M-0001', memberId: 'M-0001', name: 'JSW Steel Plant', amount: 268071, type: 'Organisation', category: 'Corporate', subCategory: 'Reference', admissionFee: 10000, depositToggle: 'No', depositAmount: 0, status: 'Expired', 
            date: '2024-03-11', expiryDate: '2025-03-11', phone: '9010626991', email: 'jsw.steel.plant38@gmail.com',
            address: 'Mumbai, Maharashtra', gstin: '357RIKO99HA19ZT', invoiceNo: 'INV-12010',
            authName: 'Ramesh Jindal', authPhone: '9876543211', authEmail: 'ramesh.j@jsw.in',
            invoiceHistory: [
                { invoiceNo: 'INV-12010', date: '2024-03-11', expiryDate: '2025-03-11', amount: 268071, status: 'Expired' }
            ]
        },
        { 
            id: 'M-0058', memberId: 'M-0058', name: 'Tata Motors', amount: 134130, type: 'Organisation', category: 'Corporate', subCategory: 'Borrowing', admissionFee: 50000, depositToggle: 'Yes', depositAmount: 100000, status: 'Active', 
            date: '2024-05-20', expiryDate: '2025-05-20', phone: '9876543210', email: 'contact@tatamotors.com',
            address: 'Pune, Maharashtra', gstin: '27AAAAA0000A1Z5', invoiceNo: 'INV-12058',
            authName: 'Sunil Tata', authPhone: '9988776655', authEmail: 'sunil.t@tatamotors.com',
            invoiceHistory: [
                { invoiceNo: 'INV-12020', date: '2022-05-20', expiryDate: '2023-05-20', amount: 110000, status: 'Expired' },
                { invoiceNo: 'INV-12040', date: '2023-05-20', expiryDate: '2024-05-20', amount: 125000, status: 'Expired' },
                { invoiceNo: 'INV-12058', date: '2024-05-20', expiryDate: '2025-05-20', amount: 134130, status: 'Active' }
            ]
        }
    ];

    // Initialize from Firestore
    let memberships = [];

    async function loadData() {
        try {
            const querySnapshot = await getDocs(membershipsCollection);
            const loaded = [];
            querySnapshot.forEach((doc) => {
                loaded.push(doc.data());
            });
            memberships = loaded.length > 0 ? loaded : defaultMemberships;
            
            // If we loaded default data because Firestore is empty, save it
            if (loaded.length === 0) {
                memberships.forEach(m => saveData(m));
            }
            
            updateStats();
            updateNotifications();
            renderList();
            renderAnalytics();
            
            // Re-render detail view if one is active
            if (currentDetailId) {
                showDetailView(currentDetailId);
            }
        } catch (error) {
            console.error("Error loading documents: ", error);
        }
    }

    async function saveData(itemToSave = null) {
        try {
            if (itemToSave) {
                // Save a specific item
                await setDoc(doc(db, "memberships", itemToSave.id), itemToSave);
            } else {
                // Save all if no specific item was passed (legacy support)
                for (const m of memberships) {
                    await setDoc(doc(db, "memberships", m.id), m);
                }
            }
        } catch (error) {
            console.error("Error saving document: ", error);
        }
    }

    // Set up real-time listener
    onSnapshot(membershipsCollection, (snapshot) => {
        const loaded = [];
        snapshot.forEach((doc) => {
            loaded.push(doc.data());
        });
        if (loaded.length > 0) {
            memberships = loaded;
            updateStats();
            updateNotifications();
            renderList();
            renderAnalytics();
            if (currentDetailId) {
                showDetailView(currentDetailId);
            }
        }
    });

    let currentFilter = 'All';
    let searchQuery = '';
    const itemsPerPage = 5;
    let currentPage = 1;

    let currentDetailId = null; // Tracks which member is being viewed

    // --- 3. DOM Elements ---
    // Dashboard views
    const dashboardSection = document.querySelector('.stats-grid').parentElement; // Everything except detail view
    const detailViewSection = document.getElementById('detailViewSection');
    const pageHeader = document.querySelector('.page-header');
    const statsGrid = document.querySelector('.stats-grid');
    const actionsBar = document.querySelector('.actions-bar');
    const pageActions = document.querySelector('.page-actions');
    const resultsTextEl = document.getElementById('resultsText');
    const membershipListEl = document.getElementById('membershipList');
    const paginationSection = document.getElementById('paginationSection');

    // Pagination Elements
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageNumbersEl = document.getElementById('pageNumbers');

    // Detail View Elements
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    const detailName = document.getElementById('detailName');
    const detailId = document.getElementById('detailId');
    const detailTypeBadge = document.getElementById('detailTypeBadge');
    const detailStatusBadge = document.getElementById('detailStatusBadge');
    const detailInvoiceNo = document.getElementById('detailInvoiceNo');
    const detailCategory = document.getElementById('detailCategory');
    const detailSubCategory = document.getElementById('detailSubCategory');
    const detailAdmissionFee = document.getElementById('detailAdmissionFee');
    const detailDepositAmount = document.getElementById('detailDepositAmount');
    const detailAmount = document.getElementById('detailAmount');
    const detailSubDate = document.getElementById('detailSubDate');
    const detailExpDate = document.getElementById('detailExpDate');
    
    // Org Detail Elements
    const detailOrgView = document.getElementById('detailOrgView');
    const detailOrgMemberId = document.getElementById('detailOrgMemberId');
    const detailOrgPhone = document.getElementById('detailOrgPhone');
    const detailOrgEmail = document.getElementById('detailOrgEmail');
    const detailOrgAddress = document.getElementById('detailOrgAddress');
    const detailOrgGstin = document.getElementById('detailOrgGstin');
    const detailAuthName = document.getElementById('detailAuthName');
    const detailAuthPhone = document.getElementById('detailAuthPhone');
    const detailAuthEmail = document.getElementById('detailAuthEmail');

    // Ind Detail Elements
    const detailIndView = document.getElementById('detailIndView');
    const detailIndMemberId = document.getElementById('detailIndMemberId');
    const detailIndPhone = document.getElementById('detailIndPhone');
    const detailIndEmail = document.getElementById('detailIndEmail');
    const detailIndAddress = document.getElementById('detailIndAddress');

    const invoiceViewer = document.getElementById('invoiceViewer');
    const detailEditBtn = document.getElementById('detailEditBtn');
    const editInvoiceBtn = document.getElementById('editInvoiceBtn');
    const detailSendReminderBtn = document.getElementById('detailSendReminderBtn');
    
    // Membership Status Elements
    const detailMembershipStatus = document.getElementById('detailMembershipStatus');
    const refundProcessSection = document.getElementById('refundProcessSection');
    const refundDepositAmount = document.getElementById('refundDepositAmount');
    const uploadRefundDocBtn = document.getElementById('uploadRefundDocBtn');
    const refundDocFile = document.getElementById('refundDocFile');
    const refundFileError = document.getElementById('refundFileError');
    const refundInitiatedMsg = document.getElementById('refundInitiatedMsg');
    const refundDocName = document.getElementById('refundDocName');
    const refundDocDownload = document.getElementById('refundDocDownload');

    // Stats & Filters
    const statActive = document.getElementById('statActive');
    const statExpired = document.getElementById('statExpired');
    const statTotal = document.getElementById('statTotal');

    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Form inputs
    const subIdInput = document.getElementById('subId');
    const subMemberIdInput = document.getElementById('subMemberId');
    const subNameInput = document.getElementById('subName');
    const subAmountInput = document.getElementById('subAmount');
    const subDateInput = document.getElementById('subDate');
    const subTypeInput = document.getElementById('subType');
    
    // New Form Inputs
    const subCategoryInput = document.getElementById('subCategory');
    const subSubCategoryInput = document.getElementById('subSubCategory');
    const subAdmissionFeeInput = document.getElementById('subAdmissionFee');
    const subDepositToggleInput = document.getElementById('subDepositToggle');
    const subDepositAmountInput = document.getElementById('subDepositAmount');
    const depositAmountGroup = document.getElementById('depositAmountGroup');

    // Organisation Form Inputs
    const orgMemberIdInput = document.getElementById('orgMemberId');
    const orgPhoneInput = document.getElementById('orgPhone');
    const orgEmailInput = document.getElementById('orgEmail');
    const orgGstinInput = document.getElementById('orgGstin');
    const orgAddressInput = document.getElementById('orgAddress');
    const authNameInput = document.getElementById('authName');
    const authPhoneInput = document.getElementById('authPhone');
    const authEmailInput = document.getElementById('authEmail');

    // Individual Form Inputs
    const indMemberIdInput = document.getElementById('indMemberId');
    const indPhoneInput = document.getElementById('indPhone');
    const indEmailInput = document.getElementById('indEmail');
    const indAddressInput = document.getElementById('indAddress');

    const subInvoiceNoInput = document.getElementById('subInvoiceNo');
    const subExpiryDateInput = document.getElementById('subExpiryDate');
    const invoiceDetailsInput = document.getElementById('invoiceDetails');

    // Section wrappers
    const orgPersonalFields = document.getElementById('orgPersonalFields');
    const indPersonalFields = document.getElementById('indPersonalFields');

    // Modal
    const modal = document.getElementById('subscriptionModal');
    const modalTitle = document.getElementById('modalTitle');
    const subForm = document.getElementById('subscriptionForm');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const addSubBtn = document.getElementById('addSubscriptionBtn');

    // --- 4. Core Logic Functions ---


    function updateStats() {
        // Recompute the latest status for all items to be safe so the top level displays correct counts
        memberships.forEach(m => m.status = getLatestSummaryStatus(m));
        const activeCount = memberships.filter(m => m.status === 'Active' || m.status === 'Warning').length;
        const expiredCount = memberships.filter(m => m.status === 'Expired').length;
        
        statActive.textContent = activeCount;
        statExpired.textContent = expiredCount;
        statTotal.textContent = memberships.length;
    }

    function formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    function getBadgeClass(typeOrStatus) {
        const map = {
            'Organisation': 'badge-org',
            'Industry': 'badge-ind', // Used in screenshot
            'Individual': 'badge-ind',
            'Active': 'badge-active',
            'Expired': 'badge-expired',
            'Warning': 'badge-warning'
        };
        return map[typeOrStatus] || '';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function calculateStatus(expiryDateStr) {
        if (!expiryDateStr) return 'Expired';
        
        const now = new Date();
        const expiryDate = new Date(expiryDateStr);
        
        // Reset time for accurate day comparison
        now.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);

        if (expiryDate < now) {
            return 'Expired';
        }
        
        // Check for warning (e.g., within 30 days)
        const timeDiff = expiryDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff <= 30) {
            return 'Warning';
        }
        
        return 'Active';
    }

    function renderList() {
        // Filter Data
        let filtered = memberships.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery) || 
                                  m.id.toLowerCase().includes(searchQuery);
            const matchesFilter = currentFilter === 'All' || m.type === currentFilter;
            return matchesSearch && matchesFilter;
        });

        resultsTextEl.textContent = `${filtered.length} subscriptions found`;

        // Clear List
        membershipListEl.innerHTML = '';

        if (filtered.length === 0) {
            membershipListEl.innerHTML = '<div class="list-item" style="justify-content: center; color: var(--text-secondary);">No memberships found.</div>';
            return;
        }

        const startIdx = (currentPage - 1) * itemsPerPage;
        const paginatedItems = filtered.slice(startIdx, startIdx + itemsPerPage);

        paginatedItems.forEach(item => {
            const listEl = document.createElement('div');
            listEl.className = 'list-item';
            const calculatedStatus = calculateStatus(item.expiryDate);
            listEl.innerHTML = `
                <div class="item-id">${item.id}</div>
                <div class="item-name">${item.name}</div>
                <div class="item-amount">${formatCurrency(item.amount)}</div>
                <span class="badge ${getBadgeClass(item.type)}">${item.type === 'Organisation' ? 'Org' : 'Ind'}</span>
                <span class="badge ${getBadgeClass(calculatedStatus)}">${calculatedStatus}</span>
                <div style="display:flex; gap:8px; margin-left:auto;">
                    <button class="btn btn-outline btn-sm" onclick="editMembership('${item.id}')">Edit</button>
                    <button class="btn btn-outline btn-sm" style="border-color: var(--danger-color); color: var(--danger-color);" onclick="deleteSubscription('${item.id}')">Delete</button>
                    <button class="btn btn-primary" onclick="viewMembership('${item.id}')">View More →</button>
                </div>
            `;
            membershipListEl.appendChild(listEl);
        });

        renderPagination(filtered.length);
    }

    function renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        
        // Ensure currentPage is valid
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        // Button States
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;

        // Render Page Numbers
        pageNumbersEl.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}`;
            btn.style.margin = '0 2px';
            btn.textContent = i;
            btn.addEventListener('click', () => {
                currentPage = i;
                renderList();
            });
            pageNumbersEl.appendChild(btn);
        }
    }

    // Pagination Event Listeners
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderList();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        // Increment page; renderPagination handles the upper bound disabled state
        currentPage++;
        renderList();
    });

    // --- 5. Detail View Logic ---
    function showDetailView(id) {
        const item = memberships.find(m => m.id === id);
        if (!item) return;

        currentDetailId = id;

        // Hide Dashboard Elements
        pageHeader.style.display = 'none';
        statsGrid.style.display = 'none';
        actionsBar.style.display = 'none';
        pageActions.style.display = 'none';
        resultsTextEl.style.display = 'none';
        membershipListEl.style.display = 'none';
        paginationSection.style.display = 'none';
        
        const analyticsOverview = document.getElementById('analyticsOverview');
        if (analyticsOverview) analyticsOverview.style.display = 'none';

        // Show Detail View
        detailViewSection.style.display = 'block';

        // Populate Data
        detailName.textContent = item.name;
        detailId.textContent = item.id;
        
        detailTypeBadge.textContent = item.type;
        detailTypeBadge.className = `badge ${getBadgeClass(item.type)}`;
        
        const calculatedTopStatus = calculateStatus(item.expiryDate);
        detailStatusBadge.textContent = calculatedTopStatus;
        detailStatusBadge.className = `badge ${getBadgeClass(calculatedTopStatus)}`;

        detailMembershipStatus.value = item.membershipStatus || 'Continuing';
        updateRefundUI(item);

        detailInvoiceNo.textContent = item.invoiceNo || '-';
        detailCategory.textContent = item.category || '-';
        detailSubCategory.textContent = item.subCategory || '-';
        detailAdmissionFee.textContent = item.admissionFee ? formatCurrency(item.admissionFee) : '-';
        detailDepositAmount.textContent = item.depositAmount && item.depositToggle === 'Yes' ? formatCurrency(item.depositAmount) : (item.depositToggle === 'No' ? 'Not Required' : '-');
        
        detailAmount.textContent = formatCurrency(item.amount);
        detailSubDate.textContent = formatDate(item.date);
        detailExpDate.textContent = formatDate(item.expiryDate);

        // Populate Personal Details depending on Type
        if (item.type === 'Organisation') {
            detailOrgView.style.display = 'block';
            detailIndView.style.display = 'none';

            detailOrgMemberId.textContent = item.memberId || item.id;
            detailOrgPhone.textContent = item.phone || '-';
            detailOrgEmail.textContent = item.email || '-';
            detailOrgAddress.textContent = item.address || '-';
            detailOrgGstin.textContent = item.gstin || '-';
            
            detailAuthName.textContent = item.authName || '-';
            detailAuthPhone.textContent = item.authPhone || '-';
            detailAuthEmail.textContent = item.authEmail || '-';
        } else {
            detailOrgView.style.display = 'none';
            detailIndView.style.display = 'block';

            detailIndMemberId.textContent = item.memberId || item.id;
            detailIndPhone.textContent = item.phone || '-';
            detailIndEmail.textContent = item.email || '-';
            detailIndAddress.textContent = item.address || '-';
        }

        // Populate Subscription Record Table
        const invoiceTableBody = document.getElementById('invoiceTableBody');
        const detailTotalHistoryAmount = document.getElementById('detailTotalHistoryAmount');
        const history = item.invoiceHistory || [];

        let totalAmountPaid = 0;

        invoiceTableBody.innerHTML = '';
        if (history.length === 0) {
            invoiceTableBody.innerHTML = '<tr><td colspan="7" class="table-empty-state">No records found.</td></tr>';
        } else {
            history.forEach((entry, idx) => {
                totalAmountPaid += (entry.amount || 0);
                const entryStatus = calculateStatus(entry.expiryDate);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${idx + 1}</td>
                    <td>${entry.invoiceNo || '-'}</td>
                    <td>${formatDate(entry.date)}</td>
                    <td>${formatDate(entry.expiryDate)}</td>
                    <td>${formatCurrency(entry.amount)}</td>
                    <td><span class="badge ${getBadgeClass(entryStatus)}">${entryStatus}</span></td>
                    <td>
                        ${entry.pdfData ? `<a href="${entry.pdfData}" download="${entry.pdfName || 'invoice.pdf'}" class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.75rem;">Download PDF</a>` : '-'}
                    </td>
                    <td style="display:flex; gap:4px;">
                        <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onclick="editHistoryEntry('${item.id}', ${idx})">Edit</button>
                        <button class="btn btn-outline btn-sm" style="border-color: var(--danger-color); color: var(--danger-color); padding: 2px 8px; font-size: 0.75rem;" onclick="deleteHistoryEntry('${item.id}', ${idx})">Delete</button>
                    </td>
                `;
                invoiceTableBody.appendChild(row);
            });
        }
        
        detailTotalHistoryAmount.textContent = formatCurrency(totalAmountPaid);

        // Load notes
        const memberNotesInput = document.getElementById('memberNotesInput');
        const notesSavedMsg = document.getElementById('notesSavedMsg');
        memberNotesInput.value = item.notes || '';
        notesSavedMsg.style.display = 'none';

    }

    // --- Add History Entry Modal Logic ---
    const addEntryModal = document.getElementById('addEntryModal');
    const addEntryModalTitle = document.getElementById('addEntryModalTitle');
    const addEntryForm = document.getElementById('addEntryForm');
    const closeAddEntryBtn = document.getElementById('closeAddEntryBtn');
    const cancelAddEntryBtn = document.getElementById('cancelAddEntryBtn');
    const entryInvoiceNo = document.getElementById('entryInvoiceNo');
    const entryDate = document.getElementById('entryDate');
    const entryExpiryDate = document.getElementById('entryExpiryDate');
    const entryAmount = document.getElementById('entryAmount');
    const entryPdfFile = document.getElementById('entryPdfFile');
    const editEntryIndexInput = document.getElementById('editEntryIndex');

    let editEntryIndex = -1; // -1 = adding new, >= 0 = editing existing

    // "Add Entry" button opens the modal in Add mode
    document.getElementById('editInvoiceBtn').addEventListener('click', () => {
        editEntryIndex = -1;
        editEntryIndexInput.value = -1;
        addEntryModalTitle.textContent = 'Add History Entry';
        addEntryForm.reset();
        // Pre-fill dates sensibly
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);
        entryDate.value = today.toISOString().split('T')[0];
        entryExpiryDate.value = nextYear.toISOString().split('T')[0];
        addEntryModal.style.display = 'flex';
    });

    // Open modal in Edit mode for an existing history entry
    window.editHistoryEntry = function(memberId, idx) {
        const item = memberships.find(m => m.id === memberId);
        if (!item || !item.invoiceHistory || !item.invoiceHistory[idx]) return;
        const entry = item.invoiceHistory[idx];

        editEntryIndex = idx;
        editEntryIndexInput.value = idx;
        addEntryModalTitle.textContent = 'Edit History Entry';
        addEntryForm.reset();

        entryInvoiceNo.value = entry.invoiceNo || '';
        entryDate.value = entry.date || '';
        entryExpiryDate.value = entry.expiryDate || '';
        entryAmount.value = entry.amount || '';
        // Note: existing PDF is kept unless user uploads a new one
        addEntryModal.style.display = 'flex';
    };

    function closeAddEntryModal() {
        addEntryModal.style.display = 'none';
    }
    closeAddEntryBtn.addEventListener('click', closeAddEntryModal);
    cancelAddEntryBtn.addEventListener('click', closeAddEntryModal);
    addEntryModal.addEventListener('click', (e) => { if (e.target === addEntryModal) closeAddEntryModal(); });

    addEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const item = memberships.find(m => m.id === currentDetailId);
        if (!item) return;

        if (!item.invoiceHistory) item.invoiceHistory = [];

        const updatedEntry = {
            invoiceNo: entryInvoiceNo.value || '-',
            date: entryDate.value,
            expiryDate: entryExpiryDate.value,
            amount: parseFloat(entryAmount.value) || 0
        };

        const file = entryPdfFile.files[0];

        const finalize = (entry) => {
            if (editEntryIndex >= 0) {
                // Preserve existing PDF if no new file chosen
                if (!file) {
                    entry.pdfData = item.invoiceHistory[editEntryIndex].pdfData;
                    entry.pdfName = item.invoiceHistory[editEntryIndex].pdfName;
                }
                item.invoiceHistory[editEntryIndex] = entry;
            } else {
                item.invoiceHistory.push(entry);
            }
            saveData(item);
            showDetailView(currentDetailId);
            closeAddEntryModal();
        };

        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Please select a valid PDF file.');
                return;
            }
            if (file.size > 700 * 1024) {
                alert('PDF file size must be less than 700KB due to database limits.');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(evt) {
                updatedEntry.pdfData = evt.target.result;
                updatedEntry.pdfName = file.name;
                finalize(updatedEntry);
            };
            reader.readAsDataURL(file);
        } else {
            finalize(updatedEntry);
        }
    });

    function hideDetailView() {
        currentDetailId = null;
        
        detailViewSection.style.display = 'none';

        pageHeader.style.display = 'block';
        statsGrid.style.display = 'grid'; // Note: grid not block
        actionsBar.style.display = 'flex';
        pageActions.style.display = 'flex';
        resultsTextEl.style.display = 'block';
        membershipListEl.style.display = 'flex';
        paginationSection.style.display = 'flex';
    }

    backToDashboardBtn.addEventListener('click', hideDetailView);

    window.viewMembership = function(id) {
        showDetailView(id);
    };

    window.deleteSubscription = async function(id) {
        if (confirm('Are you sure you want to completely delete this subscription?')) {
            try {
                // Remove from local array
                memberships = memberships.filter(m => m.id !== id);
                
                // Remove from Firestore
                const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                await deleteDoc(doc(db, "memberships", id));
                
                // Update UI visually immediately without waiting for snapshot
                updateStats();
                updateNotifications();
                renderList();
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Failed to delete the subscription. Please try again.");
            }
        }
    };

    detailEditBtn.addEventListener('click', () => {
        openModal(true, currentDetailId, 'personal');
    });

    if (detailSendReminderBtn) {
        detailSendReminderBtn.addEventListener('click', () => {
            if (currentDetailId) {
                window.sendReminderEmail(currentDetailId);
            }
        });
    }

    function getLatestSummaryStatus(item) {
        if (item.invoiceHistory && item.invoiceHistory.length > 0) {
            // Get the most recent valid expiry date from history
            const latestHistory = item.invoiceHistory.reduce((latest, current) => {
                const latestDate = new Date(latest.expiryDate);
                const currentDate = new Date(current.expiryDate);
                // Return whichever is further in the future
                return currentDate > latestDate ? current : latest;
            }, item.invoiceHistory[0]);
            
            // Update the top level summary field based on latest history
            item.expiryDate = latestHistory.expiryDate;
            return calculateStatus(latestHistory.expiryDate);
        } else {
             return calculateStatus(item.expiryDate);
        }
    }

    window.deleteHistoryEntry = function(memberId, historyIndex) {
        if (confirm('Are you sure you want to delete this history record?')) {
            const item = memberships.find(m => m.id === memberId);
            if (item && item.invoiceHistory) {
                // Remove the item at the specific index
                item.invoiceHistory.splice(historyIndex, 1);
                
                // If history is now empty, reset PDF upload fields for consistency
                if (item.invoiceHistory.length === 0) {
                     delete item.invoicePdf;
                     delete item.invoicePdfName;
                     delete item.invoicePdfSize;
                } else {
                     item.status = getLatestSummaryStatus(item);
                }
                
                saveData(item);
                showDetailView(memberId); // Refresh the view
                updateStats(); // Update dashboard counts
                renderList();
            }
        }
    };

    // Membership Status Handling
    const replaceRefundDocBtn = document.getElementById('replaceRefundDocBtn');

    function updateRefundUI(item) {
        if (item.membershipStatus === 'Cancelled' && item.depositToggle === 'Yes' && item.depositAmount > 0) {
            if (item.refundStatus === 'Initiated') {
                refundProcessSection.style.display = 'none';
                refundInitiatedMsg.style.display = 'block';
                refundDocName.textContent = item.refundDocName ? `· ${item.refundDocName}` : '';
                if (item.refundDocData) {
                    refundDocDownload.href = item.refundDocData;
                    refundDocDownload.download = item.refundDocName || 'refund-document';
                    refundDocDownload.style.display = 'inline-flex';
                } else {
                    refundDocDownload.style.display = 'none';
                }
            } else {
                refundProcessSection.style.display = 'block';
                refundInitiatedMsg.style.display = 'none';
                refundDepositAmount.textContent = formatCurrency(item.depositAmount);
                refundFileError.style.display = 'none';
                refundDocFile.value = '';
            }
        } else {
            refundProcessSection.style.display = 'none';
            refundInitiatedMsg.style.display = 'none';
        }
    }

    // "Replace" button resets refund so upload form reappears
    replaceRefundDocBtn.addEventListener('click', () => {
        const item = memberships.find(m => m.id === currentDetailId);
        if (item) {
            delete item.refundStatus;
            delete item.refundDocData;
            delete item.refundDocName;
            saveData(item);
            updateRefundUI(item);
            updateStats();
        }
    });

    detailMembershipStatus.addEventListener('change', (e) => {
        const item = memberships.find(m => m.id === currentDetailId);
        if (item) {
            item.membershipStatus = e.target.value;
            if (e.target.value === 'Cancelled') {
                item.cancelledDate = new Date().toISOString().split('T')[0];
            } else {
                delete item.cancelledDate;
            }
            saveData(item);
            updateRefundUI(item);
        }
    });

    uploadRefundDocBtn.addEventListener('click', () => {
        const file = refundDocFile.files[0];
        refundFileError.style.display = 'none';

        if (!file) {
            refundFileError.textContent = 'Please select a document to upload.';
            refundFileError.style.display = 'block';
            return;
        }
        if (file.size > 700 * 1024) {
            refundFileError.textContent = 'File size must be less than 700KB due to database limits.';
            refundFileError.style.display = 'block';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            const item = memberships.find(m => m.id === currentDetailId);
            if (item) {
                item.refundStatus = 'Initiated';
                item.refundDocData = evt.target.result;
                item.refundDocName = file.name;
                saveData(item);
                updateRefundUI(item);
            }
        };
        reader.readAsDataURL(file);
    });

    // --- 6. Event Listeners & Modal CRUD ---

    // Notes / Remarks
    const memberNotesInput = document.getElementById('memberNotesInput');
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    const notesSavedMsg = document.getElementById('notesSavedMsg');

    // --- Analytics Overview ---
    function getChartColors() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            textPrimary: isDark ? '#f8fafc' : '#0f172a',
            textSecondary: isDark ? '#94a3b8' : '#475569',
            gridColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            cardBg: isDark ? '#1e293b' : '#ffffff',
        };
    }

    function renderAnalytics() {
        if (memberships.length === 0) return;
        const colors = getChartColors();

        const startInputEl = document.getElementById('analyticsStartDate');
        const endInputEl = document.getElementById('analyticsEndDate');
        
        let startDate = null;
        let endDate = null;
        
        if (startInputEl && startInputEl.value) {
            startDate = new Date(startInputEl.value);
            startDate.setHours(0,0,0,0);
        }
        if (endInputEl && endInputEl.value) {
            endDate = new Date(endInputEl.value);
            endDate.setHours(23,59,59,999);
        }

        const now = new Date();
        const parseDateString = dStr => {
            if (!dStr) return new Date(0);
            const pts = dStr.split('-');
            return new Date(pts[0], pts[1] - 1, pts[2]);
        };

        // ---- KPI Cards ----
        let totalRevenue = 0;
        let membershipRevenue = 0;
        let admissionRevenue = 0;
        let depositRevenue = 0;

        memberships.forEach(m => {
            (m.invoiceHistory || []).forEach((e, idx) => {
                const edate = parseDateString(e.date);
                if ((startDate && edate < startDate) || (endDate && edate > endDate)) return;

                const amt = parseFloat(e.amount) || 0;
                totalRevenue += amt;

                // Identify if this is the FIRST chronological invoice
                if (idx === 0) {
                    const adm = parseFloat(m.admissionFee) || 0;
                    const dep = (m.depositToggle === 'Yes') ? (parseFloat(m.depositAmount) || 0) : 0;
                    
                    admissionRevenue += adm;
                    depositRevenue += dep;
                    
                    let mem = amt - adm - dep;
                    if (mem < 0) mem = 0;
                    membershipRevenue += mem;
                } else {
                    membershipRevenue += amt;
                }
            });
        });

        const newSubs = memberships.filter(m => {
            const d = parseDateString(m.date);
            return (!startDate || d >= startDate) && (!endDate || d <= endDate);
        }).length;

        document.getElementById('kpiTotalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('kpiMembershipRevenue').textContent = formatCurrency(membershipRevenue);
        document.getElementById('kpiAdmissionRevenue').textContent = formatCurrency(admissionRevenue);
        document.getElementById('kpiDepositRevenue').textContent = formatCurrency(depositRevenue);
        document.getElementById('kpiNewSubscriptions').textContent = newSubs;
        document.getElementById('kpiTotalMembers').textContent = memberships.length;

        const activeCount = memberships.filter(m => {
            const s = calculateStatus(m.expiryDate);
            return s === 'Active' || s === 'Warning';
        }).length;
        const expiredCount = memberships.filter(m => calculateStatus(m.expiryDate) === 'Expired').length;
        const cancelledCount = memberships.filter(m => m.membershipStatus === 'Cancelled').length;
        const cancellationRate = memberships.length > 0 ? Math.round((cancelledCount / memberships.length) * 100) : 0;

        document.getElementById('kpiActiveMembers').textContent = activeCount;
        document.getElementById('kpiExpiredMembers').textContent = expiredCount;
        document.getElementById('kpiCancellationRate').textContent = cancellationRate + '%';

        const kpiLabelRevenue = document.getElementById('kpiLabelRevenue');
        const kpiLabelNewSubs = document.getElementById('kpiLabelNewSubs');
        if (kpiLabelRevenue && kpiLabelNewSubs) {
            let periodText = 'All Time';
            if (startDate && endDate) {
                const shortStart = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
                const shortEnd = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
                periodText = `${shortStart} - ${shortEnd}`;
            } else if (startDate) {
                periodText = `From ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}`;
            } else if (endDate) {
                periodText = `Until ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}`;
            }
            kpiLabelRevenue.textContent = `Total Revenue (${periodText})`;
            kpiLabelNewSubs.textContent = `New Subscriptions (${periodText})`;
        }

        // ---- Revenue Trend Bar Chart (Dynamic Daily/Monthly) ----
        let timeLabels = [];
        let revenueData = {};
        
        const validInvoices = [];
        memberships.forEach(m => {
            (m.invoiceHistory || []).forEach(e => {
                if (!e.date) return;
                const d = parseDateString(e.date);
                if ((startDate && d < startDate) || (endDate && d > endDate)) return;
                validInvoices.push(e);
            });
        });
        
        const cStart = startDate || (validInvoices.length > 0 ? validInvoices.map(i => parseDateString(i.date)).reduce((a,b)=>a<b?a:b, new Date()) : new Date(now.getFullYear()-1, now.getMonth(), 1));
        const cEnd = endDate || (validInvoices.length > 0 ? validInvoices.map(i => parseDateString(i.date)).reduce((a,b)=>a>b?a:b, new Date()) : now);
        
        const daysDiff = Math.ceil((cEnd - cStart) / (1000 * 3600 * 24));
        let isDaily = daysDiff <= 60 && daysDiff > 0;
        
        if (isDaily) {
            for (let i = 0; i <= daysDiff; i++) {
                const d = new Date(cStart.getTime() + i * 24 * 3600 * 1000);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                timeLabels.push({ key, label });
                revenueData[key] = 0;
            }
        } else {
            const mStart = new Date(cStart.getFullYear(), cStart.getMonth(), 1);
            const mEnd = new Date(cEnd.getFullYear(), cEnd.getMonth(), 1);
            let curr = new Date(mStart);
            while (curr <= mEnd) {
                const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
                const label = curr.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                timeLabels.push({ key, label });
                revenueData[key] = 0;
                curr.setMonth(curr.getMonth() + 1);
            }
        }

        validInvoices.forEach(entry => {
            const key = isDaily ? entry.date : entry.date.substring(0, 7);
            if (key in revenueData) {
                revenueData[key] += entry.amount || 0;
            }
        });
        const revenueChartLabels = timeLabels.map(t => t.label);
        const revenueChartValues = timeLabels.map(t => revenueData[t.key]);

        destroyChart('monthlyRevenue');
        const ctxRev = document.getElementById('chartMonthlyRevenue');
        if (ctxRev) {
            chartInstances['monthlyRevenue'] = new Chart(ctxRev, {
                type: 'bar',
                data: {
                    labels: revenueChartLabels,
                    datasets: [{
                        label: 'Revenue (₹)',
                        data: revenueChartValues,
                        backgroundColor: 'rgba(55, 48, 163, 0.75)',
                        borderRadius: 5,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => ' ₹' + ctx.parsed.y.toLocaleString('en-IN')
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: colors.textSecondary, font: { size: 11 } },
                            grid: { color: colors.gridColor }
                        },
                        y: {
                            ticks: {
                                color: colors.textSecondary,
                                font: { size: 11 },
                                callback: val => '₹' + (val >= 100000 ? (val/100000).toFixed(1) + 'L' : val.toLocaleString('en-IN'))
                            },
                            grid: { color: colors.gridColor }
                        }
                    }
                }
            });
        }

        // --- Breakdown Charts (Filtered by created date) ---
        const filteredMemberships = memberships.filter(m => {
            const d = parseDateString(m.date);
            return (!startDate || d >= startDate) && (!endDate || d <= endDate);
        });
        
        // ---- Member Type Doughnut ----
        const orgCount = filteredMemberships.filter(m => m.type === 'Organisation').length;
        const indCount = filteredMemberships.filter(m => m.type === 'Individual').length;

        destroyChart('memberType');
        const ctxType = document.getElementById('chartMemberType');
        if (ctxType) {
            chartInstances['memberType'] = new Chart(ctxType, {
                type: 'doughnut',
                data: {
                    labels: ['Organisation', 'Individual'],
                    datasets: [{
                        data: [orgCount, indCount],
                        backgroundColor: ['#3730a3', '#0ea5e9'],
                        borderWidth: 0,
                        hoverOffset: 6,
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: colors.textPrimary, padding: 14, font: { size: 12 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.label}: ${ctx.parsed}`
                            }
                        }
                    }
                }
            });
        }

        // ---- Category Horizontal Bar Chart ----
        const categories = ['Corporate', 'Academic', 'Alumni', 'Personal'];
        const catCounts = categories.map(cat => filteredMemberships.filter(m => m.category === cat).length);
        const catColors = ['rgba(55,48,163,0.8)', 'rgba(14,165,233,0.8)', 'rgba(22,163,74,0.8)', 'rgba(245,158,11,0.8)'];

        destroyChart('category');
        const ctxCat = document.getElementById('chartCategory');
        if (ctxCat) {
            chartInstances['category'] = new Chart(ctxCat, {
                type: 'bar',
                data: {
                    labels: categories,
                    datasets: [{
                        label: 'Members',
                        data: catCounts,
                        backgroundColor: catColors,
                        borderRadius: 5,
                        borderSkipped: false,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.parsed.x} member${ctx.parsed.x !== 1 ? 's' : ''}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: colors.textSecondary, font: { size: 11 }, precision: 0 },
                            grid: { color: colors.gridColor }
                        },
                        y: {
                            ticks: { color: colors.textSecondary, font: { size: 12 } },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // ---- Status Doughnut ----
        const warnCount = memberships.filter(m => calculateStatus(m.expiryDate) === 'Warning').length;

        destroyChart('status');
        const ctxStatus = document.getElementById('chartStatus');
        if (ctxStatus) {
            chartInstances['status'] = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Warning', 'Expired'],
                    datasets: [{
                        data: [activeCount - warnCount, warnCount, expiredCount],
                        backgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
                        borderWidth: 0,
                        hoverOffset: 6,
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: colors.textPrimary, padding: 12, font: { size: 12 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.label}: ${ctx.parsed}`
                            }
                        }
                    }
                }
            });
        }
    }

    // --- Analytics Page Navigation & Filters ---
    const navAnalyticsBtn = document.getElementById('navAnalyticsBtn');
    const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
    const analyticsOverview = document.getElementById('analyticsOverview');
    
    const applyAnalyticsDateBtn = document.getElementById('applyAnalyticsDateBtn');
    const resetAnalyticsDateBtn = document.getElementById('resetAnalyticsDateBtn');
    const startInputEl = document.getElementById('analyticsStartDate');
    const endInputEl = document.getElementById('analyticsEndDate');
    
    if (applyAnalyticsDateBtn) {
        applyAnalyticsDateBtn.addEventListener('click', () => {
            if (startInputEl.value && endInputEl.value && new Date(startInputEl.value) > new Date(endInputEl.value)) {
                alert('Start date cannot be after end date.');
                return;
            }
            renderAnalytics();
        });
    }

    if (resetAnalyticsDateBtn) {
        resetAnalyticsDateBtn.addEventListener('click', () => {
            if (startInputEl) startInputEl.value = '';
            if (endInputEl) endInputEl.value = '';
            renderAnalytics();
        });
    }

    if (navAnalyticsBtn && closeAnalyticsBtn && analyticsOverview) {
        navAnalyticsBtn.addEventListener('click', () => {
            // Hide Dashboard Elements & Detail View
            pageHeader.style.display = 'none';
            statsGrid.style.display = 'none';
            actionsBar.style.display = 'none';
            pageActions.style.display = 'none';
            resultsTextEl.style.display = 'none';
            membershipListEl.style.display = 'none';
            paginationSection.style.display = 'none';
            detailViewSection.style.display = 'none';
            
            // Show Analytics Overview Page
            analyticsOverview.style.display = 'block';
            
            // Re-render to ensure charts size correctly
            renderAnalytics();
        });

        closeAnalyticsBtn.addEventListener('click', () => {
            // Hide Analytics Overview Page
            analyticsOverview.style.display = 'none';
            
            // Show Dashboard Elements
            pageHeader.style.display = 'block';
            statsGrid.style.display = 'grid';
            actionsBar.style.display = 'flex';
            pageActions.style.display = 'flex';
            resultsTextEl.style.display = 'block';
            membershipListEl.style.display = 'flex';
            paginationSection.style.display = 'flex';
            
            // Re-render list if needed
            renderList();
        });
    }

    saveNotesBtn.addEventListener('click', () => {
        const item = memberships.find(m => m.id === currentDetailId);
        if (item) {
            item.notes = memberNotesInput.value;
            saveData(item);
            notesSavedMsg.style.display = 'block';
            setTimeout(() => { notesSavedMsg.style.display = 'none'; }, 3000);
        }
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        renderList();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            currentPage = 1;
            renderList();
        });
    });

    const basicFormFields = document.getElementById('basicFormFields');
    const personalFormFields = document.getElementById('personalFormFields');
    const invoiceFormFields = document.getElementById('invoiceFormFields');

    function openModal(isEdit, id = null, mode = 'basic') {
        modal.style.display = 'flex';
        
        // Hide or show fields based on mode
        basicFormFields.style.display = mode === 'basic' ? 'block' : 'none';
        personalFormFields.style.display = mode === 'personal' ? 'block' : 'none';
        invoiceFormFields.style.display = mode === 'invoice' ? 'block' : 'none';

        if (isEdit) {
            if (mode === 'personal') {
                modalTitle.textContent = 'Edit Personal Details';
            } else if (mode === 'invoice') {
                modalTitle.textContent = 'Edit Invoice Details';
            } else {
                modalTitle.textContent = 'Edit Subscription';
            }
            
            const item = memberships.find(m => m.id === id);
            if (item) {
                // Populate basic fields first as Type affects other sections
                subIdInput.value = item.id;
                subMemberIdInput.value = item.memberId || item.id;
                subNameInput.value = item.name;
                subAmountInput.value = item.amount;
                subDateInput.value = item.date;
                subTypeInput.value = item.type;
                
                // Show/hide relevant personal detail sections
                if (item.type === 'Organisation') {
                    orgPersonalFields.style.display = 'block';
                    indPersonalFields.style.display = 'none';
                    
                    orgMemberIdInput.value = item.memberId || item.id;
                    orgPhoneInput.value = item.phone || '';
                    orgEmailInput.value = item.email || '';
                    orgGstinInput.value = item.gstin || '';
                    orgAddressInput.value = item.address || '';
                    
                    authNameInput.value = item.authName || '';
                    authPhoneInput.value = item.authPhone || '';
                    authEmailInput.value = item.authEmail || '';
                } else {
                    orgPersonalFields.style.display = 'none';
                    indPersonalFields.style.display = 'block';
                    
                    indMemberIdInput.value = item.memberId || item.id;
                    indPhoneInput.value = item.phone || '';
                    indEmailInput.value = item.email || '';
                    indAddressInput.value = item.address || '';
                }

                // Shared non-basic fields
                subInvoiceNoInput.value = item.invoiceNo || '';
                subExpiryDateInput.value = item.expiryDate || '';
                invoiceDetailsInput.value = item.invoiceDetails || '';

                // Dynamic Form Fields setup
                if (mode === 'basic') {
                    updateCategoryOptions();
                    subCategoryInput.value = item.category || (item.type === 'Organisation' ? 'Corporate' : 'Alumni');
                    updateSubCategoryOptions();
                    subSubCategoryInput.value = item.subCategory || 'Borrowing';
                    
                    subAdmissionFeeInput.value = item.admissionFee || '';
                    subDepositToggleInput.value = item.depositToggle || 'Yes';
                    updateDepositToggle();
                    subDepositAmountInput.value = item.depositAmount || '';
                }
            }
        } else {
            modalTitle.textContent = 'Add Subscription';
            subForm.reset();
            subIdInput.value = '';
            subMemberIdInput.value = '';

            subDateInput.value = new Date().toISOString().split('T')[0];
            // Setup default expiry to 1 year
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            subExpiryDateInput.value = nextYear.toISOString().split('T')[0];

            if (mode === 'basic' || mode === 'personal') {
                const currentType = subTypeInput.value || 'Organisation';
                if (currentType === 'Organisation') {
                    orgPersonalFields.style.display = 'block';
                    indPersonalFields.style.display = 'none';
                } else {
                    orgPersonalFields.style.display = 'none';
                    indPersonalFields.style.display = 'block';
                }
            }

            if (mode === 'basic') {
                subTypeInput.value = 'Organisation';
                updateCategoryOptions();
                updateSubCategoryOptions();
                updateDepositToggle();
            }
        }
    }

    // Dynamic Form Logic Functions
    function updateCategoryOptions() {
        subCategoryInput.innerHTML = '';
        if (subTypeInput.value === 'Organisation') {
            subCategoryInput.innerHTML = '<option value="Corporate">Corporate</option><option value="Academic">Academic</option>';
        } else {
            subCategoryInput.innerHTML = '<option value="Alumni">Alumni</option><option value="Personal">Personal</option>';
        }
    }

    function updateSubCategoryOptions() {
        subSubCategoryInput.innerHTML = '';
        const cat = subCategoryInput.value;
        if (cat === 'Corporate' || cat === 'Alumni') {
            subSubCategoryInput.innerHTML = '<option value="Reference">Reference</option><option value="Borrowing">Borrowing</option>';
            subSubCategoryInput.value = 'Reference'; // Default
        } else {
            // Academic (Org) or Personal (Ind)
            subSubCategoryInput.innerHTML = '<option value="Borrowing">Borrowing</option>';
            subSubCategoryInput.value = 'Borrowing';
        }
        updateDepositToggle();
    }

    function updateDepositToggle() {
        const subCat = subSubCategoryInput.value;
        if (subCat === 'Reference') {
            subDepositToggleInput.value = 'No';
        } else if (subCat === 'Borrowing') {
            subDepositToggleInput.value = 'Yes';
        }
        
        depositAmountGroup.style.display = subDepositToggleInput.value === 'Yes' ? 'block' : 'none';
        if (subDepositToggleInput.value === 'No') {
            subDepositAmountInput.value = '';
        }
    }

    subTypeInput.addEventListener('change', () => {
        updateCategoryOptions();
        updateSubCategoryOptions();
    });

    subCategoryInput.addEventListener('change', () => {
        updateSubCategoryOptions();
    });

    subSubCategoryInput.addEventListener('change', () => {
        updateDepositToggle();
    });

    subDepositToggleInput.addEventListener('change', () => {
        depositAmountGroup.style.display = subDepositToggleInput.value === 'Yes' ? 'block' : 'none';
        if (subDepositToggleInput.value === 'No') {
            subDepositAmountInput.value = '';
        }
    });

    function closeModal() {
        modal.style.display = 'none';
        subForm.reset();
    }

    window.editMembership = function(id) {
        openModal(true, id, 'basic');
    };

    addSubBtn.addEventListener('click', () => openModal(false, null, 'basic'));
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    subForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = subIdInput.value;
        const inputMemberId = subMemberIdInput.value.trim();
        const name = subNameInput.value;
        const amount = parseFloat(subAmountInput.value);
        const date = subDateInput.value;
        const type = subTypeInput.value;
        
        // Grab extended fields depending on Type
        let phone = '';
        let email = '';
        let address = '';
        let gstin = '';
        let memberId = '';
        let authName = '';
        let authPhone = '';
        let authEmail = '';

        if (type === 'Organisation') {
            memberId = orgMemberIdInput.value;
            phone = orgPhoneInput.value;
            email = orgEmailInput.value;
            gstin = orgGstinInput.value;
            address = orgAddressInput.value;
            authName = authNameInput.value;
            authPhone = authPhoneInput.value;
            authEmail = authEmailInput.value;
        } else {
            memberId = indMemberIdInput.value;
            phone = indPhoneInput.value;
            email = indEmailInput.value;
            address = indAddressInput.value;
            // Individual doesn't have GSTIN or Authority by default in this schema
        }

        const invoiceNo = subInvoiceNoInput.value;
        const expiryDate = subExpiryDateInput.value;
        const invoiceDetails = invoiceDetailsInput.value;
        
        // Grab dynamic fields
        const category = subCategoryInput.value;
        const subCategory = subSubCategoryInput.value;
        const admissionFee = parseFloat(subAdmissionFeeInput.value) || 0;
        const depositToggle = subDepositToggleInput.value;
        const depositAmount = parseFloat(subDepositAmountInput.value) || 0;
        
        const calculatedStatus = calculateStatus(expiryDate);

        if (id) {
            // Edit
            const index = memberships.findIndex(m => m.id === id);
            if (index !== -1) {
                // If memberId changed, we should technically update id, but let's keep id as internal primary key and memberId as display
                memberships[index] = { 
                    ...memberships[index], name, amount, date, type, status: calculatedStatus, phone, email, address, gstin, 
                    invoiceNo, expiryDate, invoiceDetails, category, subCategory, admissionFee, 
                    depositToggle, depositAmount, memberId, authName, authPhone, authEmail 
                };
                saveData(memberships[index]);
            }
            // If we are currently viewing this item in Detail View, update it immediately
            if (currentDetailId === id) {
                showDetailView(id);
            }
        } else {
            // Add — use the Membership ID the user typed in the form
            if (!inputMemberId) {
                alert('Please enter a Membership ID.');
                return;
            }
            if (memberships.find(m => m.id === inputMemberId)) {
                alert(`Membership ID "${inputMemberId}" already exists. Please use a unique ID.`);
                return;
            }
            const newItem = { 
                id: inputMemberId, memberId: inputMemberId, name, amount, date, type, status: calculatedStatus, phone, email, address, gstin, 
                invoiceNo, expiryDate, invoiceDetails, category, subCategory, admissionFee, 
                depositToggle, depositAmount, authName, authPhone, authEmail 
            };
            memberships.unshift(newItem);
            saveData(newItem);
        }

        // We don't strictly need to call renderList here because onSnapshot will trigger it,
        // but closeModal gives immediate UI feedback.
        closeModal();
    });

    // --- 7. Notification Drawer Logic ---
    const notificationToggle = document.getElementById('notificationToggle');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationDrawer = document.getElementById('notificationDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerContent = document.getElementById('drawerContent');
    const drawerFilterBtns = document.querySelectorAll('.drawer-filter-btn');

    let activeDrawerFilter = 'all'; // 'all' | '30' | '90' | 'expired'

    function getDaysUntilExpiry(expiryDateStr) {
        if (!expiryDateStr) return -Infinity;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const exp = new Date(expiryDateStr);
        exp.setHours(0, 0, 0, 0);
        return Math.ceil((exp - now) / (1000 * 3600 * 24));
    }

    window.sendReminderEmail = function(memberId) {
        const item = memberships.find(m => m.id === memberId);
        if (!item) return;

        let targetEmail = item.email || '';
        if (item.type === 'Organisation' && item.authEmail && item.authEmail !== item.email) {
            if (targetEmail) {
                targetEmail += ',' + item.authEmail;
            } else {
                targetEmail = item.authEmail;
            }
        }

        if (!targetEmail) {
            alert('No email address found for this member.');
            return;
        }

        const days = getDaysUntilExpiry(item.expiryDate);
        const isExpired = days < 0;
        
        const subject = encodeURIComponent(`Subscription Renewal Reminder - IITGN Library`);
        const body = encodeURIComponent(
`Dear ${item.authName || item.name},

I hope you are doing well!

We would like to inform you that your ${(item.category === 'Other' ? 'Personal' : (item.category || item.type))} membership will expire on ${formatDate(item.expiryDate)}. We kindly request that you renew your membership by making a payment of ${formatCurrency(item.amount)} per annum as soon as possible. You can choose to pay online or by cheque. After making the payment, please send us the transaction details so that we can verify with our Institute Account Section whether the payment has been successfully processed. Once we have confirmed the payment, we will proceed with renewing your membership and creating new cards.

Bank Account details are as follows:

      Name of Account:  IIT Gandhinagar IR A/C

---------------------------------------------------------
Name of Bank: Canara Bank     | IFSC Code: CNRB0005159
---------------------------------------------------------
Account No.: 5159132000006    | MICR Code: 380015052
---------------------------------------------------------


We are eagerly anticipating your kind cooperation in this matter and greatly appreciate the value of membership. Additionally, we strongly encourage you to utilize the services and facilities offered by the library for your academic needs. We are delighted to assist you with this matter.


Thanks & Regards
Library Services | पुस्तकालय सेवाएँ
Indian Institute of Technology Gandhinagar
भारतीय प्रौद्योगिकी संस्थान गांधीनगर
Palaj | पालज | Gandhinagar | गांधीनगर- 382055
Gujarat | गुजरात  (INDIA  | भारत )
Phone | दूरभाष: + 91-079-2395 2622
Website II Online Catalogue II Digital Repository
------------------------------------------
Share the joy of reading and win amazing prizes too!
 presents Book Review Writing Competition for all students.
Register now`
        );

        let primaryEmail = globalPrimarySenderEmail !== null ? globalPrimarySenderEmail : localStorage.getItem('primarySenderEmail');
        if (primaryEmail === null) {
            primaryEmail = window.prompt("Enter the Gmail address you want to use as the primary sender account for reminders. Leave blank to be prompted with the account chooser.");
            if (primaryEmail !== null) {
                setDoc(doc(window.db, "settings", "general"), { primarySenderEmail: primaryEmail.trim() }, { merge: true });
                localStorage.setItem('primarySenderEmail', primaryEmail.trim());
            }
        }

        if (primaryEmail && primaryEmail.trim() !== '') {
            const gmailLink = `https://mail.google.com/mail/u/${encodeURIComponent(primaryEmail.trim())}/?view=cm&fs=1&to=${targetEmail}&su=${subject}&body=${body}`;
            window.open(gmailLink, '_blank');
        } else {
            const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${targetEmail}&su=${subject}&body=${body}`;
            window.open(`https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(gmailLink)}`, '_blank');
        }
    };

    function updateNotifications(filter = activeDrawerFilter) {
        // Recalculate status for all memberships
        memberships.forEach(m => { m.status = getLatestSummaryStatus(m); });

        // Badge always counts Warning + Expired regardless of filter
        const alerting = memberships.filter(m => m.status === 'Warning' || m.status === 'Expired');
        notificationBadge.textContent = alerting.length;
        notificationBadge.style.display = alerting.length > 0 ? 'flex' : 'none';

        // Apply the active drawer filter
        let filtered;
        if (filter === 'expired') {
            filtered = memberships.filter(m => getDaysUntilExpiry(m.expiryDate) < 0);
        } else if (filter === '30') {
            filtered = memberships.filter(m => {
                const days = getDaysUntilExpiry(m.expiryDate);
                return days >= 0 && days <= 30;
            });
        } else if (filter === '90') {
            filtered = memberships.filter(m => {
                const days = getDaysUntilExpiry(m.expiryDate);
                return days >= 0 && days <= 90;
            });
        } else {
            // 'all' — show Warning + Expired
            filtered = alerting;
        }

        drawerContent.innerHTML = '';
        if (filtered.length === 0) {
            drawerContent.innerHTML = `<p style="color: var(--text-secondary); text-align:center; padding: 24px 0;">No subscriptions match this filter.</p>`;
            return;
        }

        filtered.forEach(item => {
            const days = getDaysUntilExpiry(item.expiryDate);
            const isExpired = days < 0;
            const daysLabel = isExpired
                ? `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
                : `Expires in ${days} day${days !== 1 ? 's' : ''}`;

            const el = document.createElement('div');
            el.className = 'notification-item' + (isExpired ? ' notification-item--expired' : '');
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <h4 style="flex:1;">${item.name}</h4>
                    <span class="badge ${getBadgeClass(item.status)}">${item.status}</span>
                </div>
                <p style="margin-top:4px; font-size:0.75rem; color: var(--text-secondary);">${item.id} &nbsp;·&nbsp; ${daysLabel}</p>
                <p style="margin-top:2px; font-size:0.75rem; color: var(--text-secondary);">Expiry: ${formatDate(item.expiryDate)}</p>
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="btn btn-outline btn-sm" style="flex:1;" onclick="viewMembership('${item.id}'); toggleDrawer(true);">View Details →</button>
                    <button class="btn btn-primary btn-sm" style="flex:1;" onclick="sendReminderEmail('${item.id}')">Send Reminder</button>
                </div>
            `;
            drawerContent.appendChild(el);
        });
    }

    // Wire up drawer filter buttons
    drawerFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            drawerFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeDrawerFilter = btn.dataset.days;
            updateNotifications(activeDrawerFilter);
        });
    });

    function toggleDrawer(forceClose = false) {
        if (forceClose || notificationDrawer.classList.contains('open')) {
            notificationDrawer.classList.remove('open');
            drawerOverlay.style.display = 'none';
        } else {
            notificationDrawer.classList.add('open');
            drawerOverlay.style.display = 'block';
            updateNotifications(activeDrawerFilter);
        }
    }

    notificationToggle.addEventListener('click', () => toggleDrawer());
    closeDrawerBtn.addEventListener('click', () => toggleDrawer(true));
    drawerOverlay.addEventListener('click', () => toggleDrawer(true));

    // --- 8. Initial Render ---
    // Start the loading process
    loadData();
});
