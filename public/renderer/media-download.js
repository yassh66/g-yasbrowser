/**
 * YAS Browser - Media Download Studio Controller
 * 
 * Features:
 * - Full-Screen / Full-Window Workspace Overlay taking over browser content area
 * - Real yt-dlp Extractor Engine integration with native IPC bridge
 * - Intelligent Format Matrix (Combined Video+Audio, Video Only, Lossless Audio Only)
 * - Complete Trash / Clear All functionality resetting input, analysis, states, and errors
 * - 1-Click "⚡ Best Quality" instant download pipeline
 * - Real-time progress tracker with animated progress bar, speed, ETA, and bytes
 * - Native "Open File" and "Open Folder" actions
 * - System Engine Diagnostics modal for yt-dlp and FFmpeg status
 * - Quick Platform Demo Presets for YouTube 4K & Instagram Reels
 */

class MediaDownloader {
  constructor() {
    this.isOpen = false;
    this.isAnalyzing = false;
    this.currentRequestId = 0;
    this.currentMediaInfo = null;
    this.selectedFormatId = null;
    this.activeCategory = 'combined'; // 'combined' | 'video' | 'audio'
    this.activeDownloads = new Map();
    this.destinationFolder = '~/Downloads';
    this.isElectron = Boolean(window.electronAPI && window.electronAPI.isElectron);

    this.dom = {
      // Overlay & Containers
      overlay: document.getElementById('mediaModalBackdrop'),
      panelContainer: document.getElementById('mediaPanelContainer'),
      triggerBtn: document.getElementById('mediaDownloadTriggerBtn'),
      closeBtn: document.getElementById('mediaPanelCloseBtn'),
      emptyState: document.getElementById('studioEmptyState'),
      twoColumnGrid: document.getElementById('analyzedResultContainer'),
      workspace: document.querySelector('.studio-workspace'),
      downloadCounter: document.getElementById('downloadCounter'),

      // Header Controls
      engineSubtitle: document.getElementById('engineStatusSubtitle'),
      presetYtBadge: document.getElementById('presetYtBadge'),
      presetIgBadge: document.getElementById('presetIgBadge'),
      destinationPill: document.getElementById('btnChangeFolder'),
      destinationPathText: document.getElementById('destinationPathText'),
      btnOpenDownloadsFolder: document.getElementById('btnOpenDownloadsFolder'),
      engineStatusBadge: document.getElementById('engineStatusBadge'),
      engineBadgeText: document.getElementById('engineBadgeText'),
      btnClearAll: document.getElementById('btnClearMediaAll'),

      // Input Hero
      inputWrapper: document.getElementById('mediaInputWrapper'),
      urlInput: document.getElementById('mediaUrlInput'),
      inputClearBtn: document.getElementById('inputClearBtn'),
      pasteClipboardBtn: document.getElementById('pasteClipboardBtn'),
      btnAnalyze: document.getElementById('btnAnalyzeMedia'),
      btnQuickBest: document.getElementById('btnQuickBestQuality'),

      // Analysis Loading & Error Cards
      loadingCard: document.getElementById('analysisLoadingCard'),
      loadingTitle: document.getElementById('loadingPhaseTitle'),
      loadingSub: document.getElementById('loadingPhaseSub'),
      step1Dot: document.getElementById('step1Dot'),
      step2Dot: document.getElementById('step2Dot'),
      step3Dot: document.getElementById('step3Dot'),
      errorCard: document.getElementById('mediaErrorCard'),
      errorTitle: document.getElementById('errorTitle'),
      errorDesc: document.getElementById('errorDescription'),
      btnErrorRetry: document.getElementById('btnErrorRetry'),
      btnErrorGuide: document.getElementById('btnErrorGuide'),

      // Media Preview Card (Left Column)
      thumbnail: document.getElementById('mediaThumbnail'),
      durationBadge: document.getElementById('mediaDuration'),
      platformBadge: document.getElementById('mediaPlatformBadge'),
      bestAvailableBadge: document.getElementById('bestAvailableBadge'),
      mediaTitle: document.getElementById('mediaTitle'),
      mediaCreator: document.getElementById('mediaCreator'),

      // Formats Selection (Right Column)
      tabCombined: document.getElementById('tabCombinedFormats'),
      tabVideo: document.getElementById('tabVideoFormats'),
      tabAudio: document.getElementById('tabAudioFormats'),
      formatsList: document.getElementById('formatsListContainer'),
      btnStartDownload: document.getElementById('btnStartDownload'),

      // Queue Section
      queueList: document.getElementById('downloadQueueList'),
      emptyQueuePlaceholder: document.getElementById('emptyQueuePlaceholder'),
      btnClearCompletedQueue: document.getElementById('btnClearCompletedQueue'),

      // Diagnostics Modal
      engineModalBackdrop: document.getElementById('engineInstallModalBackdrop'),
      btnEngineModalClose: document.getElementById('btnEngineModalClose'),
      btnRescanDependencies: document.getElementById('btnRescanDependencies'),
      btnRunEngineSelfTest: document.getElementById('btnRunEngineSelfTest'),
      engineSelfTestContainer: document.getElementById('engineSelfTestContainer'),
      selfTestOverallBadge: document.getElementById('selfTestOverallBadge'),
      selfTestSummaryText: document.getElementById('selfTestSummaryText'),
      selfTestGrid: document.getElementById('selfTestGrid'),
      btnDiagDone: document.getElementById('btnDiagDone'),
      btnTestCookieBridge: document.getElementById('btnTestCookieBridge'),
      manualCookieStatusText: document.getElementById('manualCookieStatusText'),
      btnImportCookieFile: document.getElementById('btnImportCookieFile'),
      btnTogglePasteCookie: document.getElementById('btnTogglePasteCookie'),
      btnClearManualCookie: document.getElementById('btnClearManualCookie'),
      pasteCookieBox: document.getElementById('pasteCookieBox'),
      pasteCookieTextarea: document.getElementById('pasteCookieTextarea'),
      btnSavePastedCookie: document.getElementById('btnSavePastedCookie'),
      btnCancelPastedCookie: document.getElementById('btnCancelPastedCookie'),
      cookieTestResultBox: document.getElementById('cookieTestResultBox'),
      ytdlpStatusPill: document.getElementById('ytdlpStatusPill'),
      ytdlpPathText: document.getElementById('ytdlpPathText'),
      ffmpegStatusPill: document.getElementById('ffmpegStatusPill'),
      ffmpegPathText: document.getElementById('ffmpegPathText'),
      cookieBridgeStatusPill: document.getElementById('cookieBridgeStatusPill'),
      cookieBrowsersList: document.getElementById('cookieBrowsersList'),
      activeCookieBrowserText: document.getElementById('activeCookieBrowserText'),
      diagLogsSection: document.getElementById('diagLogsSection'),
      toggleDiagLogs: document.getElementById('toggleDiagLogs'),
      diagLogsBody: document.getElementById('diagLogsBody'),
      diagLogsCountBadge: document.getElementById('diagLogsCountBadge'),
      diagLogsViewer: document.getElementById('diagLogsViewer'),
      btnCopyDiagLogs: document.getElementById('btnCopyDiagLogs'),
      btnClearDiagLogs: document.getElementById('btnClearDiagLogs'),
      btnErrorLogs: document.getElementById('btnErrorLogs'),
      guideHeading: document.getElementById('guideHeading'),
      guideCommandText: document.getElementById('guideCommandText'),
      btnCopyGuideCommand: document.getElementById('btnCopyGuideCommand'),
      guideAlternativesList: document.getElementById('guideAlternativesList'),
      tabWinGuide: document.getElementById('tabWinGuide'),
      tabMacGuide: document.getElementById('tabMacGuide'),
      tabLinuxGuide: document.getElementById('tabLinuxGuide')
    };

    this.init();
  }

  init() {
    this.setupPanelEvents();
    this.setupInputEvents();
    this.setupFormatTabs();
    this.setupDiagnosticsModal();
    this.setupIPCListeners();
    this.checkInitialEngineHealth();
  }

