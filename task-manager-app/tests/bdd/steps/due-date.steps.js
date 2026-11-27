import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures.js';
import { createTask, postTask, listTasks } from '../support/api.js';
import { localDateOffset, localNoon } from '../support/dates.js';

const row = (world, title = world.title) => world.page.locator('ul.task-list li').filter({ hasText: title });

// ---- Clock / browser ----

Given('the browser clock is set to local noon today', async ({ world }) => {
  await world.page.clock.install({ time: localNoon() });
});

Given('the browser timezone is {string}', async ({ world }, timezoneId) => {
  await world.useTimezone(timezoneId);
});

Given('the browser clock is set to {string}', async ({ world }, iso) => {
  await world.page.clock.install({ time: new Date(iso) });
});

When('the browser clock moves to {string} and I reload the page', async ({ world }, iso) => {
  await world.page.clock.setFixedTime(new Date(iso));
  await world.page.reload();
  await expect(row(world)).toBeVisible();
});

// ---- Fixtures created through the API ----

async function seed(world, request, status, due_date) {
  world.title = world.nextTitle();
  const task = await createTask(request, { title: world.title, status, due_date });
  world.createdIds.push(task.id);
  world.dueDate = due_date ?? null;
}

Given('a {string} task exists with a due date {int} days ago', async ({ world, request }, status, n) => {
  await seed(world, request, status, localDateOffset(-n, localNoon()));
});

Given('a {string} task exists with a due date {int} days from now', async ({ world, request }, status, n) => {
  await seed(world, request, status, localDateOffset(n, localNoon()));
});

Given('a {string} task exists with a due date today', async ({ world, request }, status) => {
  await seed(world, request, status, localDateOffset(0, localNoon()));
});

Given('a {string} task exists with the due date {string}', async ({ world, request }, status, date) => {
  await seed(world, request, status, date);
});

Given('a {string} task exists with no due date', async ({ world, request }, status) => {
  await seed(world, request, status, undefined);
});

Given('a {string} task labelled {string} exists', async ({ world, request }, status, label) => {
  const title = world.nextTitle(label);
  const task = await createTask(request, { title, status });
  world.createdIds.push(task.id);
});

// ---- UI actions ----

When('I open the task manager', async ({ world }) => {
  await world.page.goto('/');
  await expect(world.page.getByRole('heading', { name: 'Task Manager' })).toBeVisible();
  if (world.title) await expect(row(world)).toBeVisible();
});

async function addViaUi(world, dueDate) {
  world.title = world.nextTitle('added');
  await world.page.getByPlaceholder('New task title').fill(world.title);
  if (dueDate) await world.page.getByLabel('Due date (optional)').fill(dueDate);
  await world.page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(row(world)).toBeVisible();
}

When('I add a task with a due date {int} days from now', async ({ world }, n) => {
  await addViaUi(world, localDateOffset(n, localNoon()));
});

When('I add a task without a due date', async ({ world }) => {
  await addViaUi(world, undefined);
});

When('I note the number of tasks listed', async ({ world }) => {
  world.countBefore = await world.page.locator('ul.task-list li').count();
});

When('I delete the task I just added', async ({ world }) => {
  await world.page.getByRole('button', { name: `Delete ${world.title}` }).click();
  await expect(row(world)).toHaveCount(0);
});

When('I search for {string}', async ({ world }, label) => {
  await world.page.getByLabel('Search tasks by title').fill(world.nextTitle(label));
});

// ---- UI assertions ----

Then('the task shows its due date {int} days from now', async ({ world }, n) => {
  const expected = localDateOffset(n, localNoon());
  await expect(row(world).locator('time.due-date')).toHaveText(expected);
  await expect(row(world).locator('time.due-date')).toHaveAttribute('datetime', expected);
});

Then('the task shows its due date {int} days ago', async ({ world }, n) => {
  await expect(row(world).locator('time.due-date')).toHaveText(localDateOffset(-n, localNoon()));
});

Then('the task shows its due date today', async ({ world }) => {
  await expect(row(world).locator('time.due-date')).toHaveText(localDateOffset(0, localNoon()));
});

Then('the task shows no due date', async ({ world }) => {
  await expect(row(world)).toBeVisible();
  await expect(row(world).locator('time.due-date')).toHaveCount(0);
  await expect(row(world)).not.toContainText(/\d{4}-\d{2}-\d{2}/);
});

Then('the task is marked overdue', async ({ world }) => {
  await expect(row(world)).toHaveClass(/overdue/);
  await expect(row(world).locator('.overdue-label')).toHaveText('Overdue');
});

Then('the task is not marked overdue', async ({ world }) => {
  await expect(row(world)).toBeVisible();
  await expect(row(world)).not.toHaveClass(/overdue/);
  await expect(row(world).locator('.overdue-label')).toHaveCount(0);
  await expect(row(world)).not.toContainText('Overdue');
});

Then('the due date input is empty', async ({ world }) => {
  await expect(world.page.getByLabel('Due date (optional)')).toHaveValue('');
});

Then('the number of tasks listed is unchanged', async ({ world }) => {
  await expect(world.page.locator('ul.task-list li')).toHaveCount(world.countBefore);
});

Then('only the {string} task is listed', async ({ world }, label) => {
  const items = world.page.locator('ul.task-list li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText(world.nextTitle(label));
});

// ---- API-level scenario ----

When('I create a task via the API with due date {string}', async ({ world, request }, date) => {
  world.title = world.nextTitle();
  world.lastApi = await postTask(request, { title: world.title, due_date: date });
});

Then('the API responds with status {int}', async ({ world }, status) => {
  expect(world.lastApi.status).toBe(status);
});

Then('the task is not listed by the API', async ({ world, request }) => {
  const all = await listTasks(request);
  expect(all.some((t) => t.title === world.title)).toBe(false);
});
