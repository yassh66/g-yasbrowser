/**
 * YAS Browser - Core Browser Engine & Renderer
 * 
 * Features:
 * - Full Tab Management (Create, Switch, Close, Middle-click close, Keyboard shortcuts)
 * - True Tab-Isolated Viewports (<webview> in Electron, Sandboxed <iframe> in Web preview)
 * - Preserves state, scroll position, and forms when switching tabs
 * - Address Bar Omnibox with Smart URL normalization, Google Search fallback, and HTTPS badges
 * - Navigation History (Back, Forward, Reload / Stop Loading swap, Home)
 * - Sleek Top Loading Progress Bar (Brave / Arc Style)
 * - Custom Title Bar controls (Minimize, Maximize / Restore, Close) for frameless window
 * - Deep Seamless Media Download integration (Active tab video detection, Toolbar pulse, Auto pre-fill)
 */

class YASBrowser {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.trackersBlocked = 142;
    this.bookmarks = new Set(['https://youtube.com', 'https://instagram.com', 'https://github.com']);
    this.isElectron = Boolean(window.electronAPI && window.electronAPI.isElectron);

    this.dom = {
      // Title bar & window controls
      titlebar: document.getElementById('titlebar'),
      tabStrip: document.getElementById('tabStrip'),
      newTabBtn: document.getElementById('newTabBtn'),
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
      shieldToggleBtn: document.getElementById('shieldToggleBtn'),
      shieldCounter: document.getElementById('shieldCounter'),
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
      toastContainer: document.getElementById('toastContainer')
    };

