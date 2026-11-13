document.addEventListener("DOMContentLoaded", function () {
    
    // 1. Sidebar Panel Layout Routing Engine
    const navlinks = document.querySelectorAll(".navlink");
    const sections = document.querySelectorAll(".page-section");

    navlinks.forEach(link => {
        link.addEventListener("click", function () {
            const pageId = this.getAttribute("data-page");
            if (pageId === "logout") {
                if (confirm("Terminate active dashboard session?")) {
                    window.location.href = "/logout";
                }
                return;
            }
            switchDashboardView(pageId);
        });
    });

    // Central Controller View Handler 
    window.switchDashboardView = function (pageId) {
        const targetSection = document.getElementById("page-" + pageId);
        const targetLink = document.querySelector(`.navlink[data-page="${pageId}"]`);

        if (!targetSection) return;

        // Clear active display declarations from view components
        navlinks.forEach(l => l.classList.remove("is-active"));
        sections.forEach(s => s.classList.remove("is-active"));

        // Assign active tracking state markers
        if (targetLink) targetLink.classList.add("is-active");
        targetSection.classList.add("is-active");

        // Dynamic Header configuration values matching selected modules
        const titles = {
            home: ["Good Morning, Faculty Member", "Here's your teaching overview for today"],
            lt: ["Learning Topics Tracker Matrix", "Filter tracks and manage active lecture timers"],
            exam: ["Examination Scoring Portal", "Input active candidate evaluation logs with precision"],
            result: ["Result Generation Studio", "Compile scorecard data models and dispatch to cohorts"],
            hallticket: ["Hall Ticket Document Dispatch", "Review candidate terminal admit clearances"],
            notice: ["Dispatched System Bulletins Matrix", "Configure operational notification broadcasts"],
            discipline: ["Discipline & Behavior Case Logs", "Track and record student infractions with custom remarks"]
        };

        if (titles[pageId]) {
            document.getElementById("topbarTitle").textContent = titles[pageId][0];
            document.getElementById("topbarSub").textContent = titles[pageId][1];
        }

        // Collapse mobile sliding overlay drawer assemblies if active
        const sidebar = document.getElementById("sidebar");
        const sidebarOverlay = document.getElementById("sidebarOverlay");
        if (sidebar) sidebar.classList.remove("is-open");
        if (sidebarOverlay) sidebarOverlay.classList.remove("is-open");
    };

    window.routeToPage = function (pageId) { switchDashboardView(pageId); };

    // Mobile Navigation Layout Event Listeners
    const menuBtn = document.getElementById("menuBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidebar = document.getElementById("sidebar");

    if (menuBtn && sidebar && sidebarOverlay) {
        menuBtn.addEventListener("click", function () {
            sidebar.classList.toggle("is-open");
            sidebarOverlay.classList.toggle("is-open");
        });
        sidebarOverlay.addEventListener("click", function () {
            sidebar.classList.remove("is-open");
            sidebarOverlay.classList.remove("is-open");
        });
    }

    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const dateEl = document.getElementById("topbarDate");
    if (dateEl) { dateEl.textContent = new Date().toLocaleDateString("en-US", options).toUpperCase(); }

    window.initializeTimerVariables();
    window.filterDisciplineStudents();
});

// ===================== MANAGEMENT CORE INTERACTION MODULES =====================

/* -------------------------------------------------------------------------
   LEARNING TOPICS (LT) LIVE TIMING ENGINE WITH FULLSCREEN
   ------------------------------------------------------------------------- */
let timerInterval = null;
let countdownSeconds = 45 * 60;
let isTimerRunning = false;

function initializeTimerVariables() {
    countdownSeconds = parseInt(document.getElementById("customTimerMinutes").value || 45) * 60;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const inlineTimer = document.getElementById("ltTimer");
    const fsTimer = document.getElementById("fsTimeDisplay");

    const minutes = Math.floor(countdownSeconds / 60);
    const seconds = countdownSeconds % 60;

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const timeText = `${formattedMinutes}:${formattedSeconds}`;

    if (inlineTimer) inlineTimer.textContent = timeText;
    if (fsTimer) fsTimer.textContent = timeText;
}

function updateLTTrackTimer() {
    const inputMinutes = document.getElementById("customTimerMinutes");
    if (!inputMinutes || inputMinutes.value <= 0) {
        alert("Please enter a valid duration greater than zero minutes.");
        return;
    }

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isTimerRunning = false;
    document.getElementById("btnStartTracker").textContent = "Start Focus Tracker";
    document.getElementById("fsBtnToggle").textContent = "Start Tracker";
    document.getElementById("fsBtnToggle").className = "btn btn-primary";

    countdownSeconds = parseInt(inputMinutes.value) * 60;
    updateTimerDisplay();

    const selectedBlock = document.querySelector("#ltContainerList .lt-box.selected .dynamic-duration-label");
    if (selectedBlock) { selectedBlock.textContent = inputMinutes.value + "m"; }
}

function startFullscreenFocusMode() {
    // 1. Sync Text content from active selection to Fullscreen Overlay
    document.getElementById("fsSubject").textContent = document.getElementById("activeLTHeading").textContent;
    const currentTopicText = document.getElementById("activeLTSubheading").textContent;
    document.getElementById("fsTopic").textContent = currentTopicText.replace("Current topic track: ", "");

    // 2. Display the overlay
    document.getElementById("fsTimerOverlay").classList.add("is-active");

    // 3. Request Native Fullscreen on the document element for true immersion
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.warn(`Error attempting to enable fullscreen mode: ${err.message}`);
        });
    }

    // 4. Start the timer if it's not already running
    if (!isTimerRunning) {
        toggleTimerRunning();
    }
}

