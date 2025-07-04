# 💱 Currency Rate Widget for Zoho CRM

Цей віджет показує актуальний курс долара США по НБУ та порівнює його з курсом в угоді (Deal) у Zoho CRM. Якщо різниця перевищує 5%, пропонується оновити курс в угоді.

## 📦 Особливості

- 🔄 Витягує курс НБУ з API НБУ
- 📊 Показує курс в угоді та розраховує різницю
- ⚠️ Виводить кнопку оновлення, якщо різниця ≥ 5%
- 🌐 Підтримка двох мов: 🇺🇦 Українська, 🇬🇧 English
- 🎯 Адаптивний інтерфейс

## 📁 Структура проєкту

project-root/
├── app/
│   ├── widget.html
│   ├── widget.js
│   ├── style.css
│   └── translations/
│       ├── ua.json
│       └── en.json
├── config/
│   └── resources.json
├── plugin-manifest.json
├── plugin-properties.json
└── README.md

## 🚀 Як запустити

1. **Скопіювати/клонувати репозиторій**
git clone https://github.com/Vladlenius1988/zohoWidget.git

**🔧 Встановити zet :**

cd Currency_Widget
npm install -g zoho-extension-toolkit

**🛠 Створити новий проєкт:**

zet init

Виберіть тип: CRM, тип віджету: Related List, модуль: Deals

**🧱 Замінити файли проекту на вміст цього репозиторію:**

project-root/
├── app/
│   ├── widget.html
│   ├── widget.js
│   ├── style.css
│   └── translations/
│       ├── ua.json
│       └── en.json
├── config/
│   └── resources.json
├── plugin-manifest.json
└── plugin-properties.json

2. **Запустити емулятор для локального тестування** 

   
   zet run

   **(опційно) Деплой у Zoho CRM**

   zet push



 **🛠️ Технології**

HTML, CSS, JavaScript

Zoho Sigma SDK

Bootstrap 5

API НБУ

**🧠 Автор**
Владлен Сичов
Email: vosychov@gmail.com