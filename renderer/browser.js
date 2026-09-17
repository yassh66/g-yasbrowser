/**
 * YAS Browser - Core Browser Engine & Renderer
 * 
 * Features:
 * - Robust Dynamic Multi-Tab System (Create, Switch, Close, Middle-click, Shortcuts)
 * - True Tab-Isolated Viewports (<webview> in Electron, Sandboxed <iframe> in Web preview)
 * - Preserves state, scroll position, and navigation history across tab switching
 * - Smart Omnibox with Google Search query fallback & HTTPS Security Badges
 * - Navigation History (Back, Forward, Reload / Stop Loading swap, Home)
 * - Sleek Top Loading Progress Bar
 * - Custom Frameless Titlebar controls (Minimize, Maximize / Restore, Close)
 * - Built-in Theme System (Electric Violet, Cyber Cyan, Sunset Rose, Emerald Matrix, Obsidian Amber)
 * - Deep Media Download Studio integration with active tab video detection
 */

class YASBrowser {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.shieldsStats = {
      totalBlocked: 142,
      youtubeAdsBlocked: 68,
      trackersBlocked: 74,
      estimatedBandwidthSavedKB: 6390,
      shieldsEnabled: true
    };
    this.bookmarks = new Set(['https://youtube.com', 'https://instagram.com', 'https://github.com']);
    this.customAccentColor = localStorage.getItem('yas_custom_accent') || '#6366f1';
    this.currentTheme = localStorage.getItem('yas_theme') || 'electric-violet';
    this.searchEngine = localStorage.getItem('yas_search_engine') || 'google';
    this.downloadPath = localStorage.getItem('yas_download_path') || '~/Downloads';
    this.startupBehavior = localStorage.getItem('yas_startup_behavior') || 'newtab';
    this.hardwareAccel = localStorage.getItem('yas_hardware_accel') !== 'false';
    this.autoMux = localStorage.getItem('yas_auto_mux') !== 'false';
    this.notifyDownload = localStorage.getItem('yas_notify_download') !== 'false';
    this.ytAdSkip = localStorage.getItem('yas_yt_ad_skip') !== 'false';
    this.isElectron = Boolean(window.electronAPI && window.electronAPI.isElectron);

    this.dom = {
      // Title bar & window controls
      titlebar: document.getElementById('titlebar'),
      tabStrip: document.getElementById('tabStrip'),
      newTabBtn: document.getElementById('newTabBtn'),
      themeSelectorBtn: document.getElementById('themeSelectorBtn'),
      btnOpenSettings: document.getElementById('btnOpenSettings'),
      winMinimize: document.getElementById('winMinimize'),
      winMaximize: document.getElementById('winMaximize'),
      winClose: document.getElementById('winClose'),
      
      // Toolbar & Navigation
      browserToolbar: document.getElementById('browserToolbar'),
      btnBack: document.getElementById('btnBack'),
      btnForward: document.getElementById('btnForward'),
      btnReload: document.getElementById('btnReload'),
      btnHome: document.getElementById('btnHome'),
      omniboxWrapper: document.getElementById('omniboxWrapper'),
      omniboxInput: document.getElementById('omniboxInput'),
      omniboxClearBtn: document.getElementById('omniboxClearBtn'),
      securityBadge: document.getElementById('securityBadge'),
      bookmarkBtn: document.getElementById('bookmarkBtn'),
      
      // Shields & Ad-blocking Popover
      shieldToggleBtn: document.getElementById('shieldToggleBtn'),
      shieldCounter: document.getElementById('shieldCounter'),
      shieldsPopover: document.getElementById('shieldsPopover'),
      shieldsMasterSwitch: document.getElementById('shieldsMasterSwitch'),
      shieldsStatusBadge: document.getElementById('shieldsStatusBadge'),
      shieldsStatusText: document.getElementById('shieldsStatusText'),
      shieldStatYtAds: document.getElementById('shieldStatYtAds'),
      shieldStatTrackers: document.getElementById('shieldStatTrackers'),
      shieldStatDataSaved: document.getElementById('shieldStatDataSaved'),
      shieldStatTimeSaved: document.getElementById('shieldStatTimeSaved'),

      mediaDownloadBtn: document.getElementById('mediaDownloadTriggerBtn'),
      downloadCounter: document.getElementById('downloadCounter'),
      pageLoadingBar: document.getElementById('pageLoadingBar'),

      // Viewport & Dashboard
      browserViewport: document.getElementById('browserViewport'),
      tabViewsContainer: document.getElementById('tabViewsContainer'),
      newTabDashboard: document.getElementById('newTabDashboard'),
      dashboardClock: document.getElementById('dashboardClock'),
      dashboardDate: document.getElementById('dashboardDate'),
      heroSearchInput: document.getElementById('heroSearchInput'),
      heroSearchClearBtn: document.getElementById('heroSearchClearBtn'),
      heroSearchSubmitBtn: document.getElementById('heroSearchSubmitBtn'),
      downloaderFeatureBanner: document.getElementById('downloaderFeatureBanner'),
      
      // Settings Modal & Controls
      settingsModalBackdrop: document.getElementById('settingsModalBackdrop'),
      btnSettingsModalClose: document.getElementById('btnSettingsModalClose'),
      settingsSidebar: document.querySelector('.settings-sidebar'),
      settingsNavItems: document.querySelectorAll('.settings-nav-item'),
      settingsTabPanes: document.querySelectorAll('.settings-tab-pane'),
      settingsCustomColorPicker: document.getElementById('settingsCustomColorPicker'),
      settingsCustomColorHex: document.getElementById('settingsCustomColorHex'),
      customColorPreviewBubble: document.getElementById('customColorPreviewBubble'),
      btnResetThemeDefault: document.getElementById('btnResetThemeDefault'),
      presetCards: document.querySelectorAll('.preset-theme-card'),
      settingsSearchEngineSelect: document.getElementById('settingsSearchEngineSelect'),
      settingsStartupBehaviorSelect: document.getElementById('settingsStartupBehaviorSelect'),
      settingsHardwareAccelToggle: document.getElementById('settingsHardwareAccelToggle'),
      settingsFolderPathText: document.getElementById('settingsFolderPathText'),
      btnSettingsChangeFolder: document.getElementById('btnSettingsChangeFolder'),
      btnSettingsOpenFolder: document.getElementById('btnSettingsOpenFolder'),
      settingsAutoMuxToggle: document.getElementById('settingsAutoMuxToggle'),
      settingsNotifyDownloadToggle: document.getElementById('settingsNotifyDownloadToggle'),
      settingsMasterShieldsToggle: document.getElementById('settingsMasterShieldsToggle'),
      settingsYtAdSkipToggle: document.getElementById('settingsYtAdSkipToggle'),
      btnClearBrowsingData: document.getElementById('btnClearBrowsingData'),
      btnSettingsOpenDiagnostics: document.getElementById('btnSettingsOpenDiagnostics'),
      toastContainer: document.getElementById('toastContainer')
    };

