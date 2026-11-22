// Direct API helpers used to create and clean up fixtures (the UI is never used for setup).
export const API = 'http://localhost:4000';

// Returns the parsed body and status. Does not throw on 4xx so callers can assert on it.
export async function postTask(request, body) {
  const res = await request.post(`${API}/api/tasks`, { data: body });
  return { status: res.status(), body: await res.json() };
}

export async function createTask(request, { title, status = 'todo', due_date }) {
  const data = { title, status };
  if (due_date !== undefined) data.due_date = due_date;
  const res = await postTask(request, data);
  if (res.status !== 201) throw new Error(`createTask failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function listTasks(request) {
  const res = await request.get(`${API}/api/tasks`);
  return res.json();
}

export async function deleteTask(request, id) {
  await request.delete(`${API}/api/tasks/${id}`);
}
