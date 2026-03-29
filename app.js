class EconomyApp {
    constructor() {
        this.state = {
            score: 0,
            completedTasks: {}, // { taskId: true }
            inventory: ['theme_light'], // По умолчанию светлая тема
            currentTheme: 'theme_light',
            extraAnimations: false
        };
        this.currentModuleId = null;
        this.init();
    }

    init() {
        this.loadState();
        this.applyTheme(this.state.currentTheme);
        this.setupNavigation();
        this.renderModules();
        this.updateUI();
    }

    // --- Управление состоянием и LocalStorage ---
    loadState() {
        const saved = localStorage.getItem('olympEconState');
        if (saved) {
            this.state = { ...this.state, ...JSON.parse(saved) };
        }
    }

    saveState() {
        localStorage.setItem('olympEconState', JSON.stringify(this.state));
        this.updateUI();
    }

    addScore(points) {
        this.state.score += points;
        this.saveState();
        this.showToast(`+${points} баллов!`, 'success');
    }

    // --- Навигация ---
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.navigate(e.target.dataset.view);
            });
        });
    }

    navigate(viewId, moduleId = null) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            const navBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
            if (navBtn) navBtn.classList.add('active');
        }

        if (viewId === 'modules') this.renderModules();
        if (viewId === 'shop') this.renderShop();
        if (viewId === 'profile') this.renderProfile();
        if (viewId === 'module-detail' && moduleId) this.renderModuleDetail(moduleId);
    }

    // --- Отрисовка Модулей ---
    renderModules() {
        const container = document.getElementById('modules-container');
        container.innerHTML = '';

        courseData.modules.forEach(mod => {
            const totalTasks = mod.tasks.length;
            const completedCount = mod.tasks.filter(t => this.state.completedTasks[t.id]).length;
            const progress = Math.round((completedCount / totalTasks) * 100);
            const moduleScore = mod.tasks.reduce((sum, t) => sum + (this.state.completedTasks[t.id] ? t.points : 0), 0);

            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => this.navigate('module-detail', mod.id);
            card.innerHTML = `
                <div>
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${mod.icon}</div>
                    <h3>${mod.title}</h3>
                    <p>${mod.description}</p>
                </div>
                <div class="card-meta">
                    <div style="flex:1; margin-right:10px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;">
                            <span>Прогресс</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:var(--accent-color); font-weight:bold;">${moduleScore} 💰</div>
                        <div style="font-size:0.8rem; opacity:0.7;">из заданий</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- Детали Модуля (Теория + Задания) ---
    renderModuleDetail(moduleId) {
        this.currentModuleId = moduleId;
        const mod = courseData.modules.find(m => m.id === moduleId);
        if (!mod) return;

        document.getElementById('detail-title').innerText = mod.title;
        this.updateModuleStats(mod);

        // Рендер теории
        const theoryContainer = document.getElementById('theory-container');
        theoryContainer.innerHTML = '';
        mod.theory.forEach((section, idx) => {
            const item = document.createElement('div');
            item.className = 'accordion-item';
            item.innerHTML = `
                <div class="accordion-header" onclick="app.toggleAccordion(this)">
                    ${section.title}
                    <span>▼</span>
                </div>
                <div class="accordion-content">
                    ${section.content}
                </div>
            `;
            theoryContainer.appendChild(item);
        });

        // Рендер заданий
        const tasksContainer = document.getElementById('tasks-container');
        tasksContainer.innerHTML = '';
        mod.tasks.forEach(task => {
            const isCompleted = this.state.completedTasks[task.id];
            const taskEl = document.createElement('div');
            taskEl.className = 'task-card';
            taskEl.innerHTML = `
                <div class="task-header">
                    <strong>${task.title}</strong>
                    <span class="task-points">${isCompleted ? '✅ ' + task.points + ' получено' : '?' + task.points}</span>
                </div>
                <div class="task-body">
                    ${this.renderTaskBody(task, isCompleted)}
                </div>
            `;
            tasksContainer.appendChild(taskEl);
            
            // Инициализация интерактива
            if (task.type === 'interactive' && !isCompleted) {
                // Небольшая задержка, чтобы DOM отрисовался
                setTimeout(() => this.initInteractiveTask(task), 100);
            }
            if (task.type === 'matching' && !isCompleted) {
                this.initMatchingTask(task);
            }
        });

        // Табы
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.content-block').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
            };
        });
    }

    updateModuleStats(mod) {
        const totalTasks = mod.tasks.length;
        const completedCount = mod.tasks.filter(t => this.state.completedTasks[t.id]).length;
        const progress = Math.round((completedCount / totalTasks) * 100);
        const moduleScore = mod.tasks.reduce((sum, t) => sum + (this.state.completedTasks[t.id] ? t.points : 0), 0);

        document.getElementById('detail-progress').innerText = `${progress}%`;
        document.getElementById('detail-score').innerText = moduleScore;
    }

    toggleAccordion(header) {
        const content = header.nextElementSibling;
        content.classList.toggle('open');
        header.querySelector('span').innerText = content.classList.contains('open') ? '▲' : '▼';
    }

    renderTaskBody(task, isCompleted) {
        if (isCompleted) {
            return `<div style="padding:1rem; background:rgba(16,185,129,0.1); border-radius:8px; color:var(--accent-color);">Задание выполнено! Правильный ответ сохранен.</div>`;
        }

        switch (task.type) {
            case 'test':
                let optionsHtml = '';
                task.options.forEach((opt, idx) => {
                    optionsHtml += `<label><input type="radio" name="${task.id}" value="${idx}"> ${opt}</label>`;
                });
                return `
                    <p>${task.question}</p>
                    <div class="task-options">${optionsHtml}</div>
                    <button class="btn" style="margin-top:1rem;" onclick="app.checkTest('${task.id}', ${task.correct}, ${task.points})">Проверить</button>
                `;
            
            case 'number':
                return `
                    <p>${task.question}</p>
                    <input type="number" id="input-${task.id}" placeholder="Введите число">
                    <button class="btn" style="margin-top:1rem;" onclick="app.checkNumber('${task.id}', ${task.correct}, ${task.tolerance || 0}, ${task.points})">Проверить</button>
                `;

            case 'fill':
                return `
                    <p>${task.question}</p>
                    <input type="text" id="input-${task.id}" placeholder="Введите слово">
                    <button class="btn" style="margin-top:1rem;" onclick="app.checkFill('${task.id}', ${JSON.stringify(task.variants)}, ${task.points})">Проверить</button>
                `;

            case 'matching':
                let leftHtml = '', rightHtml = '';
                task.pairs.forEach((pair, idx) => {
                    leftHtml += `<div class="match-item" data-id="${idx}" data-side="left">${pair.left}</div>`;
                    rightHtml += `<div class="match-item" data-id="${idx}" data-side="right">${pair.right}</div>`;
                });
                return `
                    <p>Нажмите на элемент слева, затем на соответствующий справа.</p>
                    <div class="matching-container" id="match-${task.id}">
                        <div class="matching-col">${leftHtml}</div>
                        <div class="matching-col">${rightHtml}</div>
                    </div>
                    <button class="btn" style="margin-top:1rem;" onclick="app.checkMatching('${task.id}', ${task.pairs.length}, ${task.points})">Проверить</button>
                    <div id="match-status-${task.id}" style="margin-top:0.5rem; font-weight:bold;"></div>
                `;

            case 'interactive':
                return `
                    <p>${task.description}</p>
                    <div class="graph-container" id="graph-${task.id}">
                        <canvas id="canvas-${task.id}"></canvas>
                        <div class="drag-point" id="point-${task.id}" style="left:50%; top:50%;"></div>
                    </div>
                    <div class="graph-controls">
                        <button class="btn" onclick="app.checkInteractive('${task.id}', ${task.config.targetX}, ${task.config.targetY}, ${task.config.tolerance}, ${task.points})">Зафиксировать точку</button>
                    </div>
                `;
            default:
                return '<p>Тип задания не поддерживается</p>';
        }
    }

    // --- Логика проверки заданий ---
    completeTask(taskId, points) {
        if (!this.state.completedTasks[taskId]) {
            this.state.completedTasks[taskId] = true;
            this.addScore(points);
            this.saveState();
            if (this.currentModuleId) {
                const mod = courseData.modules.find(m => m.id === this.currentModuleId);
                this.updateModuleStats(mod);
                this.renderModuleDetail(this.currentModuleId); 
            }
        }
    }

    checkTest(taskId, correctIdx, points) {
        const selected = document.querySelector(`input[name="${task
