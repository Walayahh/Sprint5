// Timer variables
let workDuration = 25;
let breakDuration = 5;
let longBreakDuration = 15;
let sessionsBeforeLongBreak = 4;
let isRunning = false;
let isPaused = false;
let isBreak = false;
let currentSession = 1;
let timeLeft = workDuration * 60;
let timer;

// DOM elements
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const sessionLabelEl = document.getElementById('session-label');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const saveSettingsBtn = document.getElementById('save-settings');
const workDurationInput = document.getElementById('work-duration');
const breakDurationInput = document.getElementById('break-duration');
const longBreakDurationInput = document.getElementById('long-break-duration');
const sessionsBeforeLongBreakInput = document.getElementById('sessions-before-long-break');
const timerCircle = document.querySelector('.timer-circle');

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('studyBuddySettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        workDuration = settings.workDuration;
        breakDuration = settings.breakDuration;
        longBreakDuration = settings.longBreakDuration;
        sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak;
        
        // Update input fields
        workDurationInput.value = workDuration;
        breakDurationInput.value = breakDuration;
        longBreakDurationInput.value = longBreakDuration;
        sessionsBeforeLongBreakInput.value = sessionsBeforeLongBreak;
        
        // Reset timer with new work duration
        resetTimer();
    }
}

// Save settings to localStorage
function saveSettings() {
    // Get values from inputs
    workDuration = parseInt(workDurationInput.value);
    breakDuration = parseInt(breakDurationInput.value);
    longBreakDuration = parseInt(longBreakDurationInput.value);
    sessionsBeforeLongBreak = parseInt(sessionsBeforeLongBreakInput.value);
    
    // Save to localStorage
    const settings = {
        workDuration,
        breakDuration,
        longBreakDuration,
        sessionsBeforeLongBreak
    };
    
    localStorage.setItem('studyBuddySettings', JSON.stringify(settings));
    
    // Reset timer with new settings
    resetTimer();
}

// Update timer display
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    minutesEl.textContent = minutes < 10 ? `0${minutes}` : minutes;
    secondsEl.textContent = seconds < 10 ? `0${seconds}` : seconds;
    
    // Update document title with timer
    document.title = `${minutesEl.textContent}:${secondsEl.textContent} - StudyBuddy`;
}

// Start timer
function startTimer() {
    if (isRunning && !isPaused) return;
    
    isRunning = true;
    isPaused = false;
    
    // Update button states
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            clearInterval(timer);
            
            // Switch between work and break sessions
            if (!isBreak) {
                // Completed a work session, switch to break
                isBreak = true;
                
                // Check if it's time for a long break
                if (currentSession % sessionsBeforeLongBreak === 0) {
                    timeLeft = longBreakDuration * 60;
                    sessionLabelEl.textContent = "LONG BREAK";
                } else {
                    timeLeft = breakDuration * 60;
                    sessionLabelEl.textContent = "SHORT BREAK";
                }
                
                document.body.classList.add('break-mode');
                timerCircle.style.borderColor = '#06d6a0';
            } else {
                // Completed a break, switch to work
                isBreak = false;
                currentSession++;
                timeLeft = workDuration * 60;
                sessionLabelEl.textContent = "FOCUS TIME";
                document.body.classList.remove('break-mode');
                timerCircle.style.borderColor = '#3a86ff';
            }
            
            updateDisplay();
            startTimer(); // Auto-start the next session
        }
    }, 1000);
}

// Pause timer
function pauseTimer() {
    if (!isRunning || isPaused) return;
    
    clearInterval(timer);
    isPaused = true;
    pauseBtn.textContent = "Resume";
}

// Resume timer
function resumeTimer() {
    if (!isRunning || !isPaused) return;
    
    isPaused = false;
    startTimer();
    pauseBtn.textContent = "Pause";
}

// Reset timer
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isPaused = false;
    isBreak = false;
    currentSession = 1;
    timeLeft = workDuration * 60;
    
    // Update display
    updateDisplay();
    sessionLabelEl.textContent = "FOCUS TIME";
    
    // Reset button states
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause";
    
    // Reset styles
    document.body.classList.remove('break-mode');
    timerCircle.style.borderColor = '#3a86ff';
}

// Event listeners
startBtn.addEventListener('click', startTimer);

pauseBtn.addEventListener('click', () => {
    if (isPaused) {
        resumeTimer();
    } else {
        pauseTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);

saveSettingsBtn.addEventListener('click', saveSettings);

// Initialize
loadSettings();
updateDisplay();
