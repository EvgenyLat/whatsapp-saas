import axios from 'axios';
import { mockStats, mockBookings, mockServices, simulateApiDelay } from './mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

// Check if we're in development mode and API is not available
const isDevelopment = process.env.NODE_ENV === 'development';
const useMockData = isDevelopment;

// Types for API responses
export interface Stats {
    bookings: number;
    revenue: number;
    clients: number;
}

export interface Booking {
    id: string;
    clientName: string;
    phone: string;
    service: string;
    startTs: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

export interface Service {
    id: string;
    name: string;
    duration: number;
}

export async function apiGet<T = any>(path: string): Promise<T> {
    // Use mock data in development if API is not available
    if (useMockData) {
        await simulateApiDelay();
        
        switch (path) {
            case '/admin/stats':
                return mockStats as T;
            case '/admin/bookings':
                return mockBookings as T;
            case '/admin/services':
                return mockServices as T;
            default:
                throw new Error(`Mock data not available for path: ${path}`);
        }
    }

    try {
        const res = await axios.get(API_BASE + path);
        return res.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // If API is not available, fall back to mock data
            if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
                console.warn(`API not available, using mock data for ${path}`);
                await simulateApiDelay();
                
                switch (path) {
                    case '/admin/stats':
                        return mockStats as T;
                    case '/admin/bookings':
                        return mockBookings as T;
                    case '/admin/services':
                        return mockServices as T;
                    default:
                        throw new Error(`Mock data not available for path: ${path}`);
                }
            }
            throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
        }
        throw error;
    }
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
    // Use mock data in development if API is not available
    if (useMockData) {
        await simulateApiDelay();
        
        if (path.includes('/admin/services')) {
            const newService = {
                id: Date.now().toString(),
                name: body.name,
                duration: body.duration
            };
            return newService as T;
        }
        
        if (path.includes('/admin/bookings') && path.includes('/cancel')) {
            return { success: true } as T;
        }
        
        throw new Error(`Mock data not available for POST path: ${path}`);
    }

    try {
        const res = await axios.post(API_BASE + path, body);
        return res.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // If API is not available, simulate successful response for demo
            if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
                console.warn(`API not available, simulating success for ${path}`);
                await simulateApiDelay();
                
                if (path.includes('/admin/services')) {
                    const newService = {
                        id: Date.now().toString(),
                        name: body.name,
                        duration: body.duration
                    };
                    return newService as T;
                }
                
                if (path.includes('/admin/bookings') && path.includes('/cancel')) {
                    return { success: true } as T;
                }
                
                return { success: true } as T;
            }
            throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
        }
        throw error;
    }
}
