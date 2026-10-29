// === 1. СОСТОЯНИЕ ===
let apartments = [];
let editId = null;
let uploadedPhotoBase64 = null; // Временное хранение фото перед сохранением

const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

// === 2. ЭЛЕМЕНТЫ ===
const list = document.getElementById('list');
const formTitle = document.getElementById('formTitle');
const addBtn = document.getElementById('addBtn');
const cancelBtn = document.getElementById('cancelBtn');
const editIdInput = document.getElementById('editId');

// Поля формы
const nameInput = document.getElementById('name');
const photoInput = document.getElementById('photo');
const areaInput = document.getElementById('area');
const tenantNameInput = document.getElementById('tenantName');
const tenantPhoneInput = document.getElementById('tenantPhone');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const incomeInput = document.getElementById('income');
const mortgageInput = document.getElementById('mortgage');
const utilitiesInput = document.getElementById('utilities');
const expensesInput = document.getElementById('expenses');
const paymentStatusInput = document.getElementById('paymentStatus');
const prevMeterInput = document.getElementById('prevMeter');
const currMeterInput = document.getElementById('currMeter');
const meterRateInput = document.getElementById('meterRate');
const notesInput = document.getElementById('notes');

// Дашборд
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const totalProfitEl = document.getElementById('totalProfit');
const totalDebtsEl = document.getElementById('totalDebts');
const expiringContractsEl = document.getElementById('expiringContracts');

// Экспорт
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

// === 3. УТИЛИТЫ ===
function formatMoney(num) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(num)) + ' ₽';
}

function loadData() {
  const saved = localStorage.getItem('rentalCRM_v3');
  if (saved) apartments = JSON.parse(saved);
}

function saveData() {
  localStorage.setItem('rentalCRM_v3', JSON.stringify(apartments));
}

// Загрузка фото
photoInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      uploadedPhotoBase64 = event.target.result; // Сохраняем картинку в виде текста
    };
    reader.readAsDataURL(file);
  }
});

