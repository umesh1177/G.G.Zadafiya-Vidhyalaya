// ---------------------------------------------------------------------
// Shared UI behaviour: mobile sidebar drawer, pill tabs, simple modals.
// No framework — vanilla JS, progressively attached on DOMContentLoaded.
// ---------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- Mobile sidebar drawer ---------------- */
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.querySelector('.sidebar-overlay');
  var menuBtn = document.querySelector('.topbar__menu-btn');

  function openSidebar(){ sidebar.classList.add('is-open'); overlay.classList.add('is-open'); }
  function closeSidebar(){ sidebar.classList.remove('is-open'); overlay.classList.remove('is-open'); }

  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
  document.querySelectorAll('.navlink').forEach(function (link) {
    link.addEventListener('click', closeSidebar);
  });

  /* ---------------- Tab groups ----------------
     Markup contract:
     <div class="tabs" data-tab-group="g1">
       <button class="tab-btn is-active" data-tab-target="g1-a">A</button>
       <button class="tab-btn" data-tab-target="g1-b">B</button>
     </div>
     <div class="tab-panel is-active" data-tab-panel="g1-a" data-tab-family="g1">...</div>
     <div class="tab-panel" data-tab-panel="g1-b" data-tab-family="g1">...</div>
  ----------------------------------------------- */
  document.querySelectorAll('[data-tab-group]').forEach(function (group) {
    var familyName = group.getAttribute('data-tab-group');
    var buttons = group.querySelectorAll('.tab-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab-target');
        buttons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        document.querySelectorAll('[data-tab-family="' + familyName + '"]').forEach(function (panel) {
          panel.classList.toggle('is-active', panel.getAttribute('data-tab-panel') === target);
        });
      });
    });
  });

  /* ---------------- Generic modal open/close ----------------
     <button data-modal-open="modal-id">View</button>
     <div class="modal-overlay" id="modal-id" data-modal>
       <div class="modal-box">... <button data-modal-close>×</button></div>
     </div>
  -------------------------------------------------------------- */
  document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-modal-open');
      var modal = document.getElementById(id);
      if (modal) modal.classList.add('is-open');
    });
  });
  document.querySelectorAll('[data-modal]').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('is-open');
    });
    modal.querySelectorAll('[data-modal-close]').forEach(function (closeBtn) {
      closeBtn.addEventListener('click', function () { modal.classList.remove('is-open'); });
    });
  });

  /* ---------------- Inline "View details" panels ----------------
     Shows a row's data inside a detail panel without navigation.
     Buttons carry data-val-<field> attributes; the panel template's
     elements with matching data-field get their text replaced.
  ------------------------------------------------------------------ */
  document.querySelectorAll('[data-detail-trigger]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panelId = btn.getAttribute('data-detail-trigger');
      var panel = document.getElementById(panelId);
      if (!panel) return;

      panel.querySelectorAll('[data-field]').forEach(function (el) {
        var key = el.getAttribute('data-field');
        var val = btn.getAttribute('data-val-' + key);
        if (val !== null) el.textContent = val;
      });

      var empty = panel.querySelector('.detail-panel__empty');
      var filled = panel.querySelector('.detail-panel__filled');
      if (empty) empty.style.display = 'none';
      if (filled) filled.style.display = '';

      document.querySelectorAll('tr.is-selected-row').forEach(function (tr) {
        tr.classList.remove('is-selected-row');
      });
      var row = btn.closest('tr');
      if (row) row.classList.add('is-selected-row');
    });
  });

  /* ---------------- Simple toggle-section ("Add New ..." forms) ---------------- */
  document.querySelectorAll('[data-toggle-target]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-toggle-target');
      var el = document.getElementById(id);
      if (el) el.classList.toggle('is-open');
    });
  });

  /* ---------------- Score pill picker (Excellent / Better / Good) ----------------
     <div class="score-pill-group">
       <button class="score-pill" data-score="Excellent">Excellent</button>
       <button class="score-pill" data-score="Better">Better</button>
       <button class="score-pill" data-score="Good">Good</button>
     </div>
     Clicking a pill selects it exclusively within its group.
  --------------------------------------------------------------------------------- */
  document.querySelectorAll('.score-pill-group').forEach(function (group) {
    group.querySelectorAll('.score-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        group.querySelectorAll('.score-pill').forEach(function (p) { p.classList.remove('is-selected'); });
        pill.classList.add('is-selected');
      });
    });
  });

  /* ---------------- AB (Absent) checkbox disables that row's mark inputs ---------------- */
  document.querySelectorAll('[data-ab-toggle]').forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      var row = checkbox.closest('tr');
      if (!row) return;
      row.querySelectorAll('input[type="text"], input[type="number"]').forEach(function (inp) {
        inp.disabled = checkbox.checked;
        if (checkbox.checked) inp.value = '';
      });
      row.querySelectorAll('.score-pill').forEach(function (p) {
        p.disabled = checkbox.checked;
        p.classList.toggle('is-selected', false);
      });
    });
  });

  /* ---------------- Add-subject style repeatable rows ----------------
     <button data-add-row="targetListId" data-row-template="templateId">+ Add</button>
     Appends a clone of the (hidden) template into the target list, filled
     from sibling inputs named via data-source-fields on the button.
  -------------------------------------------------------------------------- */
  document.querySelectorAll('[data-add-chip]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var listId = btn.getAttribute('data-add-chip');
      var list = document.getElementById(listId);
      if (!list) return;
      var subjectInput = document.querySelector('[data-field-for="' + listId + '-subject"]');
      var dateInput = document.querySelector('[data-field-for="' + listId + '-date"]');
      var subjectVal = subjectInput ? subjectInput.value.trim() : '';
      var dateVal = dateInput ? dateInput.value.trim() : '';
      if (!subjectVal) return;
      var chip = document.createElement('div');
      chip.className = 'added-chip';
      chip.innerHTML = '<span>' + subjectVal + (dateVal ? ' — ' + dateVal : '') + '</span><button type="button" aria-label="Remove">&times;</button>';
      chip.querySelector('button').addEventListener('click', function () { chip.remove(); });
      list.appendChild(chip);
      if (subjectInput) subjectInput.value = '';
      if (dateInput) dateInput.value = '';
    });
  });

  /* ---------------- Chapter accordion (Syllabus / Exam Unit) ---------------- */
  document.querySelectorAll('.chapter-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var item = header.closest('.chapter-item');
      if (item) item.classList.toggle('is-open');
    });
  });

  /* ---------------- "Finish" topic toggle (visual only, static demo) ---------------- */
  document.querySelectorAll('.btn-finish').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var done = btn.classList.toggle('is-done');
      btn.textContent = done ? 'Done ✓' : 'Finish';
      var row = btn.closest('.topic-row');
      var statusChip = row ? row.querySelector('.topic-status') : null;
      if (statusChip) {
        statusChip.textContent = done ? 'Done' : 'Pending';
        statusChip.classList.toggle('chip-success', done);
        statusChip.classList.toggle('chip-warning', !done);
      }
    });
  });

  /* ---------------- Set LT Multi-Topic Selector ---------------- */
  var selectedLtTopics = [];
  var ltList = document.getElementById('selectedLtTopicsList');
  var ltEmpty = document.getElementById('selectedLtTopicsEmpty');

  document.querySelectorAll('.btn-add-lt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var topic = btn.getAttribute('data-topic');
      if (selectedLtTopics.indexOf(topic) > -1) {
        selectedLtTopics = selectedLtTopics.filter(function (t) { return t !== topic; });
      } else {
        selectedLtTopics.push(topic);
      }
      renderLtTopics();
    });
  });

  function renderLtTopics() {
    if (!ltList) return;
    ltList.innerHTML = '';
    if (selectedLtTopics.length === 0) {
      if (ltEmpty) ltEmpty.style.display = 'block';
    } else {
      if (ltEmpty) ltEmpty.style.display = 'none';
      selectedLtTopics.forEach(function (topic) {
        var chip = document.createElement('div');
        chip.className = 'added-chip';
        chip.innerHTML = '<span>' + topic + '</span><button type="button" aria-label="Remove">&times;</button>';
        chip.querySelector('button').addEventListener('click', function () {
          selectedLtTopics = selectedLtTopics.filter(function (t) { return t !== topic; });
          renderLtTopics();
        });
        ltList.appendChild(chip);
      });
    }
    updateLtButtonStates();
  }

  function updateLtButtonStates() {
    document.querySelectorAll('.btn-add-lt').forEach(function (btn) {
      var topic = btn.getAttribute('data-topic');
      var row = btn.closest('tr');
      if (selectedLtTopics.indexOf(topic) > -1) {
        btn.textContent = 'Added ✓';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
        if (row) row.classList.add('is-selected-row');
      } else {
        btn.textContent = 'Add for LT';
        btn.classList.remove('btn-ghost');
        btn.classList.add('btn-primary');
        if (row) row.classList.remove('is-selected-row');
      }
    });
  }

  /* ---------------- Exam Unit Multi-Unit Selector ---------------- */
  var selectedExamUnits = [];
  var examList = document.getElementById('selectedExamUnitsList');
  var examEmpty = document.getElementById('selectedExamUnitsEmpty');

  document.querySelectorAll('.btn-add-exam-unit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var unit = btn.getAttribute('data-unit');
      if (selectedExamUnits.indexOf(unit) > -1) {
        selectedExamUnits = selectedExamUnits.filter(function (u) { return u !== unit; });
      } else {
        selectedExamUnits.push(unit);
      }
      renderExamUnits();
    });
  });

  function renderExamUnits() {
    if (!examList) return;
    examList.innerHTML = '';
    if (selectedExamUnits.length === 0) {
      if (examEmpty) examEmpty.style.display = 'block';
    } else {
      if (examEmpty) examEmpty.style.display = 'none';
      selectedExamUnits.forEach(function (unit) {
        var chip = document.createElement('div');
        chip.className = 'added-chip';
        chip.innerHTML = '<span>' + unit + '</span><button type="button" aria-label="Remove">&times;</button>';
        chip.querySelector('button').addEventListener('click', function () {
          selectedExamUnits = selectedExamUnits.filter(function (u) { return u !== unit; });
          renderExamUnits();
        });
        examList.appendChild(chip);
      });
    }
    updateExamButtonStates();
  }

  function updateExamButtonStates() {
    document.querySelectorAll('.btn-add-exam-unit').forEach(function (btn) {
      var unit = btn.getAttribute('data-unit');
      if (selectedExamUnits.indexOf(unit) > -1) {
        btn.textContent = 'Selected ✓';
        btn.classList.remove('btn-ghost');
        btn.classList.add('btn-primary');
      } else {
        if (btn.classList.contains('all-topics-btn')) {
          btn.textContent = 'All topics';
        } else {
          var text = btn.getAttribute('data-unit');
          var parts = text.split(' — ');
          btn.textContent = parts[parts.length - 1];
        }
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
      }
    });
  }
});
