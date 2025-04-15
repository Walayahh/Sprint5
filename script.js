/******************************************************
 *                 STUDYBUDDY SCRIPT.JS
 ******************************************************/

// -------------------- Pomodoro Timer Variables --------------------
let workDuration = 25;
let breakDuration = 5;
let longBreakDuration = 15;
let sessionsBeforeLongBreak = 4;
let soundEnabled = true;
let isRunning = false;
let isPaused = false;
let isBreak = false;
let currentSession = 1;
let timeLeft = workDuration * 60;
let timer;
let sessionHistory = [];

// -------------------- DOM Elements --------------------
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
const soundEnabledCheckbox = document.getElementById('sound-enabled');
const timerCircle = document.querySelector('.timer-circle');
const historyListEl = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// NEW: Focus Stats
const focusStatsEl = document.getElementById('focus-stats');

// NEW: Daily Tips
const tipContentEl = document.getElementById('tip-content');
const refreshTipBtn = document.getElementById('refresh-tip-btn');

// NEW: GPT-Based Study Assistant
const apiKeyInput = document.getElementById('api-key-input');
const questionInput = document.getElementById('question-input');
const askBtn = document.getElementById('ask-btn');
const assistantAnswerEl = document.getElementById('assistant-answer');

// -------------------- Audio Setup --------------------
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

// -------------------- History Functions --------------------
function renderHistory() {
    if (!historyListEl) return;
    historyListEl.innerHTML = '';
    sessionHistory.forEach(entry => {
        const li = document.createElement('li');
        const textSpan = document.createElement('span');
        const timeSpan = document.createElement('span');

        textSpan.textContent = `Session ${entry.sessionNumber} (${entry.duration} min)`;
        timeSpan.textContent = new Date(entry.timestamp)
            .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeSpan.classList.add('timestamp');

        li.appendChild(textSpan);
        li.appendChild(timeSpan);
        // Newest entries on top
        historyListEl.prepend(li);
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
            sessionHistory = [];
        }
    }
    renderHistory();
}

function addHistoryEntry(sessionNumber, duration) {
    const newEntry = {
        sessionNumber,
        duration,
        timestamp: new Date().toISOString()
    };
    sessionHistory.push(newEntry);
    saveHistory();
    renderHistory();
    // Update Focus Stats each time a session is completed
    updateFocusStats();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear the session history?')) {
        sessionHistory = [];
        saveHistory();
        renderHistory();
        updateFocusStats(); // Also update stats after clearing
    }
}

// -------------------- Load/Save Settings --------------------
function loadSettings() {
    const savedSettings = localStorage.getItem('studyBuddySettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            workDuration = settings.workDuration || 25;
            breakDuration = settings.breakDuration || 5;
            longBreakDuration = settings.longBreakDuration || 15;
            sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak || 4;
            soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;

            // Update UI
            workDurationInput.value = workDuration;
            breakDurationInput.value = breakDuration;
            longBreakDurationInput.value = longBreakDuration;
            sessionsBeforeLongBreakInput.value = sessionsBeforeLongBreak;
            soundEnabledCheckbox.checked = soundEnabled;
        } catch(e) {
            console.error("Error parsing settings from localStorage", e);
            // Use defaults
        }
    } else {
        // Defaults if no settings saved
        workDurationInput.value = workDuration;
        breakDurationInput.value = breakDuration;
        longBreakDurationInput.value = longBreakDuration;
        sessionsBeforeLongBreakInput.value = sessionsBeforeLongBreak;
        soundEnabledCheckbox.checked = soundEnabled;
    }

    // Also load stored GPT API key if any
    const storedApiKey = localStorage.getItem('openAiApiKey');
    if (storedApiKey) {
        apiKeyInput.value = storedApiKey; // For convenience
    }

    // Load history
    loadHistory();

    // Reset timer after loading
    resetTimer();

    // Load daily tip
    loadDailyTip();
    updateFocusStats(); // Refresh stats after load
}

function saveSettings() {
    workDuration = parseInt(workDurationInput.value) || 25;
    breakDuration = parseInt(breakDurationInput.value) || 5;
    longBreakDuration = parseInt(longBreakDurationInput.value) || 15;
    sessionsBeforeLongBreak = parseInt(sessionsBeforeLongBreakInput.value) || 4;
    soundEnabled = soundEnabledCheckbox.checked;

    // Basic validation
    if (workDuration < 1) workDuration = 1;
    if (breakDuration < 1) breakDuration = 1;
    if (longBreakDuration < 1) longBreakDuration = 1;
    if (sessionsBeforeLongBreak < 1) sessionsBeforeLongBreak = 1;

    // Update UI in case validation changed values
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
        soundEnabled
    };
    localStorage.setItem('studyBuddySettings', JSON.stringify(settings));

    // Save GPT API key (if any)
    if (apiKeyInput.value) {
        localStorage.setItem('openAiApiKey', apiKeyInput.value);
    }

    if (!isRunning) {
        resetTimer();
    } else {
        console.log("Settings saved. Changes will apply on next reset or session end.");
    }
    alert("Settings saved!");
}

// -------------------- Timer UI --------------------
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    minutesEl.textContent = minutes < 10 ? `0${minutes}` : minutes;
    secondsEl.textContent = seconds < 10 ? `0${seconds}` : seconds;

    const status = isBreak
        ? (sessionLabelEl.textContent.includes("LONG") ? "Long Break" : "Short Break")
        : "Focus Time";
    document.title = `${minutesEl.textContent}:${secondsEl.textContent} - ${status} - StudyBuddy`;
}