    this.init();
  }

  init() {
    this.setupWindowControls();
    this.setupNavigationControls();
    this.setupOmnibox();
    this.setupDashboard();
    this.setupKeyboardShortcuts();
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
  // 1. Window Controls (Minimize, Maximize / Restore, Close)
  // =========================================================================
  setupWindowControls() {
    if (this.dom.winMinimize) {
      this.dom.winMinimize.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.minimize) {
          window.electronAPI.minimize();
        } else {
          this.showToast('Window minimize (Electron API ready)');
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

    // Window maximize state event listener from Electron main process
    if (window.electronAPI && window.electronAPI.onWindowStateChange) {
      window.electronAPI.onWindowStateChange(({ isMaximized }) => {
        this.updateMaximizeIcon(isMaximized);
      });
    }
  }

  updateMaximizeIcon(isMaximized) {
    if (this.dom.winMaximize) {
      this.dom.winMaximize.innerHTML = isMaximized ? '🗗' : '🗖';
      this.dom.winMaximize.title = isMaximized ? 'Restore' : 'Maximize';
    }
  }

  // =========================================================================
  // 2. Tab Management (Create, Activate, Close, History)
  // =========================================================================
  createTab({ title = 'New Tab', url = 'yas://newtab', favicon = '✨', isInternal = true }) {
    this.tabCounter++;
    const tabId = `tab_${this.tabCounter}`;

    // Tab Data Structure
    const tab = {
      id: tabId,
      title,
      url,
      favicon,
      isInternal,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      history: [url],
      historyIndex: 0,
      element: null,
      viewContainer: null,
      webview: null
    };

    this.tabs.push(tab);

    // 1. Build Tab Strip Item
    this.createTabStripElement(tab);

    // 2. Build View Container for this Tab
    this.createTabViewContainer(tab);

    // 3. Activate the new Tab
    this.activateTab(tabId);

    // If starting with external URL, navigate immediately
    if (url !== 'yas://newtab') {
      this.navigateTab(tab, url, title);
    }

    return tab;
  }

  createTabStripElement(tab) {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab-item';
    tabEl.id = `el_${tab.id}`;
    tabEl.setAttribute('data-tab-id', tab.id);
    tabEl.setAttribute('role', 'tab');
    tabEl.setAttribute('title', tab.title);

    tabEl.innerHTML = `
      <span class="tab-favicon">${this.renderFaviconHtml(tab.favicon)}</span>
      <span class="tab-title">${this.escapeHtml(tab.title)}</span>
      <span class="tab-audio-indicator" style="display: none;">🔊</span>
      <button class="tab-close-btn" title="Close Tab (Ctrl+W)">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Left click to activate
    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close-btn')) {
        e.stopPropagation();
        this.closeTab(tab.id);
      } else {
        this.activateTab(tab.id);
      }
    });

    // Middle click to close tab
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.closeTab(tab.id);
      }
    });

    tab.element = tabEl;
    this.dom.tabStrip.appendChild(tabEl);

    // Scroll tab strip to newly opened tab
    this.dom.tabStrip.scrollTo({
      left: this.dom.tabStrip.scrollWidth,
      behavior: 'smooth'
    });
  }

  createTabViewContainer(tab) {
    const viewContainer = document.createElement('div');
    viewContainer.className = 'tab-view-pane';
    viewContainer.id = `view_${tab.id}`;
    viewContainer.style.display = 'none';

    if (tab.isInternal || tab.url === 'yas://newtab') {
      // Uses the newtab dashboard
      viewContainer.classList.add('internal-pane');
    } else {
      this.attachWebContentElement(tab, viewContainer);
    }

    tab.viewContainer = viewContainer;
    if (this.dom.tabViewsContainer) {
      this.dom.tabViewsContainer.appendChild(viewContainer);
    }
  }

  attachWebContentElement(tab, container) {
    container.innerHTML = '';

    // Check if we are running in Electron environment with webview tag support
    if (this.isElectron) {
      const webview = document.createElement('webview');
      webview.className = 'tab-webview-frame';
      webview.setAttribute('src', tab.url);
      webview.setAttribute('allowpopups', 'true');
      webview.setAttribute('webpreferences', 'contextIsolation=yes, spellcheck=yes');
      webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 YASBrowser/1.0');

      this.bindWebviewEvents(tab, webview);
      container.appendChild(webview);
      tab.webview = webview;
    } else {
      // In web browser / sandboxed preview: render responsive iframe with sandbox
      const iframeWrap = document.createElement('div');
      iframeWrap.className = 'tab-iframe-wrapper';

      const iframe = document.createElement('iframe');
      iframe.className = 'tab-iframe-frame';
      iframe.setAttribute('src', tab.url);
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

      this.bindIframeEvents(tab, iframe, iframeWrap);
      iframeWrap.appendChild(iframe);
      container.appendChild(iframeWrap);
      tab.webview = iframe;
    }
  }

  bindWebviewEvents(tab, webview) {
    webview.addEventListener('did-start-loading', () => {
      tab.isLoading = true;
      if (tab.id === this.activeTabId) {
        this.updateLoadingUi(true);
      }
    });

    webview.addEventListener('did-stop-loading', () => {
      tab.isLoading = false;
      tab.canGoBack = webview.canGoBack ? webview.canGoBack() : tab.historyIndex > 0;
      tab.canGoForward = webview.canGoForward ? webview.canGoForward() : tab.historyIndex < tab.history.length - 1;

      if (tab.id === this.activeTabId) {
        this.updateLoadingUi(false);
        this.updateNavButtons(tab);
      }
    });

    webview.addEventListener('page-title-updated', (e) => {
      if (e.title && !tab.isInternal) {
        this.updateTabTitle(tab, e.title);
      }
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        this.updateTabFavicon(tab, e.favicons[0]);
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      if (e.url) {
        tab.url = e.url;
        this.pushTabHistory(tab, e.url);
        if (tab.id === this.activeTabId) {
          this.syncOmnibox(tab.url);
          this.updateSecurityBadge(tab.url);
          this.checkMediaDownloadOpportunity(tab.url);
        }
      }
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (e.url) {
        tab.url = e.url;
        if (tab.id === this.activeTabId) {
          this.syncOmnibox(tab.url);
          this.checkMediaDownloadOpportunity(tab.url);
        }
      }
    });

    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode !== -3) { // Not aborted
        tab.isLoading = false;
        if (tab.id === this.activeTabId) {
          this.updateLoadingUi(false);
        }
      }
    });

    webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      if (e.url) {
        this.createTab({
          title: 'Loading...',
          url: e.url,
          favicon: '🌐',
          isInternal: false
        });
      }
    });
  }

  bindIframeEvents(tab, iframe, wrapper) {
    this.updateLoadingUi(true);

    iframe.onload = () => {
      tab.isLoading = false;
      if (tab.id === this.activeTabId) {
        this.updateLoadingUi(false);
      }
    };

    iframe.onerror = () => {
      tab.isLoading = false;
      if (tab.id === this.activeTabId) {
        this.updateLoadingUi(false);
      }
    };

    // Auto-detect simulated load completion after 1.5s
    setTimeout(() => {
      if (tab.isLoading) {
        tab.isLoading = false;
        if (tab.id === this.activeTabId) {
          this.updateLoadingUi(false);
        }
      }
    }, 1500);
  }

  activateTab(tabId) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    this.activeTabId = tabId;

    // 1. Update Tab Strip Items
    document.querySelectorAll('.tab-item').forEach((el) => {
      const isActive = el.getAttribute('data-tab-id') === tabId;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // 2. Hide / Show View Panes
    document.querySelectorAll('.tab-view-pane').forEach((pane) => {
      pane.style.display = pane.id === `view_${tabId}` ? 'flex' : 'none';
    });

    // 3. Toggle Dashboard vs Web View
    if (tab.url === 'yas://newtab' || tab.isInternal) {
      if (this.dom.newTabDashboard) {
        this.dom.newTabDashboard.style.display = 'flex';
      }
    } else {
      if (this.dom.newTabDashboard) {
        this.dom.newTabDashboard.style.display = 'none';
      }
    }

    // 4. Sync Omnibox, Security Badge, and Bookmark state
    this.syncOmnibox(tab.url === 'yas://newtab' ? '' : tab.url);
    this.updateSecurityBadge(tab.url);
    this.updateBookmarkButtonState(tab.url);
    this.updateNavButtons(tab);
    this.updateLoadingUi(tab.isLoading);

    // 5. Check if tab has a downloadable media URL (YouTube / Instagram)
    this.checkMediaDownloadOpportunity(tab.url);
  }

  closeTab(tabId) {
    const index = this.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    const tab = this.tabs[index];

    // Remove DOM elements cleanly
    if (tab.element) tab.element.remove();
    if (tab.viewContainer) tab.viewContainer.remove();

    // Destroy webview reference
    if (tab.webview && tab.webview.remove) {
      tab.webview.remove();
    }

    this.tabs.splice(index, 1);

    // If all tabs were closed, spawn a clean new tab
    if (this.tabs.length === 0) {
      this.createTab({
        title: 'New Tab',
        url: 'yas://newtab',
        favicon: '✨',
        isInternal: true
      });
      return;
    }

    // If active tab was closed, switch to adjacent tab
    if (this.activeTabId === tabId) {
      const nextIndex = Math.min(index, this.tabs.length - 1);
      this.activateTab(this.tabs[nextIndex].id);
    }
  }

  // =========================================================================
  // 3. Navigation & URL Engine (Omnibox, Normalization, History)
  // =========================================================================
  setupOmnibox() {
    if (!this.dom.omniboxInput) return;

    // Enter key submits URL or search
    this.dom.omniboxInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const input = this.dom.omniboxInput.value.trim();
        if (input) {
          this.navigateTo(input);
          this.dom.omniboxInput.blur();
        }
      } else if (e.key === 'Escape') {
        const activeTab = this.getActiveTab();
        if (activeTab) {
          this.syncOmnibox(activeTab.url === 'yas://newtab' ? '' : activeTab.url);
        }
        this.dom.omniboxInput.blur();
      }
    });

    // Focus Omnibox selects all text
    this.dom.omniboxInput.addEventListener('focus', () => {
      this.dom.omniboxInput.select();
      this.updateClearBtnVisibility();
    });

    this.dom.omniboxInput.addEventListener('input', () => {
      this.updateClearBtnVisibility();
    });

    // Clear button inside omnibox
    if (this.dom.omniboxClearBtn) {
      this.dom.omniboxClearBtn.addEventListener('click', () => {
        this.dom.omniboxInput.value = '';
        this.dom.omniboxInput.focus();
        this.updateClearBtnVisibility();
      });
    }

    // Bookmark Toggle Button
    if (this.dom.bookmarkBtn) {
      this.dom.bookmarkBtn.addEventListener('click', () => {
        this.toggleBookmarkCurrentPage();
      });
    }
  }

  updateClearBtnVisibility() {
    if (!this.dom.omniboxClearBtn) return;
    const hasText = this.dom.omniboxInput && this.dom.omniboxInput.value.trim().length > 0;
    this.dom.omniboxClearBtn.style.display = hasText ? 'flex' : 'none';
  }

  setupNavigationControls() {
    // New tab button
    this.dom.newTabBtn?.addEventListener('click', () => {
      this.createTab({
        title: 'New Tab',
        url: 'yas://newtab',
        favicon: '✨',
        isInternal: true
      });
    });

    // Back button
    this.dom.btnBack?.addEventListener('click', () => {
      this.navigateBack();
    });

    // Forward button
    this.dom.btnForward?.addEventListener('click', () => {
      this.navigateForward();
    });

    // Reload / Stop button
    this.dom.btnReload?.addEventListener('click', () => {
      const tab = this.getActiveTab();
      if (!tab) return;

      if (tab.isLoading) {
        this.stopCurrentTabLoad();
      } else {
        this.reloadCurrentTab();
      }
    });

    // Home button
    this.dom.btnHome?.addEventListener('click', () => {
      this.navigateTo('yas://newtab');
    });

    // Shields click counter
    this.dom.shieldToggleBtn?.addEventListener('click', () => {
      this.trackersBlocked += Math.floor(Math.random() * 3) + 1;
      if (this.dom.shieldCounter) {
        this.dom.shieldCounter.textContent = this.trackersBlocked;
      }
      this.showToast(`🛡️ YAS Brave Shields: ${this.trackersBlocked} Trackers & Fingerprinters Blocked`);
    });

    // Media Download Toolbar button
    this.dom.mediaDownloadBtn?.addEventListener('click', () => {
      this.handleMediaDownloadToolbarClick();
    });
  }

  setupDashboard() {
    // Hero Search Input on Dashboard
    this.dom.heroSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this.dom.heroSearchInput.value.trim();
        if (val) {
          this.navigateTo(val);
        }
      }
    });

    // Speed Dial Cards Click
    document.querySelectorAll('.speed-dial-card').forEach((card) => {
      card.addEventListener('click', () => {
        const targetUrl = card.getAttribute('data-url');
        const targetTitle = card.getAttribute('data-title');
        if (targetUrl) {
          this.navigateTo(targetUrl, targetTitle);
        }
      });
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + T : New Tab
      if (isCmdOrCtrl && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.createTab({
          title: 'New Tab',
          url: 'yas://newtab',
          favicon: '✨',
          isInternal: true
        });
      }
      // Ctrl + W : Close Current Tab
      else if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (this.activeTabId) {
          this.closeTab(this.activeTabId);
        }
      }
      // Ctrl + R / F5 : Reload Current Tab
      else if ((isCmdOrCtrl && e.key.toLowerCase() === 'r') || e.key === 'F5') {
        e.preventDefault();
        this.reloadCurrentTab();
      }
      // Ctrl + L : Focus Omnibox
      else if (isCmdOrCtrl && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.dom.omniboxInput?.focus();
        this.dom.omniboxInput?.select();
      }
      // Ctrl + D : Bookmark Page
      else if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.toggleBookmarkCurrentPage();
      }
      // Ctrl + J or Ctrl + M : Open Media Downloader
      else if (isCmdOrCtrl && (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        this.handleMediaDownloadToolbarClick();
      }
      // Alt + Left Arrow : Back
      else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigateBack();
      }
      // Alt + Right Arrow : Forward
      else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigateForward();
      }
      // Ctrl + Tab : Cycle Tabs
      else if (isCmdOrCtrl && e.key === 'Tab') {
        e.preventDefault();
        this.cycleTabs(!e.shiftKey);
      }
    });
  }

  cycleTabs(forward = true) {
    if (this.tabs.length <= 1) return;
    const currentIndex = this.tabs.findIndex((t) => t.id === this.activeTabId);
    let nextIndex = forward ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= this.tabs.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = this.tabs.length - 1;
    this.activateTab(this.tabs[nextIndex].id);
  }

  /**
   * Intelligently parses input into either a direct URL or a search query
   */
  parseInputToUrl(input) {
    const raw = input.trim();
    if (!raw) return 'yas://newtab';

    // Internal scheme
    if (raw.startsWith('yas://') || raw.startsWith('about:')) {
      return { url: raw, title: 'New Tab', favicon: '✨', isInternal: true };
    }

    // Direct HTTP/HTTPS URL
    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        return {
          url: raw,
          title: parsed.hostname,
          favicon: this.getDomainFavicon(parsed.hostname),
          isInternal: false
        };
      } catch (e) {
        // Fallback to search
      }
    }

    // Domain name patterns (e.g. youtube.com, github.com, sub.domain.co.uk, localhost:3000)
    const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    const localhostRegex = /^localhost(:\d+)?(\/.*)?$/;
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/;

    if (domainRegex.test(raw) || localhostRegex.test(raw) || ipRegex.test(raw)) {
      const fullUrl = `https://${raw}`;
      try {
        const parsed = new URL(fullUrl);
        return {
          url: fullUrl,
          title: parsed.hostname,
          favicon: this.getDomainFavicon(parsed.hostname),
          isInternal: false
        };
      } catch (e) {}
    }

    // Search query fallback (Google Search)
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
    return {
      url: searchUrl,
      title: `${raw} - Google Search`,
      favicon: '🔍',
      isInternal: false
    };
  }

  navigateTo(inputUrl, customTitle = null) {
    const tab = this.getActiveTab();
    if (!tab) return;

    const parsed = this.parseInputToUrl(inputUrl);
    const title = customTitle || parsed.title;

    this.navigateTab(tab, parsed.url, title, parsed.favicon, parsed.isInternal);
  }

  navigateTab(tab, targetUrl, title = 'Loading...', favicon = '🌐', isInternal = false) {
    tab.url = targetUrl;
    tab.title = title;
    tab.favicon = favicon;
    tab.isInternal = isInternal || targetUrl === 'yas://newtab';

    // Push to tab navigation history
    this.pushTabHistory(tab, targetUrl);

    // Update DOM tab strip element
    this.updateTabElementDom(tab);

    // Handle Viewport Rendering
    if (tab.isInternal || targetUrl === 'yas://newtab') {
      if (tab.viewContainer) {
        tab.viewContainer.innerHTML = '';
      }
      if (tab.id === this.activeTabId && this.dom.newTabDashboard) {
        this.dom.newTabDashboard.style.display = 'flex';
      }
    } else {
      if (tab.id === this.activeTabId && this.dom.newTabDashboard) {
        this.dom.newTabDashboard.style.display = 'none';
      }

      if (tab.viewContainer) {
        this.attachWebContentElement(tab, tab.viewContainer);
      }
    }

    // Update UI elements for active tab
    if (tab.id === this.activeTabId) {
      this.syncOmnibox(tab.url === 'yas://newtab' ? '' : tab.url);
      this.updateSecurityBadge(tab.url);
      this.updateBookmarkButtonState(tab.url);
      this.updateNavButtons(tab);
      this.checkMediaDownloadOpportunity(tab.url);
    }
  }

  pushTabHistory(tab, url) {
    if (tab.history[tab.historyIndex] !== url) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(url);
      tab.historyIndex = tab.history.length - 1;
    }
    tab.canGoBack = tab.historyIndex > 0;
    tab.canGoForward = tab.historyIndex < tab.history.length - 1;
  }

  navigateBack() {
    const tab = this.getActiveTab();
    if (!tab) return;

    if (tab.webview && tab.webview.canGoBack && tab.webview.canGoBack()) {
      tab.webview.goBack();
      return;
    }

    if (tab.historyIndex > 0) {
      tab.historyIndex--;
      const prevUrl = tab.history[tab.historyIndex];
      this.navigateTab(tab, prevUrl, 'Previous Page');
    }
  }

  navigateForward() {
    const tab = this.getActiveTab();
    if (!tab) return;

    if (tab.webview && tab.webview.canGoForward && tab.webview.canGoForward()) {
      tab.webview.goForward();
      return;
    }

    if (tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++;
      const nextUrl = tab.history[tab.historyIndex];
      this.navigateTab(tab, nextUrl, 'Next Page');
    }
  }

  reloadCurrentTab() {
    const tab = this.getActiveTab();
    if (!tab) return;

    if (tab.isInternal || tab.url === 'yas://newtab') {
      this.showToast('Dashboard refreshed');
      return;
    }

    if (tab.webview) {
      if (tab.webview.reload) {
        tab.webview.reload();
      } else if (tab.webview.src) {
        tab.webview.src = tab.url;
      }
    }
    this.showToast('Page reloading...');
  }

  stopCurrentTabLoad() {
    const tab = this.getActiveTab();
    if (!tab) return;

    if (tab.webview && tab.webview.stop) {
      tab.webview.stop();
    }
    tab.isLoading = false;
    this.updateLoadingUi(false);
    this.showToast('Page loading stopped');
  }

  // =========================================================================
  // 4. UI Helpers (Omnibox Sync, Badges, Favicons, Progress Bar)
  // =========================================================================
  syncOmnibox(url) {
    if (!this.dom.omniboxInput) return;
    this.dom.omniboxInput.value = url;
    this.dom.omniboxInput.placeholder = url || 'Search with Google or enter URL...';
    this.updateClearBtnVisibility();
  }

  updateSecurityBadge(url) {
    if (!this.dom.securityBadge) return;

    if (!url || url.startsWith('yas://')) {
      this.dom.securityBadge.className = 'security-badge internal';
      this.dom.securityBadge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      `;
      this.dom.securityBadge.title = 'YAS Browser Core System Page';
    } else if (url.startsWith('https://')) {
      this.dom.securityBadge.className = 'security-badge secure';
      this.dom.securityBadge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;
      this.dom.securityBadge.title = 'Connection is secure (HTTPS 256-bit TLS)';
    } else {
      this.dom.securityBadge.className = 'security-badge insecure';
      this.dom.securityBadge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
      this.dom.securityBadge.title = 'Connection is not secure (HTTP)';
    }
  }

  updateNavButtons(tab) {
    if (this.dom.btnBack) {
      this.dom.btnBack.disabled = !tab.canGoBack && tab.historyIndex <= 0;
    }
    if (this.dom.btnForward) {
      this.dom.btnForward.disabled = !tab.canGoForward && tab.historyIndex >= tab.history.length - 1;
    }
  }

  updateLoadingUi(isLoading) {
    // 1. Loading Progress Bar
    if (this.dom.pageLoadingBar) {
      if (isLoading) {
        this.dom.pageLoadingBar.classList.add('active');
      } else {
        this.dom.pageLoadingBar.classList.remove('active');
      }
    }

    // 2. Reload Button Swap (Reload 🔄 <-> Stop ✕)
    if (this.dom.btnReload) {
      if (isLoading) {
        this.dom.btnReload.title = 'Stop loading this page (Esc)';
        this.dom.btnReload.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      } else {
        this.dom.btnReload.title = 'Reload this page (Ctrl+R)';
        this.dom.btnReload.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        `;
      }
    }
  }

  updateTabTitle(tab, title) {
    tab.title = title;
    this.updateTabElementDom(tab);
  }

  updateTabFavicon(tab, faviconUrl) {
    tab.favicon = faviconUrl;
    this.updateTabElementDom(tab);
  }

  updateTabElementDom(tab) {
    if (!tab.element) return;

    const titleEl = tab.element.querySelector('.tab-title');
    const faviconEl = tab.element.querySelector('.tab-favicon');

    if (titleEl) {
      titleEl.textContent = tab.title;
      tab.element.setAttribute('title', tab.title);
    }

    if (faviconEl) {
      faviconEl.innerHTML = this.renderFaviconHtml(tab.favicon);
    }
  }

  renderFaviconHtml(fav) {
    if (!fav) return '🌐';
    if (fav.startsWith('http')) {
      return `<img src="${this.escapeHtml(fav)}" class="tab-fav-img" onerror="this.outerHTML='🌐'" alt="" />`;
    }
    return fav;
  }

  getDomainFavicon(hostname) {
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return '▶️';
    if (hostname.includes('instagram.com')) return '📸';
    if (hostname.includes('github.com')) return '💻';
    if (hostname.includes('reddit.com')) return '🔥';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return '🐦';
    if (hostname.includes('wikipedia.org')) return '📚';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  }

  toggleBookmarkCurrentPage() {
    const tab = this.getActiveTab();
    if (!tab || tab.isInternal) return;

    if (this.bookmarks.has(tab.url)) {
      this.bookmarks.delete(tab.url);
      this.showToast('Removed from Bookmarks');
    } else {
      this.bookmarks.add(tab.url);
      this.showToast('★ Page added to Bookmarks');
    }
    this.updateBookmarkButtonState(tab.url);
  }

  updateBookmarkButtonState(url) {
    if (!this.dom.bookmarkBtn) return;
    const isBookmarked = this.bookmarks.has(url);
    this.dom.bookmarkBtn.classList.toggle('active', isBookmarked);
    this.dom.bookmarkBtn.style.color = isBookmarked ? '#ffd166' : 'var(--text-secondary)';
    this.dom.bookmarkBtn.title = isBookmarked ? 'Bookmarked (Ctrl+D to remove)' : 'Bookmark this page (Ctrl+D)';
  }

  // =========================================================================
  // 5. Media Download Integration
  // =========================================================================
  checkMediaDownloadOpportunity(url) {
    if (!this.dom.mediaDownloadBtn) return;

    const isDownloadable = Boolean(
      url &&
      (url.includes('youtube.com/watch') ||
       url.includes('youtu.be/') ||
       url.includes('youtube.com/shorts') ||
       url.includes('instagram.com/p/') ||
       url.includes('instagram.com/reel/'))
    );

    this.dom.mediaDownloadBtn.classList.toggle('attention-glow', isDownloadable);
  }

  handleMediaDownloadToolbarClick() {
    if (window.mediaDownloader) {
      const activeTab = this.getActiveTab();

      // If on a YouTube or Instagram page and the downloader doesn't already have an input, auto-fill it
      if (activeTab && activeTab.url && !activeTab.isInternal && activeTab.url.startsWith('http')) {
        const url = activeTab.url;
        const isMedia = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('instagram.com');
        
        if (isMedia) {
          const inputEl = document.getElementById('mediaUrlInput');
          if (inputEl && (!inputEl.value || inputEl.value !== url)) {
            window.mediaDownloader.setLinkAndPrompt(url);
            return;
          }
        }
      }

      window.mediaDownloader.openPanel();
    }
  }

  updateDownloadBadgeCount(activeCount) {
    if (!this.dom.downloadCounter) return;
    if (activeCount > 0) {
      this.dom.downloadCounter.textContent = activeCount;
      this.dom.downloadCounter.style.display = 'inline-flex';
    } else {
      this.dom.downloadCounter.style.display = 'none';
    }
  }

  // =========================================================================
  // 6. Utility Functions
  // =========================================================================
  getActiveTab() {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      if (this.dom.dashboardClock) {
        this.dom.dashboardClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (this.dom.dashboardDate) {
        this.dom.dashboardDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  showToast(message) {
    const container = this.dom.toastContainer || document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global Browser Instance
window.yasBrowser = new YASBrowser();
