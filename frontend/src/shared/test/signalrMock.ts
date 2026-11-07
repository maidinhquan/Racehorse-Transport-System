export const LogLevel = {
  None: 0,
  Critical: 1,
  Error: 2,
  Warning: 3,
  Information: 4,
  Debug: 5,
  Trace: 6,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const HubConnectionState = {
  Disconnected: 'Disconnected',
  Connecting: 'Connecting',
  Connected: 'Connected',
  Disconnecting: 'Disconnecting',
  Reconnecting: 'Reconnecting',
} as const;

export type HubConnectionState = (typeof HubConnectionState)[keyof typeof HubConnectionState];

export interface HubConnection {
  state: HubConnectionState;
  start(): Promise<void>;
  stop(): Promise<void>;
  on(methodName: string, newMethod: (...args: unknown[]) => void): void;
  onreconnecting(callback: (error?: Error) => void): void;
  onreconnected(callback: (connectionId?: string) => void): void;
  onclose(callback: (error?: Error) => void): void;
}

export class HubConnectionBuilder {
  withUrl(_url: string, _options?: unknown) {
    return this;
  }
  withAutomaticReconnect(_retryDelays?: number[]) {
    return this;
  }
  configureLogging(_logLevel: LogLevel) {
    return this;
  }
  build(): HubConnection {
    return {
      state: HubConnectionState.Disconnected,
      start: async () => {},
      stop: async () => {},
      on: () => {},
      onreconnecting: () => {},
      onreconnected: () => {},
      onclose: () => {},
    };
  }
}
