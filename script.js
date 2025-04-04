// START OF FILE script.js

// Timer variables
let workDuration = 25;
let breakDuration = 5;
let longBreakDuration = 15;
let sessionsBeforeLongBreak = 4;
let soundEnabled = true; // New setting for sound alerts
let isRunning = false;
let isPaused = false;
let isBreak = false;
let currentSession = 1;
let timeLeft = workDuration * 60;
let timer;
let sessionHistory = []; // New array for history tracking

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
const soundEnabledCheckbox = document.getElementById('sound-enabled'); // New DOM element
const timerCircle = document.querySelector('.timer-circle');
const historyListEl = document.getElementById('history-list'); // New DOM element
const clearHistoryBtn = document.getElementById('clear-history-btn'); // New DOM element

// --- Audio Setup ---
// NOTE: Ensure you have 'work_end.mp3' and 'break_end.mp3' in a 'sounds' folder.
let workEndSound, breakEndSound;
try {
    workEndSound = new Audio('sounds/work_end.mp3');
    breakEndSound = new Audio('sounds/break_end.mp3');
} catch (error) {
    console.error("Error loading sound files. Ensure they exist in the 'sounds' folder.", error);
    // Optionally disable sound feature if loading fails
    soundEnabled = false;
    if(soundEnabledCheckbox) soundEnabledCheckbox.disabled = true;
}

// Function to play sound only if enabled
function playSound(sound) {
    if (soundEnabled && sound && typeof sound.play === 'function') {
        sound.play().catch(error => console.error("Error playing sound:", error));
    }
}

// --- History Functions ---
function renderHistory() {
    if (!historyListEl) return; // Guard clause
    historyListEl.innerHTML = ''; // Clear existing list
    sessionHistory.forEach(entry => {
        const li = document.createElement('li');
        const textSpan = document.createElement('span');
        const timeSpan = document.createElement('span');

        textSpan.textContent = `Session ${entry.sessionNumber} (${entry.duration} min)`;
        timeSpan.textContent = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeSpan.classList.add('timestamp');

        li.appendChild(textSpan);
        li.appendChild(timeSpan);
        historyListEl.prepend(li); // Add newest entries to the top
    });
}

function saveHistory() {
    localStorage.setItem('studyBuddyHistory', JSON.stringify(sessionHistory));
}

function loadHistory() {
    const savedHistory = localStorage.getItem('studyBuddyHistory');
    if (savedHistory) {
        try {
            sessionHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error("Error parsing session history from localStorage", e);
            sessionHistory = []; // Reset if data is corrupt
        }
    }
    renderHistory(); // Render loaded history
}

function addHistoryEntry(sessionNumber, duration) {
    const newEntry = {
        sessionNumber: sessionNumber,
        duration: duration, // Store the duration of the completed session
        timestamp: new Date().toISOString() // Use ISO string for reliable storage/parsing
    };
    sessionHistory.push(newEntry);
    saveHistory();
    renderHistory();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear the session history?')) {
        sessionHistory = [];
        saveHistory();
        renderHistory();
    }
}

// Load settings and history from localStorage
function loadSettings() {
    // Load Timer Settings
    const savedSettings = localStorage.getItem('studyBuddySettings');
    if (savedSettings) {
         try {
            const settings = JSON.parse(savedSettings);
            workDuration = settings.workDuration || 25;
            breakDuration = settings.breakDuration || 5;
            longBreakDuration = settings.longBreakDuration || 15;
            sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak || 4;
            // Load sound setting (default to true if not found)
            soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;

            // Update input fields
            workDurationInput.value = workDuration;
            breakDurationInput.value = breakDuration;
            longBreakDurationInput.value = longBreakDuration;
            sessionsBeforeLongBreakInput.value = sessionsBeforeLongBreak;
            soundEnabledCheckbox.checked = soundEnabled;

        } catch(e) {
            console.error("Error parsing settings from localStorage", e);
            // Use default values if parsing fails
             workDuration = 25;
             breakDuration = 5;
             longBreakDuration = 15;
             sessionsBeforeLongBreak = 4;
             soundEnabled = true;
        }
    } else {
        // Set defaults if no settings saved
        workDurationInput.value = workDuration;
        breakDurationInput.value = breakDuration;
        longBreakDurationInput.value = longBreakDuration;
        sessionsBeforeLongBreakInput.value = sessionsBeforeLongBreak;
        soundEnabledCheckbox.checked = soundEnabled;
    }

    // Load History
    loadHistory();

    // Reset timer display based on loaded settings
    resetTimer(); // Call resetTimer here AFTER loading settings
}


// Save settings to localStorage
function saveSettings() {
    // Get values from inputs
    workDuration = parseInt(workDurationInput.value) || 25; // Add fallback default
    breakDuration = parseInt(breakDurationInput.value) || 5;
    longBreakDuration = parseInt(longBreakDurationInput.value) || 15;
    sessionsBeforeLongBreak = parseInt(sessionsBeforeLongBreakInput.value) || 4;
    soundEnabled = soundEnabledCheckbox.checked; // Get sound setting

    // Basic Validation (optional but good)
    if (workDuration < 1) workDuration = 1;
    if (breakDuration < 1) breakDuration = 1;
    if (longBreakDuration < 1) longBreakDuration = 1;
    if (sessionsBeforeLongBreak < 1) sessionsBeforeLongBreak = 1;

    // Update input fields in case validation changed values
    workDurationInput.value = workDuration;
    breakDurationInput.value = breakDuration;
    longBreakDurationInput.value = longBreakDuration;
    sessionsBeforeLongBreakInput.value = sessionsBeforeLongBreak;


    // Save to localStorage
    const settings = {
        workDuration,
        breakDuration,
        longBreakDuration,
        sessionsBeforeLongBreak,
        soundEnabled // Save sound setting
    };

    localStorage.setItem('studyBuddySettings', JSON.stringify(settings));

    // Reset timer with new settings if timer is not running
    if (!isRunning) {
        resetTimer();
    } else {
         // If timer is running, maybe just update the display?
         // Or prompt user that changes will apply on next reset?
         // For simplicity now, changes apply on next reset or session end.
         console.log("Settings saved. Changes will apply on next reset or session.");
    }
     alert("Settings saved!"); // Feedback to user
}

