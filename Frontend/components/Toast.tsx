import { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose: () => void;
}

export default function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation to complete
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const typeStyles = {
        success: 'alert-success',
        error: 'alert-danger',
        info: 'alert-info',
        warning: 'alert-warning',
    };

    const iconStyles = {
        success: 'text-success',
        error: 'text-danger',
        info: 'text-info',
        warning: 'text-warning',
    };

    const icons = {
        success: <i className="bi bi-check-circle-fill"></i>,
        error: <i className="bi bi-x-circle-fill"></i>,
        info: <i className="bi bi-info-circle-fill"></i>,
        warning: <i className="bi bi-exclamation-triangle-fill"></i>,
    };

    return (
        <div
            className={`alert ${typeStyles[type]} alert-dismissible fade show mb-2`}
            style={{
                maxWidth: '400px',
                transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
                opacity: isVisible ? 1 : 0,
                transition: 'all 0.3s ease-in-out'
            }}
        >
            <div className="d-flex align-items-center">
                <div className={`me-3 ${iconStyles[type]}`}>
                    {icons[type]}
                </div>
                <div className="flex-grow-1">
                    <p className="mb-0 fw-medium">{message}</p>
                </div>
                <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                >
                    <span className="visually-hidden">Закрыть</span>
                </button>
            </div>
        </div>
    );
}
