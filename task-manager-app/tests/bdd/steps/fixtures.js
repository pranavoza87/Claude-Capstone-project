import { test as base, createBdd } from 'playwright-bdd';
import { listTasks, deleteTask } from '../support/api.js';

// Per-scenario state. Tasks created by a scenario are removed through the API afterwards.
export const test = base.extend({
  world: async ({ page, browser, request }, use, testInfo) => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const world = {
      page, // replaced by the timezone step when a scenario needs its own context
      extraContext: null,
      uid: `E2E ${testInfo.title.slice(0, 40)} ${suffix}`,
      suffix,
      createdIds: [],
      lastApi: null,
      nextTitle(label = '') {
        return `${this.uid}${label ? ' ' + label : ''}`;
      },
      async useTimezone(timezoneId) {
        this.extraContext = await browser.newContext({ timezoneId, baseURL: 'http://localhost:5173' });
        this.page = await this.extraContext.newPage();
      },
    };
    await use(world);

    // Cleanup: delete everything this scenario created, including rows created via the UI.
    const all = await listTasks(request).catch(() => []);
    const mine = all.filter((t) => typeof t.title === 'string' && t.title.includes(world.uid));
    for (const t of mine) await deleteTask(request, t.id);
    for (const id of world.createdIds) await deleteTask(request, id);
    if (world.extraContext) await world.extraContext.close();
  },
});

export const { Given, When, Then } = createBdd(test);
