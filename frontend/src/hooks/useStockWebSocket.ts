import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
// @ts-ignore
import SockJS from 'sockjs-client';
import { useStockStore } from '../stores/useStockStore';
import { useAuthStore } from '../stores/authStore';
import { apiClient as api } from '../api/axios';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080/ws-glance';

export const useStockWebSocket = () => {
    const clientRef = useRef<Client | null>(null);
    const { setPrice } = useStockStore();
    const { token } = useAuthStore();
    const subscriptionsRef = useRef<Set<string>>(new Set());
    const isConnectedRef = useRef<boolean>(false);

    const subscribeToSymbol = useCallback((client: Client, symbol: string) => {
        client.subscribe(`/api/v1/sub/stocks/${symbol}`, (message) => {
            try {
                const body = JSON.parse(message.body);
                setPrice(symbol, body);
            } catch (e) {
                console.error('Failed to parse stock message', e);
            }
        });

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        // Fetch initial price immediately (useful when market is closed and no real-time data is streaming)
        api.get(`/stocks/${symbol}/price`).then(response => {
            if (response.data && response.data.data) {
                setPrice(symbol, response.data.data);
            }
        }).catch(err => console.error(`Failed to fetch initial price for ${symbol}`, err));

        client.publish({
            destination: `/api/v1/pub/stocks/subscribe/${symbol}`,
            body: JSON.stringify({}),
            headers
        });
    }, [setPrice, token]);

    const subscribe = useCallback((symbol: string) => {
        if (subscriptionsRef.current.has(symbol)) return;

        subscriptionsRef.current.add(symbol);

        if (clientRef.current && isConnectedRef.current) {
            subscribeToSymbol(clientRef.current, symbol);
        }
    }, [subscribeToSymbol]);

    const connect = useCallback(() => {
        if (clientRef.current?.active) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(SOCKET_URL),
            connectHeaders: token ? {
                Authorization: `Bearer ${token}`
            } : {},
            debug: (_str) => {
                // console.log('STOMP: ' + str);
            },
            reconnectDelay: 3000,
            heartbeatIncoming: 5000,
            heartbeatOutgoing: 5000,
            onConnect: () => {
                isConnectedRef.current = true;
                // console.log('WebSocket Connected. Processing subscriptions:', subscriptionsRef.current);

                // Process all tracked subscriptions upon (re)connection
                subscriptionsRef.current.forEach(symbol => {
                    if (clientRef.current) {
                        subscribeToSymbol(clientRef.current, symbol);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
            onWebSocketClose: () => {
                isConnectedRef.current = false;
            }
        });

        client.activate();
        clientRef.current = client;
    }, [subscribeToSymbol, token]);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.deactivate();
            clientRef.current = null;
            isConnectedRef.current = false;
            subscriptionsRef.current.clear();
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect, token]);

    return { subscribe };
};
