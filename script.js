const calendarBody = document.querySelector('#calendar tbody');
const monthYearDisplay = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const practiceForm = document.getElementById('practiceForm');
const selectedDayDisplay = document.getElementById('selectedDay');
const savePracticeBtn = document.getElementById('savePractice');
const totalMinutesDisplay = document.getElementById('totalMinutes');
const totalStopDisplay = document.getElementById('totalStop');
const maxStreakDisplay = document.getElementById('maxStreak');
const resetStatsBtn = document.getElementById('resetStats');

let currentDate = new Date();
let selectedDate = null;
let practiceData = loadPracticeData();

function loadPracticeData() {
    const data = localStorage.getItem('guitarPractice');
    return data ? JSON.parse(data) : {};
}

function savePracticeData() {
    localStorage.setItem('guitarPractice', JSON.stringify(practiceData));
    updateStats();
}

function generateCalendar(year, month) {
    calendarBody.innerHTML = '';
    monthYearDisplay.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.

    let date = 1;

    for (let i = 0; i < 6; i++) { // Up to 6 weeks in a month
        const row = document.createElement('tr');

        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1)) {
                const cell = document.createElement('td');
                row.appendChild(cell);
            } else if (date > daysInMonth) {
                break;
            } else {
                const cell = document.createElement('td');
                cell.textContent = date;
                const currentDay = date; // Catturiamo il valore corrente di 'date'
                const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

                if (practiceData[fullDate]) {
                    cell.classList.add('has-practice');
                    cell.title = `Pratica: ${practiceData[fullDate]}`;
                }

                cell.addEventListener('click', () => {
                    selectedDate = new Date(year, month, currentDay); // Usiamo 'currentDay'
                    selectedDayDisplay.textContent = `Giorno selezionato: ${selectedDate.toLocaleDateString()}`;
                    practiceForm.style.display = 'block';
                    resetRadioButtons();
                    const fullDateForSelection = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                    if (practiceData[fullDateForSelection]) {
                        document.querySelector(`#practiceForm input[value="${practiceData[fullDateForSelection]}"]`).checked = true;
                    }
                });

                row.appendChild(cell);
                date++;
            }
        }
        calendarBody.appendChild(row);
        if (date > daysInMonth) {
            break;
        }
    }
    practiceForm.style.display = 'none';
}

function resetRadioButtons() {
    document.querySelectorAll('#practiceForm input[type="radio"]').forEach(radio => {
        radio.checked = false;
    });
}

function updateCalendar() {
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
}

prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
});

savePracticeBtn.addEventListener('click', () => {
    if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const fullDate = `${year}-${month}-${day}`;
        const practiceType = document.querySelector('#practiceForm input[name="practice_type"]:checked')?.value;

        if (practiceType) {
            practiceData[fullDate] = practiceType;
            savePracticeData();
            updateCalendar();
        }
        selectedDate = null;
        practiceForm.style.display = 'none';
    }
});

function updateStats() {
    let totalMinutes = 0;
    let totalStop = 0;
    let maxStreak = 0;
    let currentStreak = 0;
    let lastPracticeDay = null;

    const sortedDates = Object.keys(practiceData).sort();

    for (const dateStr of sortedDates) {
        const practiceType = practiceData[dateStr];
        const currentDate = new Date(dateStr);

        if (practiceType === '5min') totalMinutes += 5;
        else if (practiceType === '15min') totalMinutes += 15;
        else if (practiceType === '30min') totalMinutes += 30;
        else if (practiceType === 'more_30min') totalMinutes += 31; // Assumiamo almeno 31 minuti

        if (practiceType === 'stop') {
            totalStop++;
            currentStreak = 0;
        } else if (practiceType) {
            if (lastPracticeDay) {
                const diffTime = Math.abs(currentDate - lastPracticeDay);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
            } else {
                currentStreak = 1;
            }
            lastPracticeDay = currentDate;
            maxStreak = Math.max(maxStreak, currentStreak);
        }
    }

    totalMinutesDisplay.textContent = totalMinutes;
    totalStopDisplay.textContent = totalStop;
    maxStreakDisplay.textContent = maxStreak;
}

resetStatsBtn.addEventListener('click', () => {
    if (confirm("Sei sicuro di voler azzerare tutte le statistiche? Questa azione è irreversibile.")) {
        practiceData = {}; // Resetta l'oggetto dei dati di pratica
        localStorage.removeItem('guitarPractice'); // Rimuove i dati dal localStorage
        updateCalendar(); // Ricarica il calendario per rimuovere le evidenziazioni
        updateStats(); // Aggiorna le statistiche a zero
    }
});

function setupDailyReminder() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                scheduleNotification();
            } else if (permission === 'denied') {
                console.warn('Notifiche disabilitate dall\'utente.');
            } else if (permission === 'default') {
                console.log('Richiesta di notifica ignorata.');
            }
        });
    } else {
        console.warn('Le notifiche non sono supportate in questo browser.');
    }
}

function scheduleNotification() {
    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(13);
    targetTime.setMinutes(30);
    targetTime.setSeconds(0);
    targetTime.setMilliseconds(0);

    // Se l'ora target è già passata oggi, imposta per domani
    if (now.getTime() > targetTime.getTime()) {
        targetTime.setDate(targetTime.getDate() + 1);
    }

    const timeUntilTarget = targetTime.getTime() - now.getTime();

    setTimeout(() => {
        showNotification();
        // Imposta per il giorno successivo
        setInterval(() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(13);
            tomorrow.setMinutes(30);
            tomorrow.setSeconds(0);
            tomorrow.setMilliseconds(0);
            const timeUntilTomorrow = tomorrow.getTime() - new Date().getTime();
            setTimeout(showNotification, timeUntilTomorrow);
        }, 24 * 60 * 60 * 1000); // Ripeti ogni 24 ore
    }, timeUntilTarget);
}

function showNotification() {
    const notification = new Notification('Ricorda di praticare la chitarra!', {
        body: 'È l\'ora di dedicare almeno 30 minuti alla tua pratica quotidiana.',
        icon: '/path/to/your/guitar_icon.png' // Sostituisci con il percorso alla tua icona (opzionale)
    });

    notification.onclick = function() {
        window.focus();
    };
}

// Avvia la richiesta di notifica all'avvio
window.onload = setupDailyReminder;

updateCalendar();
updateStats();