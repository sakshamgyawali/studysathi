
let tasks = JSON.parse(localStorage.getItem('studysathi_tasks')) || [];
let studyData = JSON.parse(localStorage.getItem('studysathi_study')) || {
    todayMinutes: 0,
    weeklyMinutes: [0, 0, 0, 0, 0, 0, 0], 
    totalPomodoros: 0,
    todayPomodoros: 0,
    lastResetDate: new Date().toDateString()
};

let timerState = {
    isRunning: false,
    isPaused: false,
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    mode: 'focus', 
    interval: null
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTaskManagement();
    initPomodoro();
    initStats();
    checkDailyReset();
    updateDashboard();
    checkAlerts();
        addTimerGradient();
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
 
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
 
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            
            if (pageId === 'stats') {
                updateStatsPage();
            }
        });
    });
}

function initTaskManagement() {
    const form = document.getElementById('addTaskForm');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const suggestBtn = document.getElementById('suggestStudyBtn');
    

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const subject = document.getElementById('taskSubject').value.trim();
        const title = document.getElementById('taskTitle').value.trim();
        const dueDate = document.getElementById('taskDueDate').value;
        
        if (subject && title && dueDate) {
            const task = {
                id: Date.now(),
                subject,
                title,
                dueDate,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            tasks.push(task);
            saveTasks();
            renderTasks();
            updateDashboard();
            form.reset();
            
            showNotification('Task added successfully! 🎉');
        }
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            renderTasks(filter);
        });
    });
    

    suggestBtn.addEventListener('click', () => {
        const suggestion = getSuggestedTask();
        const resultDiv = document.getElementById('studySuggestion');
        
        if (suggestion) {
            resultDiv.innerHTML = `
                <h3>📚 Study This: ${suggestion.subject}</h3>
                <p><strong>${suggestion.title}</strong></p>
                <p>${suggestion.reason}</p>
            `;
            resultDiv.classList.add('show');
        } else {
            resultDiv.innerHTML = `
                <h3>🎉 All Caught Up!</h3>
                <p>You have no pending urgent tasks. Great job staying on top of your work!</p>
            `;
            resultDiv.classList.add('show');
        }
    });
    
    renderTasks();
}

function renderTasks(filter = 'all') {
    const taskList = document.getElementById('taskList');
    let filteredTasks = [...tasks];
    

    if (filter === 'urgent') {
        filteredTasks = tasks.filter(task => !task.completed && getPriority(task.dueDate).level === 'urgent');
    } else if (filter === 'soon') {
        filteredTasks = tasks.filter(task => !task.completed && getPriority(task.dueDate).level === 'soon');
    } else if (filter === 'later') {
        filteredTasks = tasks.filter(task => !task.completed && getPriority(task.dueDate).level === 'later');
    } else if (filter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    
  
    filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="task-list-empty">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <p>No tasks found</p>
            </div>
        `;
        return;
    }
    
    taskList.innerHTML = filteredTasks.map(task => {
        const priority = getPriority(task.dueDate);
        return `
            <div class="task-item ${priority.level} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
                <div class="task-content">
                    <div class="task-header">
                        <span class="task-subject">${task.subject}</span>
                        <span class="task-title">${task.title}</span>
                    </div>
                    <div class="task-meta">
                        <span class="task-due">
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                            </svg>
                            ${formatDate(task.dueDate)}
                        </span>
                        <span class="priority-badge ${priority.level}">${priority.text}</span>
                    </div>
                </div>
                <button class="task-delete" onclick="deleteTask(${task.id})">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateDashboard();
    }
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        updateDashboard();
        showNotification('Task deleted');
    }
}

function getPriority(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { level: 'urgent', text: '🔴 Overdue', days: diffDays };
    } else if (diffDays <= 2) {
        return { level: 'urgent', text: '🔴 Urgent', days: diffDays };
    } else if (diffDays <= 5) {
        return { level: 'soon', text: '🟡 Soon', days: diffDays };
    } else {
        return { level: 'later', text: '🟢 Later', days: diffDays };
    }
}