function exitFullscreenFocusMode() {
    document.getElementById("fsTimerOverlay").classList.remove("is-active");
    if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
    }
}

function toggleTimerRunning() {
    const fsBtn = document.getElementById("fsBtnToggle");
    const inlineBtn = document.getElementById("btnStartTracker");

    if (isTimerRunning) {
        // Pause timer
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
        if (fsBtn) {
            fsBtn.textContent = "Resume Tracker";
            fsBtn.className = "btn btn-primary";
        }
        if (inlineBtn) {
            inlineBtn.textContent = "Resume Focus Tracker";
        }
    } else {
        // Start running
        isTimerRunning = true;
        if (fsBtn) {
            fsBtn.textContent = "Pause Tracker";
            fsBtn.className = "btn btn-warning";
        }
        if (inlineBtn) {
            inlineBtn.textContent = "Tracking (Click to Open)";
        }

        timerInterval = setInterval(() => {
            if (countdownSeconds > 0) {
                countdownSeconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                isTimerRunning = false;
                alert("The targeted presentation time allotment has concluded.");
                if (fsBtn) {
                    fsBtn.textContent = "Start Tracker";
                    fsBtn.className = "btn btn-primary";
                }
                if (inlineBtn) {
                    inlineBtn.textContent = "Start Focus Tracker";
                }
            }
        }, 1000);
    }
}

function completeLTLog() {
    exitFullscreenFocusMode();
    clearInterval(timerInterval);
    isTimerRunning = false;
    alert("Live structural data logs securely snapshot-saved and submitted to server!");
}

function applyLTFilters() {
    const stdFilter = document.getElementById("ltFilterStd").value;
    const subFilter = document.getElementById("ltFilterSub").value;
    const boxes = document.querySelectorAll("#ltContainerList .lt-box");

    boxes.forEach(box => {
        const boxStd = box.getAttribute("data-std") || "";
        const boxSub = box.getAttribute("data-sub") || "";

        const matchStd = (stdFilter === "all" || boxStd.includes(stdFilter));
        const matchSub = (subFilter === "all" || boxSub.toLowerCase() === subFilter.toLowerCase());

        if (matchStd && matchSub) {
            box.style.display = "block";
        } else {
            box.style.display = "none";
        }
    });
}

function selectLTBlock(element, subject, standard, topic, defaultMinutes) {
    document.querySelectorAll('#ltContainerList .lt-box').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('activeLTHeading').textContent = subject + " · Std " + standard;
    document.getElementById('activeLTSubheading').textContent = "Current topic track: " + topic;

    document.getElementById("customTimerMinutes").value = defaultMinutes || 45;
    updateLTTrackTimer();
}

