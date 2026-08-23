let db = JSON.parse(localStorage.getItem('alanhar_db')) || {
    companies: [],
    transactions: [],
    rmbClients: [],
    rmbCompanies: [],
    rmbTransactions: []
};

if(!db.companies) db.companies = [];
if(!db.transactions) db.transactions = [];
if(!db.rmbClients) db.rmbClients = [];
if(!db.rmbCompanies) db.rmbCompanies = [];
if(!db.rmbTransactions) db.rmbTransactions = [];

let currentActiveCompanyId = null;
let currentRmbContext = { type: 'ALL', id: null };

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

function saveData() {
    localStorage.setItem('alanhar_db', JSON.stringify(db));
}

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatFormattedInput(input) {
    let rawValue = input.value.replace(/,/g, '');
    if (isNaN(rawValue) || rawValue === '') return;
    let parts = rawValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    input.value = parts.join('.');
}

function parseNumber(str) {
    if(!str) return 0;
    return parseFloat(str.toString().replace(/,/g, '')) || 0;
}

function enterModule(moduleName) {
    document.getElementById('view-landing').classList.add('hidden');
    if(moduleName === 'SWFT') {
        document.getElementById('module-swft').classList.remove('hidden');
        document.getElementById('module-rmb').classList.add('hidden');
        switchSwftBottomTab('home');
    } else if(moduleName === 'RMB') {
        document.getElementById('module-rmb').classList.remove('hidden');
        document.getElementById('module-swft').classList.add('hidden');
        switchRmbTab('transactions');
    }
}

