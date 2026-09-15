/**
 * YAS Browser - Production-Grade Media Download Engine
 * 
 * Handles:
 * - Real yt-dlp & FFmpeg binary detection & interactive diagnostics modal
 * - YouTube (Videos + Shorts) & Instagram (Reels + Posts) deep stream analysis
 * - Intelligent Error Categorization (Age-restricted, Private, Login walls, Rate limits, Invalid URLs)
 * - Full Format Matrix: Combined (Merged Video+Audio), Raw Video, Extracted Audio (MP3/FLAC/AAC)
 * - Smart "Best Quality" one-click analysis and download execution
 * - Real-time IPC streaming download progress (speed, ETA, downloaded bytes, percent)
 * - Full pipeline states: downloading, FFmpeg merging, audio conversion, completion
 * - Process cancellation, directory selection, and native folder/file reveal
 */

class MediaDownloader {
  constructor() {
    this.currentAnalyzedData = null;
    this.selectedFormat = null;
    this.selectedFormatType = 'combined'; // 'combined' | 'video' | 'audio'
    this.downloads = [];
    this.activeDownloadCount = 0;
    this.selectedDownloadPath = '~/Downloads';
    this.systemInfo = null;
    this.currentOsTab = 'win';
    this.currentState = 'idle'; // 'idle' | 'analyzing' | 'ready' | 'error'

    this.dom = {
      modalBackdrop: document.getElementById('mediaModalBackdrop'),
      panelContainer: document.getElementById('mediaPanelContainer'),
      openTriggerBtn: document.getElementById('mediaDownloadTriggerBtn'),
      featureBannerBtn: document.getElementById('downloaderFeatureBanner'),
      closeBtn: document.getElementById('mediaPanelCloseBtn'),
      urlInput: document.getElementById('mediaUrlInput'),
      inputWrapper: document.getElementById('mediaInputWrapper'),
      inputClearBtn: document.getElementById('inputClearBtn'),
      btnAnalyze: document.getElementById('btnAnalyzeMedia'),
      btnQuickBest: document.getElementById('btnQuickBestQuality'),
      btnClearAll: document.getElementById('btnClearMediaAll'),
      pasteClipBtn: document.getElementById('pasteClipboardBtn'),
      
      // Loading State & Steps
      analysisLoadingCard: document.getElementById('analysisLoadingCard'),
      loadingPhaseTitle: document.getElementById('loadingPhaseTitle'),
      loadingPhaseSub: document.getElementById('loadingPhaseSub'),
      step1Dot: document.getElementById('step1Dot'),
      step2Dot: document.getElementById('step2Dot'),
      step3Dot: document.getElementById('step3Dot'),

      // Error State
      mediaErrorCard: document.getElementById('mediaErrorCard'),
      errorTitle: document.getElementById('errorTitle'),
      errorDescription: document.getElementById('errorDescription'),
      btnErrorRetry: document.getElementById('btnErrorRetry'),
      btnErrorGuide: document.getElementById('btnErrorGuide'),

      // Engine Diagnostics Badge & Modal
      engineStatusBadge: document.getElementById('engineStatusBadge'),
      engineBadgeText: document.getElementById('engineBadgeText'),
      engineStatusSubtitle: document.getElementById('engineStatusSubtitle'),
      engineModalBackdrop: document.getElementById('engineInstallModalBackdrop'),
      btnEngineModalClose: document.getElementById('btnEngineModalClose'),
      btnDiagDone: document.getElementById('btnDiagDone'),
      btnRescanDependencies: document.getElementById('btnRescanDependencies'),
      ytdlpStatusPill: document.getElementById('ytdlpStatusPill'),
      ytdlpPathText: document.getElementById('ytdlpPathText'),
      ffmpegStatusPill: document.getElementById('ffmpegStatusPill'),
      ffmpegPathText: document.getElementById('ffmpegPathText'),
      tabWinGuide: document.getElementById('tabWinGuide'),
      tabMacGuide: document.getElementById('tabMacGuide'),
      tabLinuxGuide: document.getElementById('tabLinuxGuide'),
      guideHeading: document.getElementById('guideHeading'),
      guideCommandText: document.getElementById('guideCommandText'),
      btnCopyGuideCommand: document.getElementById('btnCopyGuideCommand'),
      guideAlternativesList: document.getElementById('guideAlternativesList'),

      // Folder Selector
      destinationPathText: document.getElementById('destinationPathText'),
      btnChangeFolder: document.getElementById('btnChangeFolder'),
      btnOpenDownloadsFolder: document.getElementById('btnOpenDownloadsFolder'),
      
      // Preset Badges
      presetYt: document.getElementById('presetYtBadge'),
      presetIg: document.getElementById('presetIgBadge'),
      
      // Result Card Elements
      resultContainer: document.getElementById('analyzedResultContainer'),
      mediaThumbnail: document.getElementById('mediaThumbnail'),
      mediaDuration: document.getElementById('mediaDuration'),
      mediaPlatform: document.getElementById('mediaPlatformBadge'),
      bestAvailableBadge: document.getElementById('bestAvailableBadge'),
      mediaTitle: document.getElementById('mediaTitle'),
      mediaCreator: document.getElementById('mediaCreator'),
      
      // Formats Tabs & Grid
      tabCombinedFormats: document.getElementById('tabCombinedFormats'),
      tabVideoFormats: document.getElementById('tabVideoFormats'),
      tabAudioFormats: document.getElementById('tabAudioFormats'),
      formatsListContainer: document.getElementById('formatsListContainer'),
      btnStartDownload: document.getElementById('btnStartDownload'),

      // Queue & Progress
      downloadQueueList: document.getElementById('downloadQueueList'),
      emptyQueuePlaceholder: document.getElementById('emptyQueuePlaceholder'),
      downloadCounter: document.getElementById('downloadCounter')
    };

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.checkSystemDependencies();
    this.setupIpcListeners();
  }

