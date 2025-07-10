// ===== ЗАВАНТАЖЕННЯ ПЕРЕКЛАДІВ =====
async function loadTranslations(lang = 'ua') {
  try {
    const res = await fetch(`translations/${lang}.json`);
    if (!res.ok) throw new Error(`Failed to load translations: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('Error loading translations:', e);
    return {};
  }
}

// ===== ВИЗНАЧЕННЯ МОВИ КОРИСТУВАЧА =====
function getCurrentLang() {
  return localStorage.getItem('selectedLang') || (navigator.language.startsWith('en') ? 'en' : 'ua');
}

// ===== ОБРОБНИК ПЕРЕМИКАННЯ МОВИ =====
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById("languageSelector");
  if (selector) {
    selector.value = getCurrentLang();
    selector.addEventListener("change", (e) => {
      localStorage.setItem("selectedLang", e.target.value);
      location.reload(); // перезавантаження для перерендеру
    });
  }
});

// ===== ГОЛОВНИЙ ОБРОБНИК PAGELOAD =====
ZOHO.embeddedApp.on("PageLoad", async function (data) {
  console.log("🚀 PageLoad активовано", data);
  
  const lang = getCurrentLang();
  const t = await loadTranslations(lang);
  
  try {
    const dealId = data.EntityId;
    if (!dealId) {
      console.warn(t.dealIdNotFound || "⚠️ Deal ID не знайдено");
      return;
    }
    console.log("🔍 Deal ID:", dealId);

    // Спершу завантажуємо історію курсу (щоб таблиця була відразу)
    await loadExchangeRateHistory(dealId);

    // Тексти UI
    document.getElementById('widgetTitle').textContent = t.widgetTitle || '💱 Валютний курс';
    document.getElementById('nbuRateLabel').textContent = t.nbuRate || 'Курс НБУ';
    document.getElementById('dealRateLabel').textContent = t.dealRate || 'Курс в Угоді';
    document.getElementById('differenceLabel').textContent = t.difference || 'Різниця (%)';
    document.getElementById('dealRate').textContent = t.loading || 'Завантаження...';
    document.getElementById('nbuRate').textContent = t.loading || 'Завантаження...';
    document.getElementById('difference').textContent = t.loading || 'Завантаження...';

    // Отримання курсів
    const nbuRate = await fetchNbuRate();
    console.log("Курс НБУ отримано:", nbuRate);
    document.getElementById('nbuRate').textContent = `${nbuRate.toFixed(2)} ₴`;

    const dealRate = await fetchDealRate(dealId);
    console.log("Курс в угоді отримано:", dealRate);
    document.getElementById('dealRate').textContent = `${dealRate.toFixed(2)} ₴`;

const lastFieldRateRaw = localStorage.getItem(`lastFieldRate_${dealId}`);
const lastFieldRate = lastFieldRateRaw ? parseFloat(lastFieldRateRaw) : null;

if (!isNaN(dealRate) && dealRate > 0 && dealRate !== lastFieldRate) {
  let manualDiffPercent = 0;
  if (!isNaN(lastFieldRate) && lastFieldRate > 0) {
    manualDiffPercent = ((dealRate / lastFieldRate - 1) * 100);
  }

 const success = await createAndStoreHistory(dealId, dealRate, manualDiffPercent);
if (success) {
  localStorage.setItem(`lastFieldRate_${dealId}`, dealRate.toString());
  console.log("🟠 Нове значення field виявлено — записуємо в історію");
  await loadExchangeRateHistory(dealId);
}
}

    const diff = ((dealRate / nbuRate) - 1) * 100;
    const roundedDiff = Math.round(diff * 10) / 10;
    document.getElementById('difference').textContent = `${roundedDiff.toFixed(1)} %`;

    const btn = document.getElementById('btnUpdate');
    document.getElementById('btnText').textContent = t.updateRate || 'Записати курс в Угоду';

    if (Math.abs(roundedDiff) >= 5) {
      btn.style.display = 'inline-block';
      btn.classList.remove('d-none');

      btn.onclick = async () => {
        btn.disabled = true;
        btn.classList.add('btn-loading');

        try {
          const recordRes = await ZOHO.CRM.API.getRecord({ Entity: "Deals", RecordID: dealId });
          const deal = recordRes.data[0];
        const oldRate = parseFloat(deal.Exchange_Rate);
        console.log("Старий курс з угоди:", oldRate);
let diffPercent = null;

if (!isNaN(oldRate) && oldRate !== 0) {
  diffPercent = ((nbuRate / oldRate - 1) * 100);
} else {
  diffPercent = 0; 
}


          const updateRes = await ZOHO.CRM.API.updateRecord({
      Entity: "Deals",
            RecordID: dealId,
            APIData: [{ id: dealId, field: nbuRate }]
          });

          console.log("updateRes", updateRes);

          if (updateRes.data && updateRes.data[0].code === "SUCCESS") {
            console.log("🟢 Курс оновлено в CRM");

            // 🧩 Спроба створити історію
            await createExchangeRateHistory(dealId, nbuRate, diffPercent);
            localStorage.setItem(`lastFieldRate_${dealId}`, dealRate.toString());
            // ПЕРЕНАВАНТАЖЕННЯ ІСТОРІЇ ТА UI без reload
            await loadExchangeRateHistory(dealId);
            document.getElementById('dealRate').textContent = `${nbuRate.toFixed(2)} ₴`;
            document.getElementById('difference').textContent = '0.0 %';

            alert(t.rateUpdated || "✅ Курс оновлено");
            
          } else {
            console.error("❌ Не вдалося оновити:", updateRes);
            alert(t.updateError || "Помилка при оновленні курсу");
          }
        } catch (e) {
          console.error("❌ Помилка оновлення:", e);
          alert(t.updateError || "Помилка при оновленні");
        } finally {
          btn.disabled = false;
          btn.classList.remove('btn-loading');
        }
      };

    } else {
      btn.style.display = 'none';
    }
  } catch (e) {
    console.error("🔥 Фатальна помилка:", e);
    alert((t.fatalError || "Сталася помилка: ") + e.message);
  }
});

// ===== ІНІЦІАЛІЗАЦІЯ SDK =====
ZOHO.embeddedApp.init().then(() => {
  console.log("✅ SDK іниціалізовано");
});

// ===== Отримання курсу НБУ =====
async function fetchNbuRate() {
  const saved = localStorage.getItem('nbuRate');

  if (saved) {
    try {
      const { rate, date } = JSON.parse(saved);
      const today = new Date().toISOString().slice(0, 10);

      if (date === today) {
        console.log("✅ Курс НБУ з localStorage (актуальний):", rate);
        return parseFloat(rate);
      } else {
        console.log("⏳ Курс в localStorage застарілий. Отримуємо новий.");
      }
    } catch (e) {
      console.warn("⚠️ Неможливо розпарсити збережений курс. Отримуємо новий.");
    }
  }

  // Якщо нічого немає або дані застарілі/биті — отримуємо новий курс
  try {
    const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
    const data = await res.json();
    const rate = data[0].rate;

    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('nbuRate', JSON.stringify({ rate, date: today }));
    console.log("🌐 Курс НБУ з API збережено:", rate);

    return rate;
  } catch (e) {
    console.error("❌ Помилка отримання курсу НБУ:", e);
    return 0;
  }
}

// ===== Отримання курсу з угоди =====
async function fetchDealRate(id) {
  try {
    const res = await ZOHO.CRM.API.getRecord({ Entity: "Deals", RecordID: id });
    console.log("Ответ от getRecord:", res);
    return parseFloat(res.data?.[0]?.field) || 0;
  } catch (e) {
    console.error("❌ Помилка отримання угоди:", e);
    return 0;
  }
}

async function createExchangeRateHistory(dealId, currentRate) {
  try {
    const now = new Date().toISOString().split('.')[0] + 'Z';

    const lastRateRaw = localStorage.getItem(`lastFieldRate_${dealId}`);
    const lastRate = lastRateRaw ? parseFloat(lastRateRaw) : null;

    const fields = await ZOHO.CRM.META.getFields({ Entity: "Exchange_Rate_History" });
console.log(fields.fields.map(f => ({ api_name: f.api_name, field_label: f.field_label })));

    console.log("📦 createExchangeRateHistory → currentRate:", currentRate);
    console.log("📦 createExchangeRateHistory → lastRateRaw:", lastRateRaw);
    console.log("📦 createExchangeRateHistory → lastRate (parsed):", lastRate);

    let diffPercent = 0;

    if (lastRate !== null && !isNaN(lastRate) && lastRate > 0) {
      diffPercent = ((currentRate / lastRate - 1) * 100);
    } else {
      console.warn("⚠️ lastRate недоступний або некоректний. Ставимо diffPercent = 0");
      diffPercent = 0;
    }

    console.log("📊 createExchangeRateHistory → diffPercent:", diffPercent);

    const response = await ZOHO.CRM.API.insertRecord({
      Entity: "Exchange_Rate_History",
      APIData: {
        Name: `Курс на ${new Date().toLocaleDateString("uk-UA")}`,
        Deal: dealId,
        Rate: currentRate,
        Date: now,
        Rate_Source: "Автоматично",
        Difference: parseFloat(diffPercent.toFixed(1)) 
      }
    });

    console.log("📥 Історію курсу записано:", response);

    if (response.data?.[0]?.details?.id) {
      const historyIds = JSON.parse(localStorage.getItem(`historyIds_${dealId}`)) || [];
      const newId = response.data[0].details.id;

      if (!historyIds.includes(newId)) {
        historyIds.push(newId);
        localStorage.setItem(`historyIds_${dealId}`, JSON.stringify(historyIds));
      }
    }

  } catch (error) {
    console.error("❌ ПОМИЛКА в createExchangeRateHistory:", error);
  }
}

async function loadExchangeRateHistory(dealId) {
  try {
    const savedHistoryIds = JSON.parse(localStorage.getItem(`historyIds_${dealId}`)) || [];

    const records = [];
    for (const id of savedHistoryIds) {
  const res = await ZOHO.CRM.API.getRecord({ Entity: "Exchange_Rate_History", RecordID: id });
  if (res.data && res.data[0]) {
    records.push(res.data[0]);
   
  }
}
   
    const sorted = records.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    const latest5 = sorted.slice(0, 5);

    renderHistoryTable(latest5);
  } catch (error) {
    console.error("Помилка при отриманні історії:", error);
  }
}
console.log("searchRecords available?", typeof ZOHO.CRM.API.searchRecords);
function renderHistoryTable(data) {
  const container = document.getElementById("history-table");

  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = "<p>Немає записів історії.</p>";
    return;
  }

  const rows = data.map(record => {
    const date = new Date(record.Date);
    const formattedDate = date.toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
console.log("🧪 record.Difference:", record.Difference);
    return `
      <tr>
        <td>${formattedDate}</td>
        <td>${record.Rate}</td>
        <td>${!isNaN(parseFloat(record.Difference)) ? parseFloat(record.Difference).toFixed(1) : "—"}%</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Дата</th>
          <th>Курс</th>
          <th>Різниця %</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}



async function createAndStoreHistory(dealId, rate) {
  try {
    const now = new Date().toISOString().split('.')[0] + 'Z';

    const lastRateRaw = localStorage.getItem(`lastFieldRate_${dealId}`);
    const lastRate = lastRateRaw ? parseFloat(lastRateRaw) : null;

    console.log("🧾 Створення історії:");
    console.log("▶️ Новий курс (rate):", rate);
    console.log("📦 Останній збережений курс (lastRate):", lastRate);

    let diffPercent = 0;
    if (!isNaN(lastRate) && lastRate > 0) {
      diffPercent = ((rate / lastRate - 1) * 100);
    }

    console.log("📊 Обчислена різниця (%):", diffPercent);

    const response = await ZOHO.CRM.API.insertRecord({
      Entity: "Exchange_Rate_History",
      APIData: {
        Name: `Курс на ${new Date().toLocaleDateString("uk-UA")}`,
        Deal: dealId,
        Rate: rate,
        Date: now,
        Rate_Source: "Ручне оновлення",
        Difference: parseFloat(diffPercent.toFixed(1))
      }
    });

    console.log("Історію курсу записано:", response);

    // Зберігаємо новий курс
    if (response.data?.[0]?.details?.id) {
      const newId = response.data[0].details.id;
      const historyIds = JSON.parse(localStorage.getItem(`historyIds_${dealId}`)) || [];

      if (!historyIds.includes(newId)) {
        historyIds.push(newId);
        localStorage.setItem(`historyIds_${dealId}`, JSON.stringify(historyIds));
      }
      localStorage.setItem(`lastFieldRate_${dealId}`, rate.toString());
    }

    return true;
  } catch (error) {
    console.error("❌ Помилка створення запису:", error);
    return false;
  }
}