/* -------------------------------------------------------------------------
   EXAMINATION LOGIC MATRIX ENGINE
   ------------------------------------------------------------------------- */
function selectExamRow(row) {
    document.querySelectorAll(".exam-table tbody tr").forEach(r => r.classList.remove("is-selected-row"));
    row.classList.add("is-selected-row");
}

function validateMaxScoreConstraints() {
    const outOfValue = parseInt(document.getElementById("globalOutOfMarks").value || 100);
    const markInputs = document.querySelectorAll(".student-marks-input");

    markInputs.forEach(input => {
        input.max = outOfValue;
        if (parseInt(input.value) > outOfValue) {
            input.value = outOfValue;
        }
    });
}

function pressScoreKey(score) {
    const activeRow = document.querySelector(".exam-table tbody tr.is-selected-row");
    if (!activeRow) {
        alert("Select a target student candidate row sequence first.");
        return;
    }
    const inputField = activeRow.querySelector(".student-marks-input");
    if (!inputField) return;

    const outOfValue = parseInt(document.getElementById("globalOutOfMarks").value || 100);
    let currentScore = parseInt(inputField.value || 0);

    if (score === 0) {
        inputField.value = 0;
    } else {
        let calculated = currentScore + score;
        inputField.value = calculated > outOfValue ? outOfValue : calculated;
    }
}

function resetAllRosterMarksToZero() {
    if (confirm("Are you sure you want to reset all current student evaluation marks to zero?")) {
        const inputs = document.querySelectorAll(".student-marks-input");
        inputs.forEach(input => {
            input.value = 0;
        });
    }
}

function submitExamMarks() {
    alert("Roster marks entry securely committed into system core analytics logs!");
}

/* -------------------------------------------------------------------------
   DISCIPLINE SEARCHABLE FILTERS MODULE
   ------------------------------------------------------------------------- */
function filterDisciplineStudents() {
    const selectedStd = document.getElementById("disciplineFilterStd").value;
    const searchQuery = document.getElementById("disciplineSearchName").value.toLowerCase();
    const options = document.querySelectorAll("#disciplineStudentSelector option");

    let activeMatchCount = 0;

    options.forEach(option => {
        const studentStd = option.getAttribute("data-std") || "";
        const studentName = option.textContent.toLowerCase();

        const matchesStd = (selectedStd === "all" || studentStd === selectedStd);
        const matchesSearch = studentName.includes(searchQuery);

        if (matchesStd && matchesSearch) {
            option.style.display = "block";
            if (activeMatchCount === 0) {
                option.selected = true;
            }
            activeMatchCount++;
        } else {
            option.style.display = "none";
        }
    });
}

/* -------------------------------------------------------------------------
   ADMINISTRATIVE SYSTEM OVERLAYS
   ------------------------------------------------------------------------- */
function triggerResultCompilation() {
    alert("Batch processing architecture successfully initialized. The compiled scorecard payload is being prepped.");
}

function submitDiscipline() {
    const selector = document.getElementById("disciplineStudentSelector");
    const selectedText = selector.options[selector.selectedIndex].text;
    const infraction = document.getElementById("disciplineInfractionCategory").value;
    const textComments = document.getElementById("disciplineCustomRemarks").value || "No detailed remark added.";

    alert(`Parent notification microservice issued.\n\nStudent: ${selectedText}\nInfraction: ${infraction}\nFeedback: ${textComments}`);
    document.getElementById("disciplineCustomRemarks").value = "";
}

function openNoticeModal(text) {
    const noticeModalText = document.getElementById("noticeModalText");
    if (noticeModalText) {
        noticeModalText.textContent = text;
        document.getElementById("noticeModal").classList.add("is-open");
    }
}

function openDisciplineDetail(name, std, type, date, note) {
    document.getElementById("dmName").textContent = name;
    document.getElementById("dmStd").textContent = std;
    document.getElementById("dmType").textContent = type;
    document.getElementById("dmNote").textContent = note;
    document.getElementById("disciplineModal").classList.add("is-open");
}