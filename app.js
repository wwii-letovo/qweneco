class EconomyApp {
    constructor() {
        this.state = {
            score: 0,
            completedTasks: {}, 
            inventory: ['theme_light'], 
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
        this.setupResetButton();
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

    setupResetButton() {
        const btn = document.getElementById('reset-progress-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                if(confirm('Вы уверены? Весь ваш прогресс, баллы и покупки будут удалены безвозвратно.')) {
                    localStorage.removeItem('olympEconState');
                    location.reload();
                }
            });
        }
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
        
        window.scrollTo(0,0);
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

    // --- Детали Модуля ---
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
            taskEl.id = `task-card-${task.id}`;
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
            
            // Инициализация интерактивов ПОСЛЕ добавления в DOM
            if (!isCompleted) {
                if (task.type === 'interactive') setTimeout(() => this.initInteractiveTask(task), 100);
                if (task.type === 'matching') setTimeout(() => this.initMatchingTask(task), 100);
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
        const isOpen = content.classList.contains('open');
        
        // Закрываем все остальные (опционально)
        document.querySelectorAll('.accordion-content').forEach(c => {
            c.classList.remove('open');
            c.previousElementSibling.querySelector('span').innerText = '▼';
        });

        if (!isOpen) {
            content.classList.add('open');
            header.querySelector('span').innerText = '▲';
        }
    }

    renderTaskBody(task, isCompleted) {
        if (isCompleted) {
            return `<div style="padding:1rem; background:rgba(16,185,129,0.1); border-radius:8px; color:var(--accent-color); font-weight:500;">Задание выполнено! Правильный ответ сохранен.</div>`;
        }

        switch (task.type) {
            case 'test':
                let optionsHtml = '';
                task.options.forEach((opt, idx) => {
                    optionsHtml += `<label><input type="radio" name="${task.id}" value="${idx}"> ${opt}</label>`;
                });
                return `
                    <p style="margin-bottom:1rem;">${task.question}</p>
                    <div class="task-options">${optionsHtml}</div>
                    <button class="btn" style="margin-top:1rem;" onclick="app.checkTest('${task.id}', ${task.correct}, ${task.points})">Проверить ответ</button>
                `;
            
            case 'number':
                return `
                    <p style="margin-bottom:1rem;">${task.question}</p>
                    <input type="number" id="input-${task.id}" placeholder="Введите число">
                    <button class="btn" onclick="app.checkNumber('${task.id}', ${task.correct}, ${task.tolerance || 0}, ${task.points})">Проверить ответ</button>
                `;

            case 'fill':
                return `
                    <p style="margin-bottom:1rem;">${task.question}</p>
                    <input type="text" id="input-${task.id}" placeholder="Введите слово или фразу">
                    <button class="btn" onclick="app.checkFill('${task.id}', ${JSON.stringify(task.variants)}, ${task.points})">Проверить ответ</button>
                `;

            case 'matching':
                let leftHtml = '', rightHtml = '';
                task.pairs.forEach((pair, idx) => {
                    leftHtml += `<div class="match-item" data-id="${idx}" data-side="left">${pair.left}</div>`;
                    rightHtml += `<div class="match-item" data-id="${idx}" data-side="right">${pair.right}</div>`;
                });
                return `
                    <p style="margin-bottom:1rem;">Нажмите на элемент слева, затем на соответствующий справа.</p>
                    <div class="matching-container" id="match-${task.id}">
                        <div class="matching-col">${leftHtml}</div>
                        <div class="matching-col">${rightHtml}</div>
                    </div>
                    <button class="btn" style="margin-top:1rem;" onclick="app.checkMatching('${task.id}', ${task.pairs.length}, ${task.points})">Проверить все пары</button>
                `;

            case 'interactive':
                return `
                    <p style="margin-bottom:1rem;">${task.description}</p>
                    <div class="graph-container" id="graph-${task.id}">
                        <canvas id="canvas-${task.id}"></canvas>
                        <div class="drag-point" id="point-${task.id}" style="left:50%; top:50%;"></div>
                    </div>
                    <div class="graph-controls">
                        <button class="btn" onclick="app.checkInteractive('${task.id}', ${task.points})">Зафиксировать точку</button>
                    </div>
                `;
            default:
                return '<p>Тип задания не поддерживается</p>';
        }
    }

    // --- Логика проверки ---
    completeTask(taskId, points) {
        if (!this.state.completedTasks[taskId]) {
            this.state.completedTasks[taskId] = true;
            this.addScore(points);
            this.saveState();
            
            // Обновляем карточку задания визуально
            const card = document.getElementById(`task-card-${taskId}`);
            if (card) {
                card.style.border = "2px solid var(--accent-color)";
                card.style.background = "rgba(16, 185, 129, 0.05)";
                // Перерисовываем внутренности, чтобы показать статус "Выполнено"
                const mod = courseData.modules.find(m => m.id === this.currentModuleId);
                const task = mod.tasks.find(t => t.id === taskId);
                card.querySelector('.task-body').innerHTML = this.renderTaskBody(task, true);
                
                this.updateModuleStats(mod);
            }
        }
    }

    checkTest(taskId, correctIdx, points) {
        const selected = document.querySelector(`input[name="${taskId}"]:checked`);
        if (!selected) return this.showToast('Выберите вариант ответа!', 'error');
        if (parseInt(selected.value) === correctIdx) {
            this.completeTask(taskId, points);
        } else {
            this.showToast('Неверно, попробуйте еще раз.', 'error');
        }
    }

    checkNumber(taskId, correct, tolerance, points) {
        const input = document.getElementById(`input-${taskId}`);
        if (!input || input.value === '') return this.showToast('Введите число!', 'error');
        const val = parseFloat(input.value);
        if (Math.abs(val - correct) <= tolerance) {
            this.completeTask(taskId, points);
        } else {
            this.showToast('Неверный ответ.', 'error');
        }
    }

    checkFill(taskId, variants, points) {
        const input = document.getElementById(`input-${taskId}`);
        if (!input || input.value.trim() === '') return this.showToast('Введите текст!', 'error');
        const val = input.value.trim().toLowerCase();
        if (variants.includes(val)) {
            this.completeTask(taskId, points);
        } else {
            this.showToast('Неверно.', 'error');
        }
    }

    // Сопоставление
    initMatchingTask(task) {
        const container = document.getElementById(`match-${task.id}`);
        if (!container) return;
        
        let selectedLeft = null;
        
        container.querySelectorAll('.match-item').forEach(item => {
            item.onclick = () => {
                if (item.classList.contains('matched')) return;
                
                // Сброс выделения в своей колонке
                item.parentElement.querySelectorAll('.match-item').forEach(i => i.classList.remove('selected'));
                
                item.classList.add('selected');
                
                if (item.dataset.side === 'left') {
                    selectedLeft = item;
                } else if (selectedLeft) {
                    // Проверка пары
                    if (selectedLeft.dataset.id === item.dataset.id) {
                        item.classList.add('matched');
                        selectedLeft.classList.add('matched');
                        selectedLeft = null;
                        this.showToast('Пара найдена!', 'success');
                    } else {
                        this.showToast('Неверная пара', 'error');
                        setTimeout(() => {
                            item.classList.remove('selected');
                            if(selectedLeft) selectedLeft.classList.remove('selected');
                            selectedLeft = null;
                        }, 500);
                    }
                }
            };
        });
    }

    checkMatching(taskId, totalPairs, points) {
        const matched = document.querySelectorAll(`#match-${taskId} .matched`).length;
        if (matched === totalPairs * 2) {
            this.completeTask(taskId, points);
        } else {
            this.showToast(`Найдено ${matched/2} из ${totalPairs}. Соберите все пары!`, 'error');
        }
    }

    // Интерактивный график
    initInteractiveTask(task) {
        const container = document.getElementById(`graph-${task.id}`);
        if (!container) return;

        const canvas = document.getElementById(`canvas-${task.id}`);
        const ctx = canvas.getContext('2d');
        const point = document.getElementById(`point-${task.id}`);
        const config = task.config;

        // Настройка размера
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        const W = canvas.width;
        const H = canvas.height;
        const padding = 40;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text-color').trim();
            ctx.lineWidth = 2;

            // Оси
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, H - padding); 
            ctx.lineTo(W - padding, H - padding); 
            ctx.stroke();

            // График
            ctx.beginPath();
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--primary-color').trim();
            
            const scaleX = (W - 2*padding) / config.maxX;
            const scaleY = (H - 2*padding) / config.maxY;

            if (config.type === 'linear') {
                ctx.moveTo(padding, H - padding - config.maxY * scaleY); 
                ctx.lineTo(padding + config.maxX * scaleX, H - padding);
            } else if (config.type === 'convex') {
                ctx.moveTo(padding, H - padding - config.maxY * scaleY);
                for (let x = 0; x <= config.maxX; x+=0.5) {
                    const y = config.maxY * Math.sqrt(1 - Math.pow(x/config.maxX, 2));
                    ctx.lineTo(padding + x * scaleX, H - padding - y * scaleY);
                }
            } else if (config.type === 'parabola') {
                 ctx.moveTo(padding, H - padding);
                 for (let x = 0; x <= config.maxX; x+=0.5) {
                     const y = config.maxY * (1 - Math.pow((x - config.maxX/2)/(config.maxX/2), 2));
                     ctx.lineTo(padding + x * scaleX, H - padding - y * scaleY);
                 }
            }
            ctx.stroke();

            // Подписи
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color').trim();
            ctx.font = '12px Arial';
            ctx.fillText("0", padding - 15, H - padding + 15);
            ctx.fillText(config.maxX, W - padding - 15, H - padding + 15);
            ctx.fillText(config.maxY, padding - 25, padding + 5);
        };

        draw();

        let isDragging = false;

        const updatePointPos = (clientX, clientY) => {
            const rect = container.getBoundingClientRect();
            let x = clientX - rect.left;
            let y = clientY - rect.top;

            if (x < padding) x = padding;
            if (x > W - padding) x = W - padding;
            if (y < padding) y = padding;
            if (y > H - padding) y = H - padding;

            point.style.left = x + 'px';
            point.style.top = y + 'px';
        };

        // Мышь
        point.onmousedown = () => isDragging = true;
        window.onmouseup = () => isDragging = false;
        window.onmousemove = (e) => { if (isDragging) updatePointPos(e.clientX, e.clientY); };
        
        // Тач
        point.ontouchstart = (e) => { isDragging = true; e.preventDefault(); };
        window.ontouchend = () => isDragging = false;
        window.ontouchmove = (e) => { if (isDragging) { e.preventDefault(); updatePointPos(e.touches[0].clientX, e.touches[0].clientY); } };
    }

    checkInteractive(taskId, points) {
        const point = document.getElementById(`point-${task.id}`);
        const container = document.getElementById(`graph-${task.id}`);
        const canvas = document.getElementById(`canvas-${task.id}`);
        const mod = courseData.modules.find(m => m.id === this.currentModuleId);
        const taskConf = mod.tasks.find(t => t.id === taskId).config;
        
        if (!point || !canvas) return;

        const rect = container.getBoundingClientRect();
        const pLeft = parseFloat(point.style.left);
        const pTop = parseFloat(point.style.top);
        
        const W = canvas.width;
        const H = canvas.height;
        const padding = 40;
        
        const realScaleX = (W - 2*padding) / taskConf.maxX;
        const realScaleY = (H - 2*padding) / taskConf.maxY;
        
        const currentX = (pLeft - padding) / realScaleX;
        const currentY = ((H - padding) - pTop) / realScaleY; 
        
        const dist = Math.sqrt(Math.pow(currentX - taskConf.targetX, 2) + Math.pow(currentY - taskConf.targetY, 2));
        
        if (dist <= taskConf.tolerance) {
            this.completeTask(taskId, points);
        } else {
            this.showToast(`Точка далеко! Цель: (${taskConf.targetX}, ${taskConf.targetY.toFixed(1)})`, 'error');
        }
    }

    // --- Магазин и Профиль ---
    renderShop() {
        const container = document.getElementById('shop-container');
        container.innerHTML = '';
        courseData.shop.forEach(item => {
            const owned = this.state.inventory.includes(item.id);
            const canBuy = this.state.score >= item.price;
            
            const card = document.createElement('div');
            card.className = 'card';
            card.style.opacity = owned ? '0.7' : '1';
            card.innerHTML = `
                <div style="font-size: 3rem; text-align:center; margin-bottom:1rem;">${item.icon}</div>
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <div class="card-meta">
                    <span style="font-weight:bold; color:var(--accent-color);">${item.price} 💰</span>
                    <button class="btn" style="width:auto; padding:0.5rem 1rem;" 
                        ${owned ? 'disabled' : ''} 
                        ${!owned && !canBuy ? 'disabled' : ''}
                        onclick="app.buyItem('${item.id}')">
                        ${owned ? 'Куплено' : (canBuy ? 'Купить' : 'Не хватает')}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    buyItem(itemId) {
        const item = courseData.shop.find(i => i.id === itemId);
        if (!item || this.state.inventory.includes(itemId)) return;
        
        if (this.state.score >= item.price) {
            this.state.score -= item.price;
            this.state.inventory.push(itemId);
            
            if (item.type === 'theme') {
                this.applyTheme(item.class);
            }
            
            this.saveState();
            this.renderShop();
            this.showToast(`Вы купили ${item.name}!`, 'success');
        }
    }

    applyTheme(themeClass) {
        document.body.className = ''; // Сброс
        if (themeClass && themeClass !== 'theme_light') {
            document.body.classList.add(themeClass);
        }
        this.state.currentTheme = themeClass;
        this.saveState();
    }

    renderProfile() {
        const totalTasks = courseData.modules.reduce((sum, m) => sum + m.tasks.length, 0);
        const completedCount = Object.keys(this.state.completedTasks).length;
        const progress = Math.round((completedCount / totalTasks) * 100);

        document.getElementById('total-score').innerText = this.state.score;
        document.getElementById('total-progress').innerText = `${progress}%`;

        const invContainer = document.getElementById('inventory-container');
        invContainer.innerHTML = '';
        
        const allItems = [...courseData.shop, { id: 'theme_light', type: 'theme', name: 'Светлая тема', icon: '☀️', class: 'theme_light' }];

        allItems.forEach(item => {
            if (this.state.inventory.includes(item.id)) {
                const div = document.createElement('div');
                const isActive = (item.id === 'theme_light' && this.state.currentTheme === 'theme_light') || 
                                 (this.state.currentTheme === item.class);
                
                div.className = `inventory-item ${isActive ? 'active-theme' : ''}`;
                div.innerHTML = `<div style="font-size:2rem;">${item.icon}</div><div>${item.name}</div>`;
                
                if (item.type === 'theme') {
                    div.onclick = () => {
                        this.applyTheme(item.class);
                        this.renderProfile();
                        this.showToast('Тема применена', 'success');
                    };
                }
                invContainer.appendChild(div);
            }
        });
    }

    // --- Утилиты ---
    updateUI() {
        document.getElementById('mini-score').innerText = this.state.score;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Запуск приложения
const app = new EconomyApp();