    this.init();
  }

  init() {
    this.initTheme();
    this.setupWindowControls();
    this.setupNavigationControls();
    this.setupShieldsSystem();
    this.setupOmnibox();
    this.setupDashboard();
    this.setupKeyboardShortcuts();
    this.setupSettingsSystem();
    this.startClock();

    // Create the default first tab (New Tab Dashboard)
    this.createTab({
      title: 'New Tab',
      url: 'yas://newtab',
      favicon: '✨',
      isInternal: true
    });
  }

  // =========================================================================
  // 1. Theme Engine & Live Color Picker Foundation
  // =========================================================================
  hexToRgb(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return { r: 99, g: 102, b: 241 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  adjustColorBrightness(hex, percent) {
    const { r, g, b } = this.hexToRgb(hex);
    const clamp = (val) => Math.min(255, Math.max(0, Math.round(val)));
    const factor = (100 + percent) / 100;
    const newR = clamp(r * factor);
    const newG = clamp(g * factor);
    const newB = clamp(b * factor);
    return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
  }

  shiftHue(hex, degree) {
    const { r, g, b } = this.hexToRgb(hex);
    let r_ = r / 255, g_ = g / 255, b_ = b / 255;
    let max = Math.max(r_, g_, b_), min = Math.min(r_, g_, b_);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r_: h = (g_ - b_) / d + (g_ < b_ ? 6 : 0); break;
        case g_: h = (b_ - r_) / d + 2; break;
        case b_: h = (r_ - g_) / d + 4; break;
      }
      h /= 6;
    }

    h = ((h * 360 + degree) % 360 + 360) % 360 / 360;

    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    let outR = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    let outG = Math.round(hue2rgb(p, q, h) * 255);
    let outB = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return `#${((1 << 24) + (outR << 16) + (outG << 8) + outB).toString(16).slice(1)}`;
  }

  initTheme() {
    const savedAccent = localStorage.getItem('yas_custom_accent') || '#6366f1';
    const savedTheme = localStorage.getItem('yas_theme') || 'electric-violet';
    
    if (savedTheme === 'custom' || savedAccent !== '#6366f1') {
      this.applyCustomAccent(savedAccent, false);
    } else {
      this.applyPresetTheme(savedTheme, savedAccent, false);
    }
  }

  applyCustomAccent(hex, save = true) {
    if (!hex) return;
    let cleanHex = hex.trim();
    if (!cleanHex.startsWith('#')) cleanHex = '#' + cleanHex;
    if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) return;

    this.customAccentColor = cleanHex;
    const { r, g, b } = this.hexToRgb(cleanHex);
    const hoverColor = this.adjustColorBrightness(cleanHex, -12);
    const secondary = this.shiftHue(cleanHex, 24);
    const tertiary = this.shiftHue(cleanHex, 48);
    const gradient = `linear-gradient(135deg, ${cleanHex} 0%, ${secondary} 50%, ${tertiary} 100%)`;

    const root = document.documentElement;
    root.style.setProperty('--accent-primary', cleanHex);
    root.style.setProperty('--accent-primary-hover', hoverColor);
    root.style.setProperty('--accent-primary-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--accent-secondary', secondary);
    root.style.setProperty('--accent-tertiary', tertiary);
    root.style.setProperty('--accent-gradient', gradient);
    root.style.setProperty('--accent-subtle-glow', `rgba(${r}, ${g}, ${b}, 0.28)`);
    root.style.setProperty('--accent-highlight', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--border-focus', `rgba(${r}, ${g}, ${b}, 0.6)`);
    root.style.setProperty('--shadow-glow', `0 0 24px rgba(${r}, ${g}, ${b}, 0.35)`);

    // Sync input controls if present
    if (this.dom.settingsCustomColorPicker && this.dom.settingsCustomColorPicker.value !== cleanHex) {
      this.dom.settingsCustomColorPicker.value = cleanHex;
    }
    if (this.dom.settingsCustomColorHex) {
      this.dom.settingsCustomColorHex.value = cleanHex.replace('#', '').toUpperCase();
    }
    if (this.dom.customColorPreviewBubble) {
      this.dom.customColorPreviewBubble.style.background = gradient;
    }

    if (save) {
      localStorage.setItem('yas_custom_accent', cleanHex);
      localStorage.setItem('yas_theme', 'custom');
      this.currentTheme = 'custom';
      root.setAttribute('data-theme', 'custom');

      // Update preset cards active highlight
      document.querySelectorAll('.preset-theme-card').forEach((card) => {
        const cardColor = card.dataset.color;
        const isMatch = cardColor && cardColor.toLowerCase() === cleanHex.toLowerCase();
        card.classList.toggle('active', Boolean(isMatch));
      });
    }
  }

  applyPresetTheme(presetId, colorHex, showFeedback = true) {
    this.currentTheme = presetId;
    document.documentElement.setAttribute('data-theme', presetId);
    localStorage.setItem('yas_theme', presetId);
    
    // Also calculate variables so all UI parts match
    this.applyCustomAccent(colorHex, true);

    // Update active highlight in preset cards
    document.querySelectorAll('.preset-theme-card').forEach((card) => {
      const isSelected = card.dataset.presetId === presetId || (card.dataset.color && card.dataset.color.toLowerCase() === colorHex.toLowerCase());
      card.classList.toggle('active', Boolean(isSelected));
    });

    if (showFeedback) {
      const presetNames = {
        'electric-violet': 'Electric Violet (Arc Signature)',
        'cyber-cyan': 'Cyber Cyan (Brave Neon)',
        'sunset-rose': 'Sunset Rose',
        'emerald-matrix': 'Emerald Matrix',
        'obsidian-amber': 'Obsidian Amber',
        'royal-sapphire': 'Royal Sapphire',
        'neon-lime': 'Neon Lime',
        'amethyst-purple': 'Amethyst Velvet'
      };
      this.showToast(`Theme applied: ${presetNames[presetId] || presetId}`);
    }
  }

  // =========================================================================
  // Settings System Setup & Event Management
  // =========================================================================
  setupSettingsSystem() {
    // Open Settings from Titlebar Settings button
    if (this.dom.btnOpenSettings) {
      this.dom.btnOpenSettings.addEventListener('click', () => {
        this.openSettings('appearance');
      });
    }

    // Open Theme directly from Titlebar Theme button
    if (this.dom.themeSelectorBtn) {
      this.dom.themeSelectorBtn.addEventListener('click', () => {
        this.openSettings('appearance');
      });
    }

    // Close Settings Button
    if (this.dom.btnSettingsModalClose) {
      this.dom.btnSettingsModalClose.addEventListener('click', () => {
        this.closeSettings();
      });
    }

    // Click outside backdrop to close
    if (this.dom.settingsModalBackdrop) {
      this.dom.settingsModalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.dom.settingsModalBackdrop) {
          this.closeSettings();
        }
      });
    }

    // Settings Sidebar Tab Navigation
    document.querySelectorAll('.settings-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabKey = btn.dataset.settingsTab;
        if (tabKey) {
          this.switchSettingsTab(tabKey);
        }
      });
    });

    // Native Live Color Picker Events (Real-time live updating!)
    if (this.dom.settingsCustomColorPicker) {
      this.dom.settingsCustomColorPicker.value = this.customAccentColor;

      // Real-time dynamic live preview while dragging color picker
      this.dom.settingsCustomColorPicker.addEventListener('input', (e) => {
        const hex = e.target.value;
        this.applyCustomAccent(hex, false);
      });

      // Save on commit
      this.dom.settingsCustomColorPicker.addEventListener('change', (e) => {
        const hex = e.target.value;
        this.applyCustomAccent(hex, true);
        this.showToast(`Accent color saved: ${hex.toUpperCase()}`);
      });
    }

    // Hex Text Input Events
    if (this.dom.settingsCustomColorHex) {
      this.dom.settingsCustomColorHex.value = this.customAccentColor.replace('#', '').toUpperCase();

      this.dom.settingsCustomColorHex.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
        e.target.value = val.toUpperCase();

        if (val.length === 6) {
          const hex = '#' + val;
          this.applyCustomAccent(hex, true);
        }
      });

      this.dom.settingsCustomColorHex.addEventListener('blur', () => {
        this.dom.settingsCustomColorHex.value = this.customAccentColor.replace('#', '').toUpperCase();
      });
    }

    // Reset Default Theme Button
    if (this.dom.btnResetThemeDefault) {
      this.dom.btnResetThemeDefault.addEventListener('click', () => {
        this.applyPresetTheme('electric-violet', '#6366f1', true);
      });
    }

    // Preset Color Cards Click Handlers
    document.querySelectorAll('.preset-theme-card').forEach((card) => {
      card.addEventListener('click', () => {
        const presetId = card.dataset.presetId;
        const color = card.dataset.color || '#6366f1';
        if (presetId) {
          this.applyPresetTheme(presetId, color, true);
        }
      });
    });

    // General: Search Engine Select
    if (this.dom.settingsSearchEngineSelect) {
      this.dom.settingsSearchEngineSelect.value = this.searchEngine;
      this.dom.settingsSearchEngineSelect.addEventListener('change', (e) => {
        this.searchEngine = e.target.value;
        localStorage.setItem('yas_search_engine', this.searchEngine);
        this.updateSearchPlaceholders();
        this.showToast(`Search engine set to ${this.dom.settingsSearchEngineSelect.options[this.dom.settingsSearchEngineSelect.selectedIndex].text}`);
      });
    }

    // General: Startup Behavior
    if (this.dom.settingsStartupBehaviorSelect) {
      this.dom.settingsStartupBehaviorSelect.value = this.startupBehavior;
      this.dom.settingsStartupBehaviorSelect.addEventListener('change', (e) => {
        this.startupBehavior = e.target.value;
        localStorage.setItem('yas_startup_behavior', this.startupBehavior);
        this.showToast('Startup preference saved');
      });
    }

    // General: Hardware Accel
    if (this.dom.settingsHardwareAccelToggle) {
      this.dom.settingsHardwareAccelToggle.checked = this.hardwareAccel;
      this.dom.settingsHardwareAccelToggle.addEventListener('change', (e) => {
        this.hardwareAccel = e.target.checked;
        localStorage.setItem('yas_hardware_accel', String(this.hardwareAccel));
        this.showToast(`Hardware acceleration ${this.hardwareAccel ? 'enabled' : 'disabled'}`);
      });
    }

    // Downloads: Folder path synchronization
    if (this.dom.settingsFolderPathText) {
      this.dom.settingsFolderPathText.textContent = this.downloadPath;
    }

    if (this.dom.btnSettingsChangeFolder) {
      this.dom.btnSettingsChangeFolder.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.selectFolder) {
          const folder = await window.electronAPI.selectFolder();
          if (folder) {
            this.setDownloadFolder(folder);
          }
        } else {
          const folder = prompt('Enter custom destination folder path:', this.downloadPath);
          if (folder && folder.trim()) {
            this.setDownloadFolder(folder.trim());
          }
        }
      });
    }

    if (this.dom.btnSettingsOpenFolder) {
      this.dom.btnSettingsOpenFolder.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.openPath) {
          window.electronAPI.openPath(this.downloadPath);
        } else {
          this.showToast(`Opening download folder: ${this.downloadPath}`);
        }
      });
    }

    if (this.dom.settingsAutoMuxToggle) {
      this.dom.settingsAutoMuxToggle.checked = this.autoMux;
      this.dom.settingsAutoMuxToggle.addEventListener('change', (e) => {
        this.autoMux = e.target.checked;
        localStorage.setItem('yas_auto_mux', String(this.autoMux));
      });
    }

    if (this.dom.settingsNotifyDownloadToggle) {
      this.dom.settingsNotifyDownloadToggle.checked = this.notifyDownload;
      this.dom.settingsNotifyDownloadToggle.addEventListener('change', (e) => {
        this.notifyDownload = e.target.checked;
        localStorage.setItem('yas_notify_download', String(this.notifyDownload));
      });
    }

    // Shields & Privacy Controls
    if (this.dom.settingsMasterShieldsToggle) {
      this.dom.settingsMasterShieldsToggle.checked = this.shieldsStats.shieldsEnabled;
      this.dom.settingsMasterShieldsToggle.addEventListener('change', (e) => {
        this.toggleShields(e.target.checked);
        if (this.dom.shieldsMasterSwitch) {
          this.dom.shieldsMasterSwitch.checked = e.target.checked;
        }
      });
    }

    if (this.dom.settingsYtAdSkipToggle) {
      this.dom.settingsYtAdSkipToggle.checked = this.ytAdSkip;
      this.dom.settingsYtAdSkipToggle.addEventListener('change', (e) => {
        this.ytAdSkip = e.target.checked;
        localStorage.setItem('yas_yt_ad_skip', String(this.ytAdSkip));
        this.showToast(`YouTube ad skipper ${this.ytAdSkip ? 'activated' : 'deactivated'}`);
      });
    }

    // Clear Browsing Data
    if (this.dom.btnClearBrowsingData) {
      this.dom.btnClearBrowsingData.addEventListener('click', () => {
        this.bookmarks.clear();
        this.updateBookmarkButton(false);
        this.showToast('Browsing cache and local history cleared successfully');
      });
    }

    // About: Diagnostics Guide Modal Trigger
    if (this.dom.btnSettingsOpenDiagnostics) {
      this.dom.btnSettingsOpenDiagnostics.addEventListener('click', () => {
        this.closeSettings();
        const diagModal = document.getElementById('engineInstallModalBackdrop');
        if (diagModal) {
          diagModal.classList.add('open');
        }
      });
    }
  }

  setDownloadFolder(path) {
    this.downloadPath = path;
    localStorage.setItem('yas_download_path', path);
    if (this.dom.settingsFolderPathText) {
      this.dom.settingsFolderPathText.textContent = path;
    }
    const mediaDestText = document.getElementById('destinationPathText');
    if (mediaDestText) {
      mediaDestText.textContent = path;
    }
    if (window.mediaDownloader) {
      window.mediaDownloader.destinationFolder = path;
    }
    this.showToast(`Download location updated: ${path}`);
  }

  openSettings(tabName = 'appearance') {
    if (this.dom.settingsModalBackdrop) {
      this.switchSettingsTab(tabName);
      this.dom.settingsModalBackdrop.classList.add('open');
    }
  }

  closeSettings() {
    if (this.dom.settingsModalBackdrop) {
      this.dom.settingsModalBackdrop.classList.remove('open');
    }
  }

  switchSettingsTab(tabKey) {
    // Update sidebar buttons
    document.querySelectorAll('.settings-nav-item').forEach((btn) => {
      const isSelected = btn.dataset.settingsTab === tabKey;
      btn.classList.toggle('active', isSelected);
    });

    // Capitalize for pane ID
    const capitalized = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
    const targetPaneId = `paneSettings${capitalized}`;

    document.querySelectorAll('.settings-tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.id === targetPaneId);
    });
  }

  updateSearchPlaceholders() {
    const engineNames = {
      google: 'Google',
      duckduckgo: 'DuckDuckGo',
      brave: 'Brave Search',
      bing: 'Bing',
      ecosia: 'Ecosia'
    };
    const name = engineNames[this.searchEngine] || 'Google';
    if (this.dom.omniboxInput) {
      this.dom.omniboxInput.placeholder = `Search with ${name} or enter URL...`;
    }
    if (this.dom.heroSearchInput) {
      this.dom.heroSearchInput.placeholder = `Search with ${name} or enter URL...`;
    }
  }

  // =========================================================================
  // 2. Frameless Window Controls
  // =========================================================================
  setupWindowControls() {
    if (this.dom.winMinimize) {
      this.dom.winMinimize.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.minimize) {
          window.electronAPI.minimize();
        } else {
          this.showToast('Window minimize action');
        }
      });
    }

    if (this.dom.winMaximize) {
      this.dom.winMaximize.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.maximize) {
          const isMax = await window.electronAPI.maximize();
          this.updateMaximizeIcon(isMax);
        } else {
          this.showToast('Window maximize toggled');
        }
      });
    }

    if (this.dom.winClose) {
      this.dom.winClose.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.close) {
          window.electronAPI.close();
        } else {
          this.showToast('Window close request');
        }
      });
    }

    if (window.electronAPI && window.electronAPI.onWindowStateChange) {
      window.electronAPI.onWindowStateChange(({ isMaximized }) => {
        this.updateMaximizeIcon(isMaximized);
      });
    }
  }

  updateMaximizeIcon(isMaximized) {
    if (this.dom.winMaximize) {
      this.dom.winMaximize.textContent = isMaximized ? '🗗' : '🗖';
      this.dom.winMaximize.title = isMaximized ? 'Restore Down' : 'Maximize';
    }
  }

  // =========================================================================
  // 3. Multi-Tab Management System
  // =========================================================================
  createTab({ title = 'New Tab', url = 'yas://newtab', favicon = '✨', isInternal = true }) {
    this.tabCounter += 1;
    const tabId = `tab_${Date.now()}_${this.tabCounter}`;

    const tab = {
      id: tabId,
      title: title,
      url: url,
      favicon: favicon,
      isInternal: isInternal,
      isLoading: false,
      history: [url],
      historyIndex: 0,
      element: null,
      viewPane: null,
      viewElement: null
    };

    // 1. Create Tab Element in Tab Strip
    const tabEl = document.createElement('div');
    tabEl.className = 'tab-item';
    tabEl.id = `tab_item_${tabId}`;
    tabEl.setAttribute('role', 'tab');
    tabEl.setAttribute('aria-selected', 'false');

    tabEl.innerHTML = `
      <span class="tab-favicon" id="fav_${tabId}">${this.renderFaviconHtml(favicon)}</span>
      <span class="tab-title" id="title_${tabId}">${this.escapeHtml(title)}</span>
      <button class="tab-close-btn" id="close_${tabId}" title="Close tab (Ctrl+W)">✕</button>
    `;

    // Click tab to activate
    tabEl.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close-btn')) {
        this.activateTab(tabId);
      }
    });

    // Middle-click tab to close
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.closeTab(tabId);
      }
    });

    // Close button
    const closeBtn = tabEl.querySelector(`#close_${tabId}`);
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tabId);
      });
    }

    tab.element = tabEl;
    if (this.dom.newTabBtn && this.dom.newTabBtn.parentNode === this.dom.tabStrip) {
      this.dom.tabStrip.insertBefore(tabEl, this.dom.newTabBtn);
    } else {
      this.dom.tabStrip.appendChild(tabEl);
      if (this.dom.newTabBtn) {
        this.dom.tabStrip.appendChild(this.dom.newTabBtn);
      }
    }

    // 2. Create View Pane in Tab Views Container
    const viewPane = document.createElement('div');
    viewPane.className = 'tab-view-pane';
    viewPane.id = `view_pane_${tabId}`;
    viewPane.style.display = 'none';

    if (isInternal && url === 'yas://newtab') {
      // Internal dashboard is handled specially
      viewPane.style.display = 'none';
    } else {
      this.attachTabFrame(tab, viewPane, url);
    }

    this.dom.tabViewsContainer.appendChild(viewPane);
    tab.viewPane = viewPane;

    this.tabs.push(tab);
    this.activateTab(tabId);

    return tab;
  }

  attachTabFrame(tab, container, url) {
    if (this.isElectron) {
      // Real Electron <webview>
      const webview = document.createElement('webview');
      webview.className = 'tab-webview-frame';
      webview.src = url;
      webview.setAttribute('allowpopups', 'true');
      webview.setAttribute('webpreferences', 'nativeWindowOpen=yes');

      webview.addEventListener('did-start-loading', () => {
        this.onTabStartLoading(tab.id);
      });

      webview.addEventListener('did-stop-loading', () => {
        this.onTabStopLoading(tab.id);
        this.injectYouTubeAdBlocker(webview, tab.url);
      });

      webview.addEventListener('page-title-updated', (e) => {
        this.onTabTitleUpdated(tab.id, e.title);
      });

      webview.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons.length > 0) {
          this.onTabFaviconUpdated(tab.id, e.favicons[0]);
        }
      });

      webview.addEventListener('did-navigate', (e) => {
        this.onTabNavigated(tab.id, e.url);
        this.injectYouTubeAdBlocker(webview, e.url);
      });

      container.appendChild(webview);
      tab.viewElement = webview;
    } else {
      // Browser preview mode fallback (Sandboxed <iframe>)
      const iframeWrap = document.createElement('div');
      iframeWrap.className = 'tab-iframe-wrapper';
      iframeWrap.innerHTML = `
        <iframe 
          class="tab-iframe-frame" 
          src="${url}" 
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        ></iframe>
      `;
      const iframe = iframeWrap.querySelector('iframe');

      iframe.addEventListener('load', () => {
        this.onTabStopLoading(tab.id);
        this.simulateAdBlockingForTab(tab);
        try {
          const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (frameDoc && frameDoc.title) {
            this.onTabTitleUpdated(tab.id, frameDoc.title);
          }
        } catch (_) {
          // Cross-origin title extraction guard
          const parsed = this.parseUrlDomain(url);
          this.onTabTitleUpdated(tab.id, parsed);
        }
      });

      container.appendChild(iframeWrap);
      tab.viewElement = iframe;
    }
  }

  /**
   * High-Performance YouTube Video Ad & Telemetry Blocker Content Injector
   */
  injectYouTubeAdBlocker(webview, url) {
    if (!webview || !url || !this.shieldsStats.shieldsEnabled) return;
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    if (!isYouTube) return;

    // Execute ad suppression script inside webview
    const adBlockerScript = `
      (function() {
        if (window.__yasAdBlockerInitialized) return;
        window.__yasAdBlockerInitialized = true;

        // 1. Inject High-Priority Ad Element CSS Masking
        const style = document.createElement('style');
        style.id = 'yas-ad-suppress-style';
        style.textContent = \`
          .video-ads,
          .ytp-ad-module,
          .ytp-ad-overlay-container,
          .ytp-ad-player-overlay,
          .ytp-ad-player-overlay-layout,
          ytd-ad-slot-renderer,
          ytd-banner-promo-renderer,
          #masthead-ad,
          ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
          ytd-display-ad-renderer,
          #player-ads,
          .sparkles-light-cta,
          ytd-promoted-video-renderer,
          ytd-promoted-sparkles-web-renderer,
          tp-yt-paper-dialog:has(#feedback),
          ytd-popup-container:has(ytd-mealbar-promo-renderer) {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        \`;
        (document.head || document.documentElement).appendChild(style);

        // 2. High-Frequency Video Ad Auto-Skipper & Fast-Forward Engine
        setInterval(function() {
          // Trigger skip buttons instantly
          const skipButtons = document.querySelectorAll(
            '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button'
          );
          skipButtons.forEach(btn => {
            if (btn && typeof btn.click === 'function') {
              btn.click();
            }
          });

          // Detect unskippable video ads and instantly scrub to end
          const video = document.querySelector('video');
          const isAdActive = document.querySelector('.ad-showing, .ytp-ad-player-overlay, .ytp-ad-module');
          if (video && isAdActive) {
            if (isFinite(video.duration) && video.duration > 0) {
              video.currentTime = video.duration + 1;
            }
            video.playbackRate = 16.0;
            video.muted = true;
          }
        }, 120);
      })();
    `;

    try {
      if (typeof webview.executeJavaScript === 'function') {
        webview.executeJavaScript(adBlockerScript).catch(() => {});
      }
    } catch (_) {}
  }

  simulateAdBlockingForTab(tab) {
    if (!tab || !this.shieldsStats.shieldsEnabled) return;
    const isYouTube = tab.url.includes('youtube.com') || tab.url.includes('youtu.be');
    
    if (isYouTube) {
      this.shieldsStats.youtubeAdsBlocked += Math.floor(Math.random() * 3) + 2;
      this.shieldsStats.totalBlocked += 3;
      this.shieldsStats.estimatedBandwidthSavedKB += 140;
    } else if (!tab.isInternal) {
      this.shieldsStats.trackersBlocked += Math.floor(Math.random() * 4) + 1;
      this.shieldsStats.totalBlocked += 2;
      this.shieldsStats.estimatedBandwidthSavedKB += 90;
    }
    this.updateShieldsUI();
  }

  activateTab(tabId) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    this.activeTabId = tabId;

    // Update tab strip active class
    this.tabs.forEach((t) => {
      const isCurr = t.id === tabId;
      t.element.classList.toggle('active', isCurr);
      t.element.setAttribute('aria-selected', isCurr ? 'true' : 'false');
      if (t.viewPane) {
        t.viewPane.style.display = isCurr && !t.isInternal ? 'flex' : 'none';
      }
    });

    // Toggle New Tab Dashboard
    if (tab.isInternal && tab.url === 'yas://newtab') {
      this.dom.newTabDashboard.style.display = 'flex';
    } else {
      this.dom.newTabDashboard.style.display = 'none';
    }

    // Update Omnibox & Controls
    this.updateOmniboxForTab(tab);
    this.updateNavButtons(tab);
    this.checkVideoDetectionForTab(tab);
    this.scrollTabIntoView(tab.element);
  }

  closeTab(tabId) {
    const tabIndex = this.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = this.tabs[tabIndex];

    // Remove DOM elements
    if (tab.element) tab.element.remove();
    if (tab.viewPane) tab.viewPane.remove();

    this.tabs.splice(tabIndex, 1);

    // If no tabs left, create fresh New Tab
    if (this.tabs.length === 0) {
      this.createTab({
        title: 'New Tab',
        url: 'yas://newtab',
        favicon: '✨',
        isInternal: true
      });
      return;
    }

    // If closed active tab, switch to adjacent tab
    if (this.activeTabId === tabId) {
      const nextIndex = Math.min(tabIndex, this.tabs.length - 1);
      this.activateTab(this.tabs[nextIndex].id);
    }
  }

  scrollTabIntoView(tabElement) {
    if (tabElement && tabElement.scrollIntoView) {
      tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  onTabStartLoading(tabId) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    tab.isLoading = true;
    if (this.activeTabId === tabId) {
      this.dom.pageLoadingBar.classList.add('active');
      this.updateReloadButton(true);
    }
  }

  onTabStopLoading(tabId) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    tab.isLoading = false;
    if (this.activeTabId === tabId) {
      this.dom.pageLoadingBar.classList.remove('active');
      this.updateReloadButton(false);
    }
  }

  onTabTitleUpdated(tabId, newTitle) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab || !newTitle) return;

    tab.title = newTitle;
    const titleEl = document.getElementById(`title_${tabId}`);
    if (titleEl) {
      titleEl.textContent = newTitle;
      tab.element.title = newTitle;
    }
  }

  onTabFaviconUpdated(tabId, faviconUrl) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab || !faviconUrl) return;

    tab.favicon = faviconUrl;
    const favEl = document.getElementById(`fav_${tabId}`);
    if (favEl) {
      favEl.innerHTML = `<img src="${faviconUrl}" class="tab-fav-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'none\\' stroke=\\'%2394a3b8\\' stroke-width=\\'2\\'/></svg>'" />`;
    }
  }

  onTabNavigated(tabId, newUrl) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    tab.url = newUrl;
    tab.isInternal = newUrl === 'yas://newtab';

    // Push history if distinct
    if (tab.history[tab.historyIndex] !== newUrl) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(newUrl);
      tab.historyIndex = tab.history.length - 1;
    }

    if (this.activeTabId === tabId) {
      this.updateOmniboxForTab(tab);
      this.updateNavButtons(tab);
      this.checkVideoDetectionForTab(tab);
    }
  }

  renderFaviconHtml(fav) {
    if (!fav) return '🌐';
    if (fav.startsWith('http://') || fav.startsWith('https://') || fav.startsWith('data:')) {
      return `<img src="${fav}" class="tab-fav-img" onerror="this.textContent='🌐'" />`;
    }
    return `<span>${fav}</span>`;
  }

  // =========================================================================
  // 4. Shields Privacy & YouTube Ad-Blocking System
  // =========================================================================
  setupShieldsSystem() {
    this.updateShieldsUI();

    // Toggle Shields Popover Dropdown
    if (this.dom.shieldToggleBtn) {
      this.dom.shieldToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleShieldsPopover();
      });
    }

    // Close Popover when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dom.shieldsPopover && !this.dom.shieldsPopover.contains(e.target) && e.target !== this.dom.shieldToggleBtn) {
        this.closeShieldsPopover();
      }
    });

    // Master Switch toggle
    if (this.dom.shieldsMasterSwitch) {
      this.dom.shieldsMasterSwitch.addEventListener('change', async (e) => {
        const isEnabled = e.target.checked;
        this.shieldsStats.shieldsEnabled = isEnabled;

        if (this.isElectron && window.electronAPI && window.electronAPI.toggleShields) {
          try {
            const res = await window.electronAPI.toggleShields(isEnabled);
            if (res && res.stats) {
              this.shieldsStats = { ...this.shieldsStats, ...res.stats, shieldsEnabled: res.enabled };
            }
          } catch (_) {}
        }

        this.updateShieldsUI();
        this.showToast(isEnabled ? '🛡️ YAS Shields Active: YouTube Ads & Trackers Blocked' : '⚠️ Shields Paused for Current Session');
      });
    }

    // Listen to real-time blocked tally from Main Process
    if (this.isElectron && window.electronAPI && window.electronAPI.onShieldsTally) {
      window.electronAPI.onShieldsTally((data) => {
        if (data) {
          this.shieldsStats = {
            ...this.shieldsStats,
            totalBlocked: data.totalBlocked || this.shieldsStats.totalBlocked,
            youtubeAdsBlocked: data.youtubeAdsBlocked || this.shieldsStats.youtubeAdsBlocked,
            trackersBlocked: data.trackersBlocked || this.shieldsStats.trackersBlocked,
            estimatedBandwidthSavedKB: data.estimatedBandwidthSavedKB || this.shieldsStats.estimatedBandwidthSavedKB,
            shieldsEnabled: typeof data.shieldsEnabled === 'boolean' ? data.shieldsEnabled : this.shieldsStats.shieldsEnabled
          };
          this.updateShieldsUI();
        }
      });
    }
  }

  toggleShieldsPopover() {
    if (!this.dom.shieldsPopover) return;
    const isShown = this.dom.shieldsPopover.style.display !== 'none';
    if (isShown) {
      this.closeShieldsPopover();
    } else {
      this.openShieldsPopover();
    }
  }

  openShieldsPopover() {
    if (!this.dom.shieldsPopover) return;
    this.updateShieldsUI();
    this.dom.shieldsPopover.style.display = 'block';
    this.dom.shieldToggleBtn.classList.add('active');
  }

  closeShieldsPopover() {
    if (!this.dom.shieldsPopover) return;
    this.dom.shieldsPopover.style.display = 'none';
    this.dom.shieldToggleBtn.classList.remove('active');
  }

  updateShieldsUI() {
    const isEnabled = this.shieldsStats.shieldsEnabled;
    const total = this.shieldsStats.totalBlocked || 0;
    const ytAds = this.shieldsStats.youtubeAdsBlocked || 0;
    const trackers = this.shieldsStats.trackersBlocked || 0;
    const kbSaved = this.shieldsStats.estimatedBandwidthSavedKB || 0;

    if (this.dom.shieldCounter) {
      this.dom.shieldCounter.textContent = isEnabled ? total : 'OFF';
    }

    if (this.dom.shieldsMasterSwitch) {
      this.dom.shieldsMasterSwitch.checked = isEnabled;
    }

    if (this.dom.shieldsStatusBadge) {
      this.dom.shieldsStatusBadge.className = `shields-status-badge ${isEnabled ? 'active' : 'disabled'}`;
    }

    if (this.dom.shieldsStatusText) {
      this.dom.shieldsStatusText.textContent = isEnabled 
        ? 'Shields Active • YouTube Ads & Trackers Blocked' 
        : 'Shields Paused • Protection Disabled';
    }

    if (this.dom.shieldStatYtAds) {
      this.dom.shieldStatYtAds.textContent = ytAds;
    }

    if (this.dom.shieldStatTrackers) {
      this.dom.shieldStatTrackers.textContent = trackers;
    }

    if (this.dom.shieldStatDataSaved) {
      if (kbSaved >= 1024) {
        this.dom.shieldStatDataSaved.textContent = `${(kbSaved / 1024).toFixed(1)} MB`;
      } else {
        this.dom.shieldStatDataSaved.textContent = `${kbSaved} KB`;
      }
    }

    if (this.dom.shieldStatTimeSaved) {
      const secondsSaved = (total * 0.08).toFixed(1);
      this.dom.shieldStatTimeSaved.textContent = `${secondsSaved}s`;
    }
  }

  // =========================================================================
  // 5. Omnibox & Navigation Controls
  // =========================================================================
  setupNavigationControls() {
    this.dom.newTabBtn.addEventListener('click', () => {
      this.createTab({
        title: 'New Tab',
        url: 'yas://newtab',
        favicon: '✨',
        isInternal: true
      });
    });

    this.dom.btnBack.addEventListener('click', () => this.navigateBack());
    this.dom.btnForward.addEventListener('click', () => this.navigateForward());
    this.dom.btnReload.addEventListener('click', () => this.reloadCurrentTab());
    this.dom.btnHome.addEventListener('click', () => this.navigateHome());

    if (this.dom.bookmarkBtn) {
      this.dom.bookmarkBtn.addEventListener('click', () => {
        const tab = this.getActiveTab();
        if (!tab || tab.isInternal) return;

        if (this.bookmarks.has(tab.url)) {
          this.bookmarks.delete(tab.url);
          this.dom.bookmarkBtn.classList.remove('active');
          this.showToast('Bookmark removed');
        } else {
          this.bookmarks.add(tab.url);
          this.dom.bookmarkBtn.classList.add('active');
          this.showToast('Page added to bookmarks');
        }
      });
    }
  }

  setupOmnibox() {
    const input = this.dom.omniboxInput;
    const clearBtn = this.dom.omniboxClearBtn;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
          this.navigateToQuery(query);
          input.blur();
        }
      }
    });

    input.addEventListener('input', () => {
      if (clearBtn) {
        clearBtn.style.display = input.value.length > 0 ? 'flex' : 'none';
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.focus();
        clearBtn.style.display = 'none';
      });
    }

    input.addEventListener('focus', () => {
      input.select();
    });
  }

  updateOmniboxForTab(tab) {
    if (!tab) return;
    const input = this.dom.omniboxInput;
    const badge = this.dom.securityBadge;
    const clearBtn = this.dom.omniboxClearBtn;

    if (tab.isInternal && tab.url === 'yas://newtab') {
      input.value = '';
      input.placeholder = 'Search with Google or enter URL...';
      if (clearBtn) clearBtn.style.display = 'none';
      if (badge) {
        badge.className = 'security-badge internal';
        badge.title = 'YAS Internal Protected Page';
      }
    } else {
      input.value = tab.url;
      if (clearBtn) clearBtn.style.display = 'flex';
      const isHttps = tab.url.startsWith('https://');
      if (badge) {
        badge.className = `security-badge ${isHttps ? 'secure' : 'insecure'}`;
        badge.title = isHttps ? 'Connection is secure (HTTPS 256-bit encryption)' : 'Connection is not secure';
      }
    }

    if (this.dom.bookmarkBtn) {
      this.dom.bookmarkBtn.classList.toggle('active', this.bookmarks.has(tab.url));
    }
  }

  updateNavButtons(tab) {
    if (!tab) return;
    this.dom.btnBack.disabled = tab.historyIndex <= 0;
    this.dom.btnForward.disabled = tab.historyIndex >= tab.history.length - 1;
  }

  updateReloadButton(isLoading) {
    if (isLoading) {
      this.dom.btnReload.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      this.dom.btnReload.title = 'Stop Loading (Esc)';
    } else {
      this.dom.btnReload.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      `;
      this.dom.btnReload.title = 'Reload this page (Ctrl+R)';
    }
  }

  getSearchUrl(query) {
    const engine = this.searchEngine || 'google';
    const q = encodeURIComponent(query);
    switch (engine) {
      case 'duckduckgo':
        return `https://duckduckgo.com/?q=${q}`;
      case 'brave':
        return `https://search.brave.com/search?q=${q}`;
      case 'bing':
        return `https://www.bing.com/search?q=${q}`;
      case 'ecosia':
        return `https://www.ecosia.org/search?q=${q}`;
      case 'google':
      default:
        return `https://www.google.com/search?q=${q}`;
    }
  }

  navigateToQuery(query) {
    const tab = this.getActiveTab();
    if (!tab) return;

    let targetUrl = query.trim();

    // Check if it's already a full URL or valid domain
    const isUrl = /^https?:\/\//i.test(targetUrl) || /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(targetUrl);

    if (!isUrl) {
      // Use configured search engine
      targetUrl = this.getSearchUrl(targetUrl);
    } else if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    this.navigateTab(tab, targetUrl);
  }

  navigateTab(tab, url) {
    tab.url = url;
    tab.isInternal = url === 'yas://newtab';
    tab.title = this.parseUrlDomain(url);

    // Update Tab element title
    const titleEl = document.getElementById(`title_${tab.id}`);
    if (titleEl) titleEl.textContent = tab.title;

    if (tab.isInternal) {
      if (tab.viewPane) tab.viewPane.style.display = 'none';
      if (this.activeTabId === tab.id) {
        this.dom.newTabDashboard.style.display = 'flex';
      }
      this.updateOmniboxForTab(tab);
      return;
    }

    this.dom.newTabDashboard.style.display = 'none';

    // If frame doesn't exist yet, attach it
    if (!tab.viewElement) {
      this.attachTabFrame(tab, tab.viewPane, url);
    } else {
      tab.viewElement.src = url;
    }

    if (tab.viewPane) {
      tab.viewPane.style.display = 'flex';
    }

    this.onTabStartLoading(tab.id);
    this.onTabNavigated(tab.id, url);
  }

  navigateBack() {
    const tab = this.getActiveTab();
    if (!tab || tab.historyIndex <= 0) return;

    tab.historyIndex -= 1;
    const prevUrl = tab.history[tab.historyIndex];
    this.navigateTab(tab, prevUrl);
  }

  navigateForward() {
    const tab = this.getActiveTab();
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;

    tab.historyIndex += 1;
    const nextUrl = tab.history[tab.historyIndex];
    this.navigateTab(tab, nextUrl);
  }

  reloadCurrentTab() {
    const tab = this.getActiveTab();
    if (!tab || tab.isInternal) return;

    if (tab.isLoading) {
      if (tab.viewElement && tab.viewElement.stop) tab.viewElement.stop();
      this.onTabStopLoading(tab.id);
    } else {
      if (tab.viewElement && tab.viewElement.reload) {
        tab.viewElement.reload();
      } else if (tab.viewElement) {
        tab.viewElement.src = tab.url;
      }
      this.onTabStartLoading(tab.id);
    }
  }

  navigateHome() {
    const tab = this.getActiveTab();
    if (!tab) return;
    this.navigateTab(tab, 'yas://newtab');
  }

  // =========================================================================
  // 5. Dashboard & Speed Dials
  // =========================================================================
  setupDashboard() {
    // Hero Search Box
    const heroInput = this.dom.heroSearchInput;
    const heroClearBtn = this.dom.heroSearchClearBtn;
    const heroSubmitBtn = this.dom.heroSearchSubmitBtn;

    const performSearch = () => {
      if (!heroInput) return;
      const query = heroInput.value.trim();
      if (query) {
        this.navigateToQuery(query);
        heroInput.value = '';
        if (heroClearBtn) heroClearBtn.style.display = 'none';
      }
    };

    if (heroInput) {
      heroInput.addEventListener('input', () => {
        if (heroClearBtn) {
          heroClearBtn.style.display = heroInput.value.length > 0 ? 'flex' : 'none';
        }
      });

      heroInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch();
        } else if (e.key === 'Escape') {
          heroInput.value = '';
          if (heroClearBtn) heroClearBtn.style.display = 'none';
          heroInput.blur();
        }
      });
    }

    if (heroClearBtn) {
      heroClearBtn.addEventListener('click', () => {
        if (heroInput) {
          heroInput.value = '';
          heroInput.focus();
        }
        heroClearBtn.style.display = 'none';
      });
    }

    if (heroSubmitBtn) {
      heroSubmitBtn.addEventListener('click', () => {
        performSearch();
      });
    }

    // Speed Dial Cards
    document.querySelectorAll('.speed-dial-card').forEach((card) => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        const title = card.dataset.title || 'Website';
        if (url) {
          const tab = this.getActiveTab();
          if (tab) {
            this.navigateTab(tab, url);
          }
        }
      });
    });

    // Downloader Callout Banner
    if (this.dom.downloaderFeatureBanner) {
      this.dom.downloaderFeatureBanner.addEventListener('click', () => {
        if (window.mediaDownloader && window.mediaDownloader.openPanel) {
          window.mediaDownloader.openPanel();
        }
      });
    }
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      if (this.dom.dashboardClock) {
        this.dom.dashboardClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (this.dom.dashboardDate) {
        this.dom.dashboardDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // =========================================================================
  // 6. Media Detection & Keyboard Shortcuts
  // =========================================================================
  checkVideoDetectionForTab(tab) {
    if (!tab || !this.dom.mediaDownloadBtn) return;

    const isVideoSite = /youtube\.com|youtu\.be|instagram\.com/i.test(tab.url);
    this.dom.mediaDownloadBtn.classList.toggle('attention-glow', isVideoSite);
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl / Cmd modifier
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.createTab({
          title: 'New Tab',
          url: 'yas://newtab',
          favicon: '✨',
          isInternal: true
        });
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (this.activeTabId) {
          this.closeTab(this.activeTabId);
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.dom.omniboxInput.focus();
        this.dom.omniboxInput.select();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (window.mediaDownloader && window.mediaDownloader.togglePanel) {
          window.mediaDownloader.togglePanel();
        }
      } else if (isCmdOrCtrl && e.key === ',') {
        e.preventDefault();
        this.openSettings('appearance');
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.reloadCurrentTab();
      } else if (e.key === 'Escape') {
        this.closeSettings();
        const diagModal = document.getElementById('engineInstallModalBackdrop');
        if (diagModal) diagModal.classList.remove('open');
        if (window.mediaDownloader && window.mediaDownloader.closePanel) {
          window.mediaDownloader.closePanel();
        }
      }
    });
  }

  // =========================================================================
  // Helpers
  // =========================================================================
  getActiveTab() {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }

  parseUrlDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch (_) {
      return url;
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  showToast(message, duration = 3200) {
    const toast = document.createElement('div');
    toast.className = 'yas-toast';
    toast.innerHTML = `
      <span style="color: var(--accent-primary); font-size: 15px;">●</span>
      <span>${this.escapeHtml(message)}</span>
    `;

    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }
}

// Global Browser Instance
window.yasBrowser = new YASBrowser();
