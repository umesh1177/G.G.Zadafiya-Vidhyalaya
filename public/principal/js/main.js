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
});
