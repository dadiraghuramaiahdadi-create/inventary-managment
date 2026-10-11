import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const stompClientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const stockListenersRef = useRef(new Set());
  const activityListenersRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      setConnected(false);
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const brokerURL = `${wsProtocol}//${host}:8080/ws`;

    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnected(true);

        // 1. Subscribe to real-time stock updates
        client.subscribe('/topic/stock-updates', (message) => {
          try {
            const product = JSON.parse(message.body);
            stockListenersRef.current.forEach((fn) => fn(product));
          } catch (e) {
            console.error('Error handling stock update message:', e);
          }
        });

        // 2. Subscribe to inventory audit activity feed
        client.subscribe('/topic/activity', (message) => {
          try {
            const activity = JSON.parse(message.body);
            activityListenersRef.current.forEach((fn) => fn(activity));
          } catch (e) {
            console.error('Error handling activity message:', e);
          }
        });

        // 3. Subscribe to real-time low stock / out of stock alerts
        client.subscribe('/topic/alerts', (message) => {
          try {
            const alert = JSON.parse(message.body);
            setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
            setUnreadAlertCount((prev) => prev + 1);
          } catch (e) {
            console.error('Error handling alert message:', e);
          }
        });
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: (frame) => {
        console.warn('Broker reported error: ' + frame.headers['message']);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [isAuthenticated]);

  const subscribeStockUpdates = (callback) => {
    stockListenersRef.current.add(callback);
    return () => stockListenersRef.current.delete(callback);
  };

  const subscribeActivity = (callback) => {
    activityListenersRef.current.add(callback);
    return () => activityListenersRef.current.delete(callback);
  };

  const clearAlerts = () => {
    setUnreadAlertCount(0);
  };

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        alerts,
        unreadAlertCount,
        clearAlerts,
        subscribeStockUpdates,
        subscribeActivity,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
