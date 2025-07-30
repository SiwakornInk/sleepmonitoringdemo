import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

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
  
  getEpochs: async (sessionId) => {
    const response = await api.get(`/api/session/${sessionId}/epochs`);
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
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }
  
  connect() {
    const wsUrl = `${WS_BASE_URL}/ws/${this.sessionId}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('Parsed data:', data);
          
          // Call the update callback
          if (this.onUpdate && typeof this.onUpdate === 'function') {
            this.onUpdate(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Try to reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
          setTimeout(() => {
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }
  
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}