// === 4. ОТРИСОВКА ===
function render() {
  list.innerHTML = '';
  
  if (apartments.length === 0) {
    list.innerHTML = '<p class="empty-text">Нет добавленных квартир.</p>';
    updateDashboard(0, 0, 0, 0, 0);
    return;
  }

  let globalIncome = 0;
  let globalExpenses = 0;
  let globalDebts = 0;
  let expiringCount = 0;

  const today = new Date();

  apartments.forEach(apt => {
    // Инициализация старых/новых полей
    if (!apt.monthsArray) apt.monthsArray = Array(12).fill(true);
    
    // 1. Счетчики
    const meterDiff = Math.max(0, (apt.currMeter || 0) - (apt.prevMeter || 0));
    const meterCost = meterDiff * (apt.meterRate || 0);
    const totalUtilities = (apt.utilities * apt.monthsArray.filter(m => m).length) + meterCost;

    // 2. Сданные месяцы
    const rentedMonthsCount = apt.monthsArray.filter(m => m === true).length;
    
    // 3. Доход и основные расходы
    const totalIncome = apt.income * rentedMonthsCount;
    const totalMortgage = apt.mortgage * 12;
    const totalExpensesItems = apt.expenses * rentedMonthsCount;
    
    // 4. Долг (если статус "Долг" - добавляем сумму месячной оплаты)
    const currentDebt = apt.paymentStatus === 'debt' ? apt.income : 0;
    globalDebts += currentDebt;

    // 5. Итоговые расходы и прибыль
    const totalAptExpenses = totalUtilities + totalExpensesItems + totalMortgage + currentDebt;
    const profit = totalIncome - totalAptExpenses;
    
    globalIncome += totalIncome;
    globalExpenses += totalAptExpenses;

    // 6. Умный статус (Скоро окончание)
    let expiringHtml = '';
    if (apt.endDate) {
      const end = new Date(apt.endDate);
      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        expiringHtml = `<div class="warning-badge">⚠️ Скоро окончание договора (${diffDays} дн.)</div>`;
        expiringCount++;
      } else if (diffDays < 0) {
        expiringHtml = `<div class="warning-badge" style="background:#78350f; color:#fbbf24;">⛔ Договор истек</div>`;
      }
    }

    // HTML для календаря
    let calendarHtml = '<div class="calendar">';
    for (let i = 0; i < 12; i++) {
      const isRented = apt.monthsArray[i];
      calendarHtml += `<button class="month-btn ${isRented ? 'active' : 'free'}" onclick="toggleMonth(${apt.id}, ${i})">${monthNames[i]}</button>`;
    }
    calendarHtml += '</div>';

    const card = document.createElement('div');
    card.className = `card ${profit >= 0 ? 'profit' : 'loss'}`;

    card.innerHTML = `
      ${expiringHtml}
      <div class="card-header">
        <div class="card-title">
          ${apt.name} 
          <span class="badge ${rentedMonthsCount > 0 ? 'rented' : 'free'}">
            ${rentedMonthsCount > 0 ? 'Сдана (' + rentedMonthsCount + ' мес)' : 'Пустует'}
          </span>
        </div>
        <div class="card-actions">
          <button class="action-btn" onclick="editApt(${apt.id})">✏️ <span class="btn-text">Изменить</span></button>
          <button class="action-btn delete" onclick="deleteApt(${apt.id})">🗑️ <span class="btn-text">Удалить</span></button>
        </div>
      </div>
      
      <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
        ${apt.photo ? `<img src="${apt.photo}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">` : ''}
        <div>
          <p><strong>Арендатор:</strong> ${apt.tenantName || '—'}</p>
          <p><strong>Телефон:</strong> <a href="tel:${apt.tenantPhone}" style="color: #38bdf8; text-decoration: none;">${apt.tenantPhone || '—'}</a></p>
          <p><strong>Срок:</strong> ${apt.startDate || '—'} до ${apt.endDate || '—'}</p>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <span class="stat-name" style="font-size: 13px;">Календарь сдачи:</span>
        ${calendarHtml}
      </div>

      <div class="card-body">
        <div class="stat"><span class="stat-name">Площадь:</span> <span>${apt.area} кв.м</span></div>
        <div class="stat"><span class="stat-name">Оплата (в мес):</span> <span class="profit">+ ${formatMoney(apt.income)}</span></div>
        <div class="stat"><span class="stat-name">Счетчики:</span> <span class="loss">- ${formatMoney(meterCost)}</span></div>
        <div class="stat"><span class="stat-name">Ипотека (в год):</span> <span class="loss">- ${formatMoney(totalMortgage)}</span></div>
        <div class="stat"><span class="stat-name">Коммуналка (в год):</span> <span class="loss">- ${formatMoney(totalUtilities)}</span></div>
        <div class="stat"><span class="stat-name">Расходники (в год):</span> <span class="loss">- ${formatMoney(totalExpensesItems)}</span></div>
        <div class="stat"><span class="stat-name">Статус оплаты:</span> 
          <span class="${apt.paymentStatus === 'paid' ? 'profit' : 'loss'}">
            ${apt.paymentStatus === 'paid' ? 'Оплачено' : 'Долг: -' + formatMoney(apt.income)}
          </span>
        </div>
      </div>

      <div class="total-row">
        <span>Чистая прибыль за год:</span>
        <span class="${profit >= 0 ? 'profit' : 'loss'}">
          ${profit >= 0 ? '+' : ''}${formatMoney(profit)}
        </span>
      </div>
    `;
    list.appendChild(card);
  });

  updateDashboard(globalIncome, globalExpenses, globalIncome - globalExpenses, globalDebts, expiringCount);
}

function updateDashboard(income, expenses, profit, debts, expiring) {
  totalIncomeEl.textContent = '+' + formatMoney(income);
  totalExpensesEl.textContent = '-' + formatMoney(expenses);
  totalProfitEl.textContent = (profit >= 0 ? '+' : '') + formatMoney(profit);
  totalProfitEl.className = 'dash-val ' + (profit >= 0 ? 'profit' : 'loss');
  totalDebtsEl.textContent = '-' + formatMoney(debts);
  expiringContractsEl.textContent = expiring;
}

// === 5. СОХРАНЕНИЕ КВАРТИРЫ ===
addBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) return alert('Введите название или адрес!');

  const aptData = {
    id: editId || Date.now(),
    name: name,
    photo: uploadedPhotoBase64 || (editId ? apartments.find(a => a.id === editId).photo : null),
    area: Number(areaInput.value) || 0,
    tenantName: tenantNameInput.value.trim(),
    tenantPhone: tenantPhoneInput.value.trim(),
    startDate: startDateInput.value,
    endDate: endDateInput.value,
    income: Number(incomeInput.value) || 0,
    mortgage: Number(mortgageInput.value) || 0,
    utilities: Number(utilitiesInput.value) || 0,
    expenses: Number(expensesInput.value) || 0,
    paymentStatus: paymentStatusInput.value,
    prevMeter: Number(prevMeterInput.value) || 0,
    currMeter: Number(currMeterInput.value) || 0,
    meterRate: Number(meterRateInput.value) || 0,
    notes: notesInput.value.trim(),
    monthsArray: editId ? apartments.find(a => a.id === editId).monthsArray : Array(12).fill(true)
  };

  if (editId) {
    const index = apartments.findIndex(a => a.id === editId);
    if (index !== -1) apartments[index] = aptData;
  } else {
    apartments.push(aptData);
  }

  saveData();
  render();
  resetForm();
});