  /**
   * Diagnostic check of local yt-dlp and ffmpeg binaries
   */
  async checkSystemDependencies() {
    if (window.electronAPI && window.electronAPI.checkDependencies) {
      try {
        const info = await window.electronAPI.checkDependencies();
        this.systemInfo = info;
        
        if (info.defaultDownloadPath) {
          this.selectedDownloadPath = info.defaultDownloadPath;
          if (this.dom.destinationPathText) {
            this.dom.destinationPathText.textContent = info.defaultDownloadPath;
          }
        }

        // Set default OS tab based on detected platform
        if (info.platform === 'win32') this.currentOsTab = 'win';
        else if (info.platform === 'darwin') this.currentOsTab = 'mac';
        else this.currentOsTab = 'linux';

        this.updateDiagnosticsUI(info);
      } catch (err) {
        console.warn('[YAS Downloader] Failed to query system dependencies:', err);
      }
    } else {
      // Browser preview mode simulated diagnostic state
      this.systemInfo = {
        platform: 'darwin',
        ytdlp: { available: true, path: '/usr/local/bin/yt-dlp', version: '2025.02.19' },
        ffmpeg: { available: true, path: '/usr/local/bin/ffmpeg' }
      };
      this.updateDiagnosticsUI(this.systemInfo);
    }
  }

  updateDiagnosticsUI(info) {
    if (!info) return;

    // Header badge
    if (info.ytdlp && info.ytdlp.available) {
      if (this.dom.engineStatusBadge) {
        this.dom.engineStatusBadge.className = 'engine-badge';
        this.dom.engineBadgeText.textContent = `yt-dlp v${info.ytdlp.version || 'Ready'}`;
      }
      if (this.dom.engineStatusSubtitle) {
        this.dom.engineStatusSubtitle.textContent = `Native yt-dlp Engine • ${info.ffmpeg?.available ? 'FFmpeg Active' : 'Native Muxer'}`;
      }
    } else {
      if (this.dom.engineStatusBadge) {
        this.dom.engineStatusBadge.className = 'engine-badge simulated';
        this.dom.engineBadgeText.textContent = 'yt-dlp Setup Needed';
      }
      if (this.dom.engineStatusSubtitle) {
        this.dom.engineStatusSubtitle.textContent = 'Click to open setup guide & diagnostics';
      }
    }

    // Modal Status Cards
    if (this.dom.ytdlpStatusPill) {
      if (info.ytdlp?.available) {
        this.dom.ytdlpStatusPill.className = 'diag-status-pill ready';
        this.dom.ytdlpStatusPill.textContent = `Installed (${info.ytdlp.version || 'Active'})`;
        this.dom.ytdlpPathText.textContent = info.ytdlp.path || 'System PATH';
      } else {
        this.dom.ytdlpStatusPill.className = 'diag-status-pill missing';
        this.dom.ytdlpStatusPill.textContent = 'Not Found';
        this.dom.ytdlpPathText.textContent = 'Install yt-dlp for unrestricted 4K/8K downloads';
      }
    }

    if (this.dom.ffmpegStatusPill) {
      if (info.ffmpeg?.available) {
        this.dom.ffmpegStatusPill.className = 'diag-status-pill ready';
        this.dom.ffmpegStatusPill.textContent = 'Installed (Muxer Ready)';
        this.dom.ffmpegPathText.textContent = info.ffmpeg.path || 'System PATH';
      } else {
        this.dom.ffmpegStatusPill.className = 'diag-status-pill missing';
        this.dom.ffmpegStatusPill.textContent = 'Recommended';
        this.dom.ffmpegPathText.textContent = 'Required for merging 4K/1080p video+audio';
      }
    }

    this.renderInstallationGuideTab(this.currentOsTab);
  }

  renderInstallationGuideTab(os) {
    this.currentOsTab = os;
    this.dom.tabWinGuide?.classList.toggle('active', os === 'win');
    this.dom.tabMacGuide?.classList.toggle('active', os === 'mac');
    this.dom.tabLinuxGuide?.classList.toggle('active', os === 'linux');

    if (os === 'win') {
      if (this.dom.guideHeading) this.dom.guideHeading.textContent = 'Recommended Windows Installation (PowerShell / Terminal):';
      if (this.dom.guideCommandText) this.dom.guideCommandText.textContent = 'winget install yt-dlp && winget install Gyan.FFmpeg';
      if (this.dom.guideAlternativesList) {
        this.dom.guideAlternativesList.innerHTML = `
          <div class="guide-alt-item"><span>Chocolatey:</span> <span class="guide-alt-cmd">choco install yt-dlp ffmpeg</span></div>
          <div class="guide-alt-item"><span>Scoop:</span> <span class="guide-alt-cmd">scoop install yt-dlp ffmpeg</span></div>
        `;
      }
    } else if (os === 'mac') {
      if (this.dom.guideHeading) this.dom.guideHeading.textContent = 'Recommended macOS Installation (Homebrew):';
      if (this.dom.guideCommandText) this.dom.guideCommandText.textContent = 'brew install yt-dlp ffmpeg';
      if (this.dom.guideAlternativesList) {
        this.dom.guideAlternativesList.innerHTML = `
          <div class="guide-alt-item"><span>MacPorts:</span> <span class="guide-alt-cmd">sudo port install yt-dlp ffmpeg</span></div>
        `;
      }
    } else {
      if (this.dom.guideHeading) this.dom.guideHeading.textContent = 'Recommended Linux Installation:';
      if (this.dom.guideCommandText) this.dom.guideCommandText.textContent = 'sudo apt install yt-dlp ffmpeg || sudo pacman -S yt-dlp ffmpeg';
      if (this.dom.guideAlternativesList) {
        this.dom.guideAlternativesList.innerHTML = `
          <div class="guide-alt-item"><span>PIP:</span> <span class="guide-alt-cmd">pip install -U yt-dlp</span></div>
        `;
      }
    }
  }

