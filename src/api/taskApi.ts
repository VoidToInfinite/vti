import axios, { AxiosResponse } from "axios";

interface ITask {
  id: string;
  name: string;
}

const instance = axios.create({
  baseURL: "",
  timeout: 15000,
});

const responseBody = (response: AxiosResponse<ITask | ITask[]>) =>
  response.data;

const taskRequest = {
  get: (url: string) => instance.get<ITask>(url).then(responseBody),
  post: (url: string, body: ITask) =>
    instance.post<ITask>(url, body).then(responseBody),
  delete: (url: string) => instance.delete<ITask>(url).then(responseBody),
};

export const taskActions = {
  getTasks: (): Promise<ITask[]> =>
    taskRequest.get("/tasks") as Promise<ITask[]>,
  getTaskById: (id: number): Promise<ITask> =>
    taskRequest.get(`/${id}`) as Promise<ITask>,
  addTask: (task: ITask) => taskRequest.post("", task),
  deleteTask: (taskId: number) => taskRequest.delete(`${taskId}`),
};

export default taskActions;
