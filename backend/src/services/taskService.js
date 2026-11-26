/**
 * Business logic for tasks. Routes call these functions; persistence is
 * delegated to the storage module.
 */
const crypto = require('crypto');
const storage = require('./storage');
const { HttpError } = require('../utils/errors');

function notFound(id) {
  return new HttpError(404, `Task with id "${id}" not found`);
}

async function listTasks({ status, search } = {}) {
  let tasks = await storage.readTasks();

  if (status) {
    tasks = tasks.filter((task) => task.status === status);
  }
  if (search) {
    const term = search.toLowerCase();
    tasks = tasks.filter((task) => task.title.toLowerCase().includes(term));
  }

  // Newest first.
  return tasks.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function getTask(id) {
  const tasks = await storage.readTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) throw notFound(id);
  return task;
}

async function createTask({ title, description, status }) {
  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    title,
    description: description || '',
    status: status || 'pending',
    createdAt: now,
    updatedAt: now,
  };

  return storage.updateTasks((tasks) => ({
    tasks: [...tasks, task],
    result: task,
  }));
}

async function updateTask(id, { title, description, status }) {
  return storage.updateTasks((tasks) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw notFound(id);

    const updated = {
      ...tasks[index],
      title,
      description,
      status: status || tasks[index].status,
      updatedAt: new Date().toISOString(),
    };
    const next = [...tasks];
    next[index] = updated;
    return { tasks: next, result: updated };
  });
}

async function updateTaskStatus(id, status) {
  return storage.updateTasks((tasks) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw notFound(id);

    const updated = { ...tasks[index], status, updatedAt: new Date().toISOString() };
    const next = [...tasks];
    next[index] = updated;
    return { tasks: next, result: updated };
  });
}

async function deleteTask(id) {
  return storage.updateTasks((tasks) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) throw notFound(id);
    return { tasks: tasks.filter((t) => t.id !== id), result: task };
  });
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