function getSuggestedTask() {
    const incompleteTasks = tasks.filter(t => !t.completed);
    if (incompleteTasks.length === 0) return null;
    

    const sortedTasks = incompleteTasks.sort((a, b) => {
        const priorityA = getPriority(a.dueDate);
        const priorityB = getPriority(b.dueDate);
        
        const priorityOrder = { 'urgent': 0, 'soon': 1, 'later': 2 };
        
        if (priorityOrder[priorityA.level] !== priorityOrder[priorityB.level]) {
            return priorityOrder[priorityA.level] - priorityOrder[priorityB.level];
        }
        
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    const suggested = sortedTasks[0];
    const priority = getPriority(suggested.dueDate);
    
    let reason = '';
    if (priority.days < 0) {
        reason = `This task is overdue by ${Math.abs(priority.days)} day(s). It needs your immediate attention!`;
    } else if (priority.days === 0) {
        reason = 'This task is due today! Get it done now.';
    } else if (priority.days === 1) {
        reason = 'This task is due tomorrow. Better start working on it!';
    } else if (priority.days <= 2) {
        reason = `This task is due in ${priority.days} days. It's your most urgent pending task.`;
    } else {
        reason = `This is your most urgent task, due in ${priority.days} days.`;
    }
    
    return { ...suggested, reason };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function initPomodoro() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    updateTimerDisplay();
}

function startTimer() {
    timerState.isRunning = true;
    timerState.isPaused = false;
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    
    timerState.interval = setInterval(() => {
        if (timerState.timeLeft > 0) {
            timerState.timeLeft--;
            updateTimerDisplay();
        } else {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    timerState.isRunning = false;
    timerState.isPaused = true;
    
    clearInterval(timerState.interval);
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

function resetTimer() {
    pauseTimer();
    timerState.timeLeft = timerState.totalTime;
    timerState.mode = 'focus';
    
    updateTimerDisplay();
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

function completeSession() {
    pauseTimer();
    
    if (timerState.mode === 'focus') {
        studyData.todayMinutes += 25;
        const dayIndex = new Date().getDay();
        studyData.weeklyMinutes[dayIndex] += 25;
        studyData.totalPomodoros++;
        studyData.todayPomodoros++;
        
        saveStudyData();
        updateDashboard();
        updateStatsPage();
       
        timerState.mode = 'break';
        timerState.timeLeft = 5 * 60;
        timerState.totalTime = 5 * 60;
        
        showNotification('🎉 Focus session complete! Time for a 5-minute break.');
    } else {
        
        timerState.mode = 'focus';
        timerState.timeLeft = 25 * 60;
        timerState.totalTime = 25 * 60;
        
        showNotification('Break is over! Ready for another focus session?');
    }
    
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerState.timeLeft / 60);
    const seconds = timerState.timeLeft % 60;
    
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
    
    const label = timerState.mode === 'focus' ? 'Focus Time' : 'Break Time';
    document.getElementById('timerLabel').textContent = label;
    

    const progress = 1 - (timerState.timeLeft / timerState.totalTime);
    const circumference = 2 * Math.PI * 140;
    const offset = circumference * progress;
    
    const progressCircle = document.getElementById('timerProgress');
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = offset;
    }
    
 
    document.getElementById('sessionsToday').textContent = studyData.todayPomodoros;
}

function addTimerGradient() {
    const svg = document.querySelector('.timer-circle');
    if (!svg) return;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'timerGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#667eea');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#764ba2');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.insertBefore(defs, svg.firstChild);
}

function updateDashboard() {
    
    const urgentTasks = tasks.filter(t => !t.completed && getPriority(t.dueDate).level === 'urgent');
    document.getElementById('urgentCount').textContent = urgentTasks.length;

    const hours = Math.floor(studyData.todayMinutes / 60);
    const minutes = studyData.todayMinutes % 60;
    document.getElementById('todayStudyTime').textContent = `${hours}h ${minutes}m`;
    
    document.getElementById('pomodoroCount').textContent = studyData.todayPomodoros;
    
    const upcomingContainer = document.getElementById('upcomingTasks');
    const incompleteTasks = tasks
        .filter(t => !t.completed)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
    
    if (incompleteTasks.length === 0) {
        upcomingContainer.innerHTML = '<div class="task-preview-empty">No upcoming tasks. Great job! 🎉</div>';
    } else {
        upcomingContainer.innerHTML = incompleteTasks.map(task => {
            const priority = getPriority(task.dueDate);
            return `
                <div class="task-item ${priority.level}">
                    <div class="task-checkbox" onclick="toggleTask(${task.id})"></div>
                    <div class="task-content">
                        <div class="task-header">
                            <span class="task-subject">${task.subject}</span>
                            <span class="task-title">${task.title}</span>
                        </div>
                        <div class="task-meta">
                            <span class="task-due">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                                </svg>
                                ${formatDate(task.dueDate)}
                            </span>
                            <span class="priority-badge ${priority.level}">${priority.text}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}
function initStats() {
    updateStatsPage();
}

function updateStatsPage() {

    const hours = Math.floor(studyData.todayMinutes / 60);
    const minutes = studyData.todayMinutes % 60;
    document.getElementById('statsTodayTime').textContent = `${hours}h ${minutes}m`;

    const weekTotal = studyData.weeklyMinutes.reduce((a, b) => a + b, 0);
    const weekHours = Math.floor(weekTotal / 60);
    const weekMinutes = weekTotal % 60;
    document.getElementById('statsWeekTime').textContent = `${weekHours}h ${weekMinutes}m`;

    document.getElementById('totalTasks').textContent = tasks.length;
    document.getElementById('completedTasks').textContent = tasks.filter(t => t.completed).length;
    document.getElementById('totalPomodoros').textContent = studyData.totalPomodoros;

    renderWeeklyChart();
}

function renderWeeklyChart() {
    const chartContainer = document.getElementById('weeklyChart');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const maxMinutes = Math.max(...studyData.weeklyMinutes, 60);
    
    chartContainer.innerHTML = studyData.weeklyMinutes.map((minutes, index) => {
        const height = (minutes / maxMinutes) * 100;
        const hours = (minutes / 60).toFixed(1);
        
        return `
            <div class="bar" style="height: ${height}%">
                <div class="bar-value">${hours}h</div>
                <div class="bar-label">${days[index]}</div>
            </div>
        `;
    }).join('');
}

function checkAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    tasks.forEach(task => {
        if (task.completed) return;
        
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            showAlert(`${task.subject}: ${task.title}`, 'Due today!');
        } else if (diffDays < 0) {
            showAlert(`${task.subject}: ${task.title}`, `Overdue by ${Math.abs(diffDays)} day(s)!`);
        }
    });
}

function showAlert(title, message) {
    const container = document.getElementById('alertContainer');
    
    const alert = document.createElement('div');
    alert.className = 'alert';
    alert.innerHTML = `
        <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <div class="alert-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
        </button>
    `;
    
    container.appendChild(alert);

    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 10000);
}

function showNotification(message) {
    const container = document.getElementById('alertContainer');
    
    const notification = document.createElement('div');
    notification.className = 'alert';
    notification.style.borderLeftColor = '#4facfe';
    notification.innerHTML = `
        <svg class="alert-icon" style="color: #4facfe;" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <div class="alert-content">
            <p style="margin: 0;">${message}</p>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
        </button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

function checkDailyReset() {
    const today = new Date().toDateString();
    
    if (studyData.lastResetDate !== today) {
        studyData.todayMinutes = 0;
        studyData.todayPomodoros = 0;
        studyData.lastResetDate = today;
        saveStudyData();
    }
}
function saveTasks() {
    localStorage.setItem('studysathi_tasks', JSON.stringify(tasks));
}

function saveStudyData() {
    localStorage.setItem('studysathi_study', JSON.stringify(studyData));
}
