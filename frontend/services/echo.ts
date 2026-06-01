import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Register Pusher globally for laravel-echo in React Native
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
}

let echoInstance: Echo<any> | null = null;

export const getEcho = () => echoInstance;

export const initEcho = (token: string) => {
  if (echoInstance) {
    echoInstance.disconnect();
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  const useCloud = process.env.EXPO_PUBLIC_USE_PUSHER_CLOUD === 'true';
  const pusherKey = process.env.EXPO_PUBLIC_PUSHER_APP_KEY || 'local';
  const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'ap1';

  if (useCloud) {
    // Official Pusher.com Cloud configuration
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: pusherKey,
      cluster: cluster,
      forceTLS: true,
      authEndpoint: `${apiUrl}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });
  } else {
    // Self-hosted WebSocket Server configuration (Soketi, laravel-echo-server, Reverb)
    const match = apiUrl.match(/https?:\/\/([^/]+)/);
    const domain = match ? match[1] : 'localhost';
    const isSsl = apiUrl.startsWith('https');
    
    const host = process.env.EXPO_PUBLIC_PUSHER_HOST || domain;
    const port = process.env.EXPO_PUBLIC_PUSHER_PORT 
      ? Number(process.env.EXPO_PUBLIC_PUSHER_PORT) 
      : (isSsl ? 443 : 6001);

    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: pusherKey,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: isSsl,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${apiUrl}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });
  }

  return echoInstance;
};

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};
