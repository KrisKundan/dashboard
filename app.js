import { collection, getDocs, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure Firebase is initialized
    if (!window.db) {
        console.error("Firebase not initialized in window.db");
        return;
    }
    const db = window.db;
    const membershipsCollection = collection(db, "memberships");
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
    
    // Membership Status Elements
    const detailMembershipStatus = document.getElementById('detailMembershipStatus');
    const refundProcessSection = document.getElementById('refundProcessSection');
    const refundDepositAmount = document.getElementById('refundDepositAmount');
    const initiateRefundBtn = document.getElementById('initiateRefundBtn');
    const refundInitiatedMsg = document.getElementById('refundInitiatedMsg');

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
                <button class="btn btn-outline btn-sm" onclick="editMembership('${item.id}')">Edit</button>
                <button class="btn btn-primary" onclick="viewMembership('${item.id}')">View More →</button>
            `;
            membershipListEl.appendChild(listEl);
        });
    }

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
                    <td>
                        <button class="btn btn-outline btn-sm" style="border-color: var(--danger-color); color: var(--danger-color); padding: 2px 8px; font-size: 0.75rem;" onclick="deleteHistoryEntry('${item.id}', ${idx})">Delete</button>
                    </td>
                `;
                invoiceTableBody.appendChild(row);
            });
        }
        
        detailTotalHistoryAmount.textContent = formatCurrency(totalAmountPaid);

    }

    // --- Add History Entry Modal Logic ---
    const addEntryModal = document.getElementById('addEntryModal');
    const addEntryForm = document.getElementById('addEntryForm');
    const closeAddEntryBtn = document.getElementById('closeAddEntryBtn');
    const cancelAddEntryBtn = document.getElementById('cancelAddEntryBtn');
    const entryInvoiceNo = document.getElementById('entryInvoiceNo');
    const entryDate = document.getElementById('entryDate');
    const entryExpiryDate = document.getElementById('entryExpiryDate');
    const entryAmount = document.getElementById('entryAmount');
    const entryPdfFile = document.getElementById('entryPdfFile');

    // "Add Entry" button opens the modal
    document.getElementById('editInvoiceBtn').addEventListener('click', () => {
        addEntryForm.reset();
        // Pre-fill dates sensibly
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);
        entryDate.value = today.toISOString().split('T')[0];
        entryExpiryDate.value = nextYear.toISOString().split('T')[0];
        addEntryModal.style.display = 'flex';
    });

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

        if (!item.invoiceHistory) {
            item.invoiceHistory = [];
        }

        const newEntry = {
            invoiceNo: entryInvoiceNo.value || '-',
            date: entryDate.value,
            expiryDate: entryExpiryDate.value,
            amount: parseFloat(entryAmount.value) || 0
        };

        const file = entryPdfFile.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Please select a valid PDF file.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('PDF file size must be less than 5MB.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(evt) {
                newEntry.pdfData = evt.target.result;
                newEntry.pdfName = file.name;
                
                item.invoiceHistory.push(newEntry);
                saveData(item);
                showDetailView(currentDetailId); 
                closeAddEntryModal();
            };
            reader.readAsDataURL(file);
        } else {
            item.invoiceHistory.push(newEntry);
            saveData(item);
            showDetailView(currentDetailId);
            closeAddEntryModal();
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

    detailEditBtn.addEventListener('click', () => {
        openModal(true, currentDetailId, 'personal');
    });

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
    function updateRefundUI(item) {
        if (item.membershipStatus === 'Cancelled' && item.depositToggle === 'Yes' && item.depositAmount > 0) {
            if (item.refundStatus === 'Initiated') {
                refundProcessSection.style.display = 'none';
                refundInitiatedMsg.style.display = 'block';
            } else {
                refundProcessSection.style.display = 'block';
                refundInitiatedMsg.style.display = 'none';
                refundDepositAmount.textContent = formatCurrency(item.depositAmount);
            }
        } else {
            refundProcessSection.style.display = 'none';
            refundInitiatedMsg.style.display = 'none';
        }
    }

    detailMembershipStatus.addEventListener('change', (e) => {
        const item = memberships.find(m => m.id === currentDetailId);
        if (item) {
            item.membershipStatus = e.target.value;
            saveData(item);
            updateRefundUI(item);
        }
    });

    initiateRefundBtn.addEventListener('click', () => {
        const item = memberships.find(m => m.id === currentDetailId);
        if (item) {
            item.refundStatus = 'Initiated';
            saveData(item);
            updateRefundUI(item);
        }
    });

    // --- 6. Event Listeners & Modal CRUD ---
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
            subCategoryInput.innerHTML = '<option value="Alumni">Alumni</option><option value="Other">Other</option>';
        }
    }

    function updateSubCategoryOptions() {
        subSubCategoryInput.innerHTML = '';
        const cat = subCategoryInput.value;
        if (cat === 'Corporate' || cat === 'Alumni') {
            subSubCategoryInput.innerHTML = '<option value="Reference">Reference</option><option value="Borrowing">Borrowing</option>';
            subSubCategoryInput.value = 'Reference'; // Default
        } else {
            // Academic (Org) or Other (Ind)
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
                <button class="btn btn-outline btn-sm" style="margin-top:10px; width:100%;" onclick="viewMembership('${item.id}'); toggleDrawer(true);">View Details →</button>
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
