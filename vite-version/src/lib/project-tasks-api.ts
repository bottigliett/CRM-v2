import { api } from './api';

export interface ProjectTask {
  id: number;
  quoteId: number;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedByUser?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface CreateTaskData {
  title: string;
  description?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
}

class ProjectTasksAPI {
  /**
   * Get all tasks for a quote
   */
  async getQuoteTasks(quoteId: number): Promise<{ success: boolean; data: ProjectTask[] }> {
    return api.get(`/quotes/${quoteId}/tasks`);
  }

  /**
   * Toggle task completion status
   */
  async toggleTask(quoteId: number, taskId: number): Promise<{ success: boolean; data: ProjectTask }> {
    return api.patch(`/quotes/${quoteId}/tasks/${taskId}/toggle`, {});
  }

  /**
   * Create a new task
   */
  async createTask(quoteId: number, data: CreateTaskData): Promise<{ success: boolean; data: ProjectTask }> {
    return api.post(`/quotes/${quoteId}/tasks`, data);
  }

  /**
   * Update a task
   */
  async updateTask(quoteId: number, taskId: number, data: UpdateTaskData): Promise<{ success: boolean; data: ProjectTask }> {
    return api.put(`/quotes/${quoteId}/tasks/${taskId}`, data);
  }

  /**
   * Delete a task
   */
  async deleteTask(quoteId: number, taskId: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/quotes/${quoteId}/tasks/${taskId}`);
  }
}

export const projectTasksAPI = new ProjectTasksAPI();