  /**
   * Listen for real-time progress events piped from child_process yt-dlp
   */
  setupIpcListeners() {
    if (window.electronAPI && window.electronAPI.onDownloadProgress) {
      window.electronAPI.onDownloadProgress((data) => {
        this.handleProgressUpdate(data);
      });
    }
  }

  setupEventListeners() {
    // Open panel triggers
    this.dom.openTriggerBtn?.addEventListener('click', () => this.openPanel());
    this.dom.featureBannerBtn?.addEventListener('click', () => this.openPanel());

    // Close panel
    this.dom.closeBtn?.addEventListener('click', () => this.closePanel());
    this.dom.modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === this.dom.modalBackdrop) {
        this.closePanel();
      }
    });

    // Engine Diagnostics modal open/close
    this.dom.engineStatusBadge?.addEventListener('click', () => this.openEngineModal());
    this.dom.btnErrorGuide?.addEventListener('click', () => this.openEngineModal());
    this.dom.btnEngineModalClose?.addEventListener('click', () => this.closeEngineModal());
    this.dom.btnDiagDone?.addEventListener('click', () => this.closeEngineModal());
    this.dom.engineModalBackdrop?.addEventListener('click', (e) => {
      if (e.target === this.dom.engineModalBackdrop) {
        this.closeEngineModal();
      }
    });

    // Diagnostics modal tabs & copy button
    this.dom.tabWinGuide?.addEventListener('click', () => this.renderInstallationGuideTab('win'));
    this.dom.tabMacGuide?.addEventListener('click', () => this.renderInstallationGuideTab('mac'));
    this.dom.tabLinuxGuide?.addEventListener('click', () => this.renderInstallationGuideTab('linux'));

    this.dom.btnCopyGuideCommand?.addEventListener('click', async () => {
      const cmd = this.dom.guideCommandText?.textContent;
      if (cmd) {
        try {
          if (window.electronAPI && window.electronAPI.copyToClipboard) {
            await window.electronAPI.copyToClipboard(cmd);
          } else {
            await navigator.clipboard.writeText(cmd);
          }
          this.showToast('📋 Install command copied to clipboard');
        } catch (err) {
          this.showToast('Copied to clipboard');
        }
      }
    });

    this.dom.btnRescanDependencies?.addEventListener('click', async () => {
      this.dom.btnRescanDependencies.textContent = 'Scanning...';
      await this.checkSystemDependencies();
      this.dom.btnRescanDependencies.textContent = '🔄 Re-scan Binaries';
      this.showToast('System binaries scanned');
    });

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.isEngineModalOpen()) {
          this.closeEngineModal();
        } else if (this.isPanelOpen()) {
          this.closePanel();
        }
      }
    });

    // URL input typing and clear icon visibility
    this.dom.urlInput?.addEventListener('input', () => {
      const val = this.dom.urlInput.value.trim();
      this.dom.inputClearBtn?.classList.toggle('visible', val.length > 0);
      this.dom.inputWrapper?.classList.remove('has-error');
      if (this.dom.mediaErrorCard) this.dom.mediaErrorCard.style.display = 'none';
    });

    this.dom.urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.analyzeCurrentUrl();
      }
    });

    // Clear input button
    this.dom.inputClearBtn?.addEventListener('click', () => {
      this.resetAnalysisState();
      this.dom.urlInput?.focus();
    });

    // Clear All button
    this.dom.btnClearAll?.addEventListener('click', () => {
      this.resetAnalysisState();
      this.showToast('Panel and inputs reset');
    });

    // Analyze Button
    this.dom.btnAnalyze?.addEventListener('click', () => {
      this.analyzeCurrentUrl();
    });

    // ⚡ Quick Best Quality Button
    this.dom.btnQuickBest?.addEventListener('click', () => {
      this.executeQuickBestDownload();
    });

    // Error retry button
    this.dom.btnErrorRetry?.addEventListener('click', () => {
      this.analyzeCurrentUrl();
    });

    // Folder Selector
    this.dom.btnChangeFolder?.addEventListener('click', async () => {
      if (window.electronAPI && window.electronAPI.chooseDirectory) {
        const selected = await window.electronAPI.chooseDirectory();
        if (selected) {
          this.selectedDownloadPath = selected;
          if (this.dom.destinationPathText) {
            this.dom.destinationPathText.textContent = selected;
          }
          this.showToast(`📁 Destination: ${selected}`);
        }
      } else {
        this.showToast('Default download directory: ~/Downloads');
      }
    });

    this.dom.btnOpenDownloadsFolder?.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.openFolder) {
        window.electronAPI.openFolder(this.selectedDownloadPath);
      } else {
        this.showToast(`Downloads directory: ${this.selectedDownloadPath}`);
      }
    });

    // Clipboard Paste Button
    this.dom.pasteClipBtn?.addEventListener('click', async () => {
      try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
          text = await navigator.clipboard.readText();
        }
        if (text) {
          this.dom.urlInput.value = text;
          this.dom.inputClearBtn?.classList.add('visible');
          this.analyzeCurrentUrl();
        } else {
          this.showToast('Clipboard is empty');
        }
      } catch (err) {
        this.showToast('Please paste the URL manually');
      }
    });

    // Preset Link clicks
    this.dom.presetYt?.addEventListener('click', () => {
      this.dom.urlInput.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      this.dom.inputClearBtn?.classList.add('visible');
      this.analyzeCurrentUrl();
    });

    this.dom.presetIg?.addEventListener('click', () => {
      this.dom.urlInput.value = 'https://www.instagram.com/reel/C_vF8a9J3kL/';
      this.dom.inputClearBtn?.classList.add('visible');
      this.analyzeCurrentUrl();
    });

    // Format Tab Switches (Combined vs Video Only vs Audio Only)
    this.dom.tabCombinedFormats?.addEventListener('click', () => {
      this.switchFormatTab('combined');
    });

    this.dom.tabVideoFormats?.addEventListener('click', () => {
      this.switchFormatTab('video');
    });

    this.dom.tabAudioFormats?.addEventListener('click', () => {
      this.switchFormatTab('audio');
    });

    // Trigger Download
    this.dom.btnStartDownload?.addEventListener('click', () => {
      this.triggerDownloadExecution();
    });
  }

  openEngineModal() {
    this.dom.engineModalBackdrop?.classList.add('open');
  }

  closeEngineModal() {
    this.dom.engineModalBackdrop?.classList.remove('open');
  }

  isEngineModalOpen() {
    return this.dom.engineModalBackdrop?.classList.contains('open') || false;
  }

  switchFormatTab(type) {
    this.selectedFormatType = type;
    this.dom.tabCombinedFormats?.classList.toggle('active', type === 'combined');
    this.dom.tabVideoFormats?.classList.toggle('active', type === 'video');
    this.dom.tabAudioFormats?.classList.toggle('active', type === 'audio');
    this.renderFormatItems();
  }

  openPanel() {
    this.dom.modalBackdrop?.classList.add('open');
    setTimeout(() => {
      this.dom.urlInput?.focus();
    }, 200);
  }

  closePanel() {
    this.dom.modalBackdrop?.classList.remove('open');
  }

  isPanelOpen() {
    return this.dom.modalBackdrop?.classList.contains('open') || false;
  }

  setLinkAndPrompt(url) {
    if (this.dom.urlInput) {
      this.dom.urlInput.value = url;
      this.dom.inputClearBtn?.classList.add('visible');
    }
    this.openPanel();
    this.analyzeCurrentUrl();
  }

  /**
   * Analyzes the URL via Electron IPC (yt-dlp) with multi-step progress tracking
   */
  async analyzeCurrentUrl() {
    const url = this.dom.urlInput?.value.trim();

    if (!url) {
      this.dom.inputWrapper?.classList.add('has-error');
      this.showToast('Please enter a valid YouTube or Instagram link');
      return;
    }

    this.currentState = 'analyzing';
    this.setAnalyzingState(true);
    if (this.dom.mediaErrorCard) this.dom.mediaErrorCard.style.display = 'none';

    try {
      this.updateLoadingStep(1, 'Validating URL Format...', 'Detecting platform handler and endpoint');

      let result = null;
      if (window.electronAPI && window.electronAPI.analyzeUrl) {
        this.updateLoadingStep(2, 'Extracting Streams with yt-dlp...', 'Parsing video/audio streams, bitrates, and containers');
        result = await window.electronAPI.analyzeUrl(url);
      } else {
        this.updateLoadingStep(2, 'Querying Stream Matrix...', 'Simulating yt-dlp stream extraction in preview');
        result = await this.mockAnalyzeUrl(url);
      }

      if (result && result.success && result.data) {
        this.updateLoadingStep(3, 'Formats Ready', 'Rendered streams and qualities');
        this.currentState = 'ready';
        this.currentAnalyzedData = result.data;
        this.renderAnalyzedData(result.data);
        this.showToast(`✨ Analyzed ${result.data.platform} Media`);
      } else {
        this.currentState = 'error';
        const errType = result?.errorType || 'general';
        const errMsg = result?.error || 'Unable to extract stream metadata from this URL. Please verify that the link is accessible.';
        this.showErrorCard(errMsg, errType);
      }
    } catch (err) {
      console.error('[YAS Downloader] Error analyzing URL:', err);
      this.currentState = 'error';
      this.showErrorCard(err.message || 'An unexpected error occurred during stream extraction.', 'general');
    } finally {
      this.setAnalyzingState(false);
    }
  }

  /**
   * ⚡ Smart Best Quality Download: Automatically identifies and downloads highest available resolution with audio
   */
  async executeQuickBestDownload() {
    const url = this.dom.urlInput?.value.trim();
    if (!url) {
      this.dom.inputWrapper?.classList.add('has-error');
      this.showToast('Please enter a media link first');
      return;
    }

    if (!this.currentAnalyzedData) {
      await this.analyzeCurrentUrl();
    }

    if (this.currentAnalyzedData) {
      // Pick best combined format or top stream
      const combined = this.currentAnalyzedData.formats?.combined;
      if (combined && combined.length > 0) {
        this.selectedFormatType = 'combined';
        // Pick first which is highest resolution + fps
        this.selectedFormat = combined[0];
      } else {
        const anyFmt = Object.values(this.currentAnalyzedData.formats).flat();
        this.selectedFormat = anyFmt[0];
      }

      this.showToast(`⚡ Selected Best Quality: ${this.selectedFormat?.qualityLabel || 'Top Stream'}`);
      this.triggerDownloadExecution();
    }
  }

  setAnalyzingState(isLoading) {
    const btn = this.dom.btnAnalyze;
    const btnQuick = this.dom.btnQuickBest;
    const loadingCard = this.dom.analysisLoadingCard;

    if (btn) btn.disabled = isLoading;
    if (btnQuick) btnQuick.disabled = isLoading;

    if (loadingCard) {
      loadingCard.style.display = isLoading ? 'flex' : 'none';
    }

    if (isLoading) {
      this.dom.resultContainer?.classList.remove('active');
    }
  }

  updateLoadingStep(stepNum, title, sub) {
    if (this.dom.loadingPhaseTitle) this.dom.loadingPhaseTitle.textContent = title;
    if (this.dom.loadingPhaseSub) this.dom.loadingPhaseSub.textContent = sub;

    this.dom.step1Dot?.classList.toggle('active', stepNum >= 1);
    this.dom.step2Dot?.classList.toggle('active', stepNum >= 2);
    this.dom.step3Dot?.classList.toggle('active', stepNum >= 3);
  }

  showErrorCard(errorMessage, errorType = 'general') {
    if (!this.dom.mediaErrorCard) return;

    let title = 'Extraction Failed';
    if (errorType === 'age_restricted') title = 'Age-Restricted Video';
    else if (errorType === 'private') title = 'Private or Deleted Media';
    else if (errorType === 'login_required') title = 'Login Authentication Required';
    else if (errorType === 'geo_blocked') title = 'Geo-Restricted Content';
    else if (errorType === 'rate_limited') title = 'Rate Limited (HTTP 429)';
    else if (errorType === 'invalid_url') title = 'Unsupported or Invalid URL';
    else if (errorType === 'network_error') title = 'Network Connection Error';

    if (this.dom.errorTitle) this.dom.errorTitle.textContent = title;
    if (this.dom.errorDescription) this.dom.errorDescription.textContent = errorMessage;

    this.dom.mediaErrorCard.style.display = 'flex';
    this.dom.mediaErrorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Renders the analyzed media metadata and format picker
   */
  renderAnalyzedData(data) {
    if (!this.dom.resultContainer) return;

    this.dom.mediaTitle.textContent = data.title;
    this.dom.mediaCreator.innerHTML = `<span>👤</span><span>${data.uploader}</span>`;
    this.dom.mediaThumbnail.src = data.thumbnail;
    this.dom.mediaDuration.textContent = data.durationString || '0:00';

    // Platform styling
    if (data.platform && data.platform.includes('Instagram')) {
      this.dom.mediaPlatform.className = 'media-platform-badge ig';
      this.dom.mediaPlatform.textContent = '📸 ' + data.platform;
    } else {
      this.dom.mediaPlatform.className = 'media-platform-badge yt';
      this.dom.mediaPlatform.textContent = '▶️ ' + (data.platform || 'YouTube');
    }

    // Best resolution badge
    const topCombined = data.formats?.combined?.[0];
    if (topCombined && this.dom.bestAvailableBadge) {
      if (topCombined.height >= 2160) {
        this.dom.bestAvailableBadge.textContent = '✨ 4K UHD Available';
        this.dom.bestAvailableBadge.style.display = 'inline-flex';
      } else if (topCombined.height >= 1440) {
        this.dom.bestAvailableBadge.textContent = '✨ 2K QHD Available';
        this.dom.bestAvailableBadge.style.display = 'inline-flex';
      } else if (topCombined.height >= 1080) {
        this.dom.bestAvailableBadge.textContent = '✨ 1080p Full HD Available';
        this.dom.bestAvailableBadge.style.display = 'inline-flex';
      } else {
        this.dom.bestAvailableBadge.textContent = `✨ ${topCombined.qualityLabel} Available`;
        this.dom.bestAvailableBadge.style.display = 'inline-flex';
      }
    }

    // Default to Combined format tab
    this.selectedFormatType = 'combined';
    this.dom.tabCombinedFormats?.classList.add('active');
    this.dom.tabVideoFormats?.classList.remove('active');
    this.dom.tabAudioFormats?.classList.remove('active');
    this.renderFormatItems();

    this.dom.resultContainer.classList.add('active');
    this.dom.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  renderFormatItems() {
    const container = this.dom.formatsListContainer;
    if (!container || !this.currentAnalyzedData) return;

    container.innerHTML = '';
    const formats = this.currentAnalyzedData.formats[this.selectedFormatType] || [];

    if (!formats || formats.length === 0) {
      container.innerHTML = `<div class="empty-text-sub" style="padding: 18px; text-align: center;">No ${this.selectedFormatType} formats available for this media.</div>`;
      return;
    }

    // Select first by default if not set or not in current tab
    if (!this.selectedFormat || !formats.some((f) => f.formatId === this.selectedFormat.formatId)) {
      this.selectedFormat = formats[0];
    }

    formats.forEach((fmt) => {
      const card = document.createElement('div');
      const isSelected = this.selectedFormat?.formatId === fmt.formatId;
      card.className = `format-item-card ${isSelected ? 'selected' : ''}`;
      
      const metaDetails = [];
      if (fmt.resolution) metaDetails.push(`Res: ${fmt.resolution}`);
      if (fmt.fps) metaDetails.push(`${fmt.fps} fps`);
      if (fmt.vcodec && fmt.vcodec !== 'N/A') metaDetails.push(`Codec: ${fmt.vcodec}`);
      if (fmt.acodec && fmt.acodec !== 'N/A') metaDetails.push(`Audio: ${fmt.acodec}`);
      if (fmt.ext) metaDetails.push(`Ext: ${fmt.ext.toUpperCase()}`);

      // Determine quality tag class
      let qualityClass = 'quality-tag-standard';
      if (fmt.height >= 2160) qualityClass = 'quality-tag-4k';
      else if (fmt.height >= 1440) qualityClass = 'quality-tag-1080p';
      else if (fmt.height >= 1080) qualityClass = 'quality-tag-1080p';
      else if (fmt.height >= 720) qualityClass = 'quality-tag-720p';
      else if (this.selectedFormatType === 'audio') qualityClass = 'quality-tag-audio';

      card.innerHTML = `
        <div class="format-item-left">
          <div class="custom-radio-circle"></div>
          <div class="format-info-col">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="format-label-title">${fmt.qualityLabel}</span>
              <span class="quality-tag ${qualityClass}">${fmt.ext ? fmt.ext.toUpperCase() : 'MP4'}</span>
            </div>
            <span class="format-meta-sub">${metaDetails.join(' • ')}</span>
            ${fmt.note ? `<span class="format-meta-sub" style="color: var(--accent-primary); font-size: 10.5px;">${fmt.note}</span>` : ''}
          </div>
        </div>
        <div class="format-size-tag">${fmt.filesizeStr || 'Best Quality'}</div>
      `;

      card.addEventListener('click', () => {
        this.selectedFormat = fmt;
        container.querySelectorAll('.format-item-card').forEach((el) => el.classList.remove('selected'));
        card.classList.add('selected');
      });

      container.appendChild(card);
    });
  }

  /**
   * Complete reset of panel inputs, results, and active states
   */
  resetAnalysisState() {
    if (this.dom.urlInput) this.dom.urlInput.value = '';
    this.dom.inputClearBtn?.classList.remove('visible');
    this.dom.inputWrapper?.classList.remove('has-error');
    this.dom.resultContainer?.classList.remove('active');
    if (this.dom.mediaErrorCard) this.dom.mediaErrorCard.style.display = 'none';
    if (this.dom.analysisLoadingCard) this.dom.analysisLoadingCard.style.display = 'none';
    this.currentAnalyzedData = null;
    this.selectedFormat = null;
    this.currentState = 'idle';
  }

  /**
   * Initializes real download execution through yt-dlp IPC
   */
  async triggerDownloadExecution() {
    if (!this.currentAnalyzedData || !this.selectedFormat) {
      this.showToast('Please select a format to download');
      return;
    }

    const downloadId = 'dl_' + Date.now();
    const downloadItem = {
      id: downloadId,
      title: this.currentAnalyzedData.title,
      format: this.selectedFormat.qualityLabel,
      platform: this.currentAnalyzedData.platform,
      filesize: this.selectedFormat.filesizeStr || 'Estimating...',
      progress: 0,
      speed: '0.0 MB/s',
      eta: '--:--',
      phase: 'downloading', // 'downloading' | 'merging' | 'converting' | 'completed' | 'error' | 'cancelled'
      status: 'downloading',
      filePath: null,
      savePath: `${this.selectedDownloadPath}/${this.sanitizeFilename(this.currentAnalyzedData.title)}.${this.selectedFormat.ext || 'mp4'}`
    };

    this.downloads.unshift(downloadItem);
    this.activeDownloadCount++;
    this.updateDownloadBadge();
    this.renderDownloadQueue();

    this.showToast(`🚀 Starting download: ${this.selectedFormat.qualityLabel}`);

    if (window.electronAPI && window.electronAPI.startDownload) {
      try {
        await window.electronAPI.startDownload({
          downloadId,
          url: this.currentAnalyzedData.url,
          formatId: this.selectedFormat.formatId,
          isAudioOnly: this.selectedFormatType === 'audio',
          outputFolder: this.selectedDownloadPath,
          title: this.currentAnalyzedData.title,
          ext: this.selectedFormat.ext
        });
      } catch (err) {
        console.error('[YAS Downloader] Failed to start download:', err);
        downloadItem.status = 'error';
        downloadItem.phase = 'error';
        downloadItem.errorMessage = err.message || 'Download execution error';
        this.updateProgressCardDOM(downloadItem);
      }
    } else {
      // Run browser simulator if running outside Electron
      this.simulateDownloadProgress(downloadId);
    }
  }

  /**
   * Handles real progress events dispatched by Electron main process
   */
  handleProgressUpdate(data) {
    const item = this.downloads.find((d) => d.id === data.downloadId);
    if (!item) return;

    item.progress = Math.round(data.percent || 0);
    item.speed = data.speed || item.speed;
    item.eta = data.eta || item.eta;
    item.downloadedStr = data.downloadedStr || `${item.progress}%`;
    item.status = data.status || item.status;
    item.phase = data.phase || (data.status === 'completed' ? 'finished' : 'downloading');
    if (data.filePath) item.filePath = data.filePath;
    if (data.error) item.errorMessage = data.error;

    if (data.status === 'completed') {
      item.progress = 100;
      item.phase = 'finished';
      this.activeDownloadCount = Math.max(0, this.activeDownloadCount - 1);
      this.updateDownloadBadge();
      this.showToast(`✅ Download complete: ${item.title.substring(0, 32)}...`);
    } else if (data.status === 'error') {
      item.phase = 'error';
      this.activeDownloadCount = Math.max(0, this.activeDownloadCount - 1);
      this.updateDownloadBadge();
      this.showToast(`❌ Download failed: ${data.error || 'Check network connection'}`);
    }

    this.updateProgressCardDOM(item);
  }

  simulateDownloadProgress(downloadId) {
    const item = this.downloads.find((d) => d.id === downloadId);
    if (!item) return;

    let progress = 0;
    const totalSizeMB = parseFloat(item.filesize) || 64.0;

    const interval = setInterval(() => {
      if (item.status === 'cancelled' || item.status === 'completed') {
        clearInterval(interval);
        return;
      }

      const speedMBs = (14.5 + Math.random() * 6.2).toFixed(1);
      const step = (Math.random() * 5.0 + 3.5);
      progress = Math.min(100, progress + step);
      
      const downloadedMB = ((progress / 100) * totalSizeMB).toFixed(1);
      const remainingSecs = Math.max(0, Math.round((totalSizeMB - downloadedMB) / speedMBs));

      item.progress = Math.round(progress);
      item.speed = `${speedMBs} MB/s`;
      item.eta = `00:${remainingSecs.toString().padStart(2, '0')}s`;
      item.downloadedStr = `${downloadedMB} MB / ${totalSizeMB} MB`;

      if (progress >= 85 && progress < 98 && item.format.includes('4K')) {
        item.phase = 'merging';
      } else {
        item.phase = 'downloading';
      }

      this.updateProgressCardDOM(item);

      if (progress >= 100) {
        clearInterval(interval);
        item.status = 'completed';
        item.phase = 'finished';
        item.progress = 100;
        this.activeDownloadCount = Math.max(0, this.activeDownloadCount - 1);
        this.updateDownloadBadge();
        this.updateProgressCardDOM(item);
        this.showToast(`✅ Download Completed: ${item.title.substring(0, 32)}...`);
      }
    }, 250);
  }

  renderDownloadQueue() {
    const container = this.dom.downloadQueueList;
    const emptyState = this.dom.emptyQueuePlaceholder;
    if (!container) return;

    if (this.downloads.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = '';
    this.downloads.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'download-progress-card';
      card.id = `card_${item.id}`;
      
      const isFinished = item.status === 'completed' || item.phase === 'finished';

      card.innerHTML = `
        <div class="download-card-header">
          <div class="download-title-area">
            <div class="download-item-title">${item.title}</div>
            <div class="download-item-status" id="status_${item.id}">
              ${this.renderPhaseBadge(item)}
            </div>
          </div>
          <div class="download-card-actions">
            ${!isFinished ? `
              <button class="mini-action-btn" title="Cancel Download" id="btn_cancel_${item.id}">✕</button>
            ` : `
              <button class="mini-action-btn" title="Show in Folder" id="btn_reveal_${item.id}">📂</button>
            `}
          </div>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="fill_${item.id}" style="width: ${item.progress}%"></div>
        </div>
        <div class="progress-stats-row">
          <span class="progress-speed-text" id="speed_${item.id}">${isFinished ? 'Complete' : item.speed}</span>
          <span id="bytes_${item.id}">${item.downloadedStr || item.filesize}</span>
          <span class="progress-percent-badge" id="pct_${item.id}">${item.progress}%</span>
        </div>
        ${isFinished ? `
          <div class="download-complete-actions">
            <button class="btn-open-file-primary" id="btn_open_file_${item.id}">Open File</button>
            <button class="btn-show-folder-subtle" id="btn_open_folder_${item.id}">Show in Folder</button>
          </div>
        ` : ''}
      `;

      setTimeout(() => {
        const cancelBtn = card.querySelector(`#btn_cancel_${item.id}`);
        const revealBtn = card.querySelector(`#btn_reveal_${item.id}`);
        const openFileBtn = card.querySelector(`#btn_open_file_${item.id}`);
        const openFolderBtn = card.querySelector(`#btn_open_folder_${item.id}`);

        cancelBtn?.addEventListener('click', async () => {
          item.status = 'cancelled';
          item.phase = 'canceled';
          if (window.electronAPI && window.electronAPI.cancelDownload) {
            await window.electronAPI.cancelDownload(item.id);
          }
          this.activeDownloadCount = Math.max(0, this.activeDownloadCount - 1);
          this.updateDownloadBadge();
          this.updateProgressCardDOM(item);
          this.showToast('Download cancelled');
        });

        const handleShowInFolder = () => {
          if (window.electronAPI && window.electronAPI.showInFolder && item.filePath) {
            window.electronAPI.showInFolder(item.filePath);
          } else if (window.electronAPI && window.electronAPI.openFolder) {
            window.electronAPI.openFolder(this.selectedDownloadPath);
          } else {
            this.showToast(`Saved to ${item.filePath || item.savePath}`);
          }
        };

        revealBtn?.addEventListener('click', handleShowInFolder);
        openFolderBtn?.addEventListener('click', handleShowInFolder);

        openFileBtn?.addEventListener('click', () => {
          if (window.electronAPI && window.electronAPI.showInFolder && item.filePath) {
            window.electronAPI.showInFolder(item.filePath);
          } else {
            this.showToast(`Opening: ${item.title}`);
          }
        });
      }, 0);

      container.appendChild(card);
    });
  }

  renderPhaseBadge(item) {
    if (item.status === 'completed' || item.phase === 'finished') {
      return `<span class="phase-badge finished">✓ Completed</span> • <span style="color: var(--text-secondary)">${item.format}</span>`;
    }
    if (item.status === 'error' || item.phase === 'error') {
      return `<span class="phase-badge error">✕ Failed</span> • <span style="color: var(--text-secondary)">${item.errorMessage || item.format}</span>`;
    }
    if (item.status === 'cancelled' || item.phase === 'canceled') {
      return `<span class="phase-badge canceled">Canceled</span>`;
    }
    if (item.phase === 'merging') {
      return `<span class="phase-badge merging">⚡ Merging Streams (FFmpeg)</span> • <span style="color: var(--text-secondary)">${item.format}</span>`;
    }
    if (item.phase === 'converting') {
      return `<span class="phase-badge converting">🎵 Extracting Audio</span> • <span style="color: var(--text-secondary)">${item.format}</span>`;
    }
    return `<span class="phase-badge downloading">Downloading</span> • <span>${item.format}</span> • <span>${item.eta}</span>`;
  }

  updateProgressCardDOM(item) {
    const fill = document.getElementById(`fill_${item.id}`);
    const pct = document.getElementById(`pct_${item.id}`);
    const speed = document.getElementById(`speed_${item.id}`);
    const bytes = document.getElementById(`bytes_${item.id}`);
    const status = document.getElementById(`status_${item.id}`);

    if (fill) fill.style.width = `${item.progress}%`;
    if (pct) pct.textContent = `${item.progress}%`;
    if (speed) speed.textContent = item.status === 'completed' ? 'Finished' : item.speed;
    if (bytes) bytes.textContent = item.downloadedStr || item.filesize;
    if (status) status.innerHTML = this.renderPhaseBadge(item);

    if (item.status === 'completed' || item.status === 'error') {
      const card = document.getElementById(`card_${item.id}`);
      if (card && !card.querySelector(`#btn_open_file_${item.id}`)) {
        this.renderDownloadQueue();
      }
    }
  }

  updateDownloadBadge() {
    const badge = this.dom.downloadCounter;
    if (badge) {
      badge.textContent = this.activeDownloadCount;
      badge.style.display = this.activeDownloadCount > 0 ? 'inline-flex' : 'none';
    }
  }

  sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 48);
  }

  showToast(message) {
    if (window.yasBrowser && window.yasBrowser.showToast) {
      window.yasBrowser.showToast(message);
    }
  }

  /**
   * High-Fidelity Browser Preview Fallback Extractor (Only used when running in web preview without Electron backend)
   */
  async mockAnalyzeUrl(url) {
    await new Promise((r) => setTimeout(r, 650));

    const isInstagram = /instagram\.com/i.test(url);
    const isShorts = /shorts/i.test(url);

    if (isInstagram) {
      return {
        success: true,
        data: {
          id: 'ig_7741',
          url: url,
          title: 'Cinematic Visual Architecture & Cyberpunk Urban Design',
          uploader: '@neon_hyperstructure',
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
          duration: 38,
          durationString: '0:38',
          platform: 'Instagram Reel',
          formats: {
            combined: [
              { formatId: 'ig_1080p', ext: 'mp4', resolution: '1080x1920', height: 1080, fps: 60, vcodec: 'H.264', acodec: 'AAC', qualityLabel: '1080p Full HD Reel (60fps HDR)', filesizeStr: '28.4 MB', isBest: true, note: 'Original Instagram High Bitrate Stream' },
              { formatId: 'ig_720p', ext: 'mp4', resolution: '720x1280', height: 720, fps: 30, vcodec: 'H.264', acodec: 'AAC', qualityLabel: '720p Standard HD Reel', filesizeStr: '14.2 MB', note: 'Standard Mobile Compatibility' }
            ],
            video: [
              { formatId: 'ig_vid_only_1080', ext: 'mp4', resolution: '1080x1920', height: 1080, fps: 60, vcodec: 'H.264', qualityLabel: '1080p Video Stream (No Audio)', filesizeStr: '24.1 MB', note: 'Visual Stream Only' }
            ],
            audio: [
              { formatId: 'extract_mp3_320', ext: 'mp3', abr: 320, acodec: 'MP3 320k', qualityLabel: 'Extract MP3 (320 kbps Studio Quality)', filesizeStr: '3.8 MB', isExtract: true, note: 'Direct Master Soundtrack' },
              { formatId: 'extract_m4a_best', ext: 'm4a', abr: 256, acodec: 'AAC 256k', qualityLabel: 'Extract Apple AAC (256 kbps M4A)', filesizeStr: '2.1 MB', isExtract: true, note: 'Apple Lossless container' }
            ]
          }
        }
      };
    }

    return {
      success: true,
      data: {
        id: 'yt_8842',
        url: url,
        title: isShorts ? 'Stunning 60-Second 4K HDR Urban Drone Hyperlapse' : 'YAS Desktop Architecture: High Performance Browser & Media Engine',
        uploader: 'YAS Engineering Core',
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
        duration: isShorts ? 58 : 724,
        durationString: isShorts ? '0:58' : '12:04',
        platform: isShorts ? 'YouTube Shorts' : 'YouTube',
        formats: {
          combined: [
            { formatId: 'bestvideo[height<=2160]+bestaudio/best', ext: 'mp4', resolution: '3840x2160', height: 2160, fps: 60, vcodec: 'AV1 / VP9', acodec: 'Opus/AAC', qualityLabel: '4K Ultra HD (2160p 60fps HDR)', filesizeStr: '482.5 MB', isBest: true, note: 'Merged Video + Audio Master' },
            { formatId: 'bestvideo[height<=1080]+bestaudio/best', ext: 'mp4', resolution: '1920x1080', height: 1080, fps: 60, vcodec: 'H.264', acodec: 'AAC', qualityLabel: '1080p Full HD (60fps Crystal Clear)', filesizeStr: '118.2 MB', note: 'Recommended Desktop Quality' },
            { formatId: 'bestvideo[height<=720]+bestaudio/best', ext: 'mp4', resolution: '1280x720', height: 720, fps: 30, vcodec: 'H.264', acodec: 'AAC', qualityLabel: '720p HD Ready', filesizeStr: '54.1 MB', note: 'Fast Download Speed' }
          ],
          video: [
            { formatId: 'yt_raw_4k', ext: 'mp4', resolution: '3840x2160', height: 2160, fps: 60, vcodec: 'AV1 (av01)', qualityLabel: '4K Pure Video Stream (No Audio)', filesizeStr: '430 MB', note: 'DASH Video Stream' },
            { formatId: 'yt_raw_1080', ext: 'mp4', resolution: '1920x1080', height: 1080, fps: 60, vcodec: 'H.264 (avc1)', qualityLabel: '1080p Pure Video Stream (No Audio)', filesizeStr: '98 MB', note: 'DASH Video Stream' }
          ],
          audio: [
            { formatId: 'extract_mp3_320', ext: 'mp3', abr: 320, acodec: 'MP3 320k', qualityLabel: 'Extract MP3 (320 kbps Studio Quality)', filesizeStr: '32.4 MB', isExtract: true, note: 'High Bitrate Music Audio' },
            { formatId: 'extract_m4a_best', ext: 'm4a', abr: 256, acodec: 'AAC M4A', qualityLabel: 'Extract Apple AAC (256 kbps M4A)', filesizeStr: '24.1 MB', isExtract: true, note: 'Crisp Audio Master' }
          ]
        }
      }
    };
  }
}

// Global Downloader Instance
window.mediaDownloader = new MediaDownloader();
