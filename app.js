/* ========================================
   Clinical Trial Eligibility Screening
   app.js
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ---- State ----
    const TOTAL_STEPS = 6;
    let currentStep = 1;

    // ---- DOM refs ----
    const steps = document.querySelectorAll('.step');
    const btnNext = document.getElementById('btnNext');
    const btnBack = document.getElementById('btnBack');
    const stepIndicator = document.getElementById('stepIndicator');
    const progressFill = document.getElementById('progressFill');
    const progressStepsContainer = document.getElementById('progressSteps');
    const resultsOverlay = document.getElementById('resultsOverlay');
    const resultsContent = document.getElementById('resultsContent');
    const resultsClose = document.getElementById('resultsClose');

    // Step labels
    const stepLabels = [
        '基本要件', '疾患・PS', '検査値', '除外①', '除外②', '治療歴'
    ];

    // ---- Init progress labels ----
    function initProgressSteps() {
        progressStepsContainer.innerHTML = '';
        stepLabels.forEach((label, i) => {
            const span = document.createElement('span');
            span.className = 'progress-step-label';
            span.textContent = label;
            if (i === 0) span.classList.add('active');
            progressStepsContainer.appendChild(span);
        });
    }
    initProgressSteps();

    // ---- Navigation ----
    function showStep(n) {
        steps.forEach(s => s.classList.remove('active'));
        const target = document.querySelector(`[data-step="${n}"]`);
        if (target) {
            target.classList.add('active');
            target.style.animation = 'none';
            void target.offsetHeight;
            target.style.animation = '';
        }

        currentStep = n;
        btnBack.disabled = n === 1;
        stepIndicator.textContent = `${n} / ${TOTAL_STEPS}`;

        // Progress bar
        progressFill.style.width = `${(n / TOTAL_STEPS) * 100}%`;

        // Update progress labels
        const labels = progressStepsContainer.querySelectorAll('.progress-step-label');
        labels.forEach((lbl, i) => {
            lbl.classList.remove('active', 'completed');
            if (i < n - 1) lbl.classList.add('completed');
            if (i === n - 1) lbl.classList.add('active');
        });

        // Button text
        if (n === TOTAL_STEPS) {
            btnNext.innerHTML = '判定する <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M10 4l3 4-3 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            btnNext.classList.add('submit');
        } else {
            btnNext.innerHTML = '次へ <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            btnNext.classList.remove('submit');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ---- Validation per step ----
    function validateCurrentStep() {
        const activeStep = document.querySelector(`[data-step="${currentStep}"]`);
        const radios = activeStep.querySelectorAll('input[type="radio"][required]');
        const numbers = activeStep.querySelectorAll('input[type="number"][required]');
        const selects = activeStep.querySelectorAll('select[required]');
        let valid = true;

        // Check radio groups
        const radioNames = new Set();
        radios.forEach(r => radioNames.add(r.name));
        radioNames.forEach(name => {
            const checked = activeStep.querySelector(`input[name="${name}"]:checked`);
            if (!checked) {
                valid = false;
                // Highlight the group
                const container = activeStep.querySelector(`input[name="${name}"]`)?.closest('.question-card, .exclusion-item');
                if (container) {
                    container.classList.add('shake');
                    setTimeout(() => container.classList.remove('shake'), 400);
                }
            }
        });

        // Check number inputs
        numbers.forEach(input => {
            if (!input.value || input.value === '') {
                valid = false;
                input.classList.add('invalid', 'shake');
                setTimeout(() => input.classList.remove('shake'), 400);
            } else {
                input.classList.remove('invalid');
            }
        });

        // Check selects
        selects.forEach(sel => {
            if (!sel.value) {
                valid = false;
                sel.classList.add('shake');
                setTimeout(() => sel.classList.remove('shake'), 400);
            }
        });

        if (!valid) {
            showToast('未入力の項目があります');
        }
        return valid;
    }

    // ---- Toast ----
    function showToast(msg) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2500);
    }

    // ---- Event listeners ----
    btnNext.addEventListener('click', () => {
        if (!validateCurrentStep()) return;

        if (currentStep === TOTAL_STEPS) {
            evaluateEligibility();
        } else {
            showStep(currentStep + 1);
        }
    });

    btnBack.addEventListener('click', () => {
        if (currentStep > 1) showStep(currentStep - 1);
    });

    resultsClose.addEventListener('click', () => {
        resultsOverlay.classList.remove('visible');
    });

    resultsOverlay.addEventListener('click', (e) => {
        if (e.target === resultsOverlay) resultsOverlay.classList.remove('visible');
    });

    // Real-time lab value highlighting
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', () => {
            highlightLabValue(input);
        });
    });

    function highlightLabValue(input) {
        const name = input.name;
        const val = parseFloat(input.value);
        if (isNaN(val)) {
            input.classList.remove('valid', 'invalid');
            return;
        }

        const thresholds = {
            anc: { min: 1500 },
            platelets: { min: 100000 },
            hemoglobin: { min: 9.0 },
            egfr: { min: 60 },
            albumin: { min: 2.5 },
            alt_uln: { max: 2.5 },
            tbil_uln: { max: 1.5 },
            coag_uln: { max: 1.5 },
            sbp: { max: 140 },
            dbp: { max: 90 }
        };

        const t = thresholds[name];
        if (!t) return;

        let ok = true;
        if (t.min !== undefined && val < t.min) ok = false;
        if (t.max !== undefined && val > t.max) ok = false;

        input.classList.toggle('valid', ok);
        input.classList.toggle('invalid', !ok);
    }

    // ---- Evaluation Engine ----
    function evaluateEligibility() {
        const form = document.getElementById('screeningForm');
        const data = new FormData(form);
        const get = (name) => data.get(name);
        const getNum = (name) => parseFloat(data.get(name));
        const isChecked = (name) => form.querySelector(`[name="${name}"]`)?.checked || false;

        const issues = [];     // Definite failures
        const warnings = [];   // Things to note
        const passed = [];     // Passed criteria

        // ===== INCLUSION CRITERIA =====

        // Step 1
        if (get('age') === 'yes') passed.push('年齢要件（18歳以上）を満たす');
        else issues.push('年齢要件を満たさない（18歳未満）');

        if (get('consent') === 'yes') passed.push('同意能力あり');
        else issues.push('同意説明文書への署名能力なし');

        if (get('diagnosis') === 'yes') passed.push('進行固形がんの病理学的確認あり、標準治療無効/不耐');
        else issues.push('進行固形がんの確認が得られていない、又は標準治療歴の条件を満たさない');

        if (get('tissue') === 'yes') passed.push('腫瘍組織検体の提出が可能');
        else issues.push('腫瘍組織検体を提出できない');

        // Step 2
        if (get('recist') === 'yes') passed.push('RECIST 1.1に基づく測定可能病変あり');
        else issues.push('RECIST 1.1に基づく測定可能病変なし');

        if (get('prognosis') === 'yes') passed.push('12週間以上の生存見込みあり');
        else issues.push('12週間以上の生存見込みがない');

        const ecog = parseInt(get('ecog'));
        if (ecog <= 1) passed.push(`ECOG PS ${ecog} — 基準を満たす`);
        else issues.push(`ECOG PS ${ecog} — PS 0-1が必要（不適格）`);

        const sbp = getNum('sbp');
        const dbp = getNum('dbp');
        if (sbp <= 140 && dbp <= 90) {
            passed.push(`血圧 ${sbp}/${dbp} mmHg — 正常範囲`);
        } else if (sbp <= 160 && dbp <= 100) {
            warnings.push(`血圧 ${sbp}/${dbp} mmHg — 適格基準(≤140/90)を超過。コントロール状況の確認要`);
        } else {
            issues.push(`血圧 ${sbp}/${dbp} mmHg — 除外基準に該当する可能性（重篤/コントロール不良の高血圧）`);
        }

        if (get('contraception') === 'yes') passed.push('適切な避妊への同意あり');
        else issues.push('適切な避妊への同意が得られない');

        // Step 3: Lab values
        const anc = getNum('anc');
        if (anc >= 1500) passed.push(`ANC ${anc}/μL — 基準値以上`);
        else issues.push(`ANC ${anc}/μL — 基準値(≥1500)未満`);

        const plt = getNum('platelets');
        if (plt >= 100000) passed.push(`血小板 ${plt.toLocaleString()}/μL — 基準値以上`);
        else issues.push(`血小板 ${plt.toLocaleString()}/μL — 基準値(≥100,000)未満`);

        const hb = getNum('hemoglobin');
        if (hb >= 9.0) passed.push(`ヘモグロビン ${hb} g/dL — 基準値以上`);
        else issues.push(`ヘモグロビン ${hb} g/dL — 基準値(≥9.0)未満`);

        const egfr = getNum('egfr');
        if (egfr >= 60) passed.push(`eGFR ${egfr} mL/min/1.73m² — 基準値以上`);
        else issues.push(`eGFR ${egfr} mL/min/1.73m² — 基準値(≥60)未満`);

        const alb = getNum('albumin');
        if (alb >= 2.5) passed.push(`アルブミン ${alb} g/dL — 基準値以上`);
        else issues.push(`アルブミン ${alb} g/dL — 基準値(≥2.5)未満`);

        const altUln = getNum('alt_uln');
        const hasLiverMets = isChecked('liver_mets');
        const altThreshold = hasLiverMets ? 5 : 2.5;
        if (altUln <= altThreshold) {
            passed.push(`ALT ${altUln}×ULN — 基準値以下${hasLiverMets ? '（肝転移あり：≤5×ULN）' : ''}`);
        } else {
            issues.push(`ALT ${altUln}×ULN — 基準値(≤${altThreshold}×ULN)超過`);
        }

        const tbilUln = getNum('tbil_uln');
        const hasGilbert = isChecked('gilbert');
        if (tbilUln <= 1.5) {
            passed.push(`総ビリルビン ${tbilUln}×ULN — 基準値以下`);
        } else if (hasGilbert) {
            warnings.push(`総ビリルビン ${tbilUln}×ULN — ジルベール症候群のため直接ビリルビンが1.5×ULN未満であれば許容`);
        } else {
            issues.push(`総ビリルビン ${tbilUln}×ULN — 基準値(≤1.5×ULN)超過`);
        }

        const coagUln = getNum('coag_uln');
        const onAnticoag = isChecked('anticoag');
        if (coagUln <= 1.5) {
            passed.push(`凝固検査 ${coagUln}×ULN — 基準値以下`);
        } else if (onAnticoag) {
            warnings.push(`凝固検査 ${coagUln}×ULN — 抗凝固薬使用中のため治療範囲内であれば許容`);
        } else {
            issues.push(`凝固検査 ${coagUln}×ULN — 基準値(≤1.5×ULN)超過`);
        }

        // ===== EXCLUSION CRITERIA =====
        const exclusionItems = [
            { name: 'ex_cancer', label: '24ヵ月以内の重複がん' },
            { name: 'ex_surgery', label: '28日以内の大手術' },
            { name: 'ex_transplant', label: '骨髄/臓器移植の既往' },
            { name: 'ex_allergy', label: '治験薬への過敏症' },
            { name: 'ex_cardiac', label: '心臓検査異常（重大な心疾患、QTcF延長等）' },
            { name: 'ex_cns', label: '未治療の脳/CNS転移' },
            { name: 'ex_ild', label: 'ILD/肺臓炎の既往' },
            { name: 'ex_autoimmune', label: '2年以内の自己免疫疾患（全身療法を要したもの）' },
            { name: 'ex_ae', label: '前治療による未回復の副作用（>Grade 1）' },
            { name: 'ex_bleeding', label: '1ヵ月以内の重大な出血' },
            { name: 'ex_htn', label: '重篤/コントロール不良の高血圧' },
            { name: 'ex_hiv', label: 'HIV感染の既往' },
            { name: 'ex_imae', label: '免疫療法による重大な有害事象の既往' },
            { name: 'ex_hepatitis', label: 'B型/C型肝炎' },
            { name: 'ex_chf', label: 'うっ血性心不全/LVEF<50%' },
            { name: 'ex_renal', label: '活動性腎疾患/ネフローゼ症候群' },
            { name: 'ex_gi', label: '消化管穿孔/瘻孔/膿瘍' },
            { name: 'ex_bowel', label: '腸病変/腸閉塞' },
            { name: 'ex_wound', label: '創傷治癒の合併症' },
            { name: 'ex_liver', label: '肝硬変/不安定な肝疾患' },
            { name: 'ex_chemo', label: '30日以内の抗腫瘍薬投与' },
            { name: 'ex_vaccine', label: '30日以内の生ワクチン接種' },
            { name: 'ex_transfusion', label: '2週間以内の輸血/CSF投与' },
            { name: 'ex_drugs', label: 'CYP阻害剤/誘導剤、QT延長薬の使用' },
            { name: 'ex_radiation', label: '直近の放射線療法' },
            { name: 'ex_othertrial', label: '他の治験への参加' },
            { name: 'ex_pregnant', label: '妊娠中/授乳中' },
            { name: 'ex_compliance', label: 'SoA遵守不可' }
        ];

        exclusionItems.forEach(item => {
            const val = get(item.name);
            if (val === 'yes') {
                issues.push(`除外基準に該当: ${item.label}`);
            } else if (val === 'no') {
                passed.push(`除外基準に非該当: ${item.label}`);
            }
        });

        // ===== RENDER RESULTS =====
        renderResults(issues, warnings, passed);
    }

    function renderResults(issues, warnings, passed) {
        let verdict, verdictClass, verdictIcon, verdictSub;

        if (issues.length === 0 && warnings.length === 0) {
            verdict = '適格の可能性あり';
            verdictClass = 'eligible';
            verdictIcon = '✓';
            verdictSub = 'すべての適格基準を満たし、除外基準に該当する項目はありません。';
        } else if (issues.length === 0 && warnings.length > 0) {
            verdict = '条件付き適格の可能性';
            verdictClass = 'caution';
            verdictIcon = '⚠';
            verdictSub = '除外基準には該当しませんが、確認が必要な項目があります。';
        } else {
            verdict = '不適格の可能性あり';
            verdictClass = 'ineligible';
            verdictIcon = '✗';
            verdictSub = `${issues.length}件の不適格要因が検出されました。`;
        }

        let html = `
            <div class="result-verdict">
                <div class="verdict-icon ${verdictClass}">${verdictIcon}</div>
                <div class="verdict-title ${verdictClass}">${verdict}</div>
                <div class="verdict-subtitle">${verdictSub}</div>
            </div>
            <div class="result-stats">
                <div class="stat-box">
                    <div class="stat-number green">${passed.length}</div>
                    <div class="stat-label">適合項目</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number yellow">${warnings.length}</div>
                    <div class="stat-label">要確認</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number red">${issues.length}</div>
                    <div class="stat-label">不適格要因</div>
                </div>
            </div>
        `;

        if (issues.length > 0) {
            html += `<div class="result-section">
                <div class="result-section-title">❌ 不適格要因 (${issues.length}件)</div>
                ${issues.map(i => `<div class="result-item"><span class="icon-fail">✗</span><span>${i}</span></div>`).join('')}
            </div>`;
        }

        if (warnings.length > 0) {
            html += `<div class="result-section">
                <div class="result-section-title">⚠️ 要確認事項 (${warnings.length}件)</div>
                ${warnings.map(w => `<div class="result-item"><span class="icon-warn">!</span><span>${w}</span></div>`).join('')}
            </div>`;
        }

        if (passed.length > 0) {
            html += `<div class="result-section">
                <div class="result-section-title">✅ 適合項目 (${passed.length}件)</div>
                ${passed.map(p => `<div class="result-item"><span class="icon-pass">✓</span><span>${p}</span></div>`).join('')}
            </div>`;
        }

        html += `
            <div class="result-summary">
                <p>⚠ <strong>重要:</strong> 本ツールによる判定は参考情報であり、最終的な適格性の判断は治験責任（分担）医師が臨床的判断に基づいて行ってください。
                個々の患者の状況により、プロトコールに定められた例外規定が適用される場合があります。
                詳細は治験実施計画書を参照してください。</p>
            </div>
            <button class="btn-reset" id="btnReset">最初からやり直す</button>
        `;

        resultsContent.innerHTML = html;
        resultsOverlay.classList.add('visible');

        // Reset button
        document.getElementById('btnReset').addEventListener('click', () => {
            resultsOverlay.classList.remove('visible');
            document.getElementById('screeningForm').reset();
            // Clear all validation classes
            document.querySelectorAll('.valid, .invalid').forEach(el => {
                el.classList.remove('valid', 'invalid');
            });
            showStep(1);
        });
    }

    // ---- Keyboard nav ----
    document.addEventListener('keydown', (e) => {
        if (resultsOverlay.classList.contains('visible')) {
            if (e.key === 'Escape') resultsOverlay.classList.remove('visible');
            return;
        }
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            btnNext.click();
        }
    });

});
