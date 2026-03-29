class EconomyApp {
    constructor() {
        this.state = {
            score: 0,
            completedTasks: {}, // { taskId: { completed: true, points: number } }
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
    }

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
        if (points > 0) this.showToast(`+${points} баллов!`, 'success');
    }

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

    renderModules() {
        const container = document.getElementById('modules-container');
        container.innerHTML = '';

        if (!courseData.modules || courseData.modules.length === 0) {
            container.innerHTML = '<p>Ошибка загрузки данных модулей.</p>';
            return;
        }

        courseData.modules.forEach(mod => {
            const totalTasks = mod.tasks.length;
            const completedCount = mod.tasks.filter(t => this.state.completedTasks[t.id]).length;
            const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            const moduleScore = mod.tasks.reduce((sum, t) => sum + (this.state.completedTasks[t.id] ? this.state.completedTasks[t.id].points : 0), 0);

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

    renderModuleDetail(moduleId) {
        this.currentModuleId = moduleId;
        const mod = courseData.modules.find(m => m.id === moduleId);
        if (!mod) return;

        document.getElementById('detail-title').innerText = mod.title;
        this.updateModuleStats(mod);

        // Теория
        const theoryContainer = document.getElementById('theory-container');
        theoryContainer.innerHTML = '';
        mod.theory.forEach((section) => {
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

        // Задания
        const tasksContainer = document.getElementById('tasks-container');
        tasksContainer.innerHTML = '';
        mod.tasks.forEach(task => {
            const taskStatus = this.state.completedTasks[task.id];
            const isCompleted = !!taskStatus;
            
            const taskEl = document.createElement('div');
            taskEl.className = 'task-card';
            taskEl.id = `task-card-${task.id}`;
            
            let statusHtml = '';
            if (isCompleted) {
                if (taskStatus.points > 0) {
                    statusHtml = `<span class="task-points">✅ ${taskStatus.points} получено</span>`;
                } else {
                    statusHtml = `<span class="task-points" style="color:var(--error-color)">❌ Ошибка (0 баллов)</span>`;
                }
            } else {
                statusHtml = `<span class="task-points">?${task.points}</span>`;
            }

            taskEl.innerHTML = `
                <div class="task-header">
                    <strong>${task.title}</strong>
                    ${statusHtml}
                </div>
                <div class="task-body">
                    ${isCompleted ? this.renderCompletedTask(task) : this.renderTaskBody(task)}
                </div>
            `;
            tasksContainer.appendChild(taskEl);
            
            if (!isCompleted) {
                if (task.type === 'interactive') setTimeout(() => this.initInteractiveTask(task), 100);
                if (task.type === 'matching') this.initMatchingTask(task);
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
        const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
        const moduleScore = mod.tasks.reduce((sum, t) => sum + (this.state.completedTasks[t.id] ? this.state.completedTasks[t.id].points : 0), 0);

        document.getElementById('detail-progress').innerText = `${progress}%`;
        document.getElementById('detail-score').innerText = moduleScore;
    }

    toggleAccordion(header) {
        const content = header.nextElementSibling;
        content.classList.toggle('open');
        header.querySelector('span').innerText = content.classList.contains('open') ? '▲' : '▼';
    }

    renderCompletedTask(task) {
        const status = this.state.completedTasks[task.id];
        const success = status.points > 0;
        let html = `<div style="padding:1rem; border-radius:8px; background:${success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color:${success ? 'var(--accent-color)' : 'var(--error-color)'};">
            ${success ? 'Задание выполнено верно!' : 'Допущена ошибка. Правильный ответ показан ниже.'}
        </div>`;
        
        // Показываем правильный ответ
        if (task.type === 'test') {
            html += `<p style="margin-top:10px;"><strong>Правильный ответ:</strong> ${task.options[task.correct]}</p>`;
        } else if (task.type === 'number' || task.type === 'fill') {
            html += `<p style="margin-top:10px;"><strong>Правильный ответ:</strong> ${task.correct}</p>`;
        } else if (task.type === 'matching') {
            html += `<p style="margin-top:10px;"><strong>Правильные пары показаны в задании.</strong></p>`;
            // Можно добавить рендер правильных пар
        } else if (task.type === 'interactive') {
            html += `<p style="margin-top:10px;"><strong>Цель была:</strong> X=${task.config.targetX}, Y=${task.config.targetY}</p>`;
        }
        return html;
    }

    renderTaskBody(task) {
        switch (task.type) {
            case 'test':
                let optionsHtml = '';
                // Перемешиваем варианты для красоты, но сохраняем индекс правильного
                // Для простоты оставим порядок как в данных, но можно добавить shuffle
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
                // Перемешиваем правую колонку
                const shuffledPairs = [...task.pairs].sort(() => Math.random() - 0.5);
                let leftHtml = '', rightHtml = '';
                
                // Левая колонка (вопросы) - фиксированный порядок или тоже рандом
                const shuffledLeft = [...task.pairs].sort(() => Math.random() - 0.5);

                shuffledLeft.forEach((pair, idx) => {
                    leftHtml += `<div class="match-item" data-id="${pair.left}" data-side="left">${pair.left}</div>`;
                });
                
                shuffledPairs.forEach((pair, idx) => {
                    rightHtml += `<div class="match-item" data-id="${pair.right}" data-side="right">${pair.right}</div>`;
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

    // --- Проверка заданий ---
    completeTask(taskId, points) {
        if (!this.state.completedTasks[taskId]) {
            this.state.completedTasks[taskId] = { completed: true, points: points };
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
        const selected = document.querySelector(`input[name="${taskId}"]:checked`);
        if (!selected) return this.showToast('Выберите вариант!', 'error');
        
        if (parseInt(selected.value) === correctIdx) {
            this.completeTask(taskId, points);
        } else {
            // Ошибка: блокируем задание, показываем ответ, 0 баллов
            this.state.completedTasks[taskId] = { completed: true, points: 0 };
            this.saveState();
            this.showToast('Неверно! Задание закрыто.', 'error');
            this.renderModuleDetail(this.currentModuleId);
        }
    }

    checkNumber(taskId, correct, tolerance, points) {
        const val = parseFloat(document.getElementById(`input-${taskId}`).value);
        if (isNaN(val)) return this.showToast('Введите число!', 'error');

        if (Math.abs(val - correct) <= tolerance) {
            this.completeTask(taskId, points);
        } else {
            this.state.completedTasks[taskId] = { completed: true, points: 0 };
            this.saveState();
            this.showToast('Неверный ответ! Задание закрыто.', 'error');
            this.renderModuleDetail(this.currentModuleId);
        }
    }

    checkFill(taskId, variants, points) {
        const input = document.getElementById(`input-${taskId}`);
        if (!input) return;
        const val = input.value.trim().toLowerCase();
        
        if (variants.includes(val)) {
            this.completeTask(taskId, points);
        } else {
            this.state.completedTasks[taskId] = { completed: true, points: 0 };
            this.saveState();
            this.showToast('Неверно! Задание закрыто.', 'error');
            this.renderModuleDetail(this.currentModuleId);
        }
    }

    initMatchingTask(task) {
        const container = document.getElementById(`match-${task.id}`);
        if (!container) return;
        
        let selectedLeft = null;
        const matchesFound = new Set();

        container.querySelectorAll('.match-item').forEach(item => {
            item.onclick = () => {
                if (item.classList.contains('matched')) return;
                
                // Сброс выделения в своей колонке
                const side = item.dataset.side;
                container.querySelectorAll(`.match-item[data-side="${side}"]`).forEach(i => i.classList.remove('selected'));
                
                item.classList.add('selected');
                
                if (side === 'left') {
                    selectedLeft = item;
                } else if (selectedLeft) {
                    // Проверка пары
                    if (selectedLeft.dataset.id === item.dataset.id) {
                        item.classList.add('matched');
                        selectedLeft.classList.add('matched');
                        matchesFound.add(item.dataset.id);
                        selectedLeft = null;
                        
                        if (matchesFound.size === task.pairs.length) {
                            // Все найдено, но ждем нажатия кнопки проверки для начисления баллов
                            // Или можно начислять сразу, но по ТЗ кнопка
                        }
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
            this.showToast(`Собрано ${matched/2} из ${totalPairs}. Нужно собрать все!`, 'error');
        }
    }

    initInteractiveTask(task) {
        const canvas = document.getElementById(`canvas-${task.id}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const point = document.getElementById(`point-${task.id}`);
        const container = document.getElementById(`graph-${task.id}`);
        const config = task.config;

        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        const W = canvas.width;
        const H = canvas.height;
        const padding = 40;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text-color');
            ctx.lineWidth = 2;

            // Оси
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, H - padding);
            ctx.lineTo(W - padding, H - padding);
            ctx.stroke();

            // График
            ctx.beginPath();
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--primary-color');
            
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

            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color');
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

        const startDrag = (e) => { isDragging = true; e.preventDefault(); };
        const endDrag = () => { isDragging = false; };
        const moveDrag = (e) => {
            if (isDragging) {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                updatePointPos(clientX, clientY);
            }
        };

        point.addEventListener('mousedown', startDrag);
        point.addEventListener('touchstart', startDrag);
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);
        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('touchmove', moveDrag, {passive: false});
    }

    checkInteractive(taskId, targetX, targetY, tolerance, points) {
        const point = document.getElementById(`point-${task.id}`);
        const container = document.getElementById(`graph-${task.id}`);
        const canvas = document.getElementById(`canvas-${task.id}`);
        
        if (!point || !container || !canvas) return;

        const rect = container.getBoundingClientRect();
        const pLeft = parseFloat(point.style.left);
        const pTop = parseFloat(point.style.top);
        
        const W = canvas.width;
        const H = canvas.height;
        const padding = 40;
        
        const mod = courseData.modules.find(m => m.id === this.currentModuleId);
        const taskConf = mod.tasks.find(t => t.id === taskId).config;
        
        const realScaleX = (W - 2*padding) / taskConf.maxX;
        const realScaleY = (H - 2*padding) / taskConf.maxY;
        
        const currentX = (pLeft - padding) / realScaleX;
        const currentY = ((H - padding) - pTop) / realScaleY;
        
        const dist = Math.sqrt(Math.pow(currentX - targetX, 2) + Math.pow(currentY - targetY, 2));
        
        if (dist <= tolerance) {
            this.completeTask(taskId, points);
        } else {
            this.state.completedTasks[taskId] = { completed: true, points: 0 };
            this.saveState();
            this.showToast(`Ошибка! Точка далеко от цели. Задание закрыто.`, 'error');
            this.renderModuleDetail(this.currentModuleId);
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
        document.body.className = '';
        if (themeClass && themeClass !== 'theme_light') {
            document.body.classList.add(themeClass);
        }
        this.state.currentTheme = themeClass;
        this.saveState();
    }

    renderProfile() {
        const totalTasks = courseData.modules.reduce((sum, m) => sum + m.tasks.length, 0);
        const completedCount = Object.keys(this.state.completedTasks).length;
        const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

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

        const resetBtn = document.getElementById('reset-progress-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if(confirm('Вы уверены? Весь прогресс и покупки будут удалены.')) {
                    localStorage.removeItem('olympEconState');
                    location.reload();
                }
            };
        }
    }

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
