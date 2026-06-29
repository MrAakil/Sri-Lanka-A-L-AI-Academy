const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Helper to get auth headers
function getHeaders(isMultipart = false) {
  const headers: Record<string, string> = {};
  
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function request(endpoint: string, options: RequestInit = {}) {
  const isMultipart = options.body instanceof FormData;
  const config = {
    ...options,
    headers: {
      ...getHeaders(isMultipart),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        window.location.href = "/login";
      }
    }
    const errorText = await response.text();
    let errorMessage = "An error occurred";
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.detail || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: any) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  googleLogin: (credential: string) => request("/auth/google-login", { method: "POST", body: JSON.stringify({ credential }) }),
  getMe: () => request("/auth/me"),
};

// Chat API
export const chatApi = {
  query: (data: { query: string; chapter?: string; topic?: string; paper_type?: string; year?: number; medium?: string }) => 
    request("/chat/query", { method: "POST", body: JSON.stringify(data) }),
};

// Solver API
export const solverApi = {
  solvePastPaper: (formData: FormData) => 
    request("/solver/past-paper", { method: "POST", body: formData }),
  solveImage: (formData: FormData) => 
    request("/solver/image-question", { method: "POST", body: formData }),
};

// Quiz API
export const quizApi = {
  generate: (data: { chapter: string; difficulty: string; format: string; count?: number; medium?: string }) => 
    request("/quiz/generate", { method: "POST", body: JSON.stringify(data) }),
  submit: (data: { quiz_id: number; answers: any[]; medium?: string }) => 
    request("/quiz/submit", { method: "POST", body: JSON.stringify(data) }),
};

// Admin API
export const adminApi = {
  uploadDocument: (formData: FormData) => 
    request("/admin/upload", { method: "POST", body: formData }),
  getDocuments: () => request("/admin/documents"),
  deleteDocument: (id: number) => request(`/admin/documents/${id}`, { method: "DELETE" }),
};

// Analytics API
export const analyticsApi = {
  getAdminMetrics: () => request("/analytics/admin-dashboard"),
  getStudentReport: () => request("/analytics/student-report"),
};