// Update timer display
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    minutesEl.textContent = minutes < 10 ? `0${minutes}` : minutes;
    secondsEl.textContent = seconds < 10 ? `0${seconds}` : seconds;

    // Update document title with timer and status
    const status = isBreak ? (sessionLabelEl.textContent.includes("LONG") ? "Long Break" : "Short Break") : "Focus Time";
    document.title = `${minutesEl.textContent}:${secondsEl.textContent} - ${status} - StudyBuddy`;
}

// Start timer
function startTimer() {
    if (isRunning && !isPaused) return; // Already running

    if (!isRunning) { // If starting from a fresh state or reset
        timeLeft = isBreak ? timeLeft : workDuration * 60; // Use current timeLeft if resuming break, else start work session
    }

    isRunning = true;
    isPaused = false;

    // Update button states
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "Pause"; // Ensure text is correct
    // Disable settings inputs while running
    workDurationInput.disabled = true;
    breakDurationInput.disabled = true;
    longBreakDurationInput.disabled = true;
    sessionsBeforeLongBreakInput.disabled = true;
    soundEnabledCheckbox.disabled = true;
    saveSettingsBtn.disabled = true;


    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            clearInterval(timer);
            isRunning = false; // Timer stops naturally here

            // --- Session Transition Logic ---
            if (!isBreak) {
                // Completed a work session
                playSound(workEndSound); // Play sound
                addHistoryEntry(currentSession, workDuration); // Add to history BEFORE incrementing currentSession

                isBreak = true;
                if (currentSession % sessionsBeforeLongBreak === 0) {
                    timeLeft = longBreakDuration * 60;
                    sessionLabelEl.textContent = `LONG BREAK (${longBreakDuration} min)`;
                } else {
                    timeLeft = breakDuration * 60;
                    sessionLabelEl.textContent = `SHORT BREAK (${breakDuration} min)`;
                }
                document.body.classList.add('break-mode');
                // Style update is handled by CSS class now
            } else {
                // Completed a break session
                playSound(breakEndSound); // Play sound

                isBreak = false;
                currentSession++; // Increment session count only after a break finishes
                timeLeft = workDuration * 60;
                sessionLabelEl.textContent = `FOCUS TIME (${workDuration} min)`;
                document.body.classList.remove('break-mode');
                 // Style update is handled by CSS class now
            }

            updateDisplay();
            // Auto-start the next session (optional, could require user to click start again)
            startTimer();
        }
    }, 1000);
}

// Pause timer
function pauseTimer() {
    if (!isRunning || isPaused) return;

    clearInterval(timer);
    isPaused = true;
    isRunning = false; // Treat paused as not actively running the interval
    pauseBtn.textContent = "Resume";
    // Re-enable settings when paused
    workDurationInput.disabled = false;
    breakDurationInput.disabled = false;
    longBreakDurationInput.disabled = false;
    sessionsBeforeLongBreakInput.disabled = false;
    soundEnabledCheckbox.disabled = false;
    saveSettingsBtn.disabled = false;
}

// Resume timer (uses startTimer logic)
function resumeTimer() {
    if (!isPaused) return; // Can only resume if paused

    isPaused = false; // Set paused to false before calling start
    startTimer();
    pauseBtn.textContent = "Pause"; // Set text back immediately
}

// Reset timer
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isPaused = false;
    isBreak = false;
    currentSession = 1; // Reset session count
    timeLeft = workDuration * 60; // Reset time to WORK duration

    // Update display
    updateDisplay();
    sessionLabelEl.textContent = `FOCUS TIME (${workDuration} min)`; // Include duration

    // Reset button states
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause";

    // Reset styles
    document.body.classList.remove('break-mode');
    // Style update handled by CSS

    // Re-enable settings inputs on reset
    workDurationInput.disabled = false;
    breakDurationInput.disabled = false;
    longBreakDurationInput.disabled = false;
    sessionsBeforeLongBreakInput.disabled = false;
    soundEnabledCheckbox.disabled = false;
    saveSettingsBtn.disabled = false;

     // Reset title
    document.title = "StudyBuddy - Smart Study Timer";
}

// Event listeners
startBtn.addEventListener('click', startTimer);

pauseBtn.addEventListener('click', () => {
    if (isPaused) {
        resumeTimer();
    } else if (isRunning) { // Only allow pause if actually running
        pauseTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);

saveSettingsBtn.addEventListener('click', saveSettings);

clearHistoryBtn.addEventListener('click', clearHistory); // Add listener for clear history

// Initialize
loadSettings(); // Load settings AND history on page load
// updateDisplay(); // updateDisplay is called within resetTimer inside loadSettings

// END OF FILE script.js