function startTimer() {
    if (isRunning && !isPaused) return;

    if (!isRunning) {
        timeLeft = isBreak ? timeLeft : workDuration * 60; // fresh session or new break
    }

    isRunning = true;
    isPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "Pause";
    disableSettings(true);

    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            clearInterval(timer);
            isRunning = false;
            // Session ended
            if (!isBreak) {
                // Work session done
                playSound(workEndSound);
                addHistoryEntry(currentSession, workDuration);

                isBreak = true;
                if (currentSession % sessionsBeforeLongBreak === 0) {
                    timeLeft = longBreakDuration * 60;
                    sessionLabelEl.textContent = `LONG BREAK (${longBreakDuration} min)`;
                } else {
                    timeLeft = breakDuration * 60;
                    sessionLabelEl.textContent = `SHORT BREAK (${breakDuration} min)`;
                }
                document.body.classList.add('break-mode');
            } else {
                // Break session done
                playSound(breakEndSound);

                isBreak = false;
                currentSession++;
                timeLeft = workDuration * 60;
                sessionLabelEl.textContent = `FOCUS TIME (${workDuration} min)`;
                document.body.classList.remove('break-mode');
            }
            updateDisplay();
            startTimer();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning || isPaused) return;
    clearInterval(timer);
    isPaused = true;
    isRunning = false;
    pauseBtn.textContent = "Resume";
    disableSettings(false);
}

function resumeTimer() {
    if (!isPaused) return;
    isPaused = false;
    startTimer();
    pauseBtn.textContent = "Pause";
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isPaused = false;
    isBreak = false;
    currentSession = 1;
    timeLeft = workDuration * 60;

    updateDisplay();
    sessionLabelEl.textContent = `FOCUS TIME (${workDuration} min)`;

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause";
    document.body.classList.remove('break-mode');
    disableSettings(false);
    document.title = "StudyBuddy - Smart Study Timer";
}

function disableSettings(disable) {
    workDurationInput.disabled = disable;
    breakDurationInput.disabled = disable;
    longBreakDurationInput.disabled = disable;
    sessionsBeforeLongBreakInput.disabled = disable;
    soundEnabledCheckbox.disabled = disable;
    saveSettingsBtn.disabled = disable;
    apiKeyInput.disabled = disable; // Also disable/enable GPT API key field
}

// -------------------- Focus Stats (Ticket #11) --------------------
function updateFocusStats() {
    // Count total sessions in history
    const totalSessions = sessionHistory.length;

    // Count how many sessions happened "today"
    const today = new Date().toDateString();
    const todaySessions = sessionHistory.filter(entry => {
        const entryDate = new Date(entry.timestamp).toDateString();
        return entryDate === today;
    }).length;

    focusStatsEl.textContent =
        `Today’s Sessions: ${todaySessions} | Total Sessions: ${totalSessions}`;
}

// -------------------- Daily Tip (Ticket #10) --------------------
function loadDailyTip() {
    // Check date in localStorage
    const lastTipDate = localStorage.getItem('lastTipDate');
    const today = new Date().toDateString();

    if (lastTipDate === today) {
        // Already shown a tip today; load stored tip
        const storedTip = localStorage.getItem('dailyTip');
        if (storedTip) {
            tipContentEl.textContent = storedTip;
            return;
        }
    }
    // Otherwise, fetch a new tip
    fetchDailyTip();
}

function fetchDailyTip(forceNew = false) {
    // In a real app, you'd do:
    // fetch("https://example.com/api/productivity-tips")
    //   .then(res => res.json())
    //   .then(data => { ... })

    // For demonstration, we'll pick from an array.
    const tips = [
        "Take a few minutes each day to plan your study schedule.",
        "Use active recall: try to quiz yourself instead of just reading notes.",
        "Prioritize tasks using the Eisenhower Matrix: urgent vs. important.",
        "Set realistic goals for each study session to avoid burnout.",
        "Review your notes at the end of each day to reinforce memory."
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    tipContentEl.textContent = randomTip;

    const today = new Date().toDateString();
    localStorage.setItem('lastTipDate', today);
    localStorage.setItem('dailyTip', randomTip);
}

// -------------------- GPT-Based Study Assistant (Ticket #9) --------------------
async function askGptQuestion(question) {
    const apiKey = localStorage.getItem('openAiApiKey') || ""; // from localStorage
    if (!apiKey) {
        throw new Error("No OpenAI API key found. Please enter your key in Settings.");
    }

    // This example uses the Chat Completion endpoint (gpt-3.5 style).
    // If you prefer Completions, adjust accordingly.
    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };
    const body = {
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: "You are a helpful study assistant." },
            { role: "user", content: question }
        ],
        max_tokens: 200,
        temperature: 0.7
    };

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
    } else {
        throw new Error("No answer returned from GPT");
    }
}

// -------------------- Event Listeners --------------------
startBtn.addEventListener('click', startTimer);

pauseBtn.addEventListener('click', () => {
    if (isPaused) {
        resumeTimer();
    } else if (isRunning) {
        pauseTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);

saveSettingsBtn.addEventListener('click', saveSettings);

clearHistoryBtn.addEventListener('click', clearHistory);

refreshTipBtn.addEventListener('click', () => {
    // Force a new tip (ignores the once-a-day limit)
    fetchDailyTip(true);
});

// GPT Assistant
askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    if (!question) {
        assistantAnswerEl.textContent = "Please enter a question.";
        return;
    }

    // Save API key to localStorage if typed/changed
    if (apiKeyInput.value) {
        localStorage.setItem('openAiApiKey', apiKeyInput.value);
    }

    assistantAnswerEl.textContent = "Thinking...";
    try {
        const answer = await askGptQuestion(question);
        assistantAnswerEl.textContent = answer;
    } catch (err) {
        console.error(err);
        assistantAnswerEl.textContent = `Error: ${err.message}`;
    }
});

// -------------------- Initialize --------------------
loadSettings();
updateDisplay();