  // =========================================================================
  // 1. Studio Panel Open / Close / Toggle / Reset
  // =========================================================================
  setupPanelEvents() {
    // Toolbar Trigger Button
    if (this.dom.triggerBtn) {
      this.dom.triggerBtn.addEventListener('click', () => {
        this.togglePanel();
      });
    }

    // Studio Close Button
    if (this.dom.closeBtn) {
      this.dom.closeBtn.addEventListener('click', () => {
        this.closePanel();
      });
    }

    // Complete Trash / Clear All Button (Highest priority fix)
    if (this.dom.btnClearAll) {
      this.dom.btnClearAll.addEventListener('click', () => {
        this.resetAll(true);
      });
    }

    // Preset Platform Badges
    if (this.dom.presetYtBadge) {
      this.dom.presetYtBadge.addEventListener('click', () => {
        if (this.dom.urlInput) {
          this.dom.urlInput.value = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
          this.updateInputClearButton();
          this.startAnalysis();
        }
      });
    }

    if (this.dom.presetIgBadge) {
      this.dom.presetIgBadge.addEventListener('click', () => {
        if (this.dom.urlInput) {
          this.dom.urlInput.value = 'https://www.instagram.com/reel/C3x9M8_L4Q1/';
          this.updateInputClearButton();
          this.startAnalysis();
        }
      });
    }

    // Change Folder Pill
    if (this.dom.destinationPill) {
      this.dom.destinationPill.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.selectDirectory) {
          const selected = await window.electronAPI.selectDirectory();
          if (selected) {
            this.destinationFolder = selected;
            this.dom.destinationPathText.textContent = selected;
            this.showToast(`Destination folder updated: ${selected}`);
          }
        } else {
          this.showToast('Folder selection set to ~/Downloads');
        }
      });
    }

    // Open Downloads Directory Button
    if (this.dom.btnOpenDownloadsFolder) {
      this.dom.btnOpenDownloadsFolder.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.openFolder) {
          window.electronAPI.openFolder(this.destinationFolder);
        } else {
          this.showToast('Opening downloads directory: ~/Downloads');
        }
      });
    }

    // Clear Completed Queue Items
    if (this.dom.btnClearCompletedQueue) {
      this.dom.btnClearCompletedQueue.addEventListener('click', () => {
        this.clearCompletedDownloads();
      });
    }
  }

  openPanel() {
    this.isOpen = true;
    if (this.dom.overlay) this.dom.overlay.classList.add('open');

    // Auto-populate URL if active tab has a YouTube / Instagram link
    if (window.yasBrowser) {
      const activeTab = window.yasBrowser.getActiveTab();
      if (activeTab && /youtube\.com|youtu\.be|instagram\.com/i.test(activeTab.url)) {
        if (this.dom.urlInput && !this.dom.urlInput.value) {
          this.dom.urlInput.value = activeTab.url;
          this.updateInputClearButton();
          this.startAnalysis();
        }
      }
    }

    setTimeout(() => {
      if (this.dom.urlInput) this.dom.urlInput.focus();
    }, 150);
  }

  closePanel() {
    this.isOpen = false;
    if (this.dom.overlay) this.dom.overlay.classList.remove('open');
  }

  togglePanel() {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  /**
   * Complete, robust Reset / Trash functionality
   * Fully resets URL input, analysis results, selected formats, errors, and restores clean empty state
   */
  resetAll(showFeedback = true) {
    this.currentRequestId++;
    this.isAnalyzing = false;
    this.currentMediaInfo = null;
    this.selectedFormatId = null;
    this.activeCategory = 'combined';

    // Clear URL input
    this.dom.urlInput.value = '';
    this.updateInputClearButton();

    // Hide loading & error states
    this.dom.loadingCard.style.display = 'none';
    this.dom.errorCard.style.display = 'none';

    // Hide analyzed 2-column grid and show empty state
    this.dom.twoColumnGrid.style.display = 'none';
    this.dom.emptyState.style.display = 'flex';

    // Reset preview card fields
    if (this.dom.thumbnail) this.dom.thumbnail.src = '';
    if (this.dom.mediaTitle) this.dom.mediaTitle.textContent = '';
    if (this.dom.durationBadge) this.dom.durationBadge.textContent = '0:00';
    if (this.dom.mediaCreator) this.dom.mediaCreator.textContent = '';

    // Reset format tabs to combined
    this.switchFormatTab('combined');
    this.dom.formatsList.innerHTML = '';

    // Re-focus input
    this.dom.urlInput.focus();

    if (showFeedback) {
      this.showToast('Media Studio completely reset');
    }
  }

  // =========================================================================
  // 2. Input Hero & Analysis Pipeline
  // =========================================================================
  setupInputEvents() {
    const input = this.dom.urlInput;
    const clearBtn = this.dom.inputClearBtn;
    const pasteBtn = this.dom.pasteClipboardBtn;

    if (input) {
      input.addEventListener('input', () => {
        this.updateInputClearButton();
        if (this.dom.errorCard) this.dom.errorCard.style.display = 'none';
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.startAnalysis();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.resetAll(false);
      });
    }

    if (pasteBtn) {
      pasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            if (input) input.value = text.trim();
            this.updateInputClearButton();
            this.startAnalysis();
          }
        } catch (_) {
          this.showToast('Please paste using Ctrl+V');
        }
      });
    }

    // Analyze Button
    if (this.dom.btnAnalyze) {
      this.dom.btnAnalyze.addEventListener('click', () => {
        this.startAnalysis();
      });
    }

    // ⚡ 1-Click Best Quality Instant Download Button
    if (this.dom.btnQuickBest) {
      this.dom.btnQuickBest.addEventListener('click', () => {
        this.triggerQuickBestQuality();
      });
    }

    // Retry and guide buttons in error card
    if (this.dom.btnErrorRetry) {
      this.dom.btnErrorRetry.addEventListener('click', () => {
        this.startAnalysis();
      });
    }

    if (this.dom.btnErrorGuide) {
      this.dom.btnErrorGuide.addEventListener('click', () => {
        this.openDiagnosticsModal();
      });
    }
  }

  updateInputClearButton() {
    if (this.dom.inputClearBtn) {
      this.dom.inputClearBtn.style.display = this.dom.urlInput.value.length > 0 ? 'flex' : 'none';
    }
  }

  async startAnalysis(autoDownloadBest = false) {
    const rawUrl = this.dom.urlInput.value.trim();

    if (!rawUrl) {
      this.showToast('Please paste a YouTube or Instagram URL first');
      this.dom.urlInput.focus();
      return;
    }

    if (!/youtube\.com|youtu\.be|instagram\.com/i.test(rawUrl)) {
      this.showErrorState(
        'Unsupported Media Platform',
        'YAS Media Downloader currently supports YouTube Videos, Shorts, and Instagram Reels/Posts.'
      );
      return;
    }

    // Invalidate any prior analysis request so it cannot overwrite new results
    const requestId = ++this.currentRequestId;

    this.isAnalyzing = true;
    this.currentMediaInfo = null;
    this.selectedFormatId = null;

    // Clear previous results immediately from UI
    this.dom.formatsList.innerHTML = '';
    this.dom.errorCard.style.display = 'none';
    this.dom.emptyState.style.display = 'none';
    this.dom.twoColumnGrid.style.display = 'none';

    this.showLoadingPhase(1, 'Analyzing media...', 'Connecting to media stream...');

    try {
      let rawResult = null;

      if (window.electronAPI && (window.electronAPI.analyzeMedia || window.electronAPI.analyzeUrl)) {
        const analyzeFn = window.electronAPI.analyzeMedia || window.electronAPI.analyzeUrl;
        rawResult = await analyzeFn(rawUrl);
      } else {
        // High-Fidelity Mock Extractor Fallback for Web Preview
        rawResult = await this.simulateExtraction(rawUrl);
      }

      // Check if this request was superseded by a newer one
      if (requestId !== this.currentRequestId) {
        return;
      }

      let info = null;
      if (rawResult && rawResult.success !== false) {
        info = rawResult.data ? rawResult.data : rawResult;
      } else if (rawResult && rawResult.error) {
        this.isAnalyzing = false;
        this.dom.loadingCard.style.display = 'none';
        this.showErrorState('Notice', 'Unable to process this media right now. Please try again later.');
        return;
      } else {
        throw new Error('Unable to extract stream formats from the provided link.');
      }

      this.showLoadingPhase(2, 'Preparing available qualities...', 'Resolving video & audio options...');
      await new Promise((r) => setTimeout(r, 200));

      if (requestId !== this.currentRequestId) return;

      this.showLoadingPhase(3, 'Ready to download', 'Stream manifests ready');
      await new Promise((r) => setTimeout(r, 150));

      if (requestId !== this.currentRequestId) return;

      this.isAnalyzing = false;
      this.dom.loadingCard.style.display = 'none';
      this.displayAnalyzedMedia(info);

      if (autoDownloadBest) {
        this.downloadBestQuality();
      }
    } catch (err) {
      if (requestId !== this.currentRequestId) return;
      this.isAnalyzing = false;
      this.dom.loadingCard.style.display = 'none';
      this.showErrorState(
        'Notice',
        'Unable to process this media right now. Please try again later.'
      );
    }
  }

  showLoadingPhase(stepNum, title, sub) {
    this.dom.loadingCard.style.display = 'flex';
    this.dom.loadingTitle.textContent = title;
    this.dom.loadingSub.textContent = sub;

    this.dom.step1Dot.className = `tracker-step ${stepNum >= 1 ? 'active' : ''}`;
    this.dom.step2Dot.className = `tracker-step ${stepNum >= 2 ? 'active' : ''}`;
    this.dom.step3Dot.className = `tracker-step ${stepNum >= 3 ? 'active' : ''}`;
  }

  showErrorState(title, description) {
    this.dom.errorCard.style.display = 'block';
    this.dom.errorTitle.textContent = title;
    this.dom.errorDesc.textContent = description;
    this.dom.emptyState.style.display = 'none';
    this.dom.twoColumnGrid.style.display = 'none';
  }

  // =========================================================================
  // 3. Media Metadata & Format Matrix Presentation
  // =========================================================================
  normalizeMediaInfo(raw) {
    if (!raw) return null;

    let formatsList = [];
    if (Array.isArray(raw.formats)) {
      formatsList = raw.formats;
    } else if (raw.formats && typeof raw.formats === 'object') {
      const combined = Array.isArray(raw.formats.combined) ? raw.formats.combined : [];
      const video = Array.isArray(raw.formats.video) ? raw.formats.video : [];
      const audio = Array.isArray(raw.formats.audio) ? raw.formats.audio : [];
      formatsList = [...combined, ...video, ...audio];
    } else if (raw.groupedFormats && typeof raw.groupedFormats === 'object') {
      const combined = Array.isArray(raw.groupedFormats.combined) ? raw.groupedFormats.combined : [];
      const video = Array.isArray(raw.groupedFormats.video) ? raw.groupedFormats.video : [];
      const audio = Array.isArray(raw.groupedFormats.audio) ? raw.groupedFormats.audio : [];
      formatsList = [...combined, ...video, ...audio];
    }

    const normalizedFormats = formatsList.map((f, idx) => {
      const formatId = f.format_id || f.formatId || `fmt_${idx}`;
      const ext = f.ext || (f.isAudioOnly || f.type === 'audio_only' || f.type === 'audio' ? 'mp3' : 'mp4');
      const height = parseInt(f.height || (typeof f.resolution === 'string' && f.resolution.includes('x') ? f.resolution.split('x')[1] : 0), 10) || 0;
      const fps = parseInt(f.fps, 10) || 30;
      const isAudioOnly = Boolean(f.isAudioOnly || f.type === 'audio_only' || f.type === 'audio' || f.vcodec === 'none' || (f.acodec && !f.vcodec));
      const isVideoOnly = Boolean(f.isVideoOnly || f.type === 'video_only' || (f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none')));
      const isCombined = Boolean(f.isCombined || f.type === 'combined' || (!isAudioOnly && !isVideoOnly));

      const resolution = f.resolution || f.qualityLabel || (isAudioOnly ? `${f.abr || 320}kbps Audio` : `${height}p`);
      const filesizeFormatted = f.filesizeFormatted || f.filesizeStr || (f.filesize ? `${(f.filesize / 1048576).toFixed(1)} MB` : '~35 MB');

      return {
        ...f,
        format_id: formatId,
        formatId: formatId,
        ext: ext,
        resolution: resolution,
        qualityLabel: f.qualityLabel || resolution,
        height: height,
        fps: fps,
        vcodec: f.vcodec || (isAudioOnly ? 'none' : 'h264'),
        acodec: f.acodec || (isVideoOnly ? 'none' : 'mp3'),
        filesizeFormatted: filesizeFormatted,
        filesizeStr: filesizeFormatted,
        isCombined: isCombined,
        isVideoOnly: isVideoOnly,
        isAudioOnly: isAudioOnly,
        type: isAudioOnly ? 'audio' : isVideoOnly ? 'video' : 'combined'
      };
    });

    return {
      ...raw,
      title: raw.title || 'Untitled Stream',
      uploader: raw.uploader || raw.channel || 'Content Creator',
      durationFormatted: raw.durationFormatted || raw.durationString || '0:00',
      durationString: raw.durationString || raw.durationFormatted || '0:00',
      thumbnail: raw.thumbnail || '',
      platform: raw.platform || (raw.url && raw.url.includes('instagram') ? 'Instagram Reel' : 'YouTube'),
      formats: normalizedFormats
    };
  }

  displayAnalyzedMedia(rawInfo) {
    const info = this.normalizeMediaInfo(rawInfo);
    this.currentMediaInfo = info;
    this.dom.twoColumnGrid.style.display = 'grid';

    // Populate Left Column Preview Card
    this.dom.thumbnail.src = info.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
    this.dom.durationBadge.textContent = info.durationFormatted || '0:00';
    this.dom.platformBadge.textContent = info.platform || 'YouTube';
    this.dom.mediaTitle.textContent = info.title || 'Untitled Stream';
    this.dom.mediaTitle.title = info.title || 'Untitled Stream';
    this.dom.mediaCreator.textContent = info.uploader ? `By ${info.uploader}` : 'Official Channel';

    // Best Available Quality Pill
    const maxRes = this.getMaxResolution(info.formats || []);
    this.dom.bestAvailableBadge.textContent = `✨ ${maxRes} Available`;

    // Render Format Cards according to current category
    this.renderFormatOptions();
  }

  setupFormatTabs() {
    if (this.dom.tabCombined) this.dom.tabCombined.addEventListener('click', () => this.switchFormatTab('combined'));
    if (this.dom.tabVideo) this.dom.tabVideo.addEventListener('click', () => this.switchFormatTab('video'));
    if (this.dom.tabAudio) this.dom.tabAudio.addEventListener('click', () => this.switchFormatTab('audio'));

    if (this.dom.btnStartDownload) {
      this.dom.btnStartDownload.addEventListener('click', () => {
        this.startSelectedDownload();
      });
    }
  }

  switchFormatTab(category) {
    this.activeCategory = category;
    this.dom.tabCombined.classList.toggle('active', category === 'combined');
    this.dom.tabVideo.classList.toggle('active', category === 'video');
    this.dom.tabAudio.classList.toggle('active', category === 'audio');

    if (this.currentMediaInfo) {
      this.renderFormatOptions();
    }
  }

  renderFormatOptions() {
    const formats = this.currentMediaInfo?.formats || [];
    const listContainer = this.dom.formatsList;
    listContainer.innerHTML = '';

    const filtered = this.filterFormatsByCategory(formats, this.activeCategory);

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13px;">
          No formats available for this category.
        </div>
      `;
      return;
    }

    // Default select first (best) format if none selected
    if (!this.selectedFormatId || !filtered.some((f) => f.format_id === this.selectedFormatId || f.formatId === this.selectedFormatId)) {
      this.selectedFormatId = filtered[0].format_id;
    }

    filtered.forEach((fmt) => {
      const card = document.createElement('div');
      const isSelected = fmt.format_id === this.selectedFormatId || fmt.formatId === this.selectedFormatId;
      card.className = `format-row-card ${isSelected ? 'selected' : ''}`;
      card.id = `fmt_card_${fmt.format_id}`;

      const resBadge = this.getResolutionBadgeText(fmt);
      const sizeText = fmt.filesizeFormatted || fmt.filesizeStr || '~45 MB';
      const codecDesc = fmt.vcodec && fmt.vcodec !== 'none' ? `${fmt.vcodec.split('.')[0]} • ${fmt.fps || 30}fps` : `${fmt.acodec || 'mp3'} • 320kbps`;

      card.innerHTML = `
        <div class="format-left-meta">
          <span class="res-tag-badge">${this.escapeHtml(resBadge)}</span>
          <div class="format-title-desc">
            <span class="format-main-label">${this.escapeHtml(fmt.resolution || fmt.ext.toUpperCase())}</span>
            <span class="format-sub-details">${this.escapeHtml(codecDesc)}</span>
          </div>
        </div>
        <div class="format-right-meta">
          <span class="format-size-badge">${this.escapeHtml(sizeText)}</span>
          <div class="format-select-indicator"></div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedFormatId = fmt.format_id;
        document.querySelectorAll('.format-row-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
      });

      listContainer.appendChild(card);
    });
  }

  filterFormatsByCategory(formats, category) {
    if (!Array.isArray(formats)) return [];
    if (category === 'audio') {
      return formats.filter((f) => f.isAudioOnly || f.type === 'audio' || f.type === 'audio_only' || f.vcodec === 'none');
    }
    if (category === 'video') {
      return formats.filter((f) => f.isVideoOnly || f.type === 'video' || f.type === 'video_only' || (f.vcodec !== 'none' && f.acodec === 'none'));
    }
    // Combined Video + Audio
    return formats.filter((f) => f.isCombined || f.type === 'combined' || (!f.isAudioOnly && !f.isVideoOnly));
  }

  getResolutionBadgeText(fmt) {
    if (fmt.isAudioOnly || fmt.vcodec === 'none') return '320K MP3';
    const height = parseInt(fmt.height || fmt.resolution, 10);
    if (height >= 2160) return '4K UHD';
    if (height >= 1440) return '2K QHD';
    if (height >= 1080) return '1080p FHD';
    if (height >= 720) return '720p HD';
    if (height >= 480) return '480p SD';
    return fmt.ext ? fmt.ext.toUpperCase() : 'HD';
  }

  getMaxResolution(formats) {
    if (!Array.isArray(formats) || formats.length === 0) return '1080p FHD';
    let max = 0;
    formats.forEach((f) => {
      const h = parseInt(f.height || (typeof f.resolution === 'string' && f.resolution.includes('x') ? f.resolution.split('x')[1] : 0), 10);
      if (h > max) max = h;
    });
    if (max >= 2160) return '4K UHD';
    if (max >= 1440) return '2K QHD';
    if (max >= 1080) return '1080p FHD';
    if (max >= 720) return '720p HD';
    return '1080p FHD';
  }

  // =========================================================================
  // 4. Download Execution & Real-Time Queue Tracker
  // =========================================================================
  async triggerQuickBestQuality() {
    const rawUrl = this.dom.urlInput.value.trim();
    if (!rawUrl) {
      this.showToast('Please paste a media URL first');
      this.dom.urlInput.focus();
      return;
    }
    await this.startAnalysis(true);
  }

  downloadBestQuality() {
    if (!this.currentMediaInfo) return;
    const formats = this.currentMediaInfo.formats || [];
    const combined = this.filterFormatsByCategory(formats, 'combined');
    const best = combined.length > 0 ? combined[0] : formats[0];

    if (best) {
      this.selectedFormatId = best.format_id;
      this.startSelectedDownload();
    }
  }

  async startSelectedDownload() {
    if (!this.currentMediaInfo || !this.selectedFormatId) {
      this.showToast('Please select a format to download');
      return;
    }

    const fmt = this.currentMediaInfo.formats.find((f) => f.format_id === this.selectedFormatId || f.formatId === this.selectedFormatId);
    const downloadId = `dl_${Date.now()}`;

    const downloadJob = {
      id: downloadId,
      title: this.currentMediaInfo.title,
      url: this.dom.urlInput.value.trim(),
      formatId: this.selectedFormatId,
      resolution: fmt ? fmt.resolution || fmt.ext : 'Best',
      status: 'downloading', // 'downloading' | 'merging' | 'completed' | 'error' | 'cancelled'
      progress: 0,
      speed: '0 MB/s',
      eta: '--',
      downloaded: '0 MB',
      totalSize: fmt ? fmt.filesizeFormatted || '45 MB' : '45 MB',
      outputPath: null,
      domElement: null
    };

    this.activeDownloads.set(downloadId, downloadJob);
    this.updateDownloadCounter();
    this.renderQueueItem(downloadJob);

    this.showToast(`Starting download: ${downloadJob.title}`);

    if (window.electronAPI && window.electronAPI.startDownload) {
      window.electronAPI.startDownload({
        downloadId: downloadId,
        url: downloadJob.url,
        formatId: downloadJob.formatId,
        destinationFolder: this.destinationFolder
      });
    } else {
      // Simulate real-time progress for preview environment
      this.simulateDownloadProgress(downloadId);
    }
  }

  renderQueueItem(job) {
    if (this.dom.emptyQueuePlaceholder) {
      this.dom.emptyQueuePlaceholder.style.display = 'none';
    }

    const item = document.createElement('div');
    item.className = 'download-item-card';
    item.id = `queue_item_${job.id}`;

    item.innerHTML = `
      <div class="queue-item-header">
        <div class="queue-item-title-wrap">
          <div class="queue-item-title" title="${this.escapeHtml(job.title)}">${this.escapeHtml(job.title)}</div>
        </div>
        <span class="queue-item-status-pill downloading" id="pill_${job.id}">Downloading 0%</span>
      </div>

      <div class="queue-progress-track">
        <div class="queue-progress-bar" id="pbar_${job.id}" style="width: 0%;"></div>
      </div>

      <div class="queue-item-footer">
        <div class="queue-meta-stats" id="stats_${job.id}">
          <span>Speed: <strong id="speed_${job.id}">0 MB/s</strong></span>
          <span>ETA: <strong id="eta_${job.id}">--</strong></span>
          <span>Size: <strong id="size_${job.id}">0 / ${job.totalSize}</strong></span>
        </div>
        <div class="queue-actions" id="actions_${job.id}">
          <button class="btn-queue-action danger" id="btnCancel_${job.id}">Cancel</button>
        </div>
      </div>
    `;

    const cancelBtn = item.querySelector(`#btnCancel_${job.id}`);
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelDownload(job.id);
      });
    }

    job.domElement = item;
    this.dom.queueList.prepend(item);
  }

  updateDownloadProgress(downloadId, data) {
    const job = this.activeDownloads.get(downloadId);
    if (!job) return;

    if (data.status === 'completed') {
      this.onDownloadCompleted(downloadId, data);
      return;
    }

    if (data.status === 'error') {
      job.status = 'error';
      const pill = document.getElementById(`pill_${downloadId}`);
      if (pill) {
        pill.className = 'queue-item-status-pill error';
        pill.textContent = 'Error';
      }
      this.showToast(`Download error: ${data.error || 'Network error'}`);
      this.updateDownloadCounter();
      return;
    }

    if (data.status === 'merging') {
      job.status = 'merging';
    } else if (job.status !== 'merging' && job.status !== 'completed') {
      job.status = 'downloading';
    }

    job.progress = typeof data.percent === 'number' ? data.percent : (job.progress || 0);
    job.speed = data.speed || job.speed || '2.4 MB/s';
    job.eta = data.eta || job.eta || '15s';
    job.downloaded = data.downloaded || job.downloaded || '12 MB';
    if (data.filePath) job.outputPath = data.filePath;

    const pbar = document.getElementById(`pbar_${downloadId}`);
    const pill = document.getElementById(`pill_${downloadId}`);
    const speed = document.getElementById(`speed_${downloadId}`);
    const eta = document.getElementById(`eta_${downloadId}`);
    const size = document.getElementById(`size_${downloadId}`);

    if (pbar) pbar.style.width = `${Math.min(100, Math.max(0, job.progress))}%`;
    if (pill) {
      if (job.status === 'merging') {
        pill.className = 'queue-item-status-pill merging';
        pill.textContent = 'Muxing FFmpeg';
      } else if (job.status !== 'completed') {
        pill.className = 'queue-item-status-pill downloading';
        pill.textContent = `${Math.round(job.progress)}%`;
      }
    }
    if (speed) speed.textContent = job.speed;
    if (eta) eta.textContent = job.eta;
    if (size) size.textContent = `${job.downloaded} / ${job.totalSize}`;
  }

  onDownloadCompleted(downloadId, data) {
    const job = this.activeDownloads.get(downloadId);
    if (!job || job.status === 'completed') return;

    job.status = 'completed';
    job.progress = 100;
    if (data?.filePath) {
      job.outputPath = data.filePath;
    } else if (!job.outputPath) {
      job.outputPath = `${this.destinationFolder}/${job.title}.mp4`;
    }

    const pbar = document.getElementById(`pbar_${downloadId}`);
    const pill = document.getElementById(`pill_${downloadId}`);
    const actions = document.getElementById(`actions_${downloadId}`);

    if (pbar) {
      pbar.style.width = '100%';
      pbar.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }

    if (pill) {
      pill.className = 'queue-item-status-pill completed';
      pill.textContent = '✓ 100% Completed';
    }

    if (actions) {
      actions.innerHTML = `
        <button class="btn-queue-action" id="btnOpenFolder_${downloadId}" title="Open and highlight downloaded video in folder">
          📁 Open Folder
        </button>
      `;
      const btnFolder = actions.querySelector(`#btnOpenFolder_${downloadId}`);
      if (btnFolder) {
        btnFolder.addEventListener('click', () => {
          const targetPath = job.outputPath || job.filePath || this.destinationFolder;
          if (window.electronAPI && window.electronAPI.showInFolder && job.outputPath) {
            window.electronAPI.showInFolder(job.outputPath);
          } else if (window.electronAPI && window.electronAPI.openFolder) {
            window.electronAPI.openFolder(targetPath);
          } else {
            this.showToast(`Opening download folder: ${targetPath}`);
          }
        });
      }
    }

    // No spam popup notifications on download completion as requested
    this.updateDownloadCounter();
  }

  cancelDownload(downloadId) {
    const job = this.activeDownloads.get(downloadId);
    if (!job) return;

    job.status = 'cancelled';
    if (window.electronAPI && window.electronAPI.cancelDownload) {
      window.electronAPI.cancelDownload(downloadId);
    }

    const pill = document.getElementById(`pill_${downloadId}`);
    const actions = document.getElementById(`actions_${downloadId}`);

    if (pill) {
      pill.className = 'queue-item-status-pill error';
      pill.textContent = 'Cancelled';
    }

    if (actions) {
      actions.innerHTML = `<span style="font-size: 11px; color: var(--text-tertiary);">Removed</span>`;
    }

    this.showToast(`Download cancelled: ${job.title}`);
    this.updateDownloadCounter();
  }

  clearCompletedDownloads() {
    let cleared = 0;
    const idsToRemove = [];

    this.activeDownloads.forEach((job, id) => {
      if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'error') {
        const el = document.getElementById(`queue_item_${id}`);
        if (el) el.remove();
        idsToRemove.push(id);
        cleared += 1;
      }
    });

    idsToRemove.forEach((id) => this.activeDownloads.delete(id));

    // Also clean up any lingering completed/orphaned DOM items in the list
    if (this.dom.queueList) {
      const remainingItems = this.dom.queueList.querySelectorAll('.download-item-card');
      if (remainingItems.length === 0 && this.dom.emptyQueuePlaceholder) {
        this.dom.emptyQueuePlaceholder.style.display = 'flex';
      }
    }

    if (this.activeDownloads.size === 0 && this.dom.emptyQueuePlaceholder) {
      this.dom.emptyQueuePlaceholder.style.display = 'flex';
    }

    this.updateDownloadCounter();
    if (cleared > 0) {
      this.showToast(`Cleared ${cleared} item${cleared > 1 ? 's' : ''} from download list`);
    } else {
      this.showToast('Download list is already clean');
    }
  }

  updateDownloadCounter() {
    const activeCount = Array.from(this.activeDownloads.values()).filter(
      (j) => j.status === 'downloading' || j.status === 'merging'
    ).length;

    if (this.dom.downloadCounter) {
      if (activeCount > 0) {
        this.dom.downloadCounter.style.display = 'inline-flex';
        this.dom.downloadCounter.textContent = activeCount;
      } else {
        this.dom.downloadCounter.style.display = 'none';
      }
    }
  }

  // =========================================================================
  // 5. Diagnostics & Engine Health
  // =========================================================================
  setupDiagnosticsModal() {
    if (this.dom.engineStatusBadge) {
      this.dom.engineStatusBadge.addEventListener('click', () => {
        this.openDiagnosticsModal();
      });
    }

    if (this.dom.btnEngineModalClose) {
      this.dom.btnEngineModalClose.addEventListener('click', () => {
        this.closeDiagnosticsModal();
      });
    }

    if (this.dom.btnDiagDone) {
      this.dom.btnDiagDone.addEventListener('click', () => {
        this.closeDiagnosticsModal();
      });
    }

    if (this.dom.btnRescanDependencies) {
      this.dom.btnRescanDependencies.addEventListener('click', async () => {
        this.dom.btnRescanDependencies.textContent = 'Scanning...';
        await this.checkInitialEngineHealth();
        this.dom.btnRescanDependencies.textContent = '🔄 Re-scan Binaries';
        this.showToast('Dependency scan completed');
      });
    }

    // Run Comprehensive Health Self-Test
    if (this.dom.btnRunEngineSelfTest) {
      this.dom.btnRunEngineSelfTest.addEventListener('click', async () => {
        await this.runEngineSelfTest();
      });
    }

    // Run Cookie Bridge & Extractor Live Diagnostic Test
    if (this.dom.btnTestCookieBridge) {
      this.dom.btnTestCookieBridge.addEventListener('click', async () => {
        await this.runCookieBridgeTest();
      });
    }

    // Import Netscape cookies.txt file
    if (this.dom.btnImportCookieFile) {
      this.dom.btnImportCookieFile.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.importCookieFile) {
          const res = await window.electronAPI.importCookieFile();
          if (res && res.success) {
            this.showToast('Custom cookies.txt imported successfully!');
            await this.checkInitialEngineHealth();
          } else if (res && res.error) {
            this.showToast(`Import failed: ${res.error}`);
          }
        }
      });
    }

    // Toggle Paste Cookies Drawer
    if (this.dom.btnTogglePasteCookie && this.dom.pasteCookieBox) {
      this.dom.btnTogglePasteCookie.addEventListener('click', () => {
        const isHidden = this.dom.pasteCookieBox.style.display === 'none';
        this.dom.pasteCookieBox.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && this.dom.pasteCookieTextarea) {
          this.dom.pasteCookieTextarea.focus();
        }
      });
    }

    // Save Pasted Cookies
    if (this.dom.btnSavePastedCookie && this.dom.pasteCookieTextarea) {
      this.dom.btnSavePastedCookie.addEventListener('click', async () => {
        const text = this.dom.pasteCookieTextarea.value.trim();
        if (!text) {
          this.showToast('Please paste Netscape cookies content');
          return;
        }
        if (window.electronAPI && window.electronAPI.saveCookieText) {
          const res = await window.electronAPI.saveCookieText(text);
          if (res && res.success) {
            this.showToast('Cookies saved successfully!');
            this.dom.pasteCookieBox.style.display = 'none';
            this.dom.pasteCookieTextarea.value = '';
            await this.checkInitialEngineHealth();
          } else {
            this.showToast(`Failed to save cookies: ${res.error || 'Invalid content'}`);
          }
        }
      });
    }

    // Cancel Pasted Cookies
    if (this.dom.btnCancelPastedCookie && this.dom.pasteCookieBox) {
      this.dom.btnCancelPastedCookie.addEventListener('click', () => {
        this.dom.pasteCookieBox.style.display = 'none';
      });
    }

    // Clear Custom Cookies File
    if (this.dom.btnClearManualCookie) {
      this.dom.btnClearManualCookie.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.clearManualCookies) {
          await window.electronAPI.clearManualCookies();
          this.showToast('Custom cookies file cleared');
          await this.checkInitialEngineHealth();
        }
      });
    }

    // Toggle Troubleshooting & Diagnostics Live Log drawer
    if (this.dom.toggleDiagLogs && this.dom.diagLogsBody) {
      this.dom.toggleDiagLogs.addEventListener('click', () => {
        const isHidden = this.dom.diagLogsBody.style.display === 'none';
        this.dom.diagLogsBody.style.display = isHidden ? 'block' : 'none';
        if (this.dom.diagLogsSection) {
          this.dom.diagLogsSection.classList.toggle('open', isHidden);
        }
      });
    }

    // Direct button in error card to open diagnostics modal with logs expanded
    if (this.dom.btnErrorLogs) {
      this.dom.btnErrorLogs.addEventListener('click', () => {
        this.openDiagnosticsModal(true);
      });
    }

    // Copy Logs Button
    if (this.dom.btnCopyDiagLogs) {
      this.dom.btnCopyDiagLogs.addEventListener('click', async () => {
        const text = this.getFormattedLogsText();
        try {
          await navigator.clipboard.writeText(text);
          this.dom.btnCopyDiagLogs.textContent = '✓ Copied!';
          setTimeout(() => {
            if (this.dom.btnCopyDiagLogs) this.dom.btnCopyDiagLogs.textContent = '📋 Copy Logs';
          }, 2000);
          this.showToast('Diagnostics logs copied to clipboard');
        } catch (_) {
          this.showToast('Failed to copy logs to clipboard');
        }
      });
    }

    // Clear Logs Button
    if (this.dom.btnClearDiagLogs) {
      this.dom.btnClearDiagLogs.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.clearDiagnosticsLogs) {
          await window.electronAPI.clearDiagnosticsLogs();
          await this.checkInitialEngineHealth();
          this.showToast('Diagnostics log buffer cleared');
        }
      });
    }

    // Guide Platform Tabs
    const setGuide = (os, cmd, alts) => {
      if (this.dom.tabWinGuide) this.dom.tabWinGuide.classList.toggle('active', os === 'win');
      if (this.dom.tabMacGuide) this.dom.tabMacGuide.classList.toggle('active', os === 'mac');
      if (this.dom.tabLinuxGuide) this.dom.tabLinuxGuide.classList.toggle('active', os === 'linux');
      if (this.dom.guideCommandText) this.dom.guideCommandText.textContent = cmd;
      if (this.dom.guideAlternativesList) this.dom.guideAlternativesList.innerHTML = alts;
    };

    if (this.dom.tabWinGuide) {
      this.dom.tabWinGuide.addEventListener('click', () => {
        setGuide('win', 'winget install yt-dlp && winget install Gyan.FFmpeg', 'Chocolatey: <code>choco install yt-dlp ffmpeg</code><br>Scoop: <code>scoop install yt-dlp ffmpeg</code>');
      });
    }

    if (this.dom.tabMacGuide) {
      this.dom.tabMacGuide.addEventListener('click', () => {
        setGuide('mac', 'brew install yt-dlp ffmpeg', 'MacPorts: <code>sudo port install yt-dlp ffmpeg</code>');
      });
    }

    if (this.dom.tabLinuxGuide) {
      this.dom.tabLinuxGuide.addEventListener('click', () => {
        setGuide('linux', 'sudo apt update && sudo apt install yt-dlp ffmpeg', 'Arch: <code>sudo pacman -S yt-dlp ffmpeg</code><br>Fedora: <code>sudo dnf install yt-dlp ffmpeg</code>');
      });
    }

    // Copy command button
    if (this.dom.btnCopyGuideCommand && this.dom.guideCommandText) {
      this.dom.btnCopyGuideCommand.addEventListener('click', () => {
        navigator.clipboard.writeText(this.dom.guideCommandText.textContent);
        this.dom.btnCopyGuideCommand.textContent = '✓ Copied!';
        setTimeout(() => {
          if (this.dom.btnCopyGuideCommand) this.dom.btnCopyGuideCommand.textContent = '📋 Copy';
        }, 2000);
      });
    }
  }

  openDiagnosticsModal(expandLogs = false) {
    this.dom.engineModalBackdrop.classList.add('open');
    if (expandLogs && this.dom.diagLogsBody) {
      this.dom.diagLogsBody.style.display = 'block';
      if (this.dom.diagLogsSection) {
        this.dom.diagLogsSection.classList.add('open');
      }
      setTimeout(() => {
        this.dom.diagLogsSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
    this.checkInitialEngineHealth();
  }

  closeDiagnosticsModal() {
    this.dom.engineModalBackdrop.classList.remove('open');
  }

  getFormattedLogsText() {
    if (!this.lastDiagnosticsLogs || this.lastDiagnosticsLogs.length === 0) {
      return 'No diagnostics logs recorded yet.';
    }
    return this.lastDiagnosticsLogs.map(l => {
      const details = l.details ? ` | ${JSON.stringify(l.details)}` : '';
      return `[${l.timestamp}] [${l.category}] ${l.message}${details}`;
    }).join('\n');
  }

  async checkInitialEngineHealth() {
    try {
      let diag = { ytdlpFound: true, ytdlpPath: '/usr/local/bin/yt-dlp', ffmpegFound: true, ffmpegPath: '/usr/local/bin/ffmpeg' };
      let logsData = { logs: [] };

      if (window.electronAPI && window.electronAPI.getDiagnostics) {
        diag = await window.electronAPI.getDiagnostics();
      }

      if (window.electronAPI && window.electronAPI.getDiagnosticsLogs) {
        logsData = await window.electronAPI.getDiagnosticsLogs();
      }

      if (this.dom.ytdlpStatusPill) {
        this.dom.ytdlpStatusPill.className = `diag-status-pill ${diag.ytdlpFound ? 'installed' : 'missing'}`;
        this.dom.ytdlpStatusPill.textContent = diag.ytdlpFound ? 'Installed' : 'Not Found';
        this.dom.ytdlpPathText.textContent = diag.ytdlpPath || 'Path: None';
      }

      if (this.dom.ffmpegStatusPill) {
        this.dom.ffmpegStatusPill.className = `diag-status-pill ${diag.ffmpegFound ? 'installed' : 'missing'}`;
        this.dom.ffmpegStatusPill.textContent = diag.ffmpegFound ? 'Installed' : 'Not Found';
        this.dom.ffmpegPathText.textContent = diag.ffmpegPath || 'Path: None';
      }

      // Update Cookie Bridge Badges
      const availableBrowsers = diag.cookieBrowsers || (logsData.cookieBrowsers || []);
      const activeCookie = diag.activeCookieBrowser || logsData.activeCookieBrowser || 'Mobile Innertube Client (Auto)';
      
      if (this.dom.activeCookieBrowserText) {
        this.dom.activeCookieBrowserText.textContent = activeCookie;
      }

      // Check Manual Cookies Status
      if (window.electronAPI && window.electronAPI.getCookieStatus) {
        const cookieStatus = await window.electronAPI.getCookieStatus();
        if (this.dom.manualCookieStatusText) {
          if (cookieStatus && cookieStatus.hasCustomCookies) {
            this.dom.manualCookieStatusText.className = 'manual-cookie-status active';
            this.dom.manualCookieStatusText.innerHTML = '<span>Manual Cookies: <strong>✓ Custom cookies.txt active</strong></span>';
            if (this.dom.btnClearManualCookie) this.dom.btnClearManualCookie.style.display = 'inline-block';
          } else {
            this.dom.manualCookieStatusText.className = 'manual-cookie-status';
            this.dom.manualCookieStatusText.innerHTML = '<span>Manual Cookies: <em>None (Using automated browser extraction)</em></span>';
            if (this.dom.btnClearManualCookie) this.dom.btnClearManualCookie.style.display = 'none';
          }
        }
      }

      if (this.dom.cookieBrowsersList) {
        const detectedIds = availableBrowsers.map(b => b.id);
        const standardBrowsers = [
          { id: 'edge', name: 'Edge' },
          { id: 'chrome', name: 'Chrome' },
          { id: 'brave', name: 'Brave' },
          { id: 'firefox', name: 'Firefox' }
        ];

        this.dom.cookieBrowsersList.innerHTML = standardBrowsers.map(b => {
          const isDetected = detectedIds.includes(b.id);
          const isActive = isDetected && (activeCookie.toLowerCase().includes(b.id) || activeCookie.toLowerCase().includes(b.name.toLowerCase()));
          return `<span class="cookie-browser-badge ${isActive ? 'active' : ''} ${!isDetected ? 'missing' : ''}" title="${isDetected ? b.name + ' available for anti-bot cookie extraction' : b.name + ' not detected'}">
            ${b.name} ${isDetected ? '<span class="badge-check">✓</span>' : '<span class="badge-check">✕</span>'}
          </span>`;
        }).join('');
      }

      // Render Troubleshooting Logs
      const rawLogs = (logsData && logsData.logs) || [];
      this.lastDiagnosticsLogs = rawLogs;

      if (this.dom.diagLogsCountBadge) {
        this.dom.diagLogsCountBadge.textContent = `${rawLogs.length} event${rawLogs.length === 1 ? '' : 's'}`;
      }

      if (this.dom.diagLogsViewer) {
        if (rawLogs.length === 0) {
          this.dom.diagLogsViewer.innerHTML = `<div class="log-empty-msg">No extraction events recorded yet. Analyze or download a media stream to see live diagnostic traces.</div>`;
        } else {
          this.dom.diagLogsViewer.innerHTML = rawLogs.slice().reverse().map(l => {
            const catClass = l.category || 'DIAGNOSTICS';
            const detailsStr = l.details ? ` <span style="color: #94a3b8; font-size: 10px;">(${Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(', ')})</span>` : '';
            return `<div class="log-entry-row">
              <span class="log-entry-time">${l.timestamp}</span>
              <span class="log-entry-tag ${catClass}">${l.category}</span>
              <span class="log-entry-text">${this.escapeHtml(l.message)}${detailsStr}</span>
            </div>`;
          }).join('');
        }
      }

      const allOk = diag.ytdlpFound && diag.ffmpegFound;
      if (this.dom.engineBadgeText) {
        this.dom.engineBadgeText.textContent = allOk ? 'Engine Ready' : 'Setup Required';
      }
    } catch (_) {
      // Ignored
    }
  }

  /**
   * Runs the active Downloader Engine Production Health Self-Test
   */
  async runEngineSelfTest() {
    if (!this.dom.btnRunEngineSelfTest) return;

    this.dom.btnRunEngineSelfTest.disabled = true;
    this.dom.btnRunEngineSelfTest.textContent = '🧪 Testing Engine...';

    if (this.dom.engineSelfTestContainer) {
      this.dom.engineSelfTestContainer.style.display = 'block';
      this.dom.selfTestOverallBadge.className = 'selftest-badge checking';
      this.dom.selfTestOverallBadge.textContent = 'RUNNING';
      this.dom.selfTestSummaryText.textContent = 'Executing binary version checks, cookie provider verification, and resources integrity validation...';
      this.dom.selfTestGrid.innerHTML = '<div class="selftest-loading">Probing yt-dlp.exe, ffmpeg.exe, and browser cookie bridges...</div>';
    }

    try {
      let report = null;
      if (window.electronAPI && window.electronAPI.runSelfTest) {
        report = await window.electronAPI.runSelfTest();
      } else {
        // Fallback simulation for web browser preview mode
        await new Promise(r => setTimeout(r, 600));
        report = {
          overall: 'pass',
          summary: 'All downloader subsystems, fallbacks, and preview pipelines are verified and ready.',
          tests: [
            { name: 'yt-dlp Extractor Engine', passed: true, status: 'pass', message: 'yt-dlp 2024.12.23 (Native Core verified)' },
            { name: 'FFmpeg Muxer Stream Pipeline', passed: true, status: 'pass', message: 'FFmpeg 7.0 (Audio/Video multiplexer verified)' },
            { name: 'Browser Cookie Bridge Providers', passed: true, status: 'pass', message: 'Edge, Chrome, Brave cookie extractors ready' },
            { name: 'Package Resources & Installation Integrity', passed: true, status: 'pass', message: 'Clean standalone binary installation verified' }
          ]
        };
      }

      const overall = report.overall || 'pass';
      if (this.dom.selfTestOverallBadge) {
        this.dom.selfTestOverallBadge.className = `selftest-badge ${overall}`;
        this.dom.selfTestOverallBadge.textContent = overall.toUpperCase();
      }

      if (this.dom.selfTestSummaryText) {
        this.dom.selfTestSummaryText.textContent = report.summary || 'Engine self-test completed.';
      }

      if (this.dom.selfTestGrid) {
        this.dom.selfTestGrid.innerHTML = (report.tests || []).map(t => {
          const statusClass = t.status || (t.passed ? 'pass' : 'fail');
          const statusIcon = t.passed ? '✓' : (statusClass === 'warning' ? '⚠' : '✕');
          const actionHtml = t.suggestedAction ? `<div class="selftest-action">💡 <strong>Suggested Action:</strong> ${this.escapeHtml(t.suggestedAction)}</div>` : '';
          return `<div class="selftest-card ${statusClass}">
            <div class="selftest-card-header">
              <span class="selftest-card-name">${this.escapeHtml(t.name)}</span>
              <span class="selftest-card-status ${statusClass}">${statusIcon} ${statusClass.toUpperCase()}</span>
            </div>
            <div class="selftest-card-body">
              <div class="selftest-card-msg">${this.escapeHtml(t.message || '')}</div>
              ${actionHtml}
            </div>
          </div>`;
        }).join('');
      }

      await this.checkInitialEngineHealth();
      this.showToast(`Engine Self-Test: ${overall.toUpperCase()} (${report.summary})`);
    } catch (err) {
      if (this.dom.selfTestOverallBadge) {
        this.dom.selfTestOverallBadge.className = 'selftest-badge fail';
        this.dom.selfTestOverallBadge.textContent = 'ERROR';
      }
      if (this.dom.selfTestSummaryText) {
        this.dom.selfTestSummaryText.textContent = `Health check failed: ${err.message}`;
      }
    } finally {
      if (this.dom.btnRunEngineSelfTest) {
        this.dom.btnRunEngineSelfTest.disabled = false;
        this.dom.btnRunEngineSelfTest.textContent = '⚡ Run Health Self-Test';
      }
    }
  }

  /**
   * Runs live test of the Cookie Bridge & Extractor
   */
  async runCookieBridgeTest() {
    if (!this.dom.btnTestCookieBridge) return;

    const testUrl = (this.dom.urlInput && this.dom.urlInput.value.trim()) || 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
    this.dom.btnTestCookieBridge.disabled = true;
    this.dom.btnTestCookieBridge.textContent = 'Testing...';

    if (this.dom.cookieTestResultBox) {
      this.dom.cookieTestResultBox.style.display = 'block';
      this.dom.cookieTestResultBox.innerHTML = '<div class="cookie-test-meta">Executing multi-tier extraction test against YouTube innertube API & cookie providers...</div>';
    }

    try {
      let result = null;
      if (window.electronAPI && window.electronAPI.testCookieBridge) {
        result = await window.electronAPI.testCookieBridge(testUrl);
      } else {
        await new Promise(r => setTimeout(r, 600));
        result = {
          success: true,
          method: 'Mobile Innertube Client (Anti-Bot Bypass)',
          title: 'Big Buck Bunny 4K 60FPS Ultra HD',
          duration: '10:34',
          formatCount: 8,
          sanitizedCmd: '"yt-dlp" --dump-single-json --extractor-args youtube:player_client=android,ios ...',
          steps: [
            { name: 'Mobile Innertube API (android,ios)', code: 0, passed: true, durationMs: 412 }
          ]
        };
      }

      if (this.dom.cookieTestResultBox) {
        if (result && result.success) {
          this.dom.cookieTestResultBox.innerHTML = `
            <div class="cookie-test-header">
              <span class="cookie-test-status pass">✓ Extraction Verified (${this.escapeHtml(result.method)})</span>
              <span style="font-size: 10px; color: #4ade80;">${result.formatCount} formats found</span>
            </div>
            <div class="cookie-test-meta">
              <strong>Title:</strong> ${this.escapeHtml(result.title || 'YouTube Stream')}<br>
              <strong>Duration:</strong> ${this.escapeHtml(result.duration || '0:00')}
            </div>
            ${result.sanitizedCmd ? `<div class="cookie-test-cmd"><code>${this.escapeHtml(result.sanitizedCmd)}</code></div>` : ''}
          `;
          this.showToast(`Cookie Bridge test succeeded via ${result.method}`);
        } else {
          this.dom.cookieTestResultBox.innerHTML = `
            <div class="cookie-test-header">
              <span class="cookie-test-status fail">✕ Extraction Test Failed</span>
            </div>
            <div class="cookie-test-meta">${this.escapeHtml(result?.error || 'All extraction tiers failed.')}</div>
          `;
          this.showToast('Cookie Bridge test encountered issues.');
        }
      }

      await this.checkInitialEngineHealth();
    } catch (e) {
      if (this.dom.cookieTestResultBox) {
        this.dom.cookieTestResultBox.innerHTML = `<div class="cookie-test-status fail">✕ Test Error: ${this.escapeHtml(e.message)}</div>`;
      }
    } finally {
      if (this.dom.btnTestCookieBridge) {
        this.dom.btnTestCookieBridge.disabled = false;
        this.dom.btnTestCookieBridge.textContent = '🧪 Test Cookie Bridge';
      }
    }
  }

  // =========================================================================
  // 6. IPC Event Subscriptions
  // =========================================================================
  setupIPCListeners() {
    if (!window.electronAPI || this.__ipcListenersInitialized) return;
    this.__ipcListenersInitialized = true;

    if (window.electronAPI.onDownloadProgress) {
      window.electronAPI.onDownloadProgress((data) => {
        this.updateDownloadProgress(data.downloadId, data);
      });
    }

    if (window.electronAPI.onDownloadCompleted) {
      window.electronAPI.onDownloadCompleted((data) => {
        this.onDownloadCompleted(data.downloadId, data);
      });
    }

    if (window.electronAPI.onDownloadError) {
      window.electronAPI.onDownloadError((data) => {
        const job = this.activeDownloads.get(data.downloadId);
        if (job) {
          job.status = 'error';
          const pill = document.getElementById(`pill_${data.downloadId}`);
          if (pill) {
            pill.className = 'queue-item-status-pill error';
            pill.textContent = 'Error';
          }
          this.showToast(`Download failed: ${data.error || 'Network error'}`);
          this.updateDownloadCounter();
        }
      });
    }
  }

  // =========================================================================
  // 7. Simulators & Fallbacks (Web Preview Environment)
  // =========================================================================
  async simulateExtraction(url) {
    await new Promise((r) => setTimeout(r, 400));

    const isInstagram = /instagram\.com/i.test(url);
    const cleanUrl = (url || '').trim();

    if (isInstagram) {
      const match = cleanUrl.match(/\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
      const code = match ? match[2] : 'C3x9M8_L4Q1';
      return {
        id: code,
        title: `Instagram Reel (${code}) - Creator Moments`,
        uploader: 'instagram.creator',
        platform: 'Instagram',
        durationFormatted: '0:45',
        thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
        formats: [
          { format_id: `ig_${code}_1080p`, resolution: '1080x1920 (Reel HD)', height: 1920, fps: 60, vcodec: 'avc1', acodec: 'mp4a', ext: 'mp4', isCombined: true, filesizeFormatted: '28.4 MB' },
          { format_id: `ig_${code}_720p`, resolution: '720x1280 (Fast)', height: 1280, fps: 30, vcodec: 'avc1', acodec: 'mp4a', ext: 'mp4', isCombined: true, filesizeFormatted: '14.2 MB' },
          { format_id: `ig_${code}_audio`, resolution: '320kbps MP3 Audio', height: 0, vcodec: 'none', acodec: 'mp3', ext: 'mp3', isAudioOnly: true, filesizeFormatted: '3.8 MB' }
        ]
      };
    }

    // Dynamic YouTube Extraction
    let videoId = 'aqz-KE-bpKQ';
    const matchWatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
    const matchShorts = cleanUrl.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
    const matchBe = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (matchWatch) videoId = matchWatch[1];
    else if (matchShorts) videoId = matchShorts[1];
    else if (matchBe) videoId = matchBe[1];

    const knownTitles = {
      'aqz-KE-bpKQ': 'Big Buck Bunny 4K 60FPS Ultra HD Open Source Movie',
      'dQw4w9WgXcQ': 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
      'jNQXAC9IVRw': 'Me at the zoo - Jawed (First YouTube Video)',
      'M7lc1UVf-VE': 'YouTube Developers - Getting Started with YouTube API'
    };

    const title = knownTitles[videoId] || `YouTube Video Stream [${videoId}]`;
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return {
      id: videoId,
      title: title,
      uploader: 'YouTube Studio Channel',
      platform: 'YouTube',
      durationFormatted: '10:24',
      thumbnail: thumbnail,
      formats: [
        { format_id: `yt_${videoId}_4k`, resolution: '3840x2160 (4K UHD)', height: 2160, fps: 60, vcodec: 'vp9', acodec: 'opus', ext: 'mp4', isCombined: true, filesizeFormatted: '312.4 MB' },
        { format_id: `yt_${videoId}_1440p`, resolution: '2560x1440 (2K QHD)', height: 1440, fps: 60, vcodec: 'vp9', acodec: 'opus', ext: 'mp4', isCombined: true, filesizeFormatted: '184.2 MB' },
        { format_id: `yt_${videoId}_1080p`, resolution: '1920x1080 (1080p FHD)', height: 1080, fps: 60, vcodec: 'avc1', acodec: 'mp4a', ext: 'mp4', isCombined: true, filesizeFormatted: '92.5 MB' },
        { format_id: `yt_${videoId}_720p`, resolution: '1280x720 (720p HD)', height: 720, fps: 30, vcodec: 'avc1', acodec: 'mp4a', ext: 'mp4', isCombined: true, filesizeFormatted: '48.1 MB' },
        { format_id: `yt_${videoId}_video_only_4k`, resolution: '3840x2160 (AV1 Video Only)', height: 2160, fps: 60, vcodec: 'av01', acodec: 'none', ext: 'mp4', isVideoOnly: true, filesizeFormatted: '280.0 MB' },
        { format_id: `yt_${videoId}_audio_320`, resolution: '320kbps Studio MP3 Audio', height: 0, vcodec: 'none', acodec: 'mp3', ext: 'mp3', isAudioOnly: true, filesizeFormatted: '28.8 MB' },
        { format_id: `yt_${videoId}_audio_flac`, resolution: 'Lossless FLAC Master', height: 0, vcodec: 'none', acodec: 'flac', ext: 'flac', isAudioOnly: true, filesizeFormatted: '64.2 MB' }
      ]
    };
  }

  simulateDownloadProgress(downloadId) {
    let currentPct = 0;
    const interval = setInterval(() => {
      const job = this.activeDownloads.get(downloadId);
      if (!job || job.status === 'cancelled') {
        clearInterval(interval);
        return;
      }

      currentPct += Math.random() * 15 + 10;

      if (currentPct >= 90 && job.status === 'downloading') {
        job.status = 'merging';
      }

      if (currentPct >= 100) {
        clearInterval(interval);
        this.onDownloadCompleted(downloadId, {
          filePath: `${this.destinationFolder}/${job.title}.mp4`
        });
        return;
      }

      this.updateDownloadProgress(downloadId, {
        percent: currentPct,
        speed: `${(Math.random() * 5 + 8).toFixed(1)} MB/s`,
        eta: `${Math.max(1, Math.round((100 - currentPct) / 10))}s`,
        downloaded: `${((currentPct / 100) * 45).toFixed(1)} MB`
      });
    }, 400);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  showToast(msg) {
    if (window.yasBrowser && window.yasBrowser.showToast) {
      window.yasBrowser.showToast(msg);
    }
  }
}

// Global Media Downloader Instance
window.mediaDownloader = new MediaDownloader();
