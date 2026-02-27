import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
// @ts-ignore
import SockJS from 'sockjs-client';
import { useStockStore } from '../stores/useStockStore';
import { useAuthStore } from '../stores/authStore';
import { apiClient as api } from '../api/axios';

const SOCKET_URL = 'http://localhost:8080/ws-glance';

export const useStockWebSocket = () => {
    const clientRef = useRef<Client | null>(null);
    const { setPrice } = useStockStore();
    const { token } = useAuthStore();
    const subscriptionsRef = useRef<Set<string>>(new Set());
    const isConnectedRef = useRef<boolean>(false);

    const subscribeToSymbol = useCallback((client: Client, symbol: string) => {
        // ... (same as before)
        // console.log(`Subscribing to ${symbol}`);
        client.subscribe(`/api/v1/sub/stocks/${symbol}`, (message) => {
            try {
                const body = JSON.parse(message.body);
                setPrice(symbol, body);
            } catch (e) {
                console.error('Failed to parse stock message', e);
            }
        });
        
        // Send a subscription request to the backend to start receiving data for this symbol
        // Only if logged in (for tracking interest), otherwise rely on global/public stream
        // Always send subscription request (both for auth and anonymous users)
        // Subscription count is managed globally by Redis service
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Fetch initial price immediately (useful when market is closed and no real-time data is streaming)
        api.get(`/stocks/${symbol}/price`).then(response => {
            if (response.data && response.data.data) {
                // If we haven't received a WS message yet, or just to sync the latest known price
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
        } else {
            // console.log(`Queueing subscription for ${symbol}`);
        }
    }, [subscribeToSymbol]);

    const connect = useCallback(() => {
        // if (!token) return; // Removed token requirement
        if (clientRef.current?.active) return;
        
        // console.log('Connecting ' + (token ? 'with token' : 'as guest'));

        const client = new Client({
            webSocketFactory: () => new SockJS(SOCKET_URL),
            connectHeaders: token ? {
                Authorization: `Bearer ${token}`
            } : {},
            debug: (_str) => {
                // console.log('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            onConnect: () => {
                // console.log('Connected to WebSocket');
                isConnectedRef.current = true;
                
                // Process queued subscriptions
                subscriptionsRef.current.forEach(symbol => {
                    subscribeToSymbol(client, symbol);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
            onWebSocketClose: () => {
                isConnectedRef.current = false;
                // console.log('WebSocket Closed');
            }
        });

        client.activate();
        clientRef.current = client;
    }, [subscribeToSymbol, token]);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            // console.log('Disconnecting WebSocket...');
            clientRef.current.deactivate();
            clientRef.current = null;
            isConnectedRef.current = false;
            subscriptionsRef.current.clear(); // CRITCAL: clear so they re-subscribe on next connect
        }
    }, []);

    useEffect(() => {
        // Updated: Connect regardless of token (allow Public Ticker)
        connect();
        return () => disconnect();
    }, [connect, disconnect, token]);

    return { subscribe };
};
