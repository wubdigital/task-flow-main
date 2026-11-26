const express = require('express');
const taskService = require('../services/taskService');
const {
  validateTaskInput,
  validateStatusInput,
  validateListQuery,
} = require('../utils/validation');
const logger = require('../utils/logger');

// Express 5 forwards errors thrown in async handlers to the error middleware.
const router = express.Router();

// GET /api/tasks?status=pending&search=report
router.get('/', async (req, res) => {
  const filters = validateListQuery(req.query);
  const tasks = await taskService.listTasks(filters);
  res.json(tasks);
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const task = await taskService.getTask(req.params.id);
  res.json(task);
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const input = validateTaskInput(req.body);
  const task = await taskService.createTask(input);
  logger.info(`Task created: ${task.id}`);
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const input = validateTaskInput(req.body);
  const task = await taskService.updateTask(req.params.id, input);
  logger.info(`Task updated: ${task.id}`);
  res.json(task);
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = validateStatusInput(req.body);
  const task = await taskService.updateTaskStatus(req.params.id, status);
  logger.info(`Task status changed: ${task.id} -> ${status}`);
  res.json(task);
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  await taskService.deleteTask(req.params.id);
  logger.info(`Task deleted: ${req.params.id}`);
  res.status(204).end();
});

module.exports = router;
