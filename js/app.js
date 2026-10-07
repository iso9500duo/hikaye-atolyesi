/**
 * HİKÂYE ATÖLYESİ - ANA UYGULAMA YÖNETİCİSİ (APP.JS)
 * 
 * Tüm modülleri (Havuz, Üretim Motoru, Değerlendirme Motoru, Ses ve Konfeti)
 * bir araya getiren ana orkestrasyon mantığı.
 */

import { poolRandomizer } from './pools.js';
import { storyEngine } from './storyEngine.js';
import { EvaluationEngine } from './evaluationEngine.js';
import { soundManager } from './soundEffects.js';
import { triggerConfetti } from './confetti.js';

class HikayeAtolyesiApp {
  constructor() {
    this.evaluationEngine = new EvaluationEngine(storyEngine);

    // Uygulama Durumu (State)
    this.state = {
      currentStep: 1,
      selections: {
        olay: null,
        kisiler: null,
        mekan: null,
        zaman: null
      },
      currentOptions: {
        olay: [],
        kisiler: [],
        mekan: [],
        zaman: []
      },
      generatedStory: null,
      studentStory: {
        title: '',
        text: ''
      },
      checklist: Array(9).fill(false),
      evaluationResult: null
    };

    this.categories = ['olay', 'kisiler', 'mekan', 'zaman'];
    this.autoSaveTimer = null;
  }

  init() {
    this._loadSavedState();
    this._initializeOptions();
    this._setupEventListeners();
    this._updateUISelections();
    this._updateStats();
    this._updateChecklistUI();
    this._updateSoundButtonUI();
    this._setupStepper();

    console.log("Hikâye Atölyesi başarıyla başlatıldı.");
  }

  // =========================================================================
  // BAŞLANGIÇ & SEÇENEK YÖNETİMİ
  // =========================================================================

  _initializeOptions() {
    this.categories.forEach(cat => {
      if (!this.state.currentOptions[cat] || this.state.currentOptions[cat].length === 0) {
        this.state.currentOptions[cat] = poolRandomizer.getRandomOptions(cat, 4);
      }
      this._renderOptions(cat);
    });
  }

  _renderOptions(category) {
    const container = document.getElementById(`options-${category}`);
    if (!container) return;

    container.classList.remove('fade-transition');
    void container.offsetWidth; // DOM reflow
    container.classList.add('fade-transition');

    container.innerHTML = '';
    const options = this.state.currentOptions[category];
    const currentSelected = this.state.selections[category];

    options.forEach(opt => {
      const isSelected = currentSelected === opt;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `option-item ${isSelected ? 'selected' : ''}`;
      button.innerHTML = `
        <span>${this._escapeHtml(opt)}</span>
        <div class="option-check">${isSelected ? '✓' : ''}</div>
      `;

      button.addEventListener('click', () => {
        this._selectOption(category, opt);
      });

      container.appendChild(button);
    });
  }

  _selectOption(category, value) {
    // Eğer aynı seçeneğe tıklandıysa durumunu koru veya değiştir
    this.state.selections[category] = value;
    soundManager.playSelect();
    
    // UI Güncelle
    this._renderOptions(category);
    this._updateUISelections();
    this._saveDraftToStorage();

    // 4/4 Kontrolü
    const count = this._getSelectedCount();
    if (count === 4) {
      soundManager.playSuccess();
      triggerConfetti();
    }
  }

  _refreshCategory(category, buttonElement) {
    if (buttonElement) {
      buttonElement.classList.add('spinning');
      setTimeout(() => buttonElement.classList.remove('spinning'), 600);
    }

    soundManager.playShuffle();
    this.state.currentOptions[category] = poolRandomizer.getRandomOptions(category, 4);

    // Eğer seçili olan seçenek yeni listede yoksa, seçimi kaldır
    if (this.state.selections[category] && !this.state.currentOptions[category].includes(this.state.selections[category])) {
      this.state.selections[category] = null;
    }

    this._renderOptions(category);
    this._updateUISelections();
    this._saveDraftToStorage();
  }

