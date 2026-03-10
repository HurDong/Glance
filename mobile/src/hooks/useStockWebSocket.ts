import { useCallback, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { apiClient as api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useStockStore } from '@/stores/useStockStore';

function resolveSocketUrl() {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (explicitSocketUrl) {
    return explicitSocketUrl;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    const parsedUrl = new URL(apiUrl);
    return `${parsedUrl.protocol}//${parsedUrl.host}/ws-glance`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/ws-glance`;
  }

  return 'http://localhost:8080/ws-glance';
}

const SOCKET_URL = resolveSocketUrl();

export function useStockWebSocket() {
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const isConnectedRef = useRef(false);
  const isConnectingRef = useRef(false);
  const setPrice = useStockStore((state) => state.setPrice);
  const token = useAuthStore((state) => state.token);

  const subscribeToSymbol = useCallback(
    (client: Client, symbol: string) => {
      client.subscribe(`/api/v1/sub/stocks/${symbol}`, (message) => {
        try {
          const body = JSON.parse(message.body);
          setPrice(symbol, body);
        } catch (error) {
          console.error('Failed to parse stock message', error);
        }
      });

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      api
        .get(`/stocks/${symbol}/price`)
        .then((response) => {
          if (response.data?.data) {
            setPrice(symbol, response.data.data);
          }
        })
        .catch((error) => {
          console.error(`Failed to fetch initial price for ${symbol}`, error);
        });

      client.publish({
        destination: `/api/v1/pub/stocks/subscribe/${symbol}`,
        body: JSON.stringify({}),
        headers,
      });
    },
    [setPrice, token],
  );

  const subscribe = useCallback(
    (symbol: string) => {
      if (subscriptionsRef.current.has(symbol)) {
        return;
      }

      subscriptionsRef.current.add(symbol);

      if (clientRef.current && isConnectedRef.current) {
        subscribeToSymbol(clientRef.current, symbol);
      }
    },
    [subscribeToSymbol],
  );

  const connect = useCallback(async () => {
    if (clientRef.current?.active || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    if (!('global' in globalThis)) {
      Object.defineProperty(globalThis, 'global', {
        value: globalThis,
        configurable: true,
      });
    }

    const sockJsModule = await import('sockjs-client');
    const SockJS = sockJsModule.default;

    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: () => {},
      reconnectDelay: 3000,
      heartbeatIncoming: 5000,
      heartbeatOutgoing: 5000,
      onConnect: () => {
        isConnectedRef.current = true;
        isConnectingRef.current = false;
        subscriptionsRef.current.forEach((symbol) => {
          if (clientRef.current) {
            subscribeToSymbol(clientRef.current, symbol);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error:', frame.headers['message']);
        console.error('Additional details:', frame.body);
      },
      onWebSocketClose: () => {
        isConnectedRef.current = false;
        isConnectingRef.current = false;
      },
    });

    client.activate();
    clientRef.current = client;
  }, [subscribeToSymbol, token]);

  const disconnect = useCallback(() => {
    if (!clientRef.current) {
      return;
    }

    clientRef.current.deactivate();
    clientRef.current = null;
    isConnectedRef.current = false;
    isConnectingRef.current = false;
    subscriptionsRef.current.clear();
  }, []);

  useEffect(() => {
    void connect();
    return () => disconnect();
  }, [connect, disconnect, token]);

  return { subscribe };
}