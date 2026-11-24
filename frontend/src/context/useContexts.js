import { createContext, useContext } from 'react';

export const ThemeContext = createContext(null);
export const ToastContext = createContext(null);
export const AuthContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme harus digunakan di dalam ThemeProvider');
  }
  return context;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return context;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}