  _getSelectedCount() {
    return Object.values(this.state.selections).filter(v => v !== null && v !== '').length;
  }

  _updateUISelections() {
    const count = this._getSelectedCount();
    const isComplete = count === 4;

    // Rozet Güncelle
    const badge = document.getElementById('gamification-badge');
    const badgeText = document.getElementById('badge-text');
    const badgeIcon = document.getElementById('badge-icon');

    if (badge && badgeText && badgeIcon) {
      if (isComplete) {
        badge.classList.add('completed');
        badgeIcon.textContent = '🎉';
        badgeText.textContent = 'Hikâyenin temelini oluşturdun!';
      } else {
        badge.classList.remove('completed');
        badgeIcon.textContent = '🎯';
        badgeText.textContent = `${count} / 4 unsur seçildi`;
      }
    }

    // Özet Hapları (Pills)
    this.categories.forEach(cat => {
      const val = this.state.selections[cat];
      const pill = document.getElementById(`summary-pill-${cat}`);
      const valElem = document.getElementById(`summary-val-${cat}`);
      const reminderElem = document.getElementById(`reminder-val-${cat}`);
      const tableElem = document.getElementById(`table-val-${cat}`);

      if (pill && valElem) {
        if (val) {
          pill.classList.remove('empty');
          pill.classList.add('filled');
          valElem.textContent = val;
        } else {
          pill.classList.remove('filled');
          pill.classList.add('empty');
          valElem.textContent = 'Henüz seçilmedi';
        }
      }

      if (reminderElem) {
        reminderElem.textContent = val || 'Seçilmedi';
      }

      if (tableElem) {
        tableElem.textContent = val || '-';
      }
    });

    // Buton & Uyarı Durumu
    const btnGenerate = document.getElementById('btn-generate-story');
    const alertBox = document.getElementById('selection-alert');

    if (btnGenerate && alertBox) {
      if (isComplete) {
        btnGenerate.disabled = false;
        alertBox.style.display = 'none';
      } else {
        btnGenerate.disabled = true;
        alertBox.style.display = 'inline-flex';
      }
    }
  }

  // =========================================================================
  // ADIM 2: HİKÂYE OLUŞTURMA & GÖSTERİMİ
  // =========================================================================

  async handleGenerateStory() {
    if (this._getSelectedCount() < 4) {
      alert("Hikâyeni oluşturmak için lütfen 4 yapı unsurundan da birer seçim yap.");
      return;
    }

    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('active');

    // Yükleme adımlarını sıfırla
    for (let i = 1; i <= 4; i++) {
      const stepElem = document.getElementById(`load-step-${i}`);
      if (stepElem) {
        stepElem.className = 'loading-step-item';
      }
    }

    try {
      const result = await storyEngine.generateStory(
        this.state.selections,
        (stepIndex, message) => {
          this._updateLoadingStep(stepIndex);
        }
      );

      this.state.generatedStory = result;
      this._displayGeneratedStory(result);

      // Yükleme bitti
      setTimeout(() => {
        if (overlay) overlay.classList.remove('active');
        this.goToStep(2);
        soundManager.playSuccess();
        triggerConfetti();
      }, 500);

    } catch (err) {
      console.error("Hikâye oluşturma hatası:", err);
      if (overlay) overlay.classList.remove('active');
      alert("Hikâye oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.");
    }
  }

