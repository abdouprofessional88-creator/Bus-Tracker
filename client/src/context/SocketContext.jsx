import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [busLocations, setBusLocations] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      if (user) {
        if (user.role === 'driver') {
          socket.emit('register-driver', { userId: user._id, driverId: user._id });
        } else if (user.role === 'passenger') {
          socket.emit('register-passenger', { userId: user._id, passengerId: user._id });
        }
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('bus-location-broadcast', (data) => {
      setBusLocations(prev => ({
        ...prev,
        [data.busId || data.driverId]: data,
      }));
    });

    socket.on('bus-location-update', (data) => {
      setBusLocations(prev => ({
        ...prev,
        [data.busId || data.driverId]: data,
      }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user]);

  const trackBus = (busId) => {
    if (socketRef.current) {
      socketRef.current.emit('track-bus', { busId });
    }
  };

  const untrackBus = (busId) => {
    if (socketRef.current) {
      socketRef.current.emit('untrack-bus', { busId });
    }
  };

  const updateLocation = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('driver-update-location', data);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      busLocations,
      trackBus,
      untrackBus,
      updateLocation,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
