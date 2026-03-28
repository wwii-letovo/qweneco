// Main Application Logic
class EconOlympApp {
    constructor() {
        this.state = {
            score: 0,
            completedTasks: {}, // taskId -> {completed: boolean, earnedPoints: number}
            purchasedItems: [],
            currentTheme: 'light',
            currentModule: null
        };
        
        this.init();
    }

    init() {
        this.loadState();
        this.setupEventListeners();
        this.renderModules();
        this.renderShop();
        this.updateUI();
        this.applyTheme();
    }

    // State Management
    loadState() {
        const saved = localStorage.getItem('econOlympState');
        if (saved) {
            this.state = { ...this.state, ...JSON.parse(saved) };
        }
    }

    saveState() {
        localStorage.setItem('econOlympState', JSON.stringify(this.state));
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.navigate(section);
            });
        });

        // Back button
        document.getElementById('backToModules').addEventListener('click', () => {
            this.showModules();
        });

        // Module tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            document.querySelector('.nav').classList.toggle('active');
        });
    }

    // Navigation
    navigate(section) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        if (section === 'profile') {
            this.renderProfile();
        }
    }

    showModules() {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('modules').classList.add('active');
        this.state.currentModule = null;
    }

    // Render Functions
    renderModules() {
        const grid = document.getElementById('modulesGrid');
        grid.innerHTML = '';

        courseData.modules.forEach(module => {
            const moduleProgress = this.getModuleProgress(module);
            const card = document.createElement('div');
            card.className = 'module-card';
            card.innerHTML = `
                <div class="module-card-header">
                    <div class="module-card-icon">${module.icon}</div>
                    <div>
                        <h3 class="module-card-title">${module.title}</h3>
                        <p class="module-card-description">${module.description}</p>
                    </div>
                </div>
                <div class="module-card-stats">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${moduleProgress.percent}%"></div>
                    </div>
                    <span class="module-points">${moduleProgress.points} pts</span>
                </div>
            `;
            card.addEventListener('click', () => this.openModule(module));
            grid.appendChild(card);
        });
    }

    getModuleProgress(module) {
        let completedCount = 0;
        let totalPoints = 0;
        let earnedPoints = 0;

        module.tasks.forEach(task => {
            totalPoints += task.points;
            if (this.state.completedTasks[task.id]?.completed) {
                completedCount++;
                earnedPoints += this.state.completedTasks[task.id].earnedPoints || task.points;
            }
        });

        return {
            percent: module.tasks.length > 0 ? (completedCount / module.tasks.length) * 100 : 0,
            points: earnedPoints,
            completed: completedCount,
            total: module.tasks.length
        };
    }

    openModule(module) {
        this.state.currentModule = module;
        
        document.getElementById('moduleIcon').textContent = module.icon;
        document.getElementById('moduleTitle').textContent = module.title;
        
        this.renderTheory(module);
        this.renderTasks(module);
        this.renderModuleProgress(module);
        
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('moduleDetail').classList.add('active');
        this.switchTab('theory');
    }

    renderTheory(module) {
        const container = document.getElementById('theoryTab');
        container.innerHTML = '';

        module.theorySections.forEach((section, index) => {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'theory-section';
            sectionEl.innerHTML = `
                <button class="theory-header ${index === 0 ? 'active' : ''}">
                    ${section.title}
                </button>
                <div class="theory-content" style="${index === 0 ? 'max-height: 1000px;' : ''}">
                    <div class="theory-content-inner">
                        ${section.content}
                    </div>
                </div>
            `;

            const header = sectionEl.querySelector('.theory-header');
            const content = sectionEl.querySelector('.theory-content');

            header.addEventListener('click', () => {
                const isActive = header.classList.contains('active');
                document.querySelectorAll('.theory-header').forEach(h => h.classList.remove('active'));
                document.querySelectorAll('.theory-content').forEach(c => c.style.maxHeight = '');
                
                if (!isActive) {
                    header.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });

            container.appendChild(sectionEl);
        });
    }

    renderTasks(module) {
        const container = document.getElementById('tasksTab');
        container.innerHTML = '';

        module.tasks.forEach(task => {
            const taskState = this.state.completedTasks[task.id];
            const isCompleted = taskState?.completed;
            
            const card = document.createElement('div');
            card.className = `task-card ${isCompleted ? 'task-completed' : ''}`;
            card.id = `task-${task.id}`;
            
            card.innerHTML = `
                <div class="task-header">
                    <h4 class="task-title">${task.title}</h4>
                    <span class="task-points">${task.points} баллов</span>
                </div>
                <p class="task-description">${task.description}</p>
                <div class="task-content" id="task-content-${task.id}"></div>
                <div class="task-feedback" id="task-feedback-${task.id}"></div>
            `;

            container.appendChild(card);
            this.renderTaskContent(task, isCompleted);
        });
    }

    renderTaskContent(task, isCompleted) {
        const contentContainer = document.getElementById(`task-content-${task.id}`);
        
        if (isCompleted) {
            contentContainer.innerHTML = '<p style="color: var(--success-color); font-weight: 600;">✓ Задание выполнено!</p>';
            return;
        }

        switch (task.type) {
            case 'test':
                this.renderTestTask(task, contentContainer);
                break;
            case 'number':
                this.renderNumberTask(task, contentContainer);
                break;
            case 'matching':
                this.renderMatchingTask(task, contentContainer);
                break;
            case 'fill':
                this.renderFillTask(task, contentContainer);
                break;
            case 'interactive':
                this.renderInteractiveTask(task, contentContainer);
                break;
        }
    }

    renderTestTask(task, container) {
        const optionsHtml = task.config.options.map((option, index) => `
            <div class="task-option" data-index="${index}">
                <span>${String.fromCharCode(65 + index)})</span>
                <span>${option}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="task-options">${optionsHtml}</div>
            <button class="task-check-btn">Проверить</button>
        `;

        let selected = null;
        container.querySelectorAll('.task-option').forEach(option => {
            option.addEventListener('click', () => {
                if (container.classList.contains('task-completed')) return;
                container.querySelectorAll('.task-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                selected = parseInt(option.dataset.index);
            });
        });

        container.querySelector('.task-check-btn').addEventListener('click', () => {
            if (selected === null) return;
            
            const feedback = document.getElementById(`task-feedback-${task.id}`);
            if (selected === task.config.correct) {
                this.completeTask(task);
                container.querySelectorAll('.task-option')[selected].classList.add('correct');
                feedback.className = 'task-feedback success';
                feedback.textContent = `Правильно! +${task.points} баллов`;
            } else {
                container.querySelectorAll('.task-option')[selected].classList.add('incorrect');
                container.querySelectorAll('.task-option')[task.config.correct].classList.add('correct');
                feedback.className = 'task-feedback error';
                feedback.textContent = 'Неправильно! Попробуйте другое задание.';
            }
        });
    }

    renderNumberTask(task, container) {
        container.innerHTML = `
            <input type="number" class="task-input" id="input-${task.id}" placeholder="Введите число">
            <button class="task-check-btn">Проверить</button>
        `;

        container.querySelector('.task-check-btn').addEventListener('click', () => {
            const input = document.getElementById(`input-${task.id}`);
            const value = parseFloat(input.value);
            const feedback = document.getElementById(`task-feedback-${task.id}`);
            
            const isCorrect = Math.abs(value - task.config.answer) <= (task.config.tolerance || 0);
            
            if (isCorrect) {
                this.completeTask(task);
                feedback.className = 'task-feedback success';
                feedback.textContent = `Правильно! +${task.points} баллов`;
            } else {
                feedback.className = 'task-feedback error';
                feedback.textContent = `Неправильно! Правильный ответ: ${task.config.answer}`;
            }
        });
    }

    renderMatchingTask(task, container) {
        const leftHtml = task.config.left.map((item, index) => `
            <div class="matching-item" data-side="left" data-index="${index}">${item}</div>
        `).join('');

        const rightHtml = task.config.right.map((item, index) => `
            <div class="matching-item" data-side="right" data-index="${index}">${item}</div>
        `).join('');

        container.innerHTML = `
            <div class="matching-container">
                <div class="matching-column">${leftHtml}</div>
                <div class="matching-column">${rightHtml}</div>
            </div>
            <button class="task-check-btn">Проверить</button>
        `;

        let selectedLeft = null;
        let selectedRight = null;
        const matches = new Map();

        container.querySelectorAll('.matching-item').forEach(item => {
            item.addEventListener('click', () => {
                if (container.classList.contains('task-completed')) return;
                
                const side = item.dataset.side;
                const index = parseInt(item.dataset.index);
                
                if (side === 'left') {
                    container.querySelectorAll('.matching-item[data-side="left"]').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    selectedLeft = index;
                } else {
                    container.querySelectorAll('.matching-item[data-side="right"]').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    selectedRight = index;
                }

                if (selectedLeft !== null && selectedRight !== null) {
                    matches.set(selectedLeft, selectedRight);
                    container.querySelectorAll('.matching-item.selected').forEach(i => {
                        i.classList.remove('selected');
                        i.classList.add('matched');
                    });
                    selectedLeft = null;
                    selectedRight = null;
                }
            });
        });

        container.querySelector('.task-check-btn').addEventListener('click', () => {
            const feedback = document.getElementById(`task-feedback-${task.id}`);
            let allCorrect = true;

            task.config.matches.forEach(([left, right]) => {
                if (matches.get(left) !== right) {
                    allCorrect = false;
                }
            });

            if (allCorrect && matches.size === task.config.matches.length) {
                this.completeTask(task);
                feedback.className = 'task-feedback success';
                feedback.textContent = `Правильно! +${task.points} баллов`;
            } else {
                feedback.className = 'task-feedback error';
                feedback.textContent = 'Не все пары совпали. Попробуйте ещё раз.';
                container.querySelectorAll('.matching-item.matched').forEach(i => i.classList.remove('matched'));
                matches.clear();
            }
        });
    }

    renderFillTask(task, container) {
        let textWithBlanks = task.config.text;
        task.config.blanks.forEach((_, index) => {
            textWithBlanks = textWithBlanks.replace('__', `<input type="text" class="blank-input" data-index="${index}">`);
        });

        container.innerHTML = `
            <p class="fill-blanks-text">${textWithBlanks}</p>
            <button class="task-check-btn">Проверить</button>
        `;

        container.querySelector('.task-check-btn').addEventListener('click', () => {
            const feedback = document.getElementById(`task-feedback-${task.id}`);
            const inputs = container.querySelectorAll('.blank-input');
            let allCorrect = true;

            inputs.forEach((input, index) => {
                const userAnswer = input.value.trim().toLowerCase();
                const correctAnswer = task.config.blanks[index].toLowerCase();
                if (userAnswer !== correctAnswer) {
                    allCorrect = false;
                }
            });

            if (allCorrect) {
                this.completeTask(task);
                feedback.className = 'task-feedback success';
                feedback.textContent = `Правильно! +${task.points} баллов`;
            } else {
                feedback.className = 'task-feedback error';
                feedback.textContent = 'Есть ошибки. Проверьте написание слов.';
            }
        });
    }

    renderInteractiveTask(task, container) {
        container.innerHTML = `
            <div class="interactive-container">
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Количество товара X</span>
                        <span id="slider-x-value">50</span>
                    </div>
                    <input type="range" class="slider" id="slider-x" min="0" max="100" value="50">
                </div>
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Количество товара Y</span>
                        <span id="slider-y-value">50</span>
                    </div>
                    <input type="range" class="slider" id="slider-y" min="0" max="100" value="50">
                </div>
                <div class="graph-container">
                    <div class="graph-axis graph-axis-x"></div>
                    <div class="graph-axis graph-axis-y"></div>
                    <div class="graph-line" id="graph-line"></div>
                    <div class="graph-label" id="point-label" style="bottom: 50px; left: 50px;">📍</div>
                </div>
            </div>
            <button class="task-check-btn">Проверить</button>
        `;

        const sliderX = document.getElementById('slider-x');
        const sliderY = document.getElementById('slider-y');
        const valueX = document.getElementById('slider-x-value');
        const valueY = document.getElementById('slider-y-value');
        const pointLabel = document.getElementById('point-label');

        const updateGraph = () => {
            const x = parseInt(sliderX.value);
            const y = parseInt(sliderY.value);
            valueX.textContent = x;
            valueY.textContent = y;
            pointLabel.style.left = `${50 + x * 2.5}px`;
            pointLabel.style.bottom = `${20 + y * 2.6}px`;
        };

        sliderX.addEventListener('input', updateGraph);
        sliderY.addEventListener('input', updateGraph);

        container.querySelector('.task-check-btn').addEventListener('click', () => {
            const feedback = document.getElementById(`task-feedback-${task.id}`);
            const x = parseInt(sliderX.value);
            const y = parseInt(sliderY.value);
            
            // Check if point is on the curve (approximately)
            const onCurve = Math.abs(x + y - 100) <= task.config.tolerance;
            
            if (onCurve) {
                this.completeTask(task);
                feedback.className = 'task-feedback success';
                feedback.textContent = `Правильно! Точка на кривой. +${task.points} баллов`;
            } else {
                feedback.className = 'task-feedback error';
                feedback.textContent = 'Точка должна быть на кривой производственных возможностей!';
            }
        });

        updateGraph();
    }

    completeTask(task) {
        if (this.state.completedTasks[task.id]?.completed) return;

        this.state.completedTasks[task.id] = {
            completed: true,
            earnedPoints: task.points
        };
        this.state.score += task.points;
        
        this.saveState();
        this.updateUI();
        
        const card = document.getElementById(`task-${task.id}`);
        if (card) {
            card.classList.add('task-completed');
        }

        // Update module progress display
        if (this.state.currentModule) {
            this.renderModuleProgress(this.state.currentModule);
        }
    }

    renderModuleProgress(module) {
        const container = document.getElementById('progressTab');
        const progress = this.getModuleProgress(module);

        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; font-weight: 700; color: var(--primary-color); margin-bottom: 1rem;">
                    ${progress.percent.toFixed(0)}%
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    Выполнено заданий: ${progress.completed} из ${progress.total}
                </p>
                <div style="background: var(--bg-color); padding: 1.5rem; border-radius: var(--radius);">
                    <p style="font-size: 1.2rem; font-weight: 600; color: var(--accent-color);">
                        Набрано баллов: ${progress.points}
                    </p>
                </div>
            </div>
        `;
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tab}Tab`);
        });
    }

    // Shop
    renderShop() {
        const grid = document.getElementById('shopGrid');
        grid.innerHTML = '';

        courseData.shop.forEach(item => {
            const isPurchased = this.state.purchasedItems.includes(item.id);
            const canAfford = this.state.score >= item.price;

            const card = document.createElement('div');
            card.className = 'shop-item';
            card.innerHTML = `
                <div class="shop-item-icon">${item.icon}</div>
                <h4 class="shop-item-title">${item.name}</h4>
                <p class="shop-item-description">${item.description}</p>
                <div class="shop-item-price">${item.price} ⭐</div>
                <button class="shop-item-btn ${isPurchased ? 'purchased' : ''}" 
                        ${!canAfford && !isPurchased ? 'disabled' : ''}>
                    ${isPurchased ? 'Куплено' : 'Купить'}
                </button>
            `;

            card.querySelector('.shop-item-btn').addEventListener('click', () => {
                if (!isPurchased && canAfford) {
                    this.purchaseItem(item);
                }
            });

            grid.appendChild(card);
        });
    }

    purchaseItem(item) {
        this.state.purchasedItems.push(item.id);
        this.state.score -= item.price;
        
        if (item.type === 'theme') {
            this.state.currentTheme = item.value;
            this.applyTheme();
        }
        
        this.saveState();
        this.updateUI();
        this.renderShop();
    }

    applyTheme() {
        if (this.state.currentTheme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', this.state.currentTheme);
        }
    }

    // Profile
    renderProfile() {
        const totalTasks = courseData.modules.reduce((sum, m) => sum + m.tasks.length, 0);
        const completedTasks = Object.keys(this.state.completedTasks).filter(
            id => this.state.completedTasks[id].completed
        ).length;
        
        const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        document.getElementById('profileScore').textContent = this.state.score;
        document.getElementById('profileProgress').textContent = `${overallProgress.toFixed(0)}%`;
        document.getElementById('profileTasksCompleted').textContent = `${completedTasks}/${totalTasks}`;

        const inventoryList = document.getElementById('inventoryList');
        inventoryList.innerHTML = '';

        if (this.state.purchasedItems.length === 0) {
            inventoryList.innerHTML = '<p style="color: var(--text-secondary);">Пока нет покупок</p>';
        } else {
            this.state.purchasedItems.forEach(itemId => {
                const item = courseData.shop.find(i => i.id === itemId);
                if (item) {
                    const el = document.createElement('div');
                    el.className = 'inventory-item';
                    el.innerHTML = `<span>${item.icon}</span><span>${item.name}</span>`;
                    inventoryList.appendChild(el);
                }
            });
        }
    }

    updateUI() {
        document.getElementById('totalScore').textContent = this.state.score;
        this.renderModules();
        this.renderShop();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EconOlympApp();
});
