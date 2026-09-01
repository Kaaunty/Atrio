import { api, ApiResponse } from './api';

export interface IntegrationConfigItem {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'CONFIGURING' | 'ERROR';
  settings?: any;
  lastSyncAt?: string | null;
  deviceCount: number;
  syncLogCount: number;
  hasProviderImplementation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeClockDeviceItem {
  id: string;
  integrationId?: string | null;
  name: string;
  ipAddress?: string | null;
  port?: number | null;
  serialNumber: string;
  model: string;
  unitId?: string | null;
  active: boolean;
  apiEndpoint?: string | null;
  authCredentials?: any;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
  unit?: { id: string; name: string; city?: string | null } | null;
  integration?: { id: string; key: string; name: string; enabled?: boolean } | null;
  _count?: {
    entries?: number;
    syncLogs?: number;
  };
}

export interface TimeClockSyncLogItem {
  id: string;
  integrationId?: string | null;
  deviceId?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  totalRecords: number;
  importedRecords: number;
  ignoredRecords: number;
  unmappedRecords: number;
  errorCount: number;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  errorDetails?: any;
  triggeredBy: 'CRON_SCHEDULE' | 'MANUAL_TRIGGER' | 'WEBHOOK' | 'AFD_UPLOAD';
  createdAt: string;
  integration?: { id: string; key: string; name: string } | null;
  device?: {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    unit?: { name: string } | null;
  } | null;
}

export interface TimeClockEntryItem {
  id: string;
  employeeId?: string | null;
  registrationNumber: string;
  timestamp: string;
  deviceId?: string | null;
  source: string;
  nsr?: string | null;
  rawPayload?: any;
  hash: string;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    registrationNumber: string;
    avatarUrl?: string | null;
    department?: { name: string } | null;
  } | null;
  device?: {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    unit?: { name: string } | null;
  } | null;
}

export interface SyncResult {
  syncLogId: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  totalRecords: number;
  importedRecords: number;
  ignoredRecords: number;
  unmappedRecords: number;
  errorCount: number;
  durationMs: number;
  message: string;
  errorDetails?: any;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: any;
}

