import { session } from 'electron';

export interface ProxySettings {
  mode: 'system' | 'manual' | 'pac' | 'direct';
  httpProxy?: string;
  httpsProxy?: string;
  socksProxy?: string;
  pacUrl?: string;
  bypassList?: string;
}

const DEFAULT_BYPASS = 'localhost,127.0.0.1,*.gov.gh';

export async function applyProxySettings(settings: ProxySettings): Promise<void> {
  const ses = session.defaultSession;

  switch (settings.mode) {
    case 'direct':
      await ses.setProxy({ mode: 'direct' });
      break;

    case 'system':
      await ses.setProxy({ mode: 'system' });
      break;

    case 'pac':
      if (settings.pacUrl) {
        await ses.setProxy({
          mode: 'pac_script',
          pacScript: settings.pacUrl,
        });
      }
      break;

    case 'manual': {
      const proxyRules: string[] = [];
      if (settings.httpProxy) proxyRules.push(`http=${settings.httpProxy}`);
      if (settings.httpsProxy) proxyRules.push(`https=${settings.httpsProxy}`);
      if (settings.socksProxy) proxyRules.push(`socks5=${settings.socksProxy}`);

      if (proxyRules.length > 0) {
        await ses.setProxy({
          mode: 'fixed_servers',
          proxyRules: proxyRules.join(';'),
          proxyBypassRules: settings.bypassList || DEFAULT_BYPASS,
        });
      }
      break;
    }
  }
}
