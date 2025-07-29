import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Session Management
export const sessionAPI = {
  start: async (useRealData = false, subjectId = null) => {
    const params = { use_real_data: useRealData };
    if (subjectId) params.subject_id = subjectId;
    
    const response = await api.post('/api/session/start', null, { params });
    return response.data;
  },
  
  end: async (sessionId) => {
    const response = await api.post(`/api/session/${sessionId}/end`);
    return response.data;
  },
  
  getSummary: async (sessionId) => {
    const response = await api.get(`/api/session/${sessionId}/summary`);
    return response.data;
  },
};

// Weekly Summary
export const getWeeklySummary = async () => {
  const response = await api.get('/api/weekly-summary');
  return response.data;
};

// Get available subjects
export const getSubjects = async () => {
  const response = await api.get('/api/subjects');
  return response.data;
};

// WebSocket Connection - FIXED VERSION
export class RealtimeMonitor {
  constructor(sessionId, onUpdate) {
    this.sessionId = sessionId;
    this.onUpdate = onUpdate;
    this.ws = null;
  }
  
  connect() {
    const wsUrl = `${WS_BASE_URL}/ws/${this.sessionId}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Call the update callback
        if (this.onUpdate) {
          this.onUpdate(data);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  }
  
  disconnect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
    }
  }
}