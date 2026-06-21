type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  tenantId?: string;
  userId?: string;
  route?: string;
  duration?: number;
  error?: any;
  [key: string]: any;
}

/**
 * Logger centralizado e passivo (Fase 7A).
 * Registra logs de forma padronizada para posterior integração com Sentry/Analytics (Fase 7B).
 */
export const Logger = {
  log: (level: LogLevel, message: string, payload?: LogPayload) => {
    const timestamp = new Date().toISOString();
    
    const formattedLog = {
      timestamp,
      level,
      message,
      ...payload,
    };

    // Serialização segura de erros para console
    if (formattedLog.error instanceof Error) {
      formattedLog.error = {
        name: formattedLog.error.name,
        message: formattedLog.error.message,
        stack: formattedLog.error.stack,
      };
    }

    if (level === 'error') {
      console.error(JSON.stringify(formattedLog, null, 2));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(formattedLog, null, 2));
    } else {
      console.log(JSON.stringify(formattedLog, null, 2));
    }
  },

  info: (message: string, payload?: LogPayload) => Logger.log('info', message, payload),
  warn: (message: string, payload?: LogPayload) => Logger.log('warn', message, payload),
  error: (message: string, payload?: LogPayload) => Logger.log('error', message, payload),
};
