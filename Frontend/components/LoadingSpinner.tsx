interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'spinner-border-sm',
        md: '',
        lg: 'spinner-border-lg',
    };

    return (
        <div className={`spinner-border loading-spinner ${sizeClasses[size]} ${className}`} role="status">
            <span className="visually-hidden">Загрузка...</span>
        </div>
    );
}
