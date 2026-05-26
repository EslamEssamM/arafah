// app.js - Arafah Day Prayers Interactive Logic

// Audio feedback using Web Audio API
let audioCtx = null;
function playChime(type) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'tap') {
      // Soft woodblock/tally sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'success') {
      // Celestial double chime chord
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.log("Audio not supported or blocked by user interaction policy.");
  }
}

// App State
const state = {
  currentCategory: 'intro',
  checkedPrayers: JSON.parse(localStorage.getItem('arafah_checked_prayers')) || {},
  theme: localStorage.getItem('arafah_theme') || 'light',
  dhikr: {
    phase: 'subhan', // 'subhan', 'hamd', 'takbir', 'free'
    count: 0
  }
};

// Category Definitions
const CATEGORY_KEYS = [
  { key: 'intro', title: PRAYERS_DATA.intro.title, icon: PRAYERS_DATA.intro.icon },
  { key: 'prophetic', title: PRAYERS_DATA.prophetic.title, icon: PRAYERS_DATA.prophetic.icon },
  { key: 'quranic', title: PRAYERS_DATA.quranic.title, icon: PRAYERS_DATA.quranic.icon },
  { key: 'parents', title: PRAYERS_DATA.parents.title, icon: PRAYERS_DATA.parents.icon },
  { key: 'forgiveness', title: PRAYERS_DATA.forgiveness.title, icon: PRAYERS_DATA.forgiveness.icon },
  { key: 'success', title: PRAYERS_DATA.success.title, icon: PRAYERS_DATA.success.icon },
  { key: 'healing', title: PRAYERS_DATA.healing.title, icon: PRAYERS_DATA.healing.icon },
  { key: 'deceased', title: PRAYERS_DATA.deceased.title, icon: PRAYERS_DATA.deceased.icon },
  { key: 'general', title: PRAYERS_DATA.general.title, icon: PRAYERS_DATA.general.icon },
  { key: 'conclusion', title: PRAYERS_DATA.conclusion.title, icon: PRAYERS_DATA.conclusion.icon }
];

// Initialize DOM Elements
const sidebarMenu = document.getElementById('sidebarMenu');
const mobileCategoryBar = document.getElementById('mobileCategoryBar');
const prayersListContainer = document.getElementById('prayersListContainer');
const currentCategoryTitle = document.getElementById('currentCategoryTitle');
const currentCategoryIcon = document.getElementById('currentCategoryIcon');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const themeToggleText = document.getElementById('themeToggleText');
const themeToggleBtnMobile = document.getElementById('themeToggleBtnMobile');

// Dhikr Elements
const dhikrClicker = document.getElementById('dhikrClicker');
const dhikrCount = document.getElementById('dhikrCount');
const dhikrLabel = document.getElementById('dhikrLabel');
const dhikrPrompt = document.getElementById('dhikrPrompt');
const dhikrResetBtn = document.getElementById('dhikrResetBtn');

// Initialize Application
function init() {
  // Apply Saved Theme
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeUI();

  // Render Menus
  renderMenus();

  // Render Initial View
  switchCategory(state.currentCategory);

  // Setup Event Listeners
  setupEventListeners();
}

// Render Navigation Menus (Desktop + Mobile)
function renderMenus() {
  sidebarMenu.innerHTML = '';
  mobileCategoryBar.innerHTML = '';

  CATEGORY_KEYS.forEach(cat => {
    // Desktop Sidebar Item
    const sideItem = document.createElement('div');
    sideItem.className = `nav-item ${state.currentCategory === cat.key ? 'active' : ''}`;
    sideItem.dataset.key = cat.key;
    sideItem.innerHTML = `
      <span class="nav-icon">${cat.icon}</span>
      <span class="nav-text">${cat.title}</span>
    `;
    sideItem.addEventListener('click', () => switchCategory(cat.key));
    sidebarMenu.appendChild(sideItem);

    // Mobile Horizontal Category Pill
    const mobileItem = document.createElement('div');
    mobileItem.className = `mobile-category-item ${state.currentCategory === cat.key ? 'active' : ''}`;
    mobileItem.dataset.key = cat.key;
    mobileItem.innerHTML = `<span>${cat.icon}</span> <span>${cat.title}</span>`;
    mobileItem.addEventListener('click', () => {
      switchCategory(cat.key);
      // Auto-scroll the active pill into view on mobile
      mobileItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    mobileCategoryBar.appendChild(mobileItem);
  });
}

// Switch Active Category
function switchCategory(key) {
  state.currentCategory = key;
  
  // Highlight active items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.key === key);
  });
  document.querySelectorAll('.mobile-category-item').forEach(item => {
    item.classList.toggle('active', item.dataset.key === key);
  });

  // Update headers
  const activeCat = CATEGORY_KEYS.find(cat => cat.key === key);
  currentCategoryTitle.textContent = activeCat.title;
  currentCategoryIcon.textContent = activeCat.icon;

  // Render the list of prayers
  renderPrayers();
}

