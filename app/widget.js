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
          const updateRes = await ZOHO.CRM.API.updateRecord({
            Entity: "Deals",
            RecordID: dealId,
            APIData: [{ id: dealId, field: nbuRate }]
          });

          if (updateRes.data && updateRes.data[0].code === "SUCCESS") {
            alert(t.rateUpdated || "✅ Курс оновлено");
            location.reload();
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
    return res.data?.[0]?.field || 0;
  } catch (e) {
    console.error("❌ Помилка отримання угоди:", e);
    return 0;
  }
}