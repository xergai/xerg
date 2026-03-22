export interface RailwayTarget {
  projectId: string;
  environmentId: string;
  serviceId: string;
}

export interface RemoteSource {
  name: string;
  transport: 'ssh' | 'railway';
  host: string;
  logFile?: string;
  sessionsDir?: string;
  identityFile?: string;
  railway?: RailwayTarget;
}

export interface RemoteConfigEntry {
  name: string;
  transport?: 'ssh' | 'railway';
  host?: string;
  logFile?: string;
  sessionsDir?: string;
  identityFile?: string;
  railway?: RailwayTarget;
}

export interface RemoteConfig {
  remotes: RemoteConfigEntry[];
}

export interface PullResult {
  localPath: string;
  logFile?: string;
  sessionsDir?: string;
  source: RemoteSource;
}

export interface RemoteDoctorReport {
  host: string;
  sshConnectivity: boolean;
  sshError?: string;
  rsyncAvailableLocal: boolean;
  rsyncAvailableRemote: boolean;
  defaultPaths: {
    gatewayExists: boolean;
    gatewayPath: string;
    gatewayFileCount: number;
    gatewayTotalBytes: number;
    sessionsExists: boolean;
    sessionsPath: string;
    sessionsFileCount: number;
    sessionsTotalBytes: number;
  };
  customPaths?: {
    logFileExists: boolean;
    logFilePath: string;
    logFileBytes: number;
    sessionsDirExists: boolean;
    sessionsDirPath: string;
    sessionsFileCount: number;
    sessionsTotalBytes: number;
  };
  notes: string[];
}

export interface RailwayDoctorReport {
  transport: 'railway';
  name: string;
  railwayCliInstalled: boolean;
  railwayAuthenticated: boolean;
  railwayAuthUser?: string;
  serviceReachable: boolean;
  serviceError?: string;
  defaultPaths: {
    gatewayExists: boolean;
    gatewayPath: string;
    gatewayFileCount: number;
    gatewayTotalBytes: number;
    sessionsExists: boolean;
    sessionsPath: string;
    sessionsFileCount: number;
    sessionsTotalBytes: number;
  };
  alternateSessionPaths: {
    path: string;
    exists: boolean;
    fileCount: number;
    totalBytes: number;
  }[];
  customPaths?: {
    logFileExists: boolean;
    logFilePath: string;
    logFileBytes: number;
    sessionsDirExists: boolean;
    sessionsDirPath: string;
    sessionsFileCount: number;
    sessionsTotalBytes: number;
  };
  notes: string[];
}
