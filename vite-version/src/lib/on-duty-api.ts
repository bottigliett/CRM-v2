const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ===================================
// TYPES
// ===================================

export interface DailyTodo {
  id: number;
  userId: number;
  text: string;
  completed: boolean;
  completedAt?: string;
  order: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTodo {
  id: number;
  userId: number;
  text: string;
  completed: boolean;
  completedAt?: string;
  order: number;
  weekStart: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPhase {
  id: number;
  taskId: number;
  userId: number;
  text: string;
  completed: boolean;
  completedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyTodoData {
  text: string;
  date?: string;
}

export interface CreateWeeklyTodoData {
  text: string;
  date?: string;
}

export interface CreateTaskPhaseData {
  text: string;
}

export interface UpdateTodoData {
  text?: string;
  completed?: boolean;
}

// ===================================
// API CLASS
// ===================================

class OnDutyAPI {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'An error occurred');
    }

    return response.json();
  }

  // ===================================
  // DAILY TODOS
  // ===================================

  async getDailyTodos(date?: string): Promise<{
    success: boolean;
    data: DailyTodo[];
  }> {
    const query = date ? `?date=${date}` : '';
    return this.request<any>(`/on-duty/daily-todos${query}`);
  }

  async createDailyTodo(data: CreateDailyTodoData): Promise<{
    success: boolean;
    message: string;
    data: DailyTodo;
  }> {
    return this.request<any>('/on-duty/daily-todos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDailyTodo(id: number, data: UpdateTodoData): Promise<{
    success: boolean;
    message: string;
    data: DailyTodo;
  }> {
    return this.request<any>(`/on-duty/daily-todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDailyTodo(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/on-duty/daily-todos/${id}`, {
      method: 'DELETE',
    });
  }

  async resetDailyTodos(date?: string): Promise<{
    success: boolean;
    message: string;
    data: DailyTodo[];
  }> {
    const query = date ? `?date=${date}` : '';
    return this.request<any>(`/on-duty/daily-todos/reset${query}`, {
      method: 'POST',
    });
  }

  // ===================================
  // WEEKLY TODOS
  // ===================================

  async getWeeklyTodos(date?: string): Promise<{
    success: boolean;
    data: WeeklyTodo[];
  }> {
    const query = date ? `?date=${date}` : '';
    return this.request<any>(`/on-duty/weekly-todos${query}`);
  }

  async createWeeklyTodo(data: CreateWeeklyTodoData): Promise<{
    success: boolean;
    message: string;
    data: WeeklyTodo;
  }> {
    return this.request<any>('/on-duty/weekly-todos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWeeklyTodo(id: number, data: UpdateTodoData): Promise<{
    success: boolean;
    message: string;
    data: WeeklyTodo;
  }> {
    return this.request<any>(`/on-duty/weekly-todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWeeklyTodo(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/on-duty/weekly-todos/${id}`, {
      method: 'DELETE',
    });
  }

  async resetWeeklyTodos(date?: string): Promise<{
    success: boolean;
    message: string;
    data: WeeklyTodo[];
  }> {
    const query = date ? `?date=${date}` : '';
    return this.request<any>(`/on-duty/weekly-todos/reset${query}`, {
      method: 'POST',
    });
  }

  // ===================================
  // TASK PHASES
  // ===================================

  async getTaskPhases(taskId: number): Promise<{
    success: boolean;
    data: TaskPhase[];
  }> {
    return this.request<any>(`/on-duty/task-phases/${taskId}`);
  }

  async createTaskPhase(taskId: number, data: CreateTaskPhaseData): Promise<{
    success: boolean;
    message: string;
    data: TaskPhase;
  }> {
    return this.request<any>(`/on-duty/task-phases/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskPhase(id: number, data: UpdateTodoData): Promise<{
    success: boolean;
    message: string;
    data: TaskPhase;
  }> {
    return this.request<any>(`/on-duty/task-phases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskPhase(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/on-duty/task-phases/${id}`, {
      method: 'DELETE',
    });
  }
}

export const onDutyAPI = new OnDutyAPI();
