/**
 * TaskFlow frontend.
 * Talks to the REST API with fetch(); renders the task list with plain DOM APIs.
 */
(function () {
  'use strict';

  const API = '/api';
  const STATUS_LABELS = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
  };

  // ---------- State ----------
  const state = {
    tasks: [],
    filter: 'all',
    search: '',
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    health: $('health'),
    list: $('task-list'),
    loading: $('loading'),
    empty: $('empty'),
    search: $('search'),
    filters: document.querySelectorAll('.filter'),
    errorBanner: $('error-banner'),
    errorMessage: $('error-message'),
    errorClose: $('error-close'),
    toast: $('toast'),
    createForm: $('create-form'),
    createTitle: $('create-title'),
    createDescription: $('create-description'),
    createStatus: $('create-status'),
    createError: $('create-error'),
    createSubmit: $('create-submit'),
    editDialog: $('edit-dialog'),
    editForm: $('edit-form'),
    editId: $('edit-id'),
    editTitle: $('edit-title'),
    editDescription: $('edit-description'),
    editStatus: $('edit-status'),
    editError: $('edit-error'),
    editSubmit: $('edit-submit'),
    editCancel: $('edit-cancel'),
    stats: {
      total: $('stat-total'),
      pending: $('stat-pending'),
      'in-progress': $('stat-in-progress'),
      completed: $('stat-completed'),
    },
  };

  // ---------- API client ----------
  async function request(path, options = {}) {
    const opts = { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } };
    if (opts.body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }

    let response;
    try {
      response = await fetch(API + path, opts);
    } catch (err) {
      throw new Error('Cannot reach the server. Check that TaskFlow is running.');
    }

    if (response.status === 204) return null;

    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      // Non-JSON response; handled below.
    }

    if (!response.ok) {
      let message = (data && data.error) || `Request failed (${response.status})`;
      if (data && Array.isArray(data.details) && data.details.length) {
        message += ': ' + data.details.join('; ');
      }
      throw new Error(message);
    }
    return data;
  }

  const api = {
    health: () => request('/health'),
    list: () => request('/tasks'),
    create: (task) => request('/tasks', { method: 'POST', body: task }),
    update: (id, task) => request(`/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: task }),
    setStatus: (id, status) =>
      request(`/tasks/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }),
    remove: (id) => request(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };

  // ---------- UI helpers ----------
  function showError(message) {
    el.errorMessage.textContent = message;
    el.errorBanner.hidden = false;
  }

  function clearError() {
    el.errorBanner.hidden = true;
  }

  let toastTimer;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.toast.hidden = true), 2500);
  }

  function setFormError(node, message) {
    node.textContent = message || '';
    node.hidden = !message;
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // ---------- Rendering ----------
  function visibleTasks() {
    const term = state.search.toLowerCase();
    return state.tasks.filter((task) => {
      if (state.filter !== 'all' && task.status !== state.filter) return false;
      if (term && !task.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }

  function renderStats() {
    const counts = { total: state.tasks.length, pending: 0, 'in-progress': 0, completed: 0 };
    state.tasks.forEach((t) => {
      if (counts[t.status] !== undefined) counts[t.status] += 1;
    });
    Object.keys(el.stats).forEach((key) => {
      el.stats[key].textContent = counts[key];
    });

    el.filters.forEach((btn) => {
      const status = btn.dataset.status;
      const count = status === 'all' ? counts.total : counts[status];
      let badge = btn.querySelector('.count');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'count';
        btn.appendChild(badge);
      }
      badge.textContent = count;
    });
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task status-${task.status}`;
    li.dataset.id = task.id;

    const top = document.createElement('div');
    top.className = 'task-top';

    const title = document.createElement('h3');
    title.className = 'task-title';
    title.textContent = task.title;

    const badge = document.createElement('span');
    badge.className = `badge badge-${task.status}`;
    badge.textContent = STATUS_LABELS[task.status] || task.status;

    top.append(title, badge);
    li.appendChild(top);

    if (task.description) {
      const desc = document.createElement('p');
      desc.className = 'task-description';
      desc.textContent = task.description;
      li.appendChild(desc);
    }

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const created = document.createElement('span');
    created.textContent = `Created ${formatDate(task.createdAt)}`;

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const statusSelect = document.createElement('select');
    statusSelect.setAttribute('aria-label', `Change status of "${task.title}"`);
    statusSelect.dataset.action = 'status';
    Object.entries(STATUS_LABELS).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === task.status;
      statusSelect.appendChild(option);
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-ghost btn-sm';
    editBtn.dataset.action = 'edit';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent = 'Delete';

    actions.append(statusSelect, editBtn, deleteBtn);
    meta.append(created, actions);
    li.appendChild(meta);
    return li;
  }

  function render() {
    renderStats();
    const tasks = visibleTasks();
    el.list.replaceChildren(...tasks.map(createTaskElement));

    if (state.tasks.length === 0) {
      el.empty.textContent = 'No tasks yet. Create your first task using the form.';
      el.empty.hidden = false;
    } else if (tasks.length === 0) {
      el.empty.textContent = 'No tasks match your search or filter.';
      el.empty.hidden = false;
    } else {
      el.empty.hidden = true;
    }
  }

  function findTask(id) {
    return state.tasks.find((t) => t.id === id);
  }

  function replaceTask(updated) {
    state.tasks = state.tasks.map((t) => (t.id === updated.id ? updated : t));
  }

  // ---------- Actions ----------
  async function loadTasks() {
    el.loading.hidden = false;
    el.empty.hidden = true;
    el.list.replaceChildren();
    try {
      state.tasks = await api.list();
      clearError();
    } catch (err) {
      showError(`Could not load tasks: ${err.message}`);
      state.tasks = [];
    } finally {
      el.loading.hidden = true;
    }
    render();
  }

  async function checkHealth() {
    try {
      const health = await api.health();
      el.health.textContent = `API ${health.status} · v${health.version}`;
      el.health.className = 'health ok';
    } catch (err) {
      el.health.textContent = 'API unavailable';
      el.health.className = 'health down';
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const title = el.createTitle.value.trim();
    el.createTitle.classList.toggle('invalid', !title);
    if (!title) {
      setFormError(el.createError, 'Title is required.');
      el.createTitle.focus();
      return;
    }
    setFormError(el.createError, '');

    el.createSubmit.disabled = true;
    el.createSubmit.textContent = 'Adding…';
    try {
      const task = await api.create({
        title,
        description: el.createDescription.value.trim(),
        status: el.createStatus.value,
      });
      state.tasks.unshift(task);
      el.createForm.reset();
      render();
      toast('Task created');
    } catch (err) {
      setFormError(el.createError, err.message);
    } finally {
      el.createSubmit.disabled = false;
      el.createSubmit.textContent = 'Add task';
    }
  }

  function openEditDialog(task) {
    el.editId.value = task.id;
    el.editTitle.value = task.title;
    el.editDescription.value = task.description || '';
    el.editStatus.value = task.status;
    el.editTitle.classList.remove('invalid');
    setFormError(el.editError, '');
    el.editDialog.showModal();
    el.editTitle.focus();
  }

  async function handleEdit(event) {
    event.preventDefault();
    const id = el.editId.value;
    const title = el.editTitle.value.trim();
    el.editTitle.classList.toggle('invalid', !title);
    if (!title) {
      setFormError(el.editError, 'Title is required.');
      el.editTitle.focus();
      return;
    }
    setFormError(el.editError, '');

    el.editSubmit.disabled = true;
    el.editSubmit.textContent = 'Saving…';
    try {
      const updated = await api.update(id, {
        title,
        description: el.editDescription.value.trim(),
        status: el.editStatus.value,
      });
      replaceTask(updated);
      el.editDialog.close();
      render();
      toast('Task updated');
    } catch (err) {
      setFormError(el.editError, err.message);
    } finally {
      el.editSubmit.disabled = false;
      el.editSubmit.textContent = 'Save changes';
    }
  }

  async function handleStatusChange(id, status, item) {
    item.classList.add('busy');
    try {
      const updated = await api.setStatus(id, status);
      replaceTask(updated);
      clearError();
      toast(`Marked as ${STATUS_LABELS[status]}`);
    } catch (err) {
      showError(`Could not update status: ${err.message}`);
    }
    render();
  }

  async function handleDelete(task, item) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    item.classList.add('busy');
    try {
      await api.remove(task.id);
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      clearError();
      toast('Task deleted');
    } catch (err) {
      showError(`Could not delete task: ${err.message}`);
    }
    render();
  }

  // ---------- Event wiring ----------
  el.createForm.addEventListener('submit', handleCreate);
  el.editForm.addEventListener('submit', handleEdit);
  el.editCancel.addEventListener('click', () => el.editDialog.close());
  el.errorClose.addEventListener('click', clearError);

  el.search.addEventListener(
    'input',
    debounce(() => {
      state.search = el.search.value.trim();
      render();
    }, 150)
  );

  el.filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.status;
      el.filters.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      render();
    });
  });

  // Event delegation for per-task controls.
  el.list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const item = button.closest('.task');
    const task = findTask(item.dataset.id);
    if (!task) return;

    if (button.dataset.action === 'edit') openEditDialog(task);
    if (button.dataset.action === 'delete') handleDelete(task, item);
  });

  el.list.addEventListener('change', (event) => {
    const select = event.target.closest('select[data-action="status"]');
    if (!select) return;
    const item = select.closest('.task');
    handleStatusChange(item.dataset.id, select.value, item);
  });

  // ---------- Init ----------
  checkHealth();
  loadTasks();
})();
