(() => {
  'use strict';

  const STORAGE = {
    progressPrefix: 'nclex-progress-',
    active: 'nclex-active-test',
    theme: 'nclex-theme',
    statVisibility: 'nclex-stat-visibility',
    textSize: 'nclex-text-size'
  };
  const DB_NAME = 'nclex-question-bank';
  const DB_VERSION = 1;
  const IMPORTED_STORE = 'importedFiles';

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const ui = {
    catalogView: $('catalogView'),
    examView: $('examView'),
    resultView: $('resultView'),
    testGrid: $('testGrid'),
    emptyState: $('emptyState'),
    catalogNotice: $('catalogNotice'),
    searchInput: $('searchInput'),
    localFileInput: $('localFileInput'),
    localUploadBtn: $('localUploadBtn'),
    clearProgressBtn: $('clearProgressBtn'),
    refreshCatalogBtn: $('refreshCatalogBtn'),
    backToListBtn: $('backToListBtn'),
    examFileName: $('examFileName'),
    themeBtn: $('themeBtn'),
    examThemeBtn: $('examThemeBtn'),
    examUtilityBar: $('examUtilityBar'),
    fullscreenExamBtn: $('fullscreenExamBtn'),
    examTextSizeUtilityBtn: $('examTextSizeUtilityBtn'),
    examThemeUtilityBtn: $('examThemeUtilityBtn'),
    markReviewBtn: $('markReviewBtn'),
    testMetaLine: $('testMetaLine'),
    qidDisplay: $('qidDisplay'),
    designedExamMain: $('designedExamMain'),
    tutoredToggle: $('tutoredToggle'),
    heroQbankRing: $('heroQbankRing'),
    heroDoneRing: $('heroDoneRing'),
    qbankUsagePercent: $('qbankUsagePercent'),
    doneCorrectPercent: $('doneCorrectPercent'),
    doneVsTotalLabel: $('doneVsTotalLabel'),
    totalQuestionsValue: $('totalQuestionsValue'),
    usedQuestionsValue: $('usedQuestionsValue'),
    usedQuestionsBadge: $('usedQuestionsBadge'),
    unusedQuestionsValue: $('unusedQuestionsValue'),
    unusedQuestionsBadge: $('unusedQuestionsBadge'),
    totalCorrectValue: $('totalCorrectValue'),
    totalCorrectBadge: $('totalCorrectBadge'),
    totalIncorrectValue: $('totalIncorrectValue'),
    totalIncorrectBadge: $('totalIncorrectBadge'),
    totalOmittedValue: $('totalOmittedValue'),
    totalOmittedBadge: $('totalOmittedBadge'),
    liveDarshanBtn: $('liveDarshanBtn'),
    liveDarshanBadgeText: $('liveDarshanBadgeText'),
    liveDarshanStatus: $('liveDarshanStatus'),
    gurbaniAudio: $('gurbaniAudio'),
    timeStat: $('timeStat'),
    progressStat: $('progressStat'),
    scoreStat: $('scoreStat'),
    progressBar: $('progressBar'),
    questionText: $('questionText'),
    questionIdBadge: $('questionIdBadge'),
    questionResultStrip: $('questionResultStrip'),
    questionResultTitle: $('questionResultTitle'),
    questionMarkStat: $('questionMarkStat'),
    questionRuleStat: $('questionRuleStat'),
    questionPercentStat: $('questionPercentStat'),
    questionTimeStat: $('questionTimeStat'),
    questionResultStat: $('questionResultStat'),
    questionMarksWrap: $('questionMarksWrap'),
    questionTimeWrap: $('questionTimeWrap'),
    questionStateWrap: $('questionStateWrap'),
    optionsList: $('optionsList'),
    feedbackCard: $('feedbackCard'),
    feedbackHeading: $('feedbackHeading'),
    feedbackBody: $('feedbackBody'),
    bottomBar: $('bottomBar'),
    prevBtn: $('prevBtn'),
    checkBtn: $('checkBtn'),
    nextBtn: $('nextBtn'),
    resultTitle: $('resultTitle'),
    resultScore: $('resultScore'),
    resultDetails: $('resultDetails'),
    resultStatsGrid: $('resultStatsGrid'),
    resultBackBtn: $('resultBackBtn'),
    resultReviewBtn: $('resultReviewBtn'),
    resultRetakeBtn: $('resultRetakeBtn'),
    loadingOverlay: $('loadingOverlay'),
    loadingText: $('loadingText')
  };

  let catalog = [];
  let activeTest = null;
  let questions = [];
  let state = freshState();
  let timerId = null;
  let statVisibility = { time: true, progress: true, score: true };
  let showExplanations = true;
  let catalogHeroMetrics = null;


  function freshState() {
    return {
      currentIndex: 0,
      answers: [],
      completed: [],
      correctCount: 0,
      seconds: 0,
      questionSeconds: [],
      marked: [],
      finished: false,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      savedAt: new Date().toISOString()
    };
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `test-${Date.now()}`;
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function addEvent(el, type, handler, options) {
    if (el) el.addEventListener(type, handler, options);
  }

  function showLoading(message) {
    if (!ui.loadingOverlay) return;
    ui.loadingText.textContent = message || 'Loading…';
    ui.loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    ui.loadingOverlay?.classList.add('hidden');
  }

  function showNotice(message, type = '') {
    if (!ui.catalogNotice) return;
    if (!message) {
      ui.catalogNotice.className = 'notice hidden';
      ui.catalogNotice.textContent = '';
      return;
    }
    ui.catalogNotice.className = `notice ${type || ''}`.trim();
    ui.catalogNotice.textContent = message;
  }

  function scrollExamToTop() {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }

  function clearCatalogDashboardSpacing() {
    [
      '--hero-collapse-progress',
      '--dash-anchor-space',
      '--dash-current-space',
      '--dash-current-height',
      '--dash-expanded-height',
      '--dash-collapsed-height',
      '--dash-collapse-distance',
      '--dash-live-space',
      '--dash-scroll-push-y'
    ].forEach((name) => document.body.style.removeProperty(name));
  }

  function restoreInlineStyle(name, value) {
    if (value) document.body.style.setProperty(name, value);
    else document.body.style.removeProperty(name);
  }

  function measureCatalogHeroMetrics() {
    const dashboard = document.querySelector('.final-dashboard-card');
    if (!dashboard) return null;

    const body = document.body;
    const previousCollapsed = body.classList.contains('hero-collapsed');
    const previousProgress = body.style.getPropertyValue('--hero-collapse-progress');
    const previousCurrentHeight = body.style.getPropertyValue('--dash-current-height');
    const previousCurrentSpace = body.style.getPropertyValue('--dash-current-space');
    const previousAnchorSpace = body.style.getPropertyValue('--dash-anchor-space');
    const previousLiveSpace = body.style.getPropertyValue('--dash-live-space');
    const previousPushY = body.style.getPropertyValue('--dash-scroll-push-y');

    body.classList.add('dashboard-measuring');
    ['--dash-current-height', '--dash-current-space', '--dash-anchor-space', '--dash-live-space', '--dash-scroll-push-y'].forEach((name) => body.style.removeProperty(name));

    body.classList.remove('hero-collapsed');
    body.style.setProperty('--hero-collapse-progress', '0');
    let rect = dashboard.getBoundingClientRect();
    const expandedTop = Math.max(rect.top, 0);
    const expandedHeight = Math.max(rect.height, 1);
    const expandedBottom = Math.max(rect.bottom, expandedHeight);

    body.classList.add('hero-collapsed');
    body.style.setProperty('--hero-collapse-progress', '1');
    rect = dashboard.getBoundingClientRect();
    const collapsedTop = Math.max(rect.top, 0);
    const measuredCollapsedHeight = Math.max(rect.height, 1);
    const measuredCollapsedBottom = Math.max(rect.bottom, measuredCollapsedHeight);

    if (previousCollapsed) body.classList.add('hero-collapsed');
    else body.classList.remove('hero-collapsed');
    restoreInlineStyle('--hero-collapse-progress', previousProgress);
    restoreInlineStyle('--dash-current-height', previousCurrentHeight);
    restoreInlineStyle('--dash-current-space', previousCurrentSpace);
    restoreInlineStyle('--dash-anchor-space', previousAnchorSpace);
    restoreInlineStyle('--dash-live-space', previousLiveSpace);
    restoreInlineStyle('--dash-scroll-push-y', previousPushY);
    body.classList.remove('dashboard-measuring');

    const top = Math.min(expandedTop, collapsedTop);
    const minimumRange = window.innerWidth <= 760 ? 86 : 108;
    const measuredRange = Math.max(expandedHeight - measuredCollapsedHeight, 0);
    const collapseDistance = Math.max(measuredRange, minimumRange);
    const collapsedHeight = Math.max(48, expandedHeight - collapseDistance);
    const collapsedBottom = top + collapsedHeight;

    return {
      viewportWidth: window.innerWidth,
      expandedTop: top,
      expandedHeight,
      expandedBottom,
      collapsedHeight,
      collapsedBottom,
      collapseDistance
    };
  }

  function ensureCatalogHeroMetrics() {
    if (!catalogHeroMetrics || Math.abs(catalogHeroMetrics.viewportWidth - window.innerWidth) > 2) {
      catalogHeroMetrics = measureCatalogHeroMetrics();
    }
    return catalogHeroMetrics;
  }



  function captureDashboardDonutRects() {
    const rects = new Map();
    document.querySelectorAll('.final-dashboard-card .dashboard-donut').forEach((el) => {
      rects.set(el, el.getBoundingClientRect());
    });
    return rects;
  }

  function animateDashboardDonutMorph(beforeRects) {
    if (!beforeRects || !beforeRects.size) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    document.querySelectorAll('.final-dashboard-card .dashboard-donut').forEach((el) => {
      const before = beforeRects.get(el);
      if (!before) return;
      const after = el.getBoundingClientRect();
      if (!before.width || !before.height || !after.width || !after.height) return;

      const beforeCenterX = before.left + before.width / 2;
      const beforeCenterY = before.top + before.height / 2;
      const afterCenterX = after.left + after.width / 2;
      const afterCenterY = after.top + after.height / 2;
      const deltaX = beforeCenterX - afterCenterX;
      const deltaY = beforeCenterY - afterCenterY;
      const scaleX = before.width / after.width;
      const scaleY = before.height / after.height;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 && Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) {
        return;
      }

      el.getAnimations?.().forEach((animation) => {
        if (animation.effect?.target === el) animation.cancel();
      });
      el.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
          { transform: 'translate(0, 0) scale(1, 1)' }
        ],
        {
          duration: 520,
          easing: 'cubic-bezier(.16, 1, .3, 1)',
          fill: 'both'
        }
      );
    });
  }

  function updateCatalogHeroCompactState() {
    const isCatalog = document.body.classList.contains('catalog-active');
    const scrollY = Math.max(window.scrollY || document.documentElement.scrollTop || 0, 0);

    if (!isCatalog) {
      document.body.classList.remove('hero-collapsed');
      clearCatalogDashboardSpacing();
      return;
    }

    const metrics = ensureCatalogHeroMetrics();
    const fallbackDistance = window.innerWidth <= 760 ? 110 : 140;
    const collapseDistance = Math.max(metrics?.collapseDistance || fallbackDistance, 1);
    const pushY = Math.min(scrollY, collapseDistance);
    const progress = Math.min(Math.max(pushY / collapseDistance, 0), 1);
    const expandedTop = metrics?.expandedTop ?? 0;
    const expandedHeight = metrics?.expandedHeight ?? (window.innerWidth <= 760 ? 206 : 252);
    const collapsedHeight = metrics?.collapsedHeight ?? Math.max(58, expandedHeight - collapseDistance);
    const currentHeight = Math.max(collapsedHeight, expandedHeight - pushY);
    const anchorSpace = expandedTop + expandedHeight;
    const currentSpace = expandedTop + currentHeight;

    document.body.style.setProperty('--hero-collapse-progress', progress.toFixed(4));
    document.body.style.setProperty('--dash-scroll-push-y', `${pushY.toFixed(2)}px`);
    document.body.style.setProperty('--dash-expanded-height', `${expandedHeight.toFixed(2)}px`);
    document.body.style.setProperty('--dash-collapsed-height', `${collapsedHeight.toFixed(2)}px`);
    document.body.style.setProperty('--dash-current-height', `${currentHeight.toFixed(2)}px`);
    document.body.style.setProperty('--dash-anchor-space', `${anchorSpace.toFixed(2)}px`);
    document.body.style.setProperty('--dash-current-space', `${currentSpace.toFixed(2)}px`);
    document.body.style.setProperty('--dash-live-space', `${currentSpace.toFixed(2)}px`);
    document.body.style.setProperty('--dash-collapse-distance', `${collapseDistance.toFixed(2)}px`);

    // The compact grid layout is only enabled at the very end. Until then, the
    // first question box pushes the dashboard height upward/downward with scroll.
    const shouldCollapse = progress > 0.985;
    const wasCollapsed = document.body.classList.contains('hero-collapsed');
    const donutRects = shouldCollapse !== wasCollapsed ? captureDashboardDonutRects() : null;
    document.body.classList.toggle('hero-collapsed', shouldCollapse);
    if (donutRects) animateDashboardDonutMorph(donutRects);
  }

  function bindCatalogHeroCompactBehavior() {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateCatalogHeroCompactState();
        ticking = false;
      });
    };
    const onResize = () => {
      catalogHeroMetrics = null;
      onScroll();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();
  }

  function showView(name) {
    [ui.catalogView, ui.examView, ui.resultView].forEach((view) => view?.classList.remove('active'));
    if (name === 'catalog') ui.catalogView?.classList.add('active');
    if (name === 'exam') ui.examView?.classList.add('active');
    if (name === 'result') ui.resultView?.classList.add('active');

    ui.bottomBar?.classList.toggle('hidden', name !== 'exam');
    ui.examUtilityBar?.classList.toggle('hidden', name !== 'exam');
    ui.backToListBtn?.classList.toggle('hidden', name === 'catalog');
    ui.examThemeBtn?.classList.toggle('hidden', name !== 'exam');
    ui.refreshCatalogBtn?.classList.toggle('hidden', false);
    document.body.classList.toggle('exam-active', name === 'exam');
    document.body.classList.toggle('catalog-active', name === 'catalog');
    document.body.classList.toggle('result-active', name === 'result');

    if (name === 'catalog') {
      questions = [];
      activeTest = null;
      state = freshState();
      updateStats();
      updateExamFileName();
    }

    updateExamFileName();
    const timeLabel = document.querySelector('[data-stat="time"] .metric-toggle-text:first-child');
    const questionLabel = document.querySelector('[data-stat="progress"] .metric-toggle-text:first-child');
    if (timeLabel) timeLabel.textContent = 'Time:';
    if (questionLabel) questionLabel.textContent = "Que's:";
    updateCatalogHeroCompactState();
    scrollExamToTop();
  }

  function updateExamFileName() {
    if (!ui.examFileName) return;
    const label = 'EXIT';
    const title = activeTest?.title || 'test list';
    ui.examFileName.textContent = label;
    if (ui.testMetaLine) ui.testMetaLine.textContent = activeTest?.title || 'NCLEX-RN';
    ui.backToListBtn?.setAttribute('aria-label', `Exit ${title} and go back to dashboard`);
    ui.backToListBtn?.setAttribute('title', 'EXIT — tap to go back');
  }

  function storageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Unable to save progress:', error);
      return false;
    }
  }

  function progressKey(testId) {
    return `${STORAGE.progressPrefix}${testId}`;
  }

  function getProgress(testId) {
    return storageGet(progressKey(testId), null);
  }

  function clearProgress(testId) {
    localStorage.removeItem(progressKey(testId));
    if (storageGet(STORAGE.active, null) === testId) localStorage.removeItem(STORAGE.active);
  }

  function clearAllProgress() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE.progressPrefix) || key === STORAGE.active)
      .forEach((key) => localStorage.removeItem(key));
  }

  function saveProgress() {
    if (!activeTest || activeTest.isTemporaryLocal) return;
    state.savedAt = new Date().toISOString();
    storageSet(progressKey(activeTest.id), state);
    storageSet(STORAGE.active, activeTest.id);
    window.NCLEX_ACCESS?.syncClientEvent?.('progress_saved', { activeTestId: activeTest.id });
    updateStats();
  }

  function normalizeCatalogItem(item, index) {
    const file = item.file || item.path || item.url || '';
    const fallbackTitle = file ? file.split('/').pop().replace(/\.[^/.]+$/, '') : `Test ${index + 1}`;
    const title = item.title || item.name || fallbackTitle || 'Untitled test';
    const id = item.id || slugify(file || title || `test-${index + 1}`);
    const format = String(item.format || file.split('.').pop() || 'json').toLowerCase();
    const tags = Array.isArray(item.tags)
      ? item.tags
      : String(item.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);

    return {
      id,
      title,
      file,
      description: item.description || '',
      tags,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
      questions: Number(item.questions || item.questionCount || 0),
      format,
      source: item.source || (item.content ? 'imported' : 'catalog'),
      content: item.content || '',
      importedAt: item.importedAt || null,
      isTemporaryLocal: Boolean(item.isTemporaryLocal)
    };
  }

  function catalogDedupKey(item) {
    const fileName = String(item.file || item.path || item.url || '')
      .split(/[\\/]/)
      .pop()
      .replace(/\.[^.]+$/i, '');
    return slugify(item.title || item.name || fileName || item.id || '');
  }

  function sourcePriority(item) {
    if (item.source === 'catalog') return 40;
    if (item.source === 'imported') return 20;
    if (item.source === 'github') return 10;
    return 0;
  }

  function mergeCatalogItems(...groups) {
    const merged = new Map();

    for (const group of groups) {
      for (const item of group || []) {
        if (!item || !(item.file || item.path || item.url || item.content)) continue;

        const normalized = normalizeCatalogItem(item, merged.size);
        const supported = /^(json|txt)$/i.test(normalized.format) || /\.(json|txt)$/i.test(normalized.file || '');
        if (!supported) continue;

        const key = catalogDedupKey(normalized);
        if (!key) continue;

        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, normalized);
          continue;
        }

        const existingPriority = sourcePriority(existing);
        const newPriority = sourcePriority(normalized);
        const keepNew = newPriority > existingPriority || (!existing.questions && normalized.questions);

        merged.set(key, keepNew ? {
          ...existing,
          ...normalized,
          questions: normalized.questions || existing.questions,
          tags: normalized.tags?.length ? normalized.tags : existing.tags,
          description: normalized.description || existing.description,
          order: normalized.order || existing.order
        } : {
          ...normalized,
          ...existing,
          questions: existing.questions || normalized.questions,
          tags: existing.tags?.length ? existing.tags : normalized.tags,
          description: existing.description || normalized.description,
          order: existing.order || normalized.order
        });
      }
    }

    return [...merged.values()].sort((a, b) => {
      const orderDiff = Number(a.order || 9999) - Number(b.order || 9999);
      if (orderDiff) return orderDiff;
      return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  async function fetchText(url, options) {
    const response = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: {
        Accept: 'application/json,text/plain,*/*',
        ...(options?.headers || {})
      }
    });
    if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`);
    return response.text();
  }

  function progressSummary(test) {
    const progress = getProgress(test.id);
    const completed = Array.isArray(progress?.completed) ? progress.completed.filter(Boolean).length : 0;
    const total = Math.max(
      Number(test.questions || 0),
      progress?.completed?.length || 0,
      progress?.answers?.length || 0
    );
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const scorePct = completed ? Math.round((Number(progress.correctCount || 0) / completed) * 100) : 0;
    const status = progress ? (progress.finished || pct === 100 ? 'done' : 'resume') : 'new';
    return { status, pct, attempted: completed, scorePct, total };
  }

  async function getDetailedProgressSummary(test) {
    const progress = getProgress(test.id);
    const base = progressSummary(test);
    if (!progress) {
      return {
        ...base,
        correctCount: 0,
        partialCount: 0,
        incorrectCount: 0,
        unansweredCount: Math.max(base.total, 0)
      };
    }

    const savedAnswers = Array.isArray(progress.answers) ? progress.answers : [];
    const total = Math.max(
      Number(test.questions || 0),
      progress?.completed?.length || 0,
      savedAnswers.length || 0
    );

    try {
      const testQuestions = await loadQuestionsForTest(test);
      let attempted = 0;
      let correctCount = 0;
      let partialCount = 0;
      let incorrectCount = 0;
      const effectiveTotal = Math.max(total, testQuestions.length || 0);
      const limit = Math.min(savedAnswers.length, testQuestions.length);

      for (let index = 0; index < limit; index += 1) {
        const answer = savedAnswers[index];
        if (!hasAnyAnswer(answer)) continue;
        attempted += 1;
        const outcome = getQuestionOutcome(testQuestions[index], answer);
        if (outcome === 'correct') correctCount += 1;
        else if (outcome === 'partial') partialCount += 1;
        else if (outcome === 'incorrect') incorrectCount += 1;
      }

      const pct = effectiveTotal ? Math.round((attempted / effectiveTotal) * 100) : 0;
      const scorePct = attempted ? Math.round((correctCount / attempted) * 100) : 0;
      const status = progress ? (progress.finished || pct === 100 ? 'done' : 'resume') : 'new';
      return {
        status,
        pct,
        attempted,
        scorePct,
        total: effectiveTotal,
        correctCount,
        partialCount,
        incorrectCount,
        unansweredCount: Math.max(effectiveTotal - attempted, 0)
      };
    } catch (error) {
      console.info('Detailed progress summary fallback:', error);
      const attempted = base.attempted;
      const correctCount = Math.max(0, Number(progress.correctCount || 0));
      const partialCount = 0;
      const incorrectCount = Math.max(attempted - correctCount, 0);
      return {
        ...base,
        correctCount,
        partialCount,
        incorrectCount,
        unansweredCount: Math.max(base.total - attempted, 0)
      };
    }
  }


  function hasAnyAnswer(answer) {
    return Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined;
  }

  function getQuestionOutcome(question, answer) {
    if (!question || !hasAnyAnswer(answer)) return 'unanswered';
    if (isAnswerCorrect(question, answer)) return 'correct';

    if ((question.correct?.length || 0) > 1 && Array.isArray(answer)) {
      const selected = [...new Set(answer)].filter((index) => Number.isInteger(index));
      const hasOverlap = selected.some((index) => question.correct.includes(index));
      if (hasOverlap) return 'partial';
    }

    return 'incorrect';
  }

  async function computeCatalogOverviewStats() {
    const totals = {
      totalQuestions: 0,
      usedQuestions: 0,
      unusedQuestions: 0,
      correctQuestions: 0,
      incorrectQuestions: 0,
      omittedQuestions: 0
    };

    for (const test of catalog) {
      const progress = getProgress(test.id);
      let testQuestions = [];
      let testTotal = Number(test.questions || 0);

      try {
        if (progress || !testTotal) {
          testQuestions = await loadQuestionsForTest(test);
          testTotal = Math.max(testTotal, testQuestions.length || 0);
        }
      } catch (error) {
        console.info('Overview question-load fallback:', error);
      }

      const savedAnswers = Array.isArray(progress?.answers) ? progress.answers : [];
      const completed = Array.isArray(progress?.completed) ? progress.completed : [];
      testTotal = Math.max(testTotal, savedAnswers.length || 0, completed.length || 0);
      totals.totalQuestions += testTotal;

      if (!progress) continue;

      const maxProgressLength = Math.max(savedAnswers.length, completed.length, testQuestions.length || 0);
      let fallbackCorrectRemaining = Math.max(0, Number(progress.correctCount || 0));

      for (let index = 0; index < maxProgressLength; index += 1) {
        const answer = savedAnswers[index];
        const answered = hasAnyAnswer(answer);
        const completedQuestion = Boolean(completed[index]);
        const used = answered || completedQuestion;
        if (!used) continue;

        totals.usedQuestions += 1;

        if (!answered) {
          totals.incorrectQuestions += 1;
          continue;
        }

        if (testQuestions[index]) {
          const outcome = getQuestionOutcome(testQuestions[index], answer);
          if (outcome === 'correct') totals.correctQuestions += 1;
          else if (outcome === 'partial') totals.omittedQuestions += 1;
          else totals.incorrectQuestions += 1;
        } else if (fallbackCorrectRemaining > 0) {
          totals.correctQuestions += 1;
          fallbackCorrectRemaining -= 1;
        } else {
          totals.incorrectQuestions += 1;
        }
      }
    }

    totals.unusedQuestions = Math.max(totals.totalQuestions - totals.usedQuestions, 0);
    return totals;
  }

  function setDashboardText(element, value) {
    if (element) element.textContent = String(value);
  }

  function setDashboardBadge(element, value) {
    if (element) element.textContent = `${value}%`;
  }

  function animateHeroOverview(stats) {
    if (animateHeroOverview._frame) cancelAnimationFrame(animateHeroOverview._frame);

    const totalQuestions = Math.max(Number(stats.totalQuestions || 0), 0);
    const usedQuestions = Math.max(Number(stats.usedQuestions || 0), 0);
    const unusedQuestions = Math.max(Number(stats.unusedQuestions ?? (totalQuestions - usedQuestions), 0), 0);
    const correctQuestions = Math.max(Number(stats.correctQuestions || 0), 0);
    const incorrectQuestions = Math.max(Number(stats.incorrectQuestions || 0), 0);
    const omittedQuestions = Math.max(Number(stats.omittedQuestions || 0), 0);
    const resolvedQuestions = Math.max(correctQuestions + incorrectQuestions + omittedQuestions, 0);

    const usedPercent = totalQuestions ? Math.round((usedQuestions / totalQuestions) * 100) : 0;
    const unusedPercent = totalQuestions ? Math.round((unusedQuestions / totalQuestions) * 100) : 0;
    const correctPercent = resolvedQuestions ? Math.round((correctQuestions / resolvedQuestions) * 100) : 0;
    const incorrectPercent = resolvedQuestions ? Math.round((incorrectQuestions / resolvedQuestions) * 100) : 0;
    const omittedPercent = resolvedQuestions ? Math.round((omittedQuestions / resolvedQuestions) * 100) : 0;

    const usedRing = ui.heroQbankRing;
    const doneRing = ui.heroDoneRing;
    const duration = 1250;
    const start = performance.now();
    const finalCorrectEnd = resolvedQuestions ? (correctQuestions / resolvedQuestions) * 360 : 0;
    const finalIncorrectEnd = resolvedQuestions ? ((correctQuestions + incorrectQuestions) / resolvedQuestions) * 360 : 0;
    const finalOmittedEnd = resolvedQuestions ? 360 : 0;

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentUsed = Math.round(usedQuestions * eased);
      const currentUnused = Math.round(unusedQuestions * eased);
      const currentCorrect = Math.round(correctQuestions * eased);
      const currentIncorrect = Math.round(incorrectQuestions * eased);
      const currentOmitted = Math.round(omittedQuestions * eased);
      const currentUsedPercent = Math.round(usedPercent * eased);
      const currentUnusedPercent = Math.round(unusedPercent * eased);
      const currentCorrectPercent = Math.round(correctPercent * eased);
      const currentIncorrectPercent = Math.round(incorrectPercent * eased);
      const currentOmittedPercent = Math.round(omittedPercent * eased);
      const currentUsedAngle = (usedPercent * 3.6) * eased;
      const currentCorrectEnd = finalCorrectEnd * eased;
      const currentIncorrectEnd = finalIncorrectEnd * eased;
      const currentOmittedEnd = finalOmittedEnd * eased;

      setDashboardText(ui.totalQuestionsValue, totalQuestions);
      setDashboardText(ui.usedQuestionsValue, currentUsed);
      setDashboardBadge(ui.usedQuestionsBadge, currentUsedPercent);
      setDashboardText(ui.unusedQuestionsValue, currentUnused);
      setDashboardBadge(ui.unusedQuestionsBadge, currentUnusedPercent);
      setDashboardText(ui.totalCorrectValue, currentCorrect);
      setDashboardBadge(ui.totalCorrectBadge, currentCorrectPercent);
      setDashboardText(ui.totalIncorrectValue, currentIncorrect);
      setDashboardBadge(ui.totalIncorrectBadge, currentIncorrectPercent);
      setDashboardText(ui.totalOmittedValue, currentOmitted);
      setDashboardBadge(ui.totalOmittedBadge, currentOmittedPercent);

      if (ui.qbankUsagePercent) ui.qbankUsagePercent.textContent = `${currentUsedPercent}%`;
      if (usedRing) usedRing.style.setProperty('--used-angle', `${currentUsedAngle}deg`);

      if (ui.doneCorrectPercent) ui.doneCorrectPercent.textContent = `${currentCorrectPercent}%`;
      if (ui.doneVsTotalLabel) ui.doneVsTotalLabel.textContent = 'CORRECT';
      if (doneRing) {
        doneRing.style.setProperty('--correct-end', `${currentCorrectEnd}deg`);
        doneRing.style.setProperty('--incorrect-end', `${currentIncorrectEnd}deg`);
        doneRing.style.setProperty('--omitted-end', `${currentOmittedEnd}deg`);
        doneRing.style.setProperty('--partial-end', `${currentIncorrectEnd}deg`);
      }

      if (progress < 1) {
        animateHeroOverview._frame = requestAnimationFrame(step);
      }
    }

    animateHeroOverview._frame = requestAnimationFrame(step);
  }

  function resetHeroOverview() {
    if (animateHeroOverview._frame) cancelAnimationFrame(animateHeroOverview._frame);
    if (ui.qbankUsagePercent) ui.qbankUsagePercent.textContent = '0%';
    if (ui.doneCorrectPercent) ui.doneCorrectPercent.textContent = '0%';
    if (ui.doneVsTotalLabel) ui.doneVsTotalLabel.textContent = 'CORRECT';
    [ui.totalQuestionsValue, ui.usedQuestionsValue, ui.unusedQuestionsValue, ui.totalCorrectValue, ui.totalIncorrectValue, ui.totalOmittedValue]
      .forEach((element) => setDashboardText(element, 0));
    [ui.usedQuestionsBadge, ui.unusedQuestionsBadge, ui.totalCorrectBadge, ui.totalIncorrectBadge, ui.totalOmittedBadge]
      .forEach((element) => setDashboardBadge(element, 0));
    if (ui.heroQbankRing) ui.heroQbankRing.style.setProperty('--used-angle', '0deg');
    if (ui.heroDoneRing) {
      ui.heroDoneRing.style.setProperty('--correct-end', '0deg');
      ui.heroDoneRing.style.setProperty('--incorrect-end', '0deg');
      ui.heroDoneRing.style.setProperty('--omitted-end', '0deg');
      ui.heroDoneRing.style.setProperty('--partial-end', '0deg');
    }
  }

  function observeOnceWhenVisible(target, callback, options = {}) {
    const element = target instanceof Element ? target : null;
    if (!element || typeof callback !== 'function') return;
    const threshold = options.threshold ?? 0.25;
    const rootMargin = options.rootMargin ?? '0px 0px -8% 0px';

    if (typeof IntersectionObserver !== 'function') {
      callback();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        observer.disconnect();
        callback();
      });
    }, { threshold, rootMargin });

    observer.observe(element);
  }

  function animateHeroOverviewWhenVisible(stats) {
    const heroTarget = ui.heroDoneRing?.closest('.hero-card') || ui.heroQbankRing || ui.heroDoneRing;
    observeOnceWhenVisible(heroTarget, () => animateHeroOverview(stats), { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  }

  function animateTestCardOrbs(card, detail) {
    if (!card) return;
    if (card._orbAnimationFrame) cancelAnimationFrame(card._orbAnimationFrame);

    const doneValue = card.querySelector('.test-done-value');
    const usagePie = card.querySelector('.test-usage-pie');
    const correctValue = card.querySelector('.test-correct-value');
    const correctOrb = card.querySelector('.test-correct-orb');
    const usedTotalValue = card.querySelector('.test-used-total-value');
    const correctCountValue = card.querySelector('.test-correct-count-value');
    const incorrectCountValue = card.querySelector('.test-incorrect-count-value');
    const partialCountValue = card.querySelector('.test-partial-count-value');
    const usedBadge = card.querySelector('.test-used-row .test-mini-badge');
    const resultBadges = card.querySelectorAll('.test-result-stats .test-mini-stat-row:not(.test-used-row) .test-mini-badge');
    const duration = 1100;
    const start = performance.now();
    const targetTotal = Math.max(Number(detail.total || 0), 0);
    const targetAttempted = Math.max(Number(detail.attempted || 0), 0);
    const targetUnused = Math.max(targetTotal - targetAttempted, 0);
    const targetCorrect = Math.max(Number(detail.correctCount || 0), 0);
    const targetPartial = Math.max(Number(detail.partialCount || 0), 0);
    const targetIncorrect = Math.max(Number(detail.incorrectCount || 0), 0);
    const targetDonePercent = targetTotal ? Math.round((targetAttempted / targetTotal) * 100) : 0;
    const targetUnusedPercent = targetTotal ? Math.round((targetUnused / targetTotal) * 100) : 0;
    const targetCorrectPercent = targetAttempted ? Math.round((targetCorrect / targetAttempted) * 100) : 0;
    const targetIncorrectPercent = targetAttempted ? Math.round((targetIncorrect / targetAttempted) * 100) : 0;
    const targetPartialPercent = targetAttempted ? Math.round((targetPartial / targetAttempted) * 100) : 0;
    const finalCorrectEnd = targetAttempted ? (targetCorrect / targetAttempted) * 360 : 0;
    const finalIncorrectEnd = targetAttempted ? ((targetCorrect + targetIncorrect) / targetAttempted) * 360 : 0;
    const finalPartialEnd = targetAttempted ? 360 : 0;

    function setText(node, value) { if (node) node.textContent = String(value); }
    function setBadge(node, value) { if (node) node.textContent = `${value}%`; }

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentAttempted = Math.round(targetAttempted * eased);
      const currentUnused = Math.round(targetUnused * eased);
      const currentCorrect = Math.round(targetCorrect * eased);
      const currentIncorrect = Math.round(targetIncorrect * eased);
      const currentPartial = Math.round(targetPartial * eased);
      const currentDonePercent = Math.round(targetDonePercent * eased);
      const currentUnusedPercent = Math.round(targetUnusedPercent * eased);
      const currentCorrectPercent = Math.round(targetCorrectPercent * eased);
      const currentIncorrectPercent = Math.round(targetIncorrectPercent * eased);
      const currentPartialPercent = Math.round(targetPartialPercent * eased);
      const currentDoneAngle = (targetDonePercent * 3.6) * eased;
      const currentCorrectEnd = finalCorrectEnd * eased;
      const currentIncorrectEnd = finalIncorrectEnd * eased;
      const currentPartialEnd = finalPartialEnd * eased;
      const hasAnimatedData = currentPartialEnd > 0.01;

      setText(doneValue, `${currentDonePercent}%`);
      setText(usedTotalValue, `${currentAttempted} / ${targetTotal}`);
      setText(correctCountValue, currentCorrect);
      setText(incorrectCountValue, currentIncorrect);
      setText(partialCountValue, currentPartial);
      setBadge(usedBadge, currentDonePercent);
      setBadge(resultBadges[0], currentCorrectPercent);
      setBadge(resultBadges[1], currentIncorrectPercent);
      setBadge(resultBadges[2], currentPartialPercent);

      if (usagePie) usagePie.style.setProperty('--test-used-angle', `${currentDoneAngle}deg`);
      if (correctValue) correctValue.textContent = `${currentCorrectPercent}%`;
      if (correctOrb) {
        correctOrb.classList.toggle('has-data', hasAnimatedData);
        correctOrb.classList.toggle('is-empty', !hasAnimatedData);
        correctOrb.style.setProperty('--test-correct-correct-end', `${currentCorrectEnd}deg`);
        correctOrb.style.setProperty('--test-correct-partial-end', `${currentIncorrectEnd}deg`);
        correctOrb.style.setProperty('--test-correct-incorrect-end', `${currentPartialEnd}deg`);
      }

      if (progress < 1) {
        card._orbAnimationFrame = requestAnimationFrame(step);
      }
    }

    card._orbAnimationFrame = requestAnimationFrame(step);
  }

  async function loadCatalogFile() {
    const raw = await fetchText(`data/tests.json?v=${Date.now()}`);
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : (parsed.tests || []);
    return items.map((item) => ({ ...item, source: item.source || 'catalog' }));
  }

  async function loadCatalog() {
    showLoading('Loading question list…');
    showNotice('');
    try {
      const [catalogItems, githubItems, importedItems] = await Promise.all([
        loadCatalogFile().catch((error) => {
          console.info('Catalog unavailable:', error);
          return [];
        }),
        discoverFromGitHub().catch((error) => {
          console.info('GitHub auto-discovery unavailable:', error);
          return [];
        }),
        getImportedFiles().catch((error) => {
          console.info('Imported files unavailable:', error);
          return [];
        })
      ]);

      catalog = mergeCatalogItems(catalogItems, importedItems, githubItems);
      renderCatalog();

      if (!catalog.length) {
        const localMessage = location.protocol === 'file:'
          ? 'No files found. Use Import files, or publish this folder with GitHub Pages.'
          : 'No files found. Add .json/.txt files to the questions folder or use Import files.';
        showNotice(localMessage, 'error');
      } else if (githubItems.length && catalogItems.length) {
        showNotice('');
      }
    } catch (error) {
      catalog = [];
      renderCatalog();
      showNotice(`${error.message}. Use Import files or publish via GitHub Pages.`, 'error');
    } finally {
      hideLoading();
    }
  }

  function renderCatalog() {
    ui.testGrid.innerHTML = '';
    ui.emptyState.classList.toggle('hidden', catalog.length > 0);

    resetHeroOverview();

    computeCatalogOverviewStats()
      .then((stats) => animateHeroOverviewWhenVisible(stats))
      .catch((error) => console.info('Unable to compute overview stats:', error));

    const term = ui.searchInput.value.trim().toLowerCase();
    const filtered = catalog.filter((test) => {
      const haystack = [test.title, test.description, ...(test.tags || [])].join(' ').toLowerCase();
      return haystack.includes(term);
    });

    if (catalog.length && !filtered.length) {
      ui.emptyState.classList.remove('hidden');
      ui.emptyState.querySelector('h2').textContent = 'No matching tests found';
      ui.emptyState.querySelector('p').textContent = 'Try a different search term.';
    } else if (!catalog.length) {
      ui.emptyState.querySelector('h2').textContent = 'No question files found';
      ui.emptyState.querySelector('p').innerHTML = 'Add <code>.json</code> or <code>.txt</code> question files using <strong>Import files</strong>, or configure a question source.';
    }

    filtered.forEach((test) => {
      const summary = progressSummary(test);
      const hasProgress = summary.status !== 'new';
      const isImported = test.source === 'imported';
      const card = document.createElement('article');
      card.className = `test-card ${summary.status === 'done' ? 'completed' : summary.status === 'resume' ? 'resume' : 'new'}`;
      const actionClass = hasProgress && isImported ? 'three' : hasProgress ? 'two' : isImported ? 'two' : 'one';
      const statusIcon = summary.status === 'done' ? 'check_circle' : summary.status === 'resume' ? 'play_circle' : 'new_releases';
      const statusText = summary.status === 'done' ? 'Completed' : summary.status === 'resume' ? 'In progress' : 'New';
      const actionIcon = 'play_arrow';
      card.innerHTML = `
        <div class="premium-card-glow" aria-hidden="true"></div>
        <div class="card-title-row premium-title-row">
          <div class="premium-title-wrap">
            <span class="material-symbols-outlined premium-title-icon">medical_services</span>
            <h2>${escapeHTML(test.title)}</h2>
          </div>
          <span class="status-badge ${summary.status === 'done' ? 'done' : summary.status === 'resume' ? 'resume' : ''}"><span class="material-symbols-outlined">${statusIcon}</span>${statusText}</span>
        </div>
        <div class="premium-card-body with-test-orbs">
          <div class="test-card-orbs" aria-label="Test progress and score overview">
            <section class="test-orb-panel test-compact-panel" aria-label="Test usage and result details">
              <span class="test-metric-orb test-correct-orb ${summary.attempted ? 'has-data' : 'is-empty'}" style="--test-correct-correct-end:0deg; --test-correct-partial-end:0deg; --test-correct-incorrect-end:0deg;">
                <span class="test-orb-gap" aria-hidden="true"></span>
                <span class="test-usage-pie" style="--test-used-angle:0deg;">
                  <span class="test-metric-center"><strong class="test-done-value">0%</strong></span>
                </span>
              </span>
              <div class="test-mini-stat-list test-result-stats" aria-label="Usage and result statistics">
                <div class="test-mini-stat-row test-used-row"><span>USED QUE'S:</span><strong class="test-used-total-value">${summary.attempted} / ${summary.total}</strong><em class="test-mini-badge test-badge-primary">${summary.pct}%</em></div>
                <div class="test-mini-stat-row"><span>CORRECT QUE'S:</span><strong class="test-correct-count-value">0</strong><em class="test-mini-badge test-badge-correct">0%</em></div>
                <div class="test-mini-stat-row"><span>INCORRECT QUE'S:</span><strong class="test-incorrect-count-value">0</strong><em class="test-mini-badge test-badge-incorrect">0%</em></div>
                <div class="test-mini-stat-row"><span>PARTIALLY INCORR:</span><strong class="test-partial-count-value">0</strong><em class="test-mini-badge test-badge-omitted">0%</em></div>
              </div>
            </section>
          </div>
        </div>
        <div class="card-actions ${actionClass}">
          <button class="primary-button" data-action="${hasProgress ? 'resume' : 'start'}" type="button"><span class="material-symbols-outlined">${actionIcon}</span>${hasProgress ? 'Resume' : 'Start'}</button>
          ${hasProgress ? '<button class="secondary-button" data-action="restart" type="button"><span class="material-symbols-outlined">refresh</span>Restart</button>' : ''}
          ${isImported ? '<button class="danger-button" data-action="remove-import" type="button"><span class="material-symbols-outlined">delete</span>Remove</button>' : ''}
        </div>`;

      card.addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) {
          return;
        }
        event.stopPropagation();
        const action = actionButton.dataset.action;
        if (action === 'remove-import') {
          if (!confirm(`Remove ${test.title}? Progress for this file will also be cleared.`)) return;
          await deleteImportedFile(test.id);
          clearProgress(test.id);
          await loadCatalog();
          showNotice('Imported file removed.', 'success');
          return;
        }
        startTest(test, action === 'restart' ? 'restart' : action);
      });

      getDetailedProgressSummary(test)
        .then((detail) => observeOnceWhenVisible(card, () => animateTestCardOrbs(card, detail), { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }))
        .catch((error) => console.info('Unable to update test summary orb:', error));

      ui.testGrid.appendChild(card);
    });
  }

  function normalizeSavedState(saved, count) {
    return {
      ...freshState(),
      ...saved,
      currentIndex: Math.min(Math.max(Number(saved.currentIndex || 0), 0), Math.max(count - 1, 0)),
      answers: Array.isArray(saved.answers) ? saved.answers : [],
      completed: Array.isArray(saved.completed) ? saved.completed : [],
      correctCount: Number(saved.correctCount || 0),
      seconds: Number(saved.seconds || 0),
      questionSeconds: Array.isArray(saved.questionSeconds) ? saved.questionSeconds.map((value) => Number(value || 0)) : [],
      marked: Array.isArray(saved.marked) ? saved.marked.map(Boolean) : [],
      finished: Boolean(saved.finished),
      finishedAt: saved.finishedAt || null,
      startedAt: saved.startedAt || new Date().toISOString(),
      savedAt: saved.savedAt || new Date().toISOString()
    };
  }

  function ensureStateShape() {
    if (!Array.isArray(state.answers)) state.answers = [];
    if (!Array.isArray(state.completed)) state.completed = [];
    if (!Array.isArray(state.marked)) state.marked = [];
    while (state.answers.length < questions.length) state.answers.push(null);
    while (state.completed.length < questions.length) state.completed.push(false);
    while (state.marked.length < questions.length) state.marked.push(false);
    state.answers = state.answers.slice(0, questions.length);
    state.completed = state.completed.slice(0, questions.length);
    state.marked = state.marked.slice(0, questions.length);
    state.currentIndex = Math.min(Math.max(Number(state.currentIndex || 0), 0), Math.max(questions.length - 1, 0));
  }

  function hasRenderableMedia(value) {
    return /<\s*(img|picture|svg|video|canvas)\b|src\s*=|data:image|\/resources\//i.test(String(value || ''));
  }

  function enhanceMediaElements(rootEl, basePath = '') {
    if (!rootEl) return;
    $$('img', rootEl).forEach((img) => {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      img.classList.add('question-media');

      const src = img.getAttribute('src') || '';
      if (!src || /^(?:https?:|data:|blob:|\/)/i.test(src) || !basePath) return;

      const fallback = `${basePath.replace(/\/?$/, '/')}${src.replace(/^\.?\//, '')}`;
      if (fallback === src) return;

      img.dataset.originalSrc = src;
      img.dataset.fallbackSrc = fallback;
      img.addEventListener('error', () => {
        if (img.dataset.triedFallback === '1') return;
        img.dataset.triedFallback = '1';
        img.src = fallback;
      }, { once: true });
    });
  }

  function sanitizeRichText(value) {
    if (value == null) return '';
    let html = String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    const parser = new DOMParser();
    const documentLike = /<\s*(html|body)\b/i.test(html)
      ? parser.parseFromString(html, 'text/html').body
      : (() => {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = html;
          return wrapper;
        })();

    $$('*', documentLike).forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value || '';
        if (name.startsWith('on') || /javascript:/i.test(value)) element.removeAttribute(attribute.name);
      });
    });

    return documentLike.innerHTML || escapeHTML(html);
  }

  function stripHTML(value) {
    if (value == null) return '';
    const div = document.createElement('div');
    div.innerHTML = String(value);
    return (div.textContent || div.innerText || '').replace(/\u00a0/g, ' ').trim();
  }

  function getOptionText(option) {
    if (option == null) return '';
    if (typeof option === 'string' || typeof option === 'number') return String(option);
    if (typeof option === 'object') {
      return String(
        option.choice ??
        option.text ??
        option.label ??
        option.content ??
        option.option ??
        option.value ??
        ''
      );
    }
    return '';
  }

  function optionHasCorrectFlag(option) {
    if (!option || typeof option !== 'object') return false;
    const raw = option.correct ?? option.isCorrect ?? option.correctAnswer ?? option.flagged ?? option.markedCorrect ?? '';
    const value = String(raw).trim().toLowerCase();
    return ['true', '1', 'yes', 'y', '✓', '✔', '*', 'correct'].includes(value);
  }

  function normalizeChoiceRecords(rawChoices) {
    const source = Array.isArray(rawChoices) ? rawChoices : Object.values(rawChoices || {});
    return source
      .map((raw, index) => {
        const text = sanitizeRichText(getOptionText(raw)).replace(/^\s*(?:[A-H]|\d+)\s*[).]\s+/i, '').trim();
        const choiceNumber = raw && typeof raw === 'object' && raw.choiceNumber != null ? Number(raw.choiceNumber) : index + 1;
        return { raw, text, choiceNumber, index };
      })
      .filter((choice) => stripHTML(choice.text) !== '' || hasRenderableMedia(choice.text));
  }

  function flattenAnswerTokens(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value.flatMap(flattenAnswerTokens);
    if (typeof value === 'object') {
      return flattenAnswerTokens(value.choiceNumber ?? value.answer ?? value.value ?? value.text ?? '');
    }
    return String(value)
      .split(/[,;|\s]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  function parseCorrectIndices(rawAnswer, choiceRecords, flagged = []) {
    const options = choiceRecords.map((choice) => choice.text);
    const indices = new Set(flagged);
    const tokens = flattenAnswerTokens(rawAnswer);

    tokens.forEach((token) => {
      const normalized = token.replace(/^["'\[]+|["'\]]+$/g, '').trim();
      if (!normalized) return;

      if (/^[A-H]$/i.test(normalized)) {
        const index = normalized.toUpperCase().charCodeAt(0) - 65;
        if (index >= 0 && index < options.length) indices.add(index);
        return;
      }

      if (/^-?\d+$/.test(normalized)) {
        const numeric = Number(normalized);
        const byChoiceNumber = choiceRecords.findIndex((choice) => choice.choiceNumber === numeric);
        if (byChoiceNumber >= 0) {
          indices.add(byChoiceNumber);
          return;
        }
        if (numeric >= 1 && numeric <= options.length) {
          indices.add(numeric - 1);
          return;
        }
        if (numeric >= 0 && numeric < options.length) indices.add(numeric);
        return;
      }

      const textIndex = options.findIndex((option) => stripHTML(option).toLowerCase() === normalized.toLowerCase());
      if (textIndex >= 0) indices.add(textIndex);
    });

    return [...indices].filter((index) => Number.isInteger(index) && index >= 0 && index < options.length);
  }

  function normalizeQuestion(question, index) {
    const rawChoices = question.answerChoiceList || question.answerChoices || question.choices || question.options || [];
    const choiceRecords = normalizeChoiceRecords(rawChoices);
    const flagged = choiceRecords
      .map((choice, choiceIndex) => optionHasCorrectFlag(choice.raw) ? choiceIndex : -1)
      .filter((choiceIndex) => choiceIndex >= 0);
    const correct = parseCorrectIndices(
      question.correctAnswer ?? question.correctAnswers ?? question.correct ?? question.answer ?? question.answers,
      choiceRecords,
      flagged
    );
    const maxSelection = Number(question.maxAnswerSelection || question.maxSelections || question.maxAnswerChoices || 0);
    const isMulti = correct.length > 1 || maxSelection > 1 || Number(question.questionTypeId || 0) === 2;

    const qid = question.questionId ?? question.id ?? question.questionIndex ?? question.sequenceId ?? `q-${index + 1}`;
    return {
      id: qid,
      qid,
      topicId: question.topicId ?? question.topicID ?? question.topic_id ?? '',
      topic: question.topic ?? question.title ?? question.topicName ?? '',
      subject: question.subject ?? question.ncsbnSubject ?? question.NCSBNSubject ?? '',
      question: sanitizeRichText(question.questionText || question.question || question.stem || question.prompt || question.text || ''),
      options: choiceRecords.map((choice) => choice.text),
      correct,
      explanation: sanitizeRichText(question.explanationText || question.explanation || question.rationale || question.reason || ''),
      isMulti,
      maxSelection
    };
  }

  function parseJSONQuestions(content) {
    const parsed = JSON.parse(content);
    const list = parsed.questionList || parsed.questions || parsed.items || parsed.data || (Array.isArray(parsed) ? parsed : null);
    if (!Array.isArray(list)) return [];
    return list
      .map((question, index) => normalizeQuestion(question, index))
      .filter((question) => stripHTML(question.question) && question.options.length > 0);
  }

  function parseTextQuestions(content) {
    const lines = content.replace(/\r/g, '').split('\n');
    const questionsOut = [];
    let current = null;
    let mode = 'question';

    function pushCurrent() {
      if (!current) return;
      const choiceRecords = current.options.map((text, index) => ({ text: sanitizeRichText(text), choiceNumber: index + 1, raw: text, index }));
      const correct = parseCorrectIndices(current.correctRaw, choiceRecords, current.inlineCorrect);
      questionsOut.push({
        id: `txt-${questionsOut.length}`,
        qid: `txt-${questionsOut.length + 1}`,
        topicId: '',
        topic: '',
        subject: '',
        question: sanitizeRichText(current.question.trim()),
        options: choiceRecords.map((choice) => choice.text),
        correct,
        explanation: sanitizeRichText(current.explanation.trim()),
        isMulti: correct.length > 1,
        maxSelection: correct.length > 1 ? correct.length : 0
      });
    }

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      const questionMatch = line.match(/^(?:Q(?:uestion)?\s*\d*|#\d+)\s*[).:\-]\s*(.*)$/i);
      if (questionMatch) {
        pushCurrent();
        current = { question: questionMatch[1] || '', options: [], correctRaw: '', inlineCorrect: [], explanation: '' };
        mode = 'question';
        return;
      }

      const optionMatch = line.match(/^([A-H]|\d+)\s*[).]\s+(.+)$/i);
      if (optionMatch) {
        if (!current) current = { question: '', options: [], correctRaw: '', inlineCorrect: [], explanation: '' };
        let optionText = optionMatch[2].trim();
        const markedCorrect = /(\s|^)(?:✓|✔|\*)\s*$/i.test(optionText);
        optionText = optionText.replace(/(\s|^)(?:✓|✔|\*)\s*$/i, '').trim();
        current.options.push(optionText);
        if (markedCorrect) current.inlineCorrect.push(current.options.length - 1);
        mode = 'options';
        return;
      }

      const answerMatch = line.match(/^(?:Answer|Correct(?:\s*Answer)?)\s*[:\-]\s*(.+)$/i);
      if (answerMatch) {
        if (!current) current = { question: '', options: [], correctRaw: '', inlineCorrect: [], explanation: '' };
        current.correctRaw = answerMatch[1].trim();
        mode = 'answer';
        return;
      }

      const explanationMatch = line.match(/^(?:Explanation|Rationale|Reason)\s*[:\-]\s*(.*)$/i);
      if (explanationMatch) {
        if (!current) current = { question: '', options: [], correctRaw: '', inlineCorrect: [], explanation: '' };
        current.explanation += `${current.explanation ? '\n' : ''}${explanationMatch[1].trim()}`;
        mode = 'explanation';
        return;
      }

      if (!current) current = { question: '', options: [], correctRaw: '', inlineCorrect: [], explanation: '' };
      if (mode === 'explanation') current.explanation += `${current.explanation ? '\n' : ''}${line}`;
      else if (mode === 'options' && current.options.length) current.options[current.options.length - 1] += ` ${line}`;
      else current.question += `${current.question ? ' ' : ''}${line}`;
    });

    pushCurrent();
    return questionsOut.filter((question) => stripHTML(question.question) && question.options.length > 0);
  }

  async function loadQuestionsForTest(test) {
    const content = test.content || await fetchText(`${test.file}${test.file.includes('?') ? '&' : '?'}v=${Date.now()}`);
    const trimmed = content.trim();
    const format = String(test.format || test.file.split('.').pop() || '').toLowerCase();
    const shouldTryJSON = format === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[');
    let parsed = [];

    if (shouldTryJSON) {
      try {
        parsed = parseJSONQuestions(content);
      } catch (error) {
        if (format === 'json') throw error;
      }
    }
    if (!parsed.length) parsed = parseTextQuestions(content);
    if (!parsed.length) throw new Error('No valid questions found.');
    const basePath = String(test.file || '').includes('/') ? String(test.file || '').replace(/\/?[^/]*$/, '') : '';
    return parsed.map((question) => ({ ...question, basePath }));
  }

  function getChoiceIcon(question, selected) {
    return '';
  }

  function getQuestionScore(question, answer) {
    const selected = Array.isArray(answer)
      ? answer
      : (answer === null || answer === undefined ? [] : [answer]);
    const correctAnswers = Array.isArray(question?.correct) ? question.correct : [];
    const maxScore = Math.max(correctAnswers.length, 1);
    const correctSelections = selected.filter((index) => correctAnswers.includes(index)).length;
    const incorrectSelections = selected.filter((index) => !correctAnswers.includes(index)).length;
    const exact = isAnswerCorrect(question, answer);
    const score = question?.isMulti
      ? Math.min(maxScore, Math.max(0, correctSelections - incorrectSelections))
      : (exact ? 1 : 0);
    const percentage = Math.round((score / maxScore) * 100);
    const title = exact ? 'Correct' : (score > 0 ? 'Partially Correct' : 'Incorrect');
    const tone = exact ? 'correct' : (score > 0 ? 'partial' : 'incorrect');
    return { score, maxScore, percentage, title, tone };
  }

  function renderQuestionResult() {
    if (!ui.questionResultStrip) return;
    if (!showExplanations) {
      ui.questionResultStrip.classList.add('hidden');
      return;
    }
    ensureStateShape();
    const question = questions[state.currentIndex];
    const completed = Boolean(state.completed[state.currentIndex]) && showExplanations;
    const answer = state.answers[state.currentIndex];
    const elapsed = Number(state.questionSeconds?.[state.currentIndex] || 0);

    if (!completed || !question) {
      ui.questionResultStrip.classList.add('hidden');
      ui.questionResultStrip.classList.remove('result-correct', 'result-partial', 'result-incorrect');
      return;
    }

    const result = getQuestionScore(question, answer);
    ui.questionResultStrip.classList.remove('hidden', 'result-correct', 'result-partial', 'result-incorrect');
    ui.questionResultStrip.classList.add(`result-${result.tone}`);
    if (ui.questionResultTitle) ui.questionResultTitle.textContent = result.title;
    if (ui.questionMarkStat) ui.questionMarkStat.textContent = `${result.score}/${result.maxScore}`;
    if (ui.questionRuleStat) ui.questionRuleStat.textContent = `${result.score}/${result.maxScore}`;
    if (ui.questionPercentStat) ui.questionPercentStat.textContent = `${result.percentage}%`;
    if (ui.questionTimeStat) ui.questionTimeStat.textContent = formatSeconds(elapsed);
    if (ui.questionResultStat) ui.questionResultStat.textContent = result.title;
  }

  function getChoiceLabel(question, index) {
    if (question?.isMulti) return `${index + 1}.`;
    return `${String.fromCharCode(65 + index)}.`;
  }

  function renderQuestion() {
    if (!questions.length) {
      goToCatalog();
      return;
    }

    ensureStateShape();
    const question = questions[state.currentIndex];
    const completed = Boolean(state.completed[state.currentIndex]) && showExplanations;
    const answer = state.answers[state.currentIndex];

    const qidText = question.qid || question.id || state.currentIndex + 1;
    if (ui.questionIdBadge) ui.questionIdBadge.textContent = `QID-${qidText}`;
    if (ui.qidDisplay) ui.qidDisplay.textContent = `QID-${qidText}`;
    if (ui.testMetaLine) ui.testMetaLine.textContent = activeTest?.title || 'NCLEX-RN';
    ui.designedExamMain?.classList.toggle('show-result', completed && showExplanations);
    updateMarkReviewButton();
    ui.questionText.innerHTML = `<div class="question-stem">${question.question}</div>`;
    enhanceMediaElements(ui.questionText, question.basePath);
    ui.optionsList.innerHTML = '';

    question.options.forEach((option, index) => {
      const selected = Array.isArray(answer) ? answer.includes(index) : answer === index;
      const li = document.createElement('li');
      const choiceLabel = getChoiceLabel(question, index);
      li.className = `option-item${selected ? ' selected' : ''}${completed ? ' locked' : ''}`;
      li.innerHTML = `
        <span class="option-status material-symbols-outlined" aria-hidden="true">${getChoiceIcon(question, selected)}</span>
        <input class="choice-input" type="${question.isMulti ? 'checkbox' : 'radio'}" name="answer-${state.currentIndex}" id="choice-${state.currentIndex}-${index}" ${selected ? 'checked' : ''} ${completed ? 'disabled' : ''} />
        <label class="choice-text" for="choice-${state.currentIndex}-${index}"><div class="choice-copy">${option}</div></label>`;

      const choose = () => {
        if (completed) return;
        if (question.isMulti) toggleChoice(index);
        else selectChoice(index);
      };
      addEvent(li, 'click', (event) => {
        if (event.target.closest('input, label')) return;
        choose();
      });
      addEvent(li.querySelector('input'), 'change', choose);
      ui.optionsList.appendChild(li);
      enhanceMediaElements(li, question.basePath);
    });

    if (completed) renderFeedback();
    else {
      ui.feedbackCard.classList.add('hidden');
      ui.designedExamMain?.classList.remove('show-result');
      ui.questionResultStrip?.classList.add('hidden');
    }
    renderQuestionResult();

    updateStats();
    updateButtons();
    saveProgress();
  }

  function selectChoice(index) {
    if (state.completed[state.currentIndex] && showExplanations) return;
    state.answers[state.currentIndex] = index;
    syncUntutoredProgressForCurrent();
    saveProgress();
    renderQuestion();
  }

  function toggleChoice(index) {
    if (state.completed[state.currentIndex] && showExplanations) return;
    const question = questions[state.currentIndex];
    let current = state.answers[state.currentIndex];
    if (!Array.isArray(current)) current = [];

    if (current.includes(index)) current = current.filter((value) => value !== index);
    else {
      current = [...current, index];
      if (question.maxSelection > 0 && current.length > question.maxSelection) current = current.slice(-question.maxSelection);
    }

    state.answers[state.currentIndex] = current;
    syncUntutoredProgressForCurrent();
    saveProgress();
    renderQuestion();
  }

  function hasSelection() {
    const answer = state.answers[state.currentIndex];
    return Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined;
  }

  function hasAnswerAt(index) {
    const answer = state.answers[index];
    return Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined;
  }

  function recomputeCorrectCount() {
    return questions.reduce((count, question, index) => {
      return count + (hasAnswerAt(index) && isAnswerCorrect(question, state.answers[index]) ? 1 : 0);
    }, 0);
  }

  function syncUntutoredProgressForCurrent() {
    if (showExplanations) return;
    ensureStateShape();
    state.completed[state.currentIndex] = hasSelection();
    state.correctCount = recomputeCorrectCount();
  }

  function isAnswerCorrect(question, answer) {
    if (!question.correct.length) return false;
    if (question.correct.length > 1 || Array.isArray(answer)) {
      if (!Array.isArray(answer)) return false;
      const selected = [...answer].sort((a, b) => a - b);
      const correct = [...question.correct].sort((a, b) => a - b);
      return JSON.stringify(selected) === JSON.stringify(correct);
    }
    return answer === question.correct[0];
  }

  function checkAnswer() {
    if (!showExplanations) return;
    if (!hasSelection()) return;
    const question = questions[state.currentIndex];
    const answer = state.answers[state.currentIndex];
    if (!state.completed[state.currentIndex]) {
      state.completed[state.currentIndex] = true;
      if (isAnswerCorrect(question, answer)) state.correctCount += 1;
    }
    saveProgress();
    renderQuestion();
    scrollQuestionResultToTop();
  }

  function scrollQuestionResultToTop() {
    if (!ui.questionResultStrip || ui.questionResultStrip.classList.contains('hidden')) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        ui.questionResultStrip.scrollIntoView({
          block: 'start',
          inline: 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
        try { ui.questionResultStrip.focus({ preventScroll: true }); } catch {}
      });
    });
  }

  function questionExplanationMeta(question) {
    const lines = [];
    if (question?.topic !== undefined && question.topic !== null && String(question.topic).trim() !== '') {
      lines.push(`<div>${escapeHTML(question.topic)}</div>`);
    }
    if (question?.subject !== undefined && question.subject !== null && String(question.subject).trim() !== '') {
      lines.push(`<div>NCSBN ${escapeHTML(question.subject)}</div>`);
    }
    return lines.length ? `<div class="explanation-meta">${lines.join('')}</div>` : '';
  }

  function renderFeedback() {
    if (!showExplanations) {
      ui.feedbackCard.classList.add('hidden');
      return;
    }

    const question = questions[state.currentIndex];
    const answer = state.answers[state.currentIndex];
    const correct = isAnswerCorrect(question, answer);
    const correctLabels = question.correct.map((index) => getChoiceLabel(question, index).replace(/\.$/, '')).join(', ');

    ui.feedbackCard.className = `feedback-card designed-feedback-pane${correct ? '' : ' incorrect'}`;
    ui.feedbackHeading.textContent = 'Explanation';
    const explanationContent = question.explanation
      ? (/<\s*(p|div|ul|ol|table|body|html)\b/i.test(question.explanation) ? question.explanation : `<p>${question.explanation}</p>`)
      : '<p>No rationale provided.</p>';

    ui.feedbackBody.innerHTML = `
      ${explanationContent}
      ${questionExplanationMeta(question)}`;
    enhanceMediaElements(ui.feedbackBody, question.basePath);

    $$('li', ui.optionsList).forEach((li, index) => {
      const selected = Array.isArray(answer) ? answer.includes(index) : answer === index;
      const isCorrectChoice = question.correct.includes(index);
      const status = li.querySelector('.option-status');
      if (isCorrectChoice) {
        li.classList.add('correct');
        if (status) {
          status.classList.add('is-visible');
          status.textContent = 'check';
          status.setAttribute('aria-label', 'Correct option');
        }
      } else if (selected) {
        li.classList.add('incorrect');
        if (status) {
          status.classList.add('is-visible');
          status.textContent = 'close';
          status.setAttribute('aria-label', 'Incorrect option');
        }
      }
    });
    renderQuestionResult();
  }

  function updateButtons() {
    const completed = Boolean(state.completed[state.currentIndex]);
    const untutored = !showExplanations;
    const isLastQuestion = state.currentIndex === questions.length - 1;

    if (ui.prevBtn) {
      ui.prevBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span>Previous</span>';
      ui.prevBtn.disabled = state.currentIndex === 0;
    }
    if (ui.checkBtn) {
      ui.checkBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check</span><span>Check</span>';
      ui.checkBtn.classList.toggle('hidden', untutored);
      ui.checkBtn.disabled = untutored || !hasSelection() || completed;
    }
    if (ui.nextBtn) {
      ui.nextBtn.innerHTML = isLastQuestion
        ? '<span>Result</span><span class="material-symbols-outlined" aria-hidden="true">bar_chart</span>'
        : '<span>Next</span><span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
      ui.nextBtn.setAttribute('aria-label', isLastQuestion ? 'Show test result' : 'Next question');
      ui.nextBtn.classList.toggle('is-result-button', isLastQuestion);
      ui.nextBtn.classList.remove('hidden');
      ui.nextBtn.disabled = showExplanations ? !completed : false;
    }
    ui.bottomBar?.classList.toggle('untutored-mode', untutored);
  }

  function updateMarkReviewButton() {
    if (!ui.markReviewBtn) return;
    ensureStateShape();
    const marked = Boolean(state.marked[state.currentIndex]);
    ui.markReviewBtn.classList.toggle('is-marked', marked);
    ui.markReviewBtn.setAttribute('aria-pressed', String(marked));
    ui.markReviewBtn.setAttribute('aria-label', marked ? 'Remove mark for review' : 'Mark question for review');
    const label = ui.markReviewBtn.querySelector('.exam-utility-label');
    if (label) label.textContent = marked ? 'Marked' : 'Mark for Review';
  }

  function toggleMarkForReview() {
    if (!questions.length) return;
    ensureStateShape();
    state.marked[state.currentIndex] = !state.marked[state.currentIndex];
    saveProgress();
    updateMarkReviewButton();
  }

  async function toggleExamFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (error) {
      console.info('Fullscreen is unavailable on this device:', error);
    }
  }

  function formatSeconds(seconds) {
    const total = Number(seconds || 0);
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  function updateStats() {
    const attempted = Array.isArray(state.answers) ? state.answers.filter((answer) => Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined).length : 0;
    const computedCorrect = questions.length ? recomputeCorrectCount() : Number(state.correctCount || 0);
    const score = attempted ? Math.round((computedCorrect / attempted) * 100) : 0;
    if (ui.timeStat) ui.timeStat.textContent = formatSeconds(state.seconds);
    if (ui.progressStat) ui.progressStat.textContent = `${questions.length ? state.currentIndex + 1 : 0} of ${questions.length}`;
    if (ui.scoreStat) ui.scoreStat.textContent = `${score}%`;
    const pct = questions.length ? Math.round((attempted / questions.length) * 100) : 0;
    if (ui.progressBar) ui.progressBar.style.width = `${pct}%`;
  }

  function startTimer() {
    stopTimer();
    timerId = window.setInterval(() => {
      state.seconds += 1;
      ensureStateShape();
      if (questions.length) {
        const index = Math.max(0, Math.min(state.currentIndex || 0, questions.length - 1));
        if (!state.completed[index]) {
          state.questionSeconds[index] = Number(state.questionSeconds[index] || 0) + 1;
        }
      }
      updateStats();
      saveProgress();
    }, 1000);
  }

  function stopTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function prevQuestion() {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderQuestion();
      scrollExamToTop();
    }
  }

  function nextQuestion() {
    if (!showExplanations) {
      syncUntutoredProgressForCurrent();
      saveProgress();
    }
    if (state.currentIndex < questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      scrollExamToTop();
    }
  }

  function finishTest() {
    stopTimer();
    ensureStateShape();
    if (!showExplanations) {
      syncUntutoredProgressForCurrent();
    }
    state.completed = state.answers.map((answer) => Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined);
    state.correctCount = recomputeCorrectCount();
    state.finished = true;
    state.finishedAt = new Date().toISOString();
    saveProgress();
    renderResult();
    renderCatalog();
    showView('result');
  }

  function renderResult() {
    const total = questions.length || Number(activeTest?.questions || 0) || state.completed.length || 0;
    const attempted = Array.isArray(state.answers) ? state.answers.filter((answer) => Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined).length : 0;
    const correct = recomputeCorrectCount();
    const incorrect = Math.max(attempted - correct, 0);
    const unanswered = Math.max(total - attempted, 0);
    const pct = attempted ? Math.round((correct / attempted) * 100) : 0;
    const avgSeconds = attempted ? Math.round(Number(state.seconds || 0) / attempted) : 0;
    const overallTone = attempted === 0 || pct === 0
      ? 'wrong'
      : (incorrect === 0 && unanswered === 0 ? 'correct' : 'partial');

    ui.resultTitle.textContent = activeTest?.title || 'Practice complete';
    ui.resultScore.textContent = `${pct}%`;

    const resultCard = ui.resultView?.querySelector('.result-card');
    if (resultCard) {
      resultCard.classList.remove('result-correct', 'result-partial', 'result-wrong');
      resultCard.classList.add(`result-${overallTone}`);
    }

    if (ui.resultStatsGrid) {
      const stats = [
        { icon: 'check', label: 'Correct', value: correct, tone: correct > 0 ? 'correct' : 'neutral' },
        { icon: 'close', label: 'Incorrect', value: incorrect, tone: incorrect > 0 ? 'wrong' : 'neutral' },
        { icon: 'quiz', label: 'Answered', value: `${attempted}/${total || attempted}`, tone: attempted === total && total > 0 ? 'correct' : 'partial' },
        { icon: 'help_outline', label: 'Unanswered', value: unanswered, tone: unanswered > 0 ? 'partial' : 'neutral' },
        { icon: 'timer', label: 'Total Time', value: formatSeconds(state.seconds), tone: 'neutral' },
        { icon: 'speed', label: 'Avg / Q', value: formatSeconds(avgSeconds), tone: 'neutral' }
      ];
      ui.resultStatsGrid.innerHTML = stats.map((stat) => `
        <div class="result-stat-card tone-${stat.tone}">
          <span class="material-symbols-outlined" aria-hidden="true">${stat.icon}</span>
          <div>
            <strong>${escapeHTML(stat.value)}</strong>
            <small>${escapeHTML(stat.label)}</small>
          </div>
        </div>`).join('');
    }

    ui.resultDetails.textContent = `Saved on this device • ${correct} correct out of ${attempted} answered • ${unanswered} unanswered`;
  }

  function goToCatalog() {
    stopTimer();
    saveProgress();
    showView('catalog');
    renderCatalog();
  }

  function reviewAnswers() {
    if (!activeTest || !questions.length) return;
    showExplanations = true;
    updateTutoredToggle();
    state.completed = state.answers.map((answer) => Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined);
    state.correctCount = recomputeCorrectCount();
    state.currentIndex = 0;
    saveProgress();
    showView('exam');
    renderQuestion();
  }

  function retakeActiveTest() {
    if (!activeTest) return;
    if (confirm('Retake this test? Progress will be cleared.')) startTest(activeTest, 'restart');
  }

  async function startTest(test, mode = 'resume') {
    activeTest = test;
    updateExamFileName();
    showLoading(`Loading ${test.title}…`);
    try {
      questions = await loadQuestionsForTest(test);
      test.questions = questions.length;
      activeTest.questions = questions.length;

      if (mode === 'restart') clearProgress(test.id);
      const saved = mode !== 'restart' ? getProgress(test.id) : null;
      state = saved ? normalizeSavedState(saved, questions.length) : freshState();
      ensureStateShape();
      saveProgress();

      if (state.finished) {
        renderResult();
        showView('result');
      } else {
        showView('exam');
        renderQuestion();
        startTimer();
      }
    } catch (error) {
      console.error(error);
      showNotice(`Could not open ${test.title}: ${error.message}`, 'error');
      showView('catalog');
    } finally {
      hideLoading();
    }
  }

  async function getImportedFiles() {
    if (!('indexedDB' in window)) return [];
    return idbTransaction('readonly', async (store) => {
      const files = await requestToPromise(store.getAll());
      return files.map((file) => ({ ...file, source: 'imported' }));
    });
  }

  async function storeImportedFile(record) {
    if (!('indexedDB' in window)) throw new Error('This browser does not support saved imports.');
    return idbTransaction('readwrite', (store) => store.put(record));
  }

  async function deleteImportedFile(id) {
    if (!('indexedDB' in window)) return undefined;
    return idbTransaction('readwrite', (store) => store.delete(id));
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Request failed'));
    });
  }

  function idbTransaction(mode, callback) {
    return new Promise((resolve, reject) => {
      let result;
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMPORTED_STORE)) {
          db.createObjectStore(IMPORTED_STORE, { keyPath: 'id' });
        }
      };
      request.onerror = () => reject(request.error || new Error('Could not open browser storage.'));
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(IMPORTED_STORE, mode);
        const store = tx.objectStore(IMPORTED_STORE);
        Promise.resolve(callback(store))
          .then((value) => { result = value; })
          .catch((error) => {
            try { tx.abort(); } catch {}
            reject(error);
          });
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error || new Error('Browser storage transaction failed.'));
        };
      };
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result || '');
      reader.onerror = () => reject(reader.error || new Error(`Cannot read ${file.name}`));
      reader.readAsText(file);
    });
  }

  function getQuestionMetaFromContent(content, fileName) {
    const trimmed = content.trim();
    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        const list = parsed.questionList || parsed.questions || parsed.items || parsed.data || (Array.isArray(parsed) ? parsed : []);
        if (Array.isArray(list)) {
          const tagSet = new Set();
          list.slice(0, 40).forEach((question) => {
            ['system', 'subject', 'topic'].forEach((key) => {
              if (question?.[key]) tagSet.add(String(question[key]));
            });
          });
          return { questions: list.length, formats: [...tagSet].slice(0, 5).join(', '), fileName };
        }
      }
    } catch {}

    let count = 0;
    let sata = 0;
    content.split('\n').forEach((line) => {
      const value = line.trim();
      if (/^(?:Q(?:uestion)?\s*\d*|#\d+)\s*[).:\-]/i.test(value)) count += 1;
      if (/\b(?:select all|sata|multiple response)\b/i.test(value)) sata += 1;
    });
    return { questions: count, formats: sata ? 'SATA, MCQ' : 'MCQ', fileName };
  }

  async function handleLocalFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => /\.(json|txt)$/i.test(file.name));
    const imported = [];
    const failed = [];

    for (const file of files) {
      try {
        const content = await readFileAsText(file);
        const meta = getQuestionMetaFromContent(content, file.name);
        const id = `imported-${slugify(file.name)}-${file.size}-${file.lastModified || Date.now()}`;
        await storeImportedFile({
          id,
          name: file.name,
          title: meta.fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
          file: file.name,
          questions: meta.questions,
          format: file.name.split('.').pop().toLowerCase(),
          tags: meta.formats.split(',').map((tag) => tag.trim()).filter(Boolean),
          content,
          source: 'imported',
          importedAt: new Date().toISOString()
        });
        imported.push(file.name);
      } catch (error) {
        failed.push({ name: file.name, error: error.message });
      }
    }

    ui.localFileInput.value = '';
    await loadCatalog();
    if (imported.length) showNotice(`Imported ${imported.length} file(s): ${imported.join(', ')}`, 'success');
    if (failed.length) showNotice(`Failed: ${failed.map((file) => file.name).join(', ')}`, 'error');
  }

  async function discoverFromGitHub() {
    const config = inferGitHubRepo();
    if (!config || config.useGitHubAutoDiscovery === false) return [];

    const branches = [...new Set([config.branch || 'main', 'main', 'master'])];
    const questionDir = config.questionsDir || 'questions';
    let lastError = null;

    for (const branch of branches) {
      try {
        const apiUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${questionDir}?ref=${encodeURIComponent(branch)}`;
        const raw = await fetchText(apiUrl, { headers: { Accept: 'application/vnd.github+json' } });
        const files = JSON.parse(raw);
        if (!Array.isArray(files)) continue;
        return files
          .filter((file) => file.type === 'file' && /\.(json|txt)$/i.test(file.name))
          .map((file) => ({
            title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
            description: `GitHub: ${file.name}`,
            questions: 0,
            format: file.name.split('.').pop().toLowerCase(),
            file: file.download_url,
            source: 'github',
            tags: ['GitHub']
          }));
      } catch (error) {
        lastError = error;
      }
    }

    console.info('GitHub auto-discovery failed:', lastError);
    return [];
  }

  function inferGitHubRepo() {
    const config = window.NCLEX_REPO_CONFIG || {};
    const hostname = location.hostname;
    const inferredOwner = hostname.endsWith('.github.io') ? hostname.replace('.github.io', '') : '';
    const pathParts = location.pathname.split('/').filter(Boolean);
    const inferredRepo = pathParts[0] || (inferredOwner ? `${inferredOwner}.github.io` : '');
    const owner = config.owner || inferredOwner;
    const repo = config.repo || inferredRepo;
    if (!owner || !repo) return { ...config, useGitHubAutoDiscovery: false };
    return {
      ...config,
      owner,
      repo,
      branch: config.branch || 'main',
      questionsDir: config.questionsDir || 'questions',
      useGitHubAutoDiscovery: config.useGitHubAutoDiscovery !== false
    };
  }

  function applyTheme() {
    const theme = storageGet(STORAGE.theme, 'light');
    document.body.classList.toggle('dark', theme === 'dark');
    [ui.themeBtn, ui.examThemeBtn].forEach((button) => {
      if (!button) return;
      const icon = button.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
      else button.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    });
  }

  function toggleTheme() {
    const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    storageSet(STORAGE.theme, nextTheme);
    applyTheme();
  }

  function normalizeTextSize(value) {
    return ['small', 'medium', 'large'].includes(value) ? value : 'medium';
  }

  function applyTextSize() {
    const size = normalizeTextSize(storageGet(STORAGE.textSize, 'medium'));
    const label = size.charAt(0).toUpperCase() + size.slice(1);
    document.body.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    document.body.classList.add(`text-size-${size}`);
    [ui.refreshCatalogBtn, ui.examTextSizeUtilityBtn].forEach((button) => {
      if (!button) return;
      button.title = `Text size: ${label}`;
      button.setAttribute('aria-label', `Text size: ${label}. Tap to change all exam text.`);
      button.dataset.size = size;
    });
  }

  function cycleTextSize() {
    const order = ['small', 'medium', 'large'];
    const current = normalizeTextSize(storageGet(STORAGE.textSize, 'medium'));
    const next = order[(order.indexOf(current) + 1) % order.length];
    storageSet(STORAGE.textSize, next);
    applyTextSize();
  }

  function syncExamMetricVisibility() {
    const valuesVisible = statVisibility.time !== false && statVisibility.progress !== false;
    $$('.exam-topbar-status .exam-stat-chip').forEach((button) => {
      button.classList.toggle('is-hidden', !valuesVisible);
      button.setAttribute('aria-pressed', String(valuesVisible));
      button.title = valuesVisible ? "Tap to hide Time and Que's values" : "Tap to show Time and Que's values";
      const value = button.querySelector('strong');
      if (value) {
        value.style.display = '';
        value.style.visibility = valuesVisible ? '' : 'hidden';
        value.style.opacity = valuesVisible ? '' : '0';
      }
      const label = button.querySelector('span:first-child');
      if (label) {
        label.style.visibility = '';
        label.style.opacity = '';
      }
    });
  }

  function applyStatVisibility() {
    statVisibility = { time: true, progress: true, score: true, ...storageGet(STORAGE.statVisibility, {}) };
    const metricValuesVisible = statVisibility.time !== false && statVisibility.progress !== false;

    $$('.stat-chip').forEach((button) => {
      const statName = button.dataset.stat;
      const isMetric = statName === 'time' || statName === 'progress';
      const isVisible = isMetric ? metricValuesVisible : statVisibility[statName] !== false;
      const value = button.querySelector('strong');

      if (value) {
        if (isMetric) {
          value.style.display = '';
          value.style.visibility = isVisible ? '' : 'hidden';
          value.style.opacity = isVisible ? '' : '0';
        } else {
          value.style.display = isVisible ? '' : 'none';
          value.style.visibility = '';
          value.style.opacity = '';
        }
      }

      button.classList.toggle('is-hidden', !isVisible);
      button.setAttribute('aria-pressed', String(isVisible));
      button.title = isVisible ? 'Click to hide this value' : 'Click to show this value';
    });

    syncExamMetricVisibility();
  }

  function toggleStatVisibility(statName) {
    if (statName === 'time' || statName === 'progress') {
      const currentlyVisible = statVisibility.time !== false && statVisibility.progress !== false;
      const nextVisible = !currentlyVisible;
      statVisibility.time = nextVisible;
      statVisibility.progress = nextVisible;
      storageSet(STORAGE.statVisibility, statVisibility);
      applyStatVisibility();
      return;
    }

    statVisibility[statName] = statVisibility[statName] === false;
    storageSet(STORAGE.statVisibility, statVisibility);
    applyStatVisibility();
  }

  function updateTutoredToggle() {
    if (!ui.tutoredToggle) return;
    ui.tutoredToggle.textContent = showExplanations ? 'Tutored' : 'Untutored';
    ui.tutoredToggle.classList.toggle('is-untutored', !showExplanations);
    ui.tutoredToggle.setAttribute('aria-pressed', String(showExplanations));
    document.body.classList.toggle('untutored-active', !showExplanations);
    ui.bottomBar?.classList.toggle('untutored-mode', !showExplanations);
    ui.questionResultStrip?.classList.toggle('hidden', !showExplanations);
    if (!showExplanations) ui.feedbackCard?.classList.add('hidden');
    if (questions.length) updateButtons();
  }

  const LIVE_STREAM_URL = 'https://live.sgpc.net:8442/;20nocache=889869';

  function updateGurbaniCardState(isPlaying) {
    if (ui.liveDarshanBtn) {
      ui.liveDarshanBtn.classList.toggle('is-playing', Boolean(isPlaying));
      ui.liveDarshanBtn.setAttribute('aria-pressed', String(Boolean(isPlaying)));
    }
    if (ui.liveDarshanBadgeText) ui.liveDarshanBadgeText.textContent = isPlaying ? 'Pause' : 'Play';
    if (ui.liveDarshanStatus) ui.liveDarshanStatus.textContent = isPlaying ? 'Tap to pause' : 'Tap to make break peaceful';
    const icon = ui.liveDarshanBtn?.querySelector('.live-darshan-badge .material-symbols-outlined');
    if (icon) icon.textContent = isPlaying ? 'pause_circle' : 'play_circle';
  }

  async function toggleGurbaniAudio() {
    const audio = ui.gurbaniAudio;
    if (!audio) return;
    try {
      if (audio.paused) {
        if (!audio.currentSrc) audio.src = LIVE_STREAM_URL;
        await audio.play();
        updateGurbaniCardState(true);
      } else {
        audio.pause();
        updateGurbaniCardState(false);
      }
    } catch (error) {
      updateGurbaniCardState(false);
      showNotice('Unable to start the live audio in-app on this device.', 'error');
    }
  }

  function wireEvents() {
    addEvent(ui.searchInput, 'input', renderCatalog);
    addEvent(ui.localUploadBtn, 'click', () => ui.localFileInput.click());
    addEvent(ui.localFileInput, 'change', (event) => handleLocalFiles(event.target.files));
    addEvent(ui.clearProgressBtn, 'click', () => {
      if (confirm('Clear ALL saved progress? This cannot be undone.')) {
        clearAllProgress();
        loadCatalog();
        showNotice('All saved progress cleared.', 'success');
        window.NCLEX_ACCESS?.syncClientEvent?.('progress_cleared');
      }
    });
    addEvent(ui.refreshCatalogBtn, 'click', cycleTextSize);
    addEvent(ui.backToListBtn, 'click', goToCatalog);
    addEvent(ui.themeBtn, 'click', toggleTheme);
    addEvent(ui.examThemeBtn, 'click', toggleTheme);
    addEvent(ui.fullscreenExamBtn, 'click', toggleExamFullscreen);
    addEvent(ui.examTextSizeUtilityBtn, 'click', cycleTextSize);
    addEvent(ui.examThemeUtilityBtn, 'click', toggleTheme);
    addEvent(ui.markReviewBtn, 'click', toggleMarkForReview);
    addEvent(ui.liveDarshanBtn, 'click', toggleGurbaniAudio);
    addEvent(ui.gurbaniAudio, 'play', () => updateGurbaniCardState(true));
    addEvent(ui.gurbaniAudio, 'pause', () => updateGurbaniCardState(false));
    addEvent(ui.gurbaniAudio, 'ended', () => updateGurbaniCardState(false));
    addEvent(ui.gurbaniAudio, 'error', () => updateGurbaniCardState(false));
    addEvent(ui.tutoredToggle, 'click', () => {
      showExplanations = !showExplanations;
      updateTutoredToggle();
      if (questions.length) renderQuestion();
    });
    addEvent(ui.prevBtn, 'click', prevQuestion);
    addEvent(ui.checkBtn, 'click', checkAnswer);
    addEvent(ui.nextBtn, 'click', () => {
      if (!showExplanations) {
        if (state.currentIndex === questions.length - 1) finishTest();
        else nextQuestion();
        return;
      }
      if (state.currentIndex === questions.length - 1) finishTest();
      else nextQuestion();
    });
    addEvent(ui.resultBackBtn, 'click', goToCatalog);
    addEvent(ui.resultReviewBtn, 'click', reviewAnswers);
    addEvent(ui.resultRetakeBtn, 'click', retakeActiveTest);

    $$('.stat-chip').forEach((button) => {
      addEvent(button, 'click', () => toggleStatVisibility(button.dataset.stat));
    });

    addEvent(document, 'keydown', (event) => {
      if (!questions.length || !ui.examView.classList.contains('active')) return;
      const number = Number.parseInt(event.key, 10);
      const question = questions[state.currentIndex];
      if (number >= 1 && number <= 9 && question?.options[number - 1] && !state.completed[state.currentIndex]) {
        event.preventDefault();
        if (question.isMulti) toggleChoice(number - 1);
        else selectChoice(number - 1);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!showExplanations) {
          if (state.currentIndex === questions.length - 1) finishTest();
          else nextQuestion();
        } else if (state.completed[state.currentIndex]) {
          if (state.currentIndex === questions.length - 1) finishTest();
          else nextQuestion();
        } else checkAnswer();
      }
      if (event.key === 'ArrowLeft') prevQuestion();
      if (event.key === 'ArrowRight' && (!showExplanations || state.completed[state.currentIndex])) {
        if (state.currentIndex === questions.length - 1) finishTest();
        else nextQuestion();
      }
    });

    addEvent(window, 'beforeunload', saveProgress);
  }

  async function init() {
    applyTheme();
    applyTextSize();
    applyStatVisibility();
    updateTutoredToggle();
    await window.NCLEX_ACCESS?.ensureAppAccess?.();
    wireEvents();
    bindCatalogHeroCompactBehavior();
    showView('catalog');
    updateStats();
    loadCatalog().then(() => window.NCLEX_ACCESS?.syncClientEvent?.('catalog_loaded')).catch(() => {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init().catch((error) => console.error(error)));
  else init().catch((error) => console.error(error));
})();
