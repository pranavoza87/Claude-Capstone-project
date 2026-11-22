import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures.js';
import { createTask } from '../support/api.js';
import { localDateOffset, localNoon } from '../support/dates.js';

// Same row locator as due-date.steps.js (kept local so that file stays untouched).
const row = (world, title = world.title) => world.page.locator('ul.task-list li').filter({ hasText: title });

// ---- Fixtures created through the API (title is scoped to this scenario via the label) ----

async function seedLabelled(world, request, status, label, due_date) {
  const task = await createTask(request, { title: world.nextTitle(label), status, due_date });
  world.createdIds.push(task.id);
}

Given(
  'a {string} task labelled {string} exists with a due date {int} days ago',
  async ({ world, request }, status, label, n) => {
    await seedLabelled(world, request, status, label, localDateOffset(-n, localNoon()));
  },
);

Given(
  'a {string} task labelled {string} exists with a due date {int} days from now',
  async ({ world, request }, status, label, n) => {
    await seedLabelled(world, request, status, label, localDateOffset(n, localNoon()));
  },
);

Given(
  'a {string} task labelled {string} exists with a due date today',
  async ({ world, request }, status, label) => {
    await seedLabelled(world, request, status, label, localDateOffset(0, localNoon()));
  },
);

// ---- UI actions ----

When('I turn on the overdue filter', async ({ world }) => {
  await world.page.getByLabel('Show overdue only').check();
});

When('I turn off the overdue filter', async ({ world }) => {
  await world.page.getByLabel('Show overdue only').uncheck();
});

// Unlike the due-date steps, this does not assert the new row is visible (it may be hidden by a filter).
When('I add a task with a due date {int} days ago', async ({ world }, n) => {
  world.title = world.nextTitle('added');
  await world.page.getByPlaceholder('New task title').fill(world.title);
  await world.page.getByLabel('Due date (optional)').fill(localDateOffset(-n, localNoon()));
  await world.page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(world.page.getByPlaceholder('New task title')).toHaveValue('');
});

When('I delete the {string} task', async ({ world }, label) => {
  const title = world.nextTitle(label);
  await world.page.getByRole('button', { name: `Delete ${title}`, exact: true }).click();
  await expect(row(world, title)).toHaveCount(0);
});

// ---- UI assertions ----

Then('the {string} task is listed', async ({ world }, label) => {
  await expect(row(world, world.nextTitle(label))).toBeVisible();
});

Then('the {string} task is not listed', async ({ world }, label) => {
  await expect(row(world, world.nextTitle(label))).toHaveCount(0);
});

Then('the {string} task is marked overdue', async ({ world }, label) => {
  const r = row(world, world.nextTitle(label));
  await expect(r).toHaveClass(/overdue/);
  await expect(r.locator('.overdue-label')).toHaveText('Overdue');
});

Then('the added task is listed', async ({ world }) => {
  await expect(row(world)).toBeVisible();
});

Then('the overdue filter is on', async ({ world }) => {
  await expect(world.page.getByLabel('Show overdue only')).toBeChecked();
});

Then('the overdue filter is off', async ({ world }) => {
  await expect(world.page.getByLabel('Show overdue only')).not.toBeChecked();
});

Then('the empty message {string} is shown', async ({ world }, message) => {
  await expect(world.page.getByText(message, { exact: true })).toBeVisible();
});

Then('the empty message {string} is not shown', async ({ world }, message) => {
  await expect(world.page.getByText(message, { exact: true })).toHaveCount(0);
});

Then('the empty message {string} is announced as a status', async ({ world }, message) => {
  await expect(world.page.getByRole('status')).toHaveText(message);
});