  _updateLoadingStep(stepIndex) {
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`load-step-${i}`);
      if (!el) continue;
      if (i < stepIndex) {
        el.className = 'loading-step-item done';
        el.querySelector('span').textContent = '✅';
      } else if (i === stepIndex) {
        el.className = 'loading-step-item active';
        el.querySelector('span').textContent = '⏳';
      } else {
        el.className = 'loading-step-item';
        el.querySelector('span').textContent = '⚪';
      }
    }
  }

  _displayGeneratedStory(storyData) {
    const titleEl = document.getElementById('story-display-title');
    const proseEl = document.getElementById('story-prose-content');
    const providerEl = document.getElementById('story-provider-info');

    if (titleEl) titleEl.textContent = storyData.title || "İsimsiz Hikâye";
    if (providerEl) providerEl.textContent = `Üretim: ${storyData.provider || 'Hikâye Atölyesi Motoru'}`;

    if (proseEl) {
      proseEl.innerHTML = '';
      const paragraphs = (storyData.content || '').split(/\n\s*\n/).filter(p => p.trim().length > 0);
      paragraphs.forEach(p => {
        const pTag = document.createElement('p');
        pTag.textContent = p.trim();
        proseEl.appendChild(pTag);
      });
    }

    // Tabloyu güncelle
    this._updateUISelections();
  }

  // =========================================================================
  // SESLENDİRME, KOPYALAMA & İNDİRME
  // =========================================================================

  handleToggleSpeech() {
    if (!this.state.generatedStory) return;

    const readBtn = document.getElementById('btn-read-aloud');
    const readText = document.getElementById('read-text');
    const readIcon = document.getElementById('read-icon');

    if (soundManager.isSpeaking) {
      soundManager.stopSpeaking();
      if (readText) readText.textContent = 'Sesli Dinle';
      if (readIcon) readIcon.textContent = '🔊';
      if (readBtn) readBtn.classList.remove('active');
    } else {
      const fullText = `${this.state.generatedStory.title}. ${this.state.generatedStory.content}`;
      soundManager.speakText(
        fullText,
        () => {
          if (readText) readText.textContent = 'Durdur';
          if (readIcon) readIcon.textContent = '⏹️';
          if (readBtn) readBtn.classList.add('active');
        },
        () => {
          if (readText) readText.textContent = 'Sesli Dinle';
          if (readIcon) readIcon.textContent = '🔊';
          if (readBtn) readBtn.classList.remove('active');
        }
      );
    }
  }

  handleCopyStory() {
    if (!this.state.generatedStory) return;
    const textToCopy = `${this.state.generatedStory.title}\n\n${this.state.generatedStory.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert("Örnek hikâye panoya kopyalandı!");
    }).catch(() => {
      alert("Metin kopyalanamadı.");
    });
  }

  handleDownloadStory() {
    if (!this.state.generatedStory) return;
    const title = this.state.generatedStory.title || "Hikaye";
    const content = `HİKÂYE ATÖLYESİ - ÖRNEK HİKÂYE\n============================\nBAŞLIK: ${title}\n\nYAPI UNSURLARI:\n- Olay: ${this.state.selections.olay}\n- Kişi: ${this.state.selections.kisiler}\n- Mekân: ${this.state.selections.mekan}\n- Zaman: ${this.state.selections.zaman}\n\n----------------------------\n\n${this.state.generatedStory.content}\n`;
    this._downloadTextFile(`${title.replace(/[\s/]/g, '_')}.txt`, content);
  }

  handlePrintStory() {
    window.print();
  }

  _downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // =========================================================================
  // ADIM 3: ÖĞRENCİ YAZIM ALANI & İSTATİSTİKLER
  // =========================================================================

  _updateStats() {
    const title = (document.getElementById('student-story-title')?.value || '').trim();
    const text = (document.getElementById('student-story-text')?.value || '').trim();

    this.state.studentStory.title = title;
    this.state.studentStory.text = text;

    const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
    const chars = text ? text.length : 0;
    const paragraphs = text ? text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0;

    const wordEl = document.getElementById('stat-words');
    const charEl = document.getElementById('stat-chars');
    const paraEl = document.getElementById('stat-paragraphs');

    if (wordEl) wordEl.textContent = words;
    if (charEl) charEl.textContent = chars;
    if (paraEl) paraEl.textContent = paragraphs;

    this._triggerAutoSave();
  }

  _triggerAutoSave() {
    const statusEl = document.getElementById('autosave-status');
    if (statusEl) statusEl.textContent = '💾 Kaydediliyor...';

    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this._saveDraftToStorage();
      if (statusEl) statusEl.textContent = '💾 Taslak yerel olarak kaydedildi';
    }, 700);
  }

  // =========================================================================
  // KONTROL LİSTESİ (CHECKLIST)
  // =========================================================================

  _updateChecklistUI() {
    let checkedCount = 0;
    for (let i = 1; i <= 9; i++) {
      const chk = document.getElementById(`check-${i}`);
      if (chk) {
        if (chk.checked) checkedCount++;
        this.state.checklist[i - 1] = chk.checked;
      }
    }

    const pct = Math.round((checkedCount / 9) * 100);
    const fill = document.getElementById('checklist-progress-fill');
    const text = document.getElementById('checklist-count-text');

    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${checkedCount} / 9 Kriter Sağlandı (%${pct})`;

    if (checkedCount === 9) {
      soundManager.playSuccess();
    }
  }

  // =========================================================================
  // ADIM 4: AI İLE GERİ BİLDİRİM VE DEĞERLENDİRME
  // =========================================================================

  async handleStartEvaluation() {
    const title = this.state.studentStory.title;
    const text = this.state.studentStory.text;

    if (!text || text.trim().length < 40) {
      alert("Lütfen değerlendirme yapmadan önce en az birkaç cümle veya paragraf içeren hikâyeni yaz.");
      document.getElementById('student-story-text')?.focus();
      return;
    }

    const btn = document.getElementById('btn-start-evaluation');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Hikâyen İnceleniyor...</span>';
    }

    try {
      const result = await this.evaluationEngine.evaluateStory(title, text, this.state.selections);
      this.state.evaluationResult = result;
      this._renderEvaluationResult(result);

      this.goToStep(4);
      soundManager.playSuccess();
      triggerConfetti();

    } catch (err) {
      console.error("Değerlendirme hatası:", err);
      alert(err.message || "Değerlendirme sırasında bir hata oluştu.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  _renderEvaluationResult(data) {
    // Skor & Rozet
    const scoreEl = document.getElementById('eval-overall-score');
    const badgeEl = document.getElementById('eval-badge-tag');
    if (scoreEl) scoreEl.textContent = data.overallScore ? data.overallScore.toFixed(1) : '8.5';
    if (badgeEl) badgeEl.textContent = data.badge || 'Genç Yazar 🖋️';

    // 9 Rubrik Kartı
    const rubricContainer = document.getElementById('rubric-cards-grid');
    if (rubricContainer && data.rubric) {
      rubricContainer.innerHTML = '';
      data.rubric.forEach(item => {
        const card = document.createElement('div');
        card.className = 'rubric-card';
        card.innerHTML = `
          <div class="rubric-card-top">
            <span class="rubric-card-title">${this._escapeHtml(item.category)}</span>
            <span class="rubric-score-pill">${item.score} / 10</span>
          </div>
          <div class="rubric-bar">
            <div class="rubric-bar-fill" style="width: ${item.score * 10}%;"></div>
          </div>
          <p class="rubric-card-comment">${this._escapeHtml(item.comment)}</p>
        `;
        rubricContainer.appendChild(card);
      });
    }

    // Genel Değerlendirme
    const generalEl = document.getElementById('eval-general-review');
    if (generalEl) generalEl.textContent = data.generalReview || '';

    // Güçlü Yönler
    const strengthsEl = document.getElementById('eval-strengths-list');
    if (strengthsEl && data.strengths) {
      strengthsEl.innerHTML = '';
      data.strengths.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<span>✨</span> <span>${this._escapeHtml(s)}</span>`;
        strengthsEl.appendChild(li);
      });
    }

    // Geliştirilecek Yönler
    const improvementsEl = document.getElementById('eval-improvements-list');
    if (improvementsEl && data.improvements) {
      improvementsEl.innerHTML = '';
      data.improvements.forEach(imp => {
        const li = document.createElement('li');
        li.innerHTML = `<span>🎯</span> <span>${this._escapeHtml(imp)}</span>`;
        improvementsEl.appendChild(li);
      });
    }

    // Bir Sonraki Öneri
    const tipEl = document.getElementById('eval-next-tip');
    if (tipEl) tipEl.textContent = data.nextStoryTip || '';
  }

  handleDownloadEvaluationReport() {
    if (!this.state.evaluationResult) return;
    const res = this.state.evaluationResult;
    let report = `HİKÂYE ATÖLYESİ - PEDAGOJİK DEĞERLENDİRME RAPORU\n===================================================\n`;
    report += `Öğrenci Hikâye Başlığı: ${this.state.studentStory.title || 'İsimsiz'}\n`;
    report += `Genel Başarı Puanı: ${res.overallScore} / 10 (${res.badge})\n\n`;
    report += `SEÇİLEN 4 YAPI UNSURU:\n- Olay: ${this.state.selections.olay}\n- Kişiler: ${this.state.selections.kisiler}\n- Mekân: ${this.state.selections.mekan}\n- Zaman: ${this.state.selections.zaman}\n\n`;
    report += `---------------------------------------------------\n9 TEMEL KRİTER DEĞERLENDİRMESİ:\n`;
    res.rubric.forEach(r => {
      report += `\n* ${r.category} (${r.score}/10): ${r.comment}`;
    });
    report += `\n\n---------------------------------------------------\nGENEL DEĞERLENDİRME:\n${res.generalReview}\n\n`;
    report += `GÜÇLÜ YÖNLER:\n` + res.strengths.map(s => `- ${s}`).join('\n') + `\n\n`;
    report += `GELİŞTİRİLEBİLECEK YÖNLER:\n` + res.improvements.map(i => `- ${i}`).join('\n') + `\n\n`;
    report += `BİR SONRAKİ HİKÂYE İÇİN İPUCU:\n${res.nextStoryTip}\n`;

    this._downloadTextFile(`Degerlendirme_Raporu_${(this.state.studentStory.title || 'Hikaye').replace(/\s+/g, '_')}.txt`, report);
  }

  // =========================================================================
  // ADIM GEÇİŞLERİ (STEPPER NAVIGATION)
  // =========================================================================

  _setupStepper() {
    for (let i = 1; i <= 4; i++) {
      const btn = document.getElementById(`step-btn-${i}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.goToStep(i);
        });
      }
    }
  }

  goToStep(step) {
    this.state.currentStep = step;

    // Stepper çizgisi ve butonları güncelle
    const progressBar = document.getElementById('stepper-progress-bar');
    if (progressBar) {
      const percentages = [0, 0, 33.3, 66.6, 100];
      progressBar.style.width = `${percentages[step]}%`;
    }

    for (let i = 1; i <= 4; i++) {
      const btn = document.getElementById(`step-btn-${i}`);
      if (!btn) continue;
      btn.classList.remove('active', 'completed');
      if (i === step) {
        btn.classList.add('active');
      } else if (i < step) {
        btn.classList.add('completed');
      }
    }

    // Bölüm görünürlüklerini ayarla
    const heroSec = document.getElementById('hero');
    const selectSec = document.getElementById('selection-area');
    const storySec = document.getElementById('story-result-section');
    const writingSec = document.getElementById('writing-studio-section');
    const evalSec = document.getElementById('evaluation-result-section');

    if (step === 1) {
      if (heroSec) heroSec.style.display = 'block';
      if (selectSec) selectSec.style.display = 'block';
      if (storySec) storySec.classList.remove('active');
      if (writingSec) writingSec.classList.remove('active');
      if (evalSec) evalSec.classList.remove('active');
      selectSec?.scrollIntoView({ behavior: 'smooth' });
    } else if (step === 2) {
      if (heroSec) heroSec.style.display = 'none';
      if (selectSec) selectSec.style.display = 'none';
      if (storySec) storySec.classList.add('active');
      if (writingSec) writingSec.classList.remove('active');
      if (evalSec) evalSec.classList.remove('active');
      storySec?.scrollIntoView({ behavior: 'smooth' });
    } else if (step === 3) {
      if (heroSec) heroSec.style.display = 'none';
      if (selectSec) selectSec.style.display = 'none';
      if (storySec) storySec.classList.remove('active');
      if (writingSec) writingSec.classList.add('active');
      if (evalSec) evalSec.classList.remove('active');
      writingSec?.scrollIntoView({ behavior: 'smooth' });
    } else if (step === 4) {
      if (heroSec) heroSec.style.display = 'none';
      if (selectSec) selectSec.style.display = 'none';
      if (storySec) storySec.classList.remove('active');
      if (writingSec) writingSec.classList.remove('active');
      if (evalSec) evalSec.classList.add('active');
      evalSec?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // =========================================================================
  // SIFIRLAMA & YENİ HİKÂYE (12. YENİ HİKÂYE)
  // =========================================================================

  resetAll(promptConfirm = true) {
    if (promptConfirm && this.state.studentStory.text.length > 50) {
      const confirmReset = confirm("Yeni bir hikâye başlatmak istediğinize emin misiniz? Yazdığınız taslak sıfırlanacaktır.");
      if (!confirmReset) return;
    }

    soundManager.stopSpeaking();

    // Seçimleri temizle
    this.categories.forEach(cat => {
      this.state.selections[cat] = null;
      this.state.currentOptions[cat] = poolRandomizer.getRandomOptions(cat, 4);
      this._renderOptions(cat);
    });

    this.state.generatedStory = null;
    this.state.studentStory = { title: '', text: '' };
    this.state.evaluationResult = null;
    this.state.checklist = Array(9).fill(false);

    // Form alanlarını sıfırla
    const titleInput = document.getElementById('student-story-title');
    const textInput = document.getElementById('student-story-text');
    if (titleInput) titleInput.value = '';
    if (textInput) textInput.value = '';

    for (let i = 1; i <= 9; i++) {
      const chk = document.getElementById(`check-${i}`);
      if (chk) chk.checked = false;
    }

    this._updateUISelections();
    this._updateStats();
    this._updateChecklistUI();
    this._saveDraftToStorage();

    this.goToStep(1);
    soundManager.playShuffle();
  }

  // =========================================================================
  // LOCALSTORAGE KAYIT & YÜKLEME
  // =========================================================================

  _saveDraftToStorage() {
    try {
      const draft = {
        selections: this.state.selections,
        currentOptions: this.state.currentOptions,
        studentStory: this.state.studentStory,
        checklist: this.state.checklist
      };
      localStorage.setItem('hikaye_atolyesi_draft', JSON.stringify(draft));
    } catch {}
  }

  _loadSavedState() {
    try {
      const saved = localStorage.getItem('hikaye_atolyesi_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selections) this.state.selections = parsed.selections;
        if (parsed.currentOptions) this.state.currentOptions = parsed.currentOptions;
        if (parsed.studentStory) {
          this.state.studentStory = parsed.studentStory;
          const titleInput = document.getElementById('student-story-title');
          const textInput = document.getElementById('student-story-text');
          if (titleInput) titleInput.value = parsed.studentStory.title || '';
          if (textInput) textInput.value = parsed.studentStory.text || '';
        }
        if (parsed.checklist) {
          this.state.checklist = parsed.checklist;
          parsed.checklist.forEach((checked, idx) => {
            const chk = document.getElementById(`check-${idx + 1}`);
            if (chk) chk.checked = !!checked;
          });
        }
      }
    } catch {}
  }

  _updateSoundButtonUI() {
    const icon = document.getElementById('sound-icon');
    if (icon) {
      icon.textContent = soundManager.isSoundEnabled() ? '🔊' : '🔇';
    }
  }

  _escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================================================================
  // EVENT LISTENERS BAĞLANTILARI
  // =========================================================================

  _setupEventListeners() {
    // Hero Başla Butonu
    document.getElementById('btn-start-hero')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('selection-area')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Kategori Yenile Butonları
    document.querySelectorAll('.btn-refresh-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.getAttribute('data-category');
        if (cat) this._refreshCategory(cat, e.currentTarget);
      });
    });

    // Hikâyemi Oluştur Butonu (Step 1 -> Step 2)
    document.getElementById('btn-generate-story')?.addEventListener('click', () => {
      this.handleGenerateStory();
    });

    // Örnek Hikâye Araçları
    document.getElementById('btn-read-aloud')?.addEventListener('click', () => {
      this.handleToggleSpeech();
    });
    document.getElementById('btn-copy-story')?.addEventListener('click', () => {
      this.handleCopyStory();
    });
    document.getElementById('btn-download-story')?.addEventListener('click', () => {
      this.handleDownloadStory();
    });
    document.getElementById('btn-print-story')?.addEventListener('click', () => {
      this.handlePrintStory();
    });

    // "Şimdi Sıra Sende: Kendi Hikâyeni Yaz" Butonu (Step 2 -> Step 3)
    document.getElementById('btn-proceed-to-writing')?.addEventListener('click', () => {
      soundManager.stopSpeaking();
      this.goToStep(3);
    });

    // Öğrenci Yazım Alanı Dinleyicileri
    const titleInput = document.getElementById('student-story-title');
    const textInput = document.getElementById('student-story-text');

    titleInput?.addEventListener('input', () => this._updateStats());
    textInput?.addEventListener('input', () => this._updateStats());

    // Checklist Değişimleri
    for (let i = 1; i <= 9; i++) {
      document.getElementById(`check-${i}`)?.addEventListener('change', () => {
        this._updateChecklistUI();
        this._saveDraftToStorage();
      });
    }

    // "Hikâyemi Değerlendir" Butonu (Step 3 -> Step 4)
    document.getElementById('btn-start-evaluation')?.addEventListener('click', () => {
      this.handleStartEvaluation();
    });

    // Değerlendirme Raporu İşlemleri
    document.getElementById('btn-download-eval')?.addEventListener('click', () => {
      this.handleDownloadEvaluationReport();
    });
    document.getElementById('btn-print-eval')?.addEventListener('click', () => {
      window.print();
    });

    // "Yeni Hikâye Oluştur" Butonları
    document.getElementById('btn-new-story-flow')?.addEventListener('click', () => {
      this.resetAll(true);
    });
    document.getElementById('btn-reset-app')?.addEventListener('click', () => {
      this.resetAll(true);
    });

    // Ses Aç / Kapat Butonu
    document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
      const enabled = soundManager.toggleSound();
      this._updateSoundButtonUI();
    });

    // Ayarlar Modalı
    const settingsModal = document.getElementById('settings-modal');
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnClearSettings = document.getElementById('btn-clear-settings');
    const inputApiKey = document.getElementById('input-api-key');
    const selectModel = document.getElementById('select-model-name');

    btnOpenSettings?.addEventListener('click', () => {
      if (inputApiKey) inputApiKey.value = storyEngine.getApiKey();
      if (selectModel) selectModel.value = storyEngine.getModelName();
      settingsModal?.classList.add('active');
    });

    btnCloseSettings?.addEventListener('click', () => {
      settingsModal?.classList.remove('active');
    });

    btnSaveSettings?.addEventListener('click', () => {
      if (inputApiKey) storyEngine.setApiKey(inputApiKey.value);
      if (selectModel) storyEngine.setModelName(selectModel.value);
      settingsModal?.classList.remove('active');
      alert("Ayarlar kaydedildi.");
    });

    btnClearSettings?.addEventListener('click', () => {
      if (inputApiKey) inputApiKey.value = '';
      storyEngine.setApiKey('');
      alert("API anahtarı temizlendi. Yerel hikâye üretim motoru kullanılacak.");
    });

    settingsModal?.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
      }
    });
  }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
  const app = new HikayeAtolyesiApp();
  app.init();
});