export const integrationService = {
  // --- Integrações (Hub & Configurações) ---
  async getIntegrations(): Promise<IntegrationConfigItem[]> {
    const res = await api.get<ApiResponse<IntegrationConfigItem[]>>('/integrations');
    return res.data.data;
  },

  async getIntegration(key: string): Promise<IntegrationConfigItem & { devices: TimeClockDeviceItem[] }> {
    const res = await api.get<ApiResponse<IntegrationConfigItem & { devices: TimeClockDeviceItem[] }>>(
      `/integrations/${key}`
    );
    return res.data.data;
  },

  async toggleIntegration(key: string, enabled: boolean): Promise<IntegrationConfigItem> {
    const res = await api.patch<ApiResponse<IntegrationConfigItem>>(`/integrations/${key}/toggle`, {
      enabled,
    });
    return res.data.data;
  },

  async updateIntegrationSettings(
    key: string,
    data: { name?: string; description?: string; settings?: any; status?: string }
  ): Promise<IntegrationConfigItem> {
    const res = await api.put<ApiResponse<IntegrationConfigItem>>(`/integrations/${key}/settings`, data);
    return res.data.data;
  },

  async triggerSync(
    key: string,
    params?: { deviceId?: string | null; startDate?: string; endDate?: string }
  ): Promise<SyncResult> {
    const res = await api.post<ApiResponse<SyncResult>>(`/integrations/${key}/sync`, params || {});
    return res.data.data;
  },

  async testConnection(
    key: string,
    data?: { deviceId?: string; ipAddress?: string; port?: number; serialNumber?: string; apiEndpoint?: string }
  ): Promise<TestConnectionResult> {
    const res = await api.post<ApiResponse<TestConnectionResult>>(`/integrations/${key}/test-connection`, data || {});
    return res.data.data;
  },

  async uploadAfd(key: string, content: string, deviceId?: string | null): Promise<SyncResult> {
    const res = await api.post<ApiResponse<SyncResult>>(`/integrations/${key}/upload-afd`, {
      content,
      deviceId,
    });
    return res.data.data;
  },

  // --- Dispositivos / Relógios de Ponto ---
  async getDevices(params?: {
    integrationId?: string;
    unitId?: string;
    active?: boolean;
    search?: string;
  }): Promise<TimeClockDeviceItem[]> {
    const res = await api.get<ApiResponse<TimeClockDeviceItem[]>>('/integrations/devices', { params });
    return res.data.data;
  },

  async createDevice(data: {
    name: string;
    serialNumber: string;
    model: string;
    ipAddress?: string | null;
    port?: number | null;
    unitId?: string | null;
    integrationKey?: string;
    apiEndpoint?: string | null;
    authCredentials?: any;
    active?: boolean;
  }): Promise<TimeClockDeviceItem> {
    const res = await api.post<ApiResponse<TimeClockDeviceItem>>('/integrations/devices', data);
    return res.data.data;
  },

  async updateDevice(
    id: string,
    data: Partial<{
      name: string;
      serialNumber: string;
      model: string;
      ipAddress: string | null;
      port: number | null;
      unitId: string | null;
      apiEndpoint: string | null;
      authCredentials: any;
      active: boolean;
    }>
  ): Promise<TimeClockDeviceItem> {
    const res = await api.put<ApiResponse<TimeClockDeviceItem>>(`/integrations/devices/${id}`, data);
    return res.data.data;
  },

  async deleteDevice(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<ApiResponse<{ success: boolean; message: string }>>(`/integrations/devices/${id}`);
    return res.data.data;
  },

  async testDeviceConnection(id: string): Promise<TestConnectionResult> {
    const res = await api.post<ApiResponse<TestConnectionResult>>(`/integrations/devices/${id}/test-connection`);
    return res.data.data;
  },

  // --- Logs de Sincronização ---
  async getSyncLogs(params?: {
    integrationId?: string;
    deviceId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TimeClockSyncLogItem[]; meta: any }> {
    const res = await api.get<ApiResponse<TimeClockSyncLogItem[]>>('/integrations/logs', { params });
    return {
      items: res.data.data,
      meta: res.data.meta,
    };
  },

  async getSyncLog(id: string): Promise<TimeClockSyncLogItem> {
    const res = await api.get<ApiResponse<TimeClockSyncLogItem>>(`/integrations/logs/${id}`);
    return res.data.data;
  },

  // --- Registros Brutos de Ponto ---
  async getEntries(params?: {
    employeeId?: string;
    deviceId?: string;
    registrationNumber?: string;
    startDate?: string;
    endDate?: string;
    source?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TimeClockEntryItem[]; meta: any }> {
    const res = await api.get<ApiResponse<TimeClockEntryItem[]>>('/integrations/entries', { params });
    return {
      items: res.data.data,
      meta: res.data.meta,
    };
  },

  async getEntriesStats(): Promise<{ totalEntries: number; todayEntries: number; unmappedEntries: number }> {
    const res = await api.get<ApiResponse<{ totalEntries: number; todayEntries: number; unmappedEntries: number }>>(
      '/integrations/entries/stats'
    );
    return res.data.data;
  },

  async remapEntries(): Promise<{ totalUnmapped: number; remappedCount: number; remainingUnmapped: number; message: string }> {
    const res = await api.post<ApiResponse<{ totalUnmapped: number; remappedCount: number; remainingUnmapped: number; message: string }>>(
      '/integrations/entries/remap'
    );
    return res.data.data;
  },

  // --- RHiD Cloud (Control iD API v2) & Sincronização de Colaboradores ---
  async getRhidSettings(): Promise<{
    email: string;
    domain: string;
    enabled: boolean;
    autoSync: boolean;
    hasPassword: boolean;
  }> {
    const res = await api.get('/integrations/control-id/rhid/settings');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async updateRhidSettings(data: {
    email: string;
    password?: string;
    domain?: string;
    enabled?: boolean;
    autoSync?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const res = await api.put('/integrations/control-id/rhid/settings', data);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async testRhidConnection(data?: {
    email?: string;
    password?: string;
    domain?: string;
  }): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    data?: {
      customerDomain?: string;
      customerId?: string;
      operatorName?: string;
      operatorEmail?: string;
      maxUsers?: number | string;
      totalEmployeesInRhid?: number;
    };
    error?: string;
  }> {
    const res = await api.post('/integrations/control-id/rhid/test-connection', data || {});
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getRhidOverview(): Promise<{
    totalAtrio: number;
    totalRhid: number;
    totalSynced: number;
    totalAtrioOnly: number;
    totalRhidOnly: number;
    items: Array<{
      key: string;
      name: string;
      cpf: string;
      registrationNumber?: string | null;
      email?: string | null;
      status: 'SYNCED' | 'ATRIO_ONLY' | 'RHID_ONLY';
      atrioId?: string | null;
      rhidId?: number | null;
      atrioStatus?: string | null;
      rhidStatus?: number | null;
      templatesCount?: number;
      hasPhoto?: boolean;
    }>;
  }> {
    const res = await api.get('/integrations/control-id/rhid/employees/overview');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async importRhidEmployees(rhidPersonIds?: number[]): Promise<{
    success: boolean;
    importedCount: number;
    linkedCount: number;
    skippedCount: number;
    message: string;
  }> {
    const res = await api.post('/integrations/control-id/rhid/employees/import', { rhidPersonIds });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async pushRhidEmployees(employeeIds?: string[]): Promise<{
    success: boolean;
    total: number;
    successCount: number;
    errorCount: number;
    errors: string[];
    message: string;
  }> {
    const res = await api.post('/integrations/control-id/rhid/employees/push', { employeeIds });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async downloadRhidCsv(): Promise<void> {
    const res = await api.get('/integrations/control-id/rhid/employees/export-csv', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'colaboradores-rhid.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async syncRhidDevices(): Promise<{
    success: boolean;
    total: number;
    createdCount: number;
    updatedCount: number;
    message: string;
  }> {
    const res = await api.post('/integrations/control-id/rhid/devices/sync');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async syncRhidOrganization(): Promise<{
    departmentsCount: number;
    positionsCount: number;
    schedulesCount: number;
    employeesUpdated: number;
  }> {
    const res = await api.post('/integrations/control-id/rhid/organization/sync');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};