function exitToLanding() {
    document.getElementById('module-swft').classList.add('hidden');
    document.getElementById('module-rmb').classList.add('hidden');
    document.getElementById('view-landing').classList.remove('hidden');
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

/* ================= SWFT LOGIC ================= */
function switchSwftBottomTab(tab) {
    ['home', 'preview', 'statements'].forEach(t => {
        document.getElementById(`swft-tab-${t}`).classList.add('hidden');
        document.getElementById(`swftNav-${t}`).className = "flex flex-col items-center gap-1 text-gray-400 hover:text-white font-bold text-xs cursor-pointer";
    });

    document.getElementById('swft-view-company-details').classList.add('hidden');

    document.getElementById(`swft-tab-${tab}`).classList.remove('hidden');
    document.getElementById(`swftNav-${tab}`).className = "flex flex-col items-center gap-1 text-amber-400 font-bold text-xs cursor-pointer";

    if(tab === 'home') renderCompanies();
    else if(tab === 'preview') renderSwftPreview();
    else if(tab === 'statements') prepareSwftStatementView();
}

function openAccountView(accountName) {
    switchSwftBottomTab('home');
    document.getElementById('globalSwftSearchAccount').value = accountName;
    renderGlobalSwftTransactions();
}

function clearSwftGlobalSearch() {
    document.getElementById('globalSwftSearchAmount').value = '';
    document.getElementById('globalSwftSearchAccount').value = 'ALL';
    document.getElementById('globalSwftSearchCurrency').value = 'ALL';
    hideGlobalSearchResults();
}

function hideGlobalSearchResults() {
    document.getElementById('globalSearchResultsContainer').classList.add('hidden');
}

function renderGlobalSwftTransactions() {
    let amount = parseNumber(document.getElementById('globalSwftSearchAmount').value);
    let account = document.getElementById('globalSwftSearchAccount').value;
    let currency = document.getElementById('globalSwftSearchCurrency').value;

    let container = document.getElementById('globalSearchResultsContainer');
    let tbody = document.getElementById('globalSwftTableBody');
    tbody.innerHTML = '';

    if(amount === 0 && account === 'ALL' && currency === 'ALL') {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    let accLabel = account === 'ALL' ? 'كل الحسابات' : (account === 'Dubai' ? 'DXB - Dubai Main' : 'TR - Turkey Main');
    document.getElementById('globalSearchResultsTitle').innerText = `نتائج تصفية المعاملات (${accLabel}):`;

    let results = db.transactions.filter(t => {
        if(amount > 0 && !t.amount.toString().includes(amount.toString())) return false;
        if(account !== 'ALL' && (t.account || 'Turkey') !== account) return false;
        if(currency !== 'ALL' && (t.currency || '$') !== currency) return false;
        return true;
    });

    if(results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">لا توجد نتائج مطابقة للبحث.</td></tr>`;
        return;
    }

    results.forEach(t => {
        let comp = db.companies.find(c => c.id === t.companyId);
        let curr = t.currency || '$';
        let accName = t.account === 'Dubai' ? 'DXB - Dubai Main' : 'TR - Turkey Main';

        let tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition";
        tr.innerHTML = `
            <td class="p-3 font-bold text-amber-400">${comp ? comp.name : 'شركة محذوفة'}</td>
            <td class="p-3 font-mono text-gray-300">${t.date}</td>
            <td class="p-3 font-mono font-bold text-white">${t.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
            <td class="p-3 font-bold text-amber-300">${curr}</td>
            <td class="p-3 font-bold text-blue-400">${accName}</td>
            <td class="p-3 text-gray-300 max-w-xs break-words">${t.note || '-'}</td>
            <td class="p-3 font-mono font-bold text-white">${t.finalTotal.toLocaleString(undefined,{minimumFractionDigits:2})} ${curr}</td>
            <td class="p-3 text-center flex justify-center gap-2">
                <button onclick="editSwftTransaction('${t.id}')" class="text-amber-400 hover:underline font-bold cursor-pointer">تعديل</button>
                <button onclick="deleteSwftTransaction('${t.id}')" class="text-red-400 hover:underline font-bold cursor-pointer">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function saveCompany() {
    let name = document.getElementById('inputCompanyName').value.trim();
    let code = document.getElementById('inputCompanyCode').value.trim();
    if(!name || !code) return alert('الرجاء إدخال اسم الكود والشركة.');
    db.companies.push({ id: Date.now().toString(), name, code });
    saveData();
    closeModal('addCompanyModal');
    document.getElementById('inputCompanyName').value = '';
    document.getElementById('inputCompanyCode').value = '';
    renderCompanies();
}

function renderCompanies() {
    let tbody = document.getElementById('companiesTableBody');
    tbody.innerHTML = '';
    if(db.companies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-gray-500">لا توجد شركات مسجلة.</td></tr>`;
        return;
    }
    db.companies.forEach(comp => {
        let tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition cursor-pointer";
        tr.innerHTML = `
            <td class="p-4 font-mono text-amber-400 font-bold">${comp.code}</td>
            <td class="p-4 font-semibold text-white">${comp.name}</td>
            <td class="p-4 text-center">
                <button onclick="openCompanyDetails('${comp.id}')" class="bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer">عرض المعاملات</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCompanyDetails(compId) {
    currentActiveCompanyId = compId;
    let comp = db.companies.find(c => c.id === compId);
    if(!comp) return;
    document.getElementById('currentCompanyName').innerText = comp.name;
    document.getElementById('currentCompanyCode').innerText = `الكود: ${comp.code}`;
    resetCompanyDateToToday();
    
    ['home', 'preview', 'statements'].forEach(t => document.getElementById(`swft-tab-${t}`).classList.add('hidden'));
    document.getElementById('swft-view-company-details').classList.remove('hidden');
}

function resetCompanyDateToToday() {
    let today = getTodayDateString();
    document.getElementById('compFromDate').value = today;
    document.getElementById('compToDate').value = today;
    renderTransactions();
}

function openAddTransactionModal() {
    document.getElementById('editingTransId').value = '';
    document.getElementById('modalTransTitle').innerText = 'إضافة معاملة جديدة (SWFT)';
    document.getElementById('transDate').value = getTodayDateString();
    document.getElementById('transAmount').value = '';
    document.getElementById('comm1Val').value = '0';
    document.getElementById('comm2Val').value = '0';
    document.getElementById('transNote').value = '';
    openModal('addTransactionModal');
}

function editSwftTransaction(id) {
    let t = db.transactions.find(x => x.id === id);
    if(!t) return;
    document.getElementById('editingTransId').value = t.id;
    document.getElementById('modalTransTitle').innerText = 'تعديل المعاملة (SWFT)';
    document.getElementById('transDate').value = t.date;
    document.getElementById('transAmount').value = t.amount.toString();
    document.getElementById('transCurrency').value = t.currency || '$';
    document.getElementById('transAccountSelect').value = t.account || 'Turkey';
    document.getElementById('transNote').value = t.note || '';
    openModal('addTransactionModal');
}

function saveTransaction() {
    let editId = document.getElementById('editingTransId').value;
    let date = document.getElementById('transDate').value;
    let amount = parseNumber(document.getElementById('transAmount').value);
    let currency = document.getElementById('transCurrency').value || '$';
    let account = document.getElementById('transAccountSelect').value || 'Turkey';
    let note = document.getElementById('transNote').value.trim();

    let c1Val = parseNumber(document.getElementById('comm1Val').value);
    let c1Type = document.getElementById('comm1Type').value;
    let c2Val = parseNumber(document.getElementById('comm2Val').value);
    let c2Type = document.getElementById('comm2Type').value;

    if(!date || amount <= 0) return alert('الرجاء إدخال بيانات صالحة.');

    let c1Calc = c1Type === 'value' ? c1Val : (c1Type === 'permil' ? (amount * c1Val) / 1000 : (amount * c1Val) / 100);
    let c2Calc = c2Type === 'value' ? c2Val : (c2Type === 'permil' ? (amount * c2Val) / 1000 : (amount * c2Val) / 100);

    if(editId) {
        let idx = db.transactions.findIndex(t => t.id === editId);
        if(idx !== -1) {
            db.transactions[idx].date = date;
            db.transactions[idx].amount = amount;
            db.transactions[idx].currency = currency;
            db.transactions[idx].account = account;
            db.transactions[idx].note = note;
            db.transactions[idx].c1CalculatedAmount = c1Calc;
            db.transactions[idx].c2CalculatedAmount = c2Calc;
            db.transactions[idx].finalTotal = amount + c1Calc + c2Calc;
        }
    } else {
        db.transactions.push({
            id: Date.now().toString(),
            companyId: currentActiveCompanyId,
            date, amount, currency, account, note,
            c1CalculatedAmount: c1Calc,
            c2CalculatedAmount: c2Calc,
            finalTotal: amount + c1Calc + c2Calc,
            initialChecked: false,
            finalChecked: false
        });
    }

    saveData();
    closeModal('addTransactionModal');
    renderTransactions();
    renderGlobalSwftTransactions();
    showToast(editId ? 'تم تعديل المعاملة بنجاح!' : 'تم حفظ المعاملة بنجاح!');
}

function renderTransactions() {
    let tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';
    let searchAmount = parseNumber(document.getElementById('compSearchAmount').value);
    let searchCurr = document.getElementById('compSearchCurrency').value;
    let fromDate = document.getElementById('compFromDate').value;
    let toDate = document.getElementById('compToDate').value;

    let compTrans = db.transactions.filter(t => {
        if(t.companyId !== currentActiveCompanyId) return false;
        if(searchAmount > 0 && !t.amount.toString().includes(searchAmount.toString())) return false;
        if(searchCurr !== 'ALL' && (t.currency || '$') !== searchCurr) return false;
        if(fromDate && t.date < fromDate) return false;
        if(toDate && t.date > toDate) return false;
        return true;
    });

    if(compTrans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-500">لا توجد معاملات مطابقة.</td></tr>`;
        return;
    }

    compTrans.forEach(t => {
        let curr = t.currency || '$';
        let accName = t.account === 'Dubai' ? 'DXB - Dubai Main' : 'TR - Turkey Main';
        let tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition";
        tr.innerHTML = `
            <td class="p-4 font-mono text-gray-300">${t.date}</td>
            <td class="p-4 font-mono font-bold text-amber-400">${t.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
            <td class="p-4 font-bold text-amber-300">${curr}</td>
            <td class="p-4 font-bold text-blue-400">${accName}</td>
            <td class="p-4 text-xs text-gray-300 max-w-xs break-words">${t.note || '-'}</td>
            <td class="p-4 font-mono font-bold text-white">${t.finalTotal.toLocaleString(undefined,{minimumFractionDigits:2})} ${curr}</td>
            <td class="p-4 text-center flex justify-center gap-2">
                <button onclick="editSwftTransaction('${t.id}')" class="text-amber-400 hover:text-amber-300 font-bold text-xs cursor-pointer">تعديل</button>
                <button onclick="deleteSwftTransaction('${t.id}')" class="text-red-400 hover:text-red-300 font-bold text-xs cursor-pointer">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteSwftTransaction(id) {
    if(confirm('هل انت متاكد من حذف المعاملة؟')) {
        db.transactions = db.transactions.filter(t => t.id !== id);
        saveData();
        renderTransactions();
        renderGlobalSwftTransactions();
    }
}

/* ================= شاشة المبدئي والنهائي الموحدة ================= */
function toggleTransactionStatus(id, type) {
    let t = db.transactions.find(x => x.id === id);
    if(t) {
        if(type === 'initial') t.initialChecked = !t.initialChecked;
        if(type === 'final') t.finalChecked = !t.finalChecked;
        saveData();
        renderSwftPreview();
    }
}

function renderSwftPreview() {
    let tbody = document.getElementById('swftPreviewUnifiedTableBody');
    tbody.innerHTML = '';

    if(!db.transactions || db.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-500">لا توجد معاملات حالية.</td></tr>`;
        return;
    }

    db.transactions.forEach(t => {
        let comp = db.companies.find(c => c.id === t.companyId);
        let curr = t.currency || '$';
        let accName = t.account === 'Dubai' ? 'DXB - Dubai Main' : 'TR - Turkey Main';
        let isFullyCompleted = t.initialChecked && t.finalChecked;

        let tr = document.createElement('tr');
        tr.className = isFullyCompleted ? "bg-emerald-950/20 opacity-60 transition duration-300" : "hover:bg-white/5 transition duration-300";

        tr.innerHTML = `
            <td class="p-4 text-center">
                <input type="checkbox" ${t.initialChecked ? 'checked' : ''} onchange="toggleTransactionStatus('${t.id}', 'initial')" class="w-5 h-5 accent-amber-500 rounded cursor-pointer">
            </td>
            <td class="p-4 text-center">
                <input type="checkbox" ${t.finalChecked ? 'checked' : ''} onchange="toggleTransactionStatus('${t.id}', 'final')" class="w-5 h-5 accent-emerald-500 rounded cursor-pointer">
            </td>
            <td class="p-4 font-bold text-amber-400">${comp ? comp.name : 'شركة غير محددة'}</td>
            <td class="p-4 font-mono font-bold text-white">${t.amount.toLocaleString(undefined,{minimumFractionDigits:2})} ${curr}</td>
            <td class="p-4 font-bold text-blue-400">${accName}</td>
            <td class="p-4 text-xs text-gray-300 max-w-xs break-words">${t.note || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function prepareSwftStatementView() {
    let select = document.getElementById('statementSwftCompany');
    select.innerHTML = '';
    db.companies.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name} (${c.code})</option>`;
    });
    renderSwftStatement();
}

function renderSwftStatement() {
    let compId = document.getElementById('statementSwftCompany').value;
    let comp = db.companies.find(c => c.id === compId);
    let tbody = document.getElementById('swftStatementTableBody');
    tbody.innerHTML = '';
    if(!comp) return;

    document.getElementById('pdfCompName').innerText = comp.name;
    document.getElementById('pdfCompCode').innerText = comp.code;
    document.getElementById('pdfStatementDate').innerText = getTodayDateString();

    let trans = db.transactions.filter(t => t.companyId === compId);
    let totalAmount = 0;
    let currencyUsed = "$";

    if(trans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-500">لا توجد معاملات لهذه الشركة.</td></tr>`;
    } else {
        trans.forEach(t => {
            let curr = t.currency || '$';
            currencyUsed = curr;
            let accName = t.account === 'Dubai' ? 'DXB - Dubai Main' : 'TR - Turkey Main';
            totalAmount += t.finalTotal;

            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 font-mono">${t.date}</td>
                <td class="p-3 font-mono font-bold">${t.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                <td class="p-3">${curr}</td>
                <td class="p-3 font-bold">${accName}</td>
                <td class="p-3">${t.note || '-'}</td>
                <td class="p-3 font-mono font-bold">${t.finalTotal.toLocaleString(undefined,{minimumFractionDigits:2})} ${curr}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('pdfStatementCurrency').innerText = currencyUsed;
    document.getElementById('pdfStatementTotalVal').innerText = `${currencyUsed} ${totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}`;
}

function clearSwftStatementFilters() {
    if(document.getElementById('statementSwftCompany').options.length > 0) {
        document.getElementById('statementSwftCompany').selectedIndex = 0;
        renderSwftStatement();
    }
    showToast('تم مسح الفلاتر بنجاح!');
}

/* ================= RMB LOGIC ================= */
function switchRmbTab(tab) {
    ['transactions', 'clients', 'companies', 'statements'].forEach(t => {
        document.getElementById(`rmb-sec-${t}`).classList.add('hidden');
        document.getElementById(`rmbTab-${t}`).className = "px-4 py-2 rounded-xl text-xs font-bold transition text-gray-400 hover:text-white cursor-pointer";
    });

    document.getElementById(`rmb-sec-${tab}`).classList.remove('hidden');
    document.getElementById(`rmbTab-${tab}`).className = "px-4 py-2 rounded-xl text-xs font-bold transition bg-red-600 text-white shadow-lg cursor-pointer";

    if(tab === 'transactions') renderRmbTransactions();
    else if(tab === 'clients') renderRmbClients();
    else if(tab === 'companies') renderRmbCompanies();
    else if(tab === 'statements') prepareRmbStatementView();
}

function saveRmbClient() {
    let name = document.getElementById('inputRmbClientName').value.trim();
    if(!name) return alert('يرجى أدخال اسم الزبون.');
    db.rmbClients.push({ id: Date.now().toString(), name });
    saveData();
    closeModal('addRmbClientModal');
    document.getElementById('inputRmbClientName').value = '';
    renderRmbClients();
}

function renderRmbClients() {
    let tbody = document.getElementById('rmbClientsTableBody');
    tbody.innerHTML = '';
    if(db.rmbClients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-gray-500">لا يوجد زبائن مسجلين.</td></tr>`;
        return;
    }
    db.rmbClients.forEach(c => {
        let tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition";
        tr.innerHTML = `
            <td class="p-4 font-bold text-white">${c.name}</td>
            <td class="p-4 text-center">
                <button onclick="filterRmbContext('CLIENT', '${c.id}', '${c.name}')" class="bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer">عرض معاملات الزبون</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function saveRmbCompany() {
    let name = document.getElementById('inputRmbCompanyName').value.trim();
    if(!name) return alert('يرجى أدخال اسم الشركة.');
    db.rmbCompanies.push({ id: Date.now().toString(), name });
    saveData();
    closeModal('addRmbCompanyModal');
    document.getElementById('inputRmbCompanyName').value = '';
    renderRmbCompanies();
}

function renderRmbCompanies() {
    let tbody = document.getElementById('rmbCompaniesTableBody');
    tbody.innerHTML = '';
    if(db.rmbCompanies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-gray-500">لا توجد شركات مسجلة.</td></tr>`;
        return;
    }
    db.rmbCompanies.forEach(comp => {
        let tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition";
        tr.innerHTML = `
            <td class="p-4 font-bold text-white">${comp.name}</td>
            <td class="p-4 text-center">
                <button onclick="filterRmbContext('COMPANY', '${comp.id}', '${comp.name}')" class="bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer">عرض معاملات الشركة</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterRmbContext(type, id, name) {
    currentRmbContext = { type, id };
    document.getElementById('btnBackFromContext').classList.remove('hidden');
    document.getElementById('rmbTransTitle').innerText = type === 'CLIENT' ? `معاملات الزبون: ${name}` : `معاملات الشركة: ${name}`;
    switchRmbTab('transactions');
}

function clearRmbContextFilter() {
    currentRmbContext = { type: 'ALL', id: null };
    document.getElementById('btnBackFromContext').classList.add('hidden');
    document.getElementById('rmbTransTitle').innerText = "معاملات RMB ¥";
    renderRmbTransactions();
}

function openRmbTransModal() {
    if(db.rmbClients.length === 0 || db.rmbCompanies.length === 0) {
        return alert('يرجى إضافة زبون وشركة واحدة على الأقل قبل إضافة معاملة.');
    }

    document.getElementById('rmbTransDate').value = getTodayDateString();
    document.getElementById('rmbTransAmount').value = '';
    document.getElementById('rmbTransAccountDetails').value = '';

    let clientSelect = document.getElementById('rmbTransClientSelect');
    clientSelect.innerHTML = '';
    db.rmbClients.forEach(c => clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);

    let compSelect = document.getElementById('rmbTransCompanySelect');
    compSelect.innerHTML = '';
    db.rmbCompanies.forEach(c => compSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);

    if(currentRmbContext.type === 'CLIENT') {
        clientSelect.value = currentRmbContext.id;
        clientSelect.disabled = true;
        compSelect.disabled = false;
    } else if(currentRmbContext.type === 'COMPANY') {
        compSelect.value = currentRmbContext.id;
        compSelect.disabled = true;
        clientSelect.disabled = false;
    } else {
        clientSelect.disabled = false;
        compSelect.disabled = false;
    }

    openModal('addRmbTransactionModal');
}

function saveRmbTransaction() {
    let date = document.getElementById('rmbTransDate').value;
    let clientId = document.getElementById('rmbTransClientSelect').value;
    let companyId = document.getElementById('rmbTransCompanySelect').value;
    let amount = parseNumber(document.getElementById('rmbTransAmount').value);
    let accountDetails = document.getElementById('rmbTransAccountDetails').value.trim();

    if(!date || !clientId || !companyId || amount <= 0) {
        return alert('يرجى إدخال كافة البيانات بشكل صحيح.');
    }

    db.rmbTransactions.push({ id: Date.now().toString(), date, clientId, companyId, amount, accountDetails });

    saveData();
    closeModal('addRmbTransactionModal');
    renderRmbTransactions();
    showToast('تمت إضافة معاملة RMB بنجاح!');
}

function renderRmbTransactions() {
    let tbody = document.getElementById('rmbTransactionsTableBody');
    tbody.innerHTML = '';

    let searchAmount = parseNumber(document.getElementById('rmbSearchAmount').value);
    let searchDetails = document.getElementById('rmbSearchDetails').value.toLowerCase().trim();

    let list = db.rmbTransactions.filter(t => {
        if(currentRmbContext.type === 'CLIENT' && t.clientId !== currentRmbContext.id) return false;
        if(currentRmbContext.type === 'COMPANY' && t.companyId !== currentRmbContext.id) return false;
        if(searchAmount > 0 && !t.amount.toString().includes(searchAmount.toString())) return false;
        if(searchDetails && !t.accountDetails.toLowerCase().includes(searchDetails)) return false;
        return true;
    });

    if(list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-500">لا توجد معاملات مطابقة للبحث.</td></tr>`;
        return;
    }

    list.forEach(t => {
        let client = db.rmbClients.find(c => c.id === t.clientId);
        let company = db.rmbCompanies.find(c => c.id === t.companyId);

        let tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition";
        tr.innerHTML = `
            <td class="p-4 font-mono text-gray-300">${t.date}</td>
            <td class="p-4 font-bold text-white">${client ? client.name : 'غير محدد'}</td>
            <td class="p-4 font-bold text-amber-400">${company ? company.name : 'غير محدد'}</td>
            <td class="p-4 font-mono font-bold text-red-400 text-base">${t.amount.toLocaleString(undefined,{minimumFractionDigits:2})} ¥</td>
            <td class="p-4 text-xs text-gray-300 max-w-xs break-words">${t.accountDetails || '-'}</td>
            <td class="p-4 text-center">
                <button onclick="deleteRmbTransaction('${t.id}')" class="text-red-500 hover:text-red-400 font-bold text-xs cursor-pointer">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteRmbTransaction(id) {
    if(confirm('هل أنت تأكد من حذف هذه المعاملة؟')) {
        db.rmbTransactions = db.rmbTransactions.filter(t => t.id !== id);
        saveData();
        renderRmbTransactions();
    }
}

function prepareRmbStatementView() {
    updateRmbStatementFilterOptions();
}

function updateRmbStatementFilterOptions() {
    let type = document.getElementById('rmbStatementType').value;
    let select = document.getElementById('rmbStatementTargetSelect');
    select.innerHTML = '';

    if(type === 'CLIENT') {
        db.rmbClients.forEach(c => select.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    } else {
        db.rmbCompanies.forEach(c => select.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    }
    renderRmbStatementTable();
}

function renderRmbStatementTable() {
    let type = document.getElementById('rmbStatementType').value;
    let targetId = document.getElementById('rmbStatementTargetSelect').value;
    let tbody = document.getElementById('rmbStatementTableBody');
    tbody.innerHTML = '';

    let targetName = "--";
    if(type === 'CLIENT') {
        let cl = db.rmbClients.find(c => c.id === targetId);
        if(cl) targetName = cl.name;
    } else {
        let comp = db.rmbCompanies.find(c => c.id === targetId);
        if(comp) targetName = comp.name;
    }

    document.getElementById('rmbPdfTargetName').innerText = targetName;
    document.getElementById('rmbPdfTargetType').innerText = type === 'CLIENT' ? "كشف حساب زبون" : "كشف حساب شركة";
    document.getElementById('rmbPdfStatementDate').innerText = getTodayDateString();

    let list = db.rmbTransactions.filter(t => type === 'CLIENT' ? t.clientId === targetId : t.companyId === targetId);

    let total = 0;
    if(list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-500">لا توجد معاملات مسجلة.</td></tr>`;
    } else {
        list.forEach(t => {
            let client = db.rmbClients.find(c => c.id === t.clientId);
            let company = db.rmbCompanies.find(c => c.id === t.companyId);
            total += t.amount;

            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 font-mono">${t.date}</td>
                <td class="p-3 font-bold">${client ? client.name : '-'}</td>
                <td class="p-3 font-bold">${company ? company.name : '-'}</td>
                <td class="p-3 font-mono font-bold">${t.amount.toLocaleString(undefined,{minimumFractionDigits:2})} ¥</td>
                <td class="p-3">${t.accountDetails || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('rmbStatementTotal').innerText = `${total.toLocaleString(undefined,{minimumFractionDigits:2})} ¥`;
}

function exportRmbData() {
    let rmbData = { rmbClients: db.rmbClients, rmbCompanies: db.rmbCompanies, rmbTransactions: db.rmbTransactions };
    let blob = new Blob([JSON.stringify(rmbData, null, 2)], { type: 'application/json' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `RMB_Data_${getTodayDateString()}.json`;
    a.click();
}

function importRmbData(e) {
    let file = e.target.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(evt) {
        try {
            let imported = JSON.parse(evt.target.result);
            if(imported.rmbClients) db.rmbClients = imported.rmbClients;
            if(imported.rmbCompanies) db.rmbCompanies = imported.rmbCompanies;
            if(imported.rmbTransactions) db.rmbTransactions = imported.rmbTransactions;
            saveData();
            showToast('تم استيراد بيانات RMB بنجاح!');
            renderRmbTransactions();
        } catch(err) {
            alert('ملف غير صالح.');
        }
    }
    reader.readAsText(file);
}

function exportFullBackup() {
    let blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `FULL_SYSTEM_BACKUP_${getTodayDateString()}.json`;
    a.click();
}

function importFullBackup(e) {
    let file = e.target.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(evt) {
        try {
            db = JSON.parse(evt.target.result);
            saveData();
            showToast('تم استعادة النسخة الاحتياطية الشاملة بنجاح!');
        } catch(err) {
            alert('ملف النسخة الاحتياطية غير صالح.');
        }
    }
    reader.readAsText(file);
}