export interface RailwayLog {
  timestamp: string;
  message: string;
  severity?: string;
  attributes?: Record<string, any>;
}

export interface RailwayDeployment {
  id: string;
  status: string;
  createdAt: string;
  staticUrl?: string;
}

export interface RailwayService {
  id: string;
  name: string;
  deployments: RailwayDeployment[];
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  severity: string;
  serviceName: string;
  deploymentId?: string;
  rawLog: string;
}
