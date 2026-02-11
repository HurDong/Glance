import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useStockStore } from '../stores/useStockStore';

const SOCKET_URL = 'http://localhost:8080/ws-glance';

export const useStockWebSocket = () => {
    const clientRef = useRef<Client | null>(null);
    const { setPrice } = useStockStore();
    const subscriptionsRef = useRef<Set<string>>(new Set());
    const isConnectedRef = useRef<boolean>(false);

    const subscribeToSymbol = useCallback((client: Client, symbol: string) => {
        console.log(`Subscribing to ${symbol}`);
        client.subscribe(`/api/v1/sub/stocks/${symbol}`, (message) => {
            try {
                const body = JSON.parse(message.body);
                setPrice(symbol, body);
            } catch (e) {
                console.error('Failed to parse stock message', e);
            }
        });
        
        // Send a subscription request to the backend to start receiving data for this symbol
        client.publish({
            destination: `/api/v1/pub/stocks/subscribe/${symbol}`,
            body: JSON.stringify({})
        });
    }, [setPrice]);

    const subscribe = useCallback((symbol: string) => {
        if (subscriptionsRef.current.has(symbol)) return;
        
        subscriptionsRef.current.add(symbol);

        if (clientRef.current && isConnectedRef.current) {
            subscribeToSymbol(clientRef.current, symbol);
        } else {
            console.log(`Queueing subscription for ${symbol}`);
        }
    }, [subscribeToSymbol]);

    const connect = useCallback(() => {
        if (clientRef.current?.active) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(SOCKET_URL),
            debug: (str) => {
                // console.log('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('Connected to WebSocket');
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
                console.log('WebSocket Closed');
            }
        });

        client.activate();
        clientRef.current = client;
    }, [subscribeToSymbol]);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.deactivate();
            clientRef.current = null;
            isConnectedRef.current = false;
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return { subscribe };
};