// === 6. РЕДАКТИРОВАНИЕ ===
window.editApt = function(id) {
  const apt = apartments.find(a => a.id === id);
  if (!apt) return;

  editId = id;
  uploadedPhotoBase64 = apt.photo; // Сохраняем текущее фото

  nameInput.value = apt.name;
  areaInput.value = apt.area;
  tenantNameInput.value = apt.tenantName;
  tenantPhoneInput.value = apt.tenantPhone;
  startDateInput.value = apt.startDate;
  endDateInput.value = apt.endDate;
  incomeInput.value = apt.income;
  mortgageInput.value = apt.mortgage;
  utilitiesInput.value = apt.utilities;
  expensesInput.value = apt.expenses;
  paymentStatusInput.value = apt.paymentStatus;
  prevMeterInput.value = apt.prevMeter;
  currMeterInput.value = apt.currMeter;
  meterRateInput.value = apt.meterRate;
  notesInput.value = apt.notes;

  formTitle.textContent = 'Редактировать квартиру';
  addBtn.textContent = 'Сохранить изменения';
  cancelBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  editId = null;
  uploadedPhotoBase64 = null;
  editIdInput.value = '';
  nameInput.value = '';
  photoInput.value = '';
  areaInput.value = '';
  tenantNameInput.value = '';
  tenantPhoneInput.value = '';
  startDateInput.value = '';
  endDateInput.value = '';
  incomeInput.value = '';
  mortgageInput.value = '';
  utilitiesInput.value = '';
  expensesInput.value = '';
  paymentStatusInput.value = 'paid';
  prevMeterInput.value = '';
  currMeterInput.value = '';
  meterRateInput.value = '';
  notesInput.value = '';

  formTitle.textContent = 'Добавить квартиру';
  addBtn.textContent = 'Сохранить';
  cancelBtn.classList.add('hidden');
}

// === 7. УДАЛЕНИЕ И КАЛЕНДАРЬ ===
window.deleteApt = function(id) {
  if (confirm('Удалить эту квартиру?')) {
    apartments = apartments.filter(a => a.id !== id);
    if (editId === id) resetForm();
    saveData();
    render();
  }
};

window.toggleMonth = function(id, monthIndex) {
  const apt = apartments.find(a => a.id === id);
  if (apt) {
    apt.monthsArray[monthIndex] = !apt.monthsArray[monthIndex];
    saveData();
    render();
  }
};

// === 8. ЭКСПОРТ В EXCEL (CSV) ===
exportBtn.addEventListener('click', () => {
  if (apartments.length === 0) return alert('Нет данных для экспорта!');

  let csvContent = "Адрес;ФИО;Телефон;Начало;Конец;Площадь;Оплата;Ипотека;Коммуналка;Расходники;Статус оплаты;Пред.счетчик;Тек.счетчик;Тариф\n";

  apartments.forEach(apt => {
    const row = [
      apt.name, apt.tenantName, apt.tenantPhone, apt.startDate, apt.endDate,
      apt.area, apt.income, apt.mortgage, apt.utilities, apt.expenses,
      apt.paymentStatus === 'paid' ? 'Оплачено' : 'Долг',
      apt.prevMeter, apt.currMeter, apt.meterRate
    ].join(";");
    csvContent += row + "\n";
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", "база_аренды.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// === 9. ИМПОРТ ИЗ EXCEL (CSV) ===
importInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const text = event.target.result;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Пропускаем заголовок (первую строку)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';');
      if (cols.length < 5) continue; // Пропускаем битые строки

      const newApt = {
        id: Date.now() + i, // Уникальный ID
        name: cols[0] || 'Без названия',
        tenantName: cols[1] || '',
        tenantPhone: cols[2] || '',
        startDate: cols[3] || '',
        endDate: cols[4] || '',
        area: Number(cols[5]) || 0,
        income: Number(cols[6]) || 0,
        mortgage: Number(cols[7]) || 0,
        utilities: Number(cols[8]) || 0,
        expenses: Number(cols[9]) || 0,
        paymentStatus: cols[10] === 'Оплачено' ? 'paid' : 'debt',
        prevMeter: Number(cols[11]) || 0,
        currMeter: Number(cols[12]) || 0,
        meterRate: Number(cols[13]) || 0,
        monthsArray: Array(12).fill(true),
        notes: 'Импортировано из Excel',
        photo: null
      };
      apartments.push(newApt);
    }
    
    saveData();
    render();
    alert(`Успешно загружено ${lines.length - 1} записей!`);
    importInput.value = ''; // Сбрасываем поле
  };
  reader.readAsText(file, 'UTF-8');
});

// === 10. ЗАПУСК ===
loadData();
render();