// Render Prayer Cards based on category
function renderPrayers() {
  prayersListContainer.innerHTML = '';

  const itemsToRender = PRAYERS_DATA[state.currentCategory].items;

  if (itemsToRender.length === 0) {
    prayersListContainer.innerHTML = `
      <div class="prayer-card" style="text-align: center; color: var(--text-secondary);">
        <p style="font-size: 16px;">لا توجد أدعية متوفرة حالياً في هذا القسم.</p>
      </div>
    `;
    return;
  }

  itemsToRender.forEach((item, index) => {
    const isChecked = state.checkedPrayers[item.id] === true;
    
    const card = document.createElement('article');
    card.className = `prayer-card ${isChecked ? 'completed' : ''}`;
    card.dataset.id = item.id;

    // Build the Header elements
    const badgeText = `دعاء #${index + 1}`;

    // Card structure
    card.innerHTML = `
      <div class="prayer-header">
        <span class="prayer-badge">${badgeText}</span>
        <div class="prayer-actions">
          <span class="prayer-check-icon">✓</span>
        </div>
      </div>
      <div class="prayer-content">${item.text}</div>
      <div class="prayer-footer">
        ${item.reference ? `<span class="prayer-reference">${item.reference}</span>` : ''}
        ${item.subtitle ? `<span class="prayer-subtitle" style="font-weight: 500;">${item.subtitle}</span>` : ''}
      </div>
    `;

    // Event listener: Tap anywhere on the card to toggle read state
    card.addEventListener('click', () => {
      const currentlyChecked = state.checkedPrayers[item.id] === true;
      const newCheckedState = !currentlyChecked;
      
      togglePrayerChecked(item.id, newCheckedState);
      card.classList.toggle('completed', newCheckedState);
      
      // Play audio feedback
      playChime('tap');
    });

    prayersListContainer.appendChild(card);
  });

  // Append Next Section Navigator Card
  const currentIdx = CATEGORY_KEYS.findIndex(cat => cat.key === state.currentCategory);
  if (currentIdx !== -1) {
    const nextIdx = (currentIdx + 1) % CATEGORY_KEYS.length;
    const nextCat = CATEGORY_KEYS[nextIdx];
    const isWrapping = nextIdx === 0;

    const nextSectionBtn = document.createElement('div');
    nextSectionBtn.className = 'next-section-navigator';
    nextSectionBtn.innerHTML = `
      <div class="next-nav-label">${isWrapping ? 'العودة للبداية' : 'المتابعة للقسم التالي'}</div>
      <div class="next-nav-title">
        <span class="next-nav-icon">${nextCat.icon}</span>
        <span class="next-nav-name">${nextCat.title}</span>
        <span class="next-nav-arrow">←</span>
      </div>
    `;

    nextSectionBtn.addEventListener('click', () => {
      switchCategory(nextCat.key);
      
      // Scroll smoothly to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Select the active mobile pill and scroll it into view
      const activeMobilePill = document.querySelector(`.mobile-category-item[data-key="${nextCat.key}"]`);
      if (activeMobilePill) {
        activeMobilePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      // Play chime
      playChime('success');
    });

    prayersListContainer.appendChild(nextSectionBtn);
  }
}

// Toggle Prayer checked state
function togglePrayerChecked(id, isChecked) {
  if (isChecked) {
    state.checkedPrayers[id] = true;
  } else {
    delete state.checkedPrayers[id];
  }
  localStorage.setItem('arafah_checked_prayers', JSON.stringify(state.checkedPrayers));
}

// Setup Dhikr (Tasbih) Counter logic
function setupDhikrCounter() {
  const phases = {
    subhan: { label: 'سُبْحَانَ الله', limit: 10, prompt: 'سبّح الله عشرًا (١٠ مرات) قبل البدء في دعائك.' },
    hamd: { label: 'الحَمْدُ لله', limit: 10, prompt: 'احمد الله عشرًا (١٠ مرات) ثناءً عليه وتقرباً إليه.' },
    takbir: { label: 'اللهُ أَكْبَر', limit: 10, prompt: 'كبّر الله عشرًا (١٠ مرات) تعظيماً لجلاله قبل مسألتك.' },
    free: { label: 'لا إله إلا الله', limit: 0, prompt: 'أكثر من التهليل والتسبيح المطلق طوال اليوم المبارك.' }
  };

  // Click handler
  dhikrClicker.addEventListener('click', () => {
    const currentPhase = phases[state.dhikr.phase];
    state.dhikr.count++;
    
    // Scale animation feedback
    dhikrClicker.style.transform = 'scale(0.9)';
    setTimeout(() => {
      dhikrClicker.style.transform = 'none';
    }, 100);

    // Audio vibe chime
    playChime('tap');

    // Check if limit is reached
    if (currentPhase.limit > 0 && state.dhikr.count >= currentPhase.limit) {
      playChime('success');
      
      // Advance to next phase
      if (state.dhikr.phase === 'subhan') {
        state.dhikr.phase = 'hamd';
      } else if (state.dhikr.phase === 'hamd') {
        state.dhikr.phase = 'takbir';
      } else if (state.dhikr.phase === 'takbir') {
        state.dhikr.phase = 'free';
      }
      state.dhikr.count = 0;
    }

    updateDhikrUI(phases);
  });

  // Reset handler
  dhikrResetBtn.addEventListener('click', () => {
    state.dhikr.count = 0;
    dhikrCount.textContent = '0';
    playChime('tap');
  });
}

function updateDhikrUI(phases) {
  const currentPhase = phases[state.dhikr.phase];
  dhikrCount.textContent = state.dhikr.count;
  dhikrLabel.textContent = currentPhase.label;
  dhikrPrompt.textContent = currentPhase.prompt;
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme switch buttons (both desktop and mobile)
  themeToggleBtn.addEventListener('click', toggleTheme);
  themeToggleBtnMobile.addEventListener('click', toggleTheme);
}

// Toggle light/dark theme
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('arafah_theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeUI();
  playChime('tap');
}

// Update Theme UI text
function updateThemeUI() {
  if (state.theme === 'dark') {
    themeToggleIcon.textContent = '☀️';
    themeToggleText.textContent = 'الوضع النهاري';
    themeToggleBtnMobile.textContent = '☀️';
  } else {
    themeToggleIcon.textContent = '🌙';
    themeToggleText.textContent = 'الوضع الليلي';
    themeToggleBtnMobile.textContent = '🌙';
  }
}

// Run application
window.addEventListener('DOMContentLoaded', () => {
  init();
  setupDhikrCounter();
});
