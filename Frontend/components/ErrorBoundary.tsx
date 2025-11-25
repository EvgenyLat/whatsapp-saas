import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (errorId: string, error: Error) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorId?: string;
    errorInfo?: React.ErrorInfo;
    isRetrying: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { 
            hasError: false, 
            isRetrying: false 
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { 
            hasError: true, 
            error,
            isRetrying: false
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        this.setState({ 
            errorId,
            errorInfo 
        });

        // Вызываем callback если передан
        if (this.props.onError) {
            this.props.onError(errorId, error);
        }
    }

    private handleRetry = () => {
        this.setState({ 
            hasError: false, 
            error: undefined, 
            errorId: undefined, 
            errorInfo: undefined,
            isRetrying: true 
        });
        
        // Небольшая задержка для плавного перехода
        setTimeout(() => {
            this.setState({ isRetrying: false });
        }, 1000);
    };

    private handleReload = () => {
        window.location.reload();
    };

    private copyErrorDetails = () => {
        const { error, errorId, errorInfo } = this.state;
        const errorDetails = {
            errorId,
            message: error?.message,
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
            .then(() => {
                // Показываем уведомление об успешном копировании
                const button = document.querySelector('[data-copy-button]') as HTMLButtonElement;
                if (button) {
                    const originalText = button.textContent;
                    button.textContent = 'Скопировано!';
                    button.classList.add('btn-success');
                    button.classList.remove('btn-outline-secondary');
                    
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.classList.remove('btn-success');
                        button.classList.add('btn-outline-secondary');
                    }, 2000);
                }
            })
            .catch(() => {
                console.error('Failed to copy error details');
            });
    };

    render() {
        const { hasError, error, errorId, isRetrying } = this.state;
        const supportContact = {
            email: 'support@example.com',
            phone: '+972 50-123-4567',
            telegram: '@support_bot'
        };
        const supportUrl = errorId ? `https://support.example.com/error/${errorId}` : null;

        if (hasError) {
            return this.props.fallback || (
                <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="container">
                        <div className="row justify-content-center">
                            <div className="col-md-8 col-lg-6">
                                <div className="card shadow-lg border-0">
                                    <div className="card-body p-4">
                                        {/* Заголовок с иконкой */}
                                        <div className="text-center mb-4">
                                            <div className="mb-3">
                                                <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '3rem' }}></i>
                                            </div>
                                            <h2 className="card-title text-danger mb-2">Произошла ошибка</h2>
                                            <p className="text-muted">
                                                К сожалению, что-то пошло не так. Мы уже работаем над решением проблемы.
                                            </p>
                                        </div>

                                        {/* Детали ошибки */}
                                        {errorId && (
                                            <div className="alert alert-info" role="alert">
                                                <div className="d-flex align-items-center">
                                                    <i className="bi bi-info-circle me-2"></i>
                                                    <div>
                                                        <strong>ID ошибки:</strong> <code>{errorId}</code>
                                                        <br />
                                                        <small className="text-muted">
                                                            Сохраните этот ID для обращения в поддержку
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Сообщение об ошибке */}
                                        {error && (
                                            <div className="alert alert-warning" role="alert">
                                                <h6 className="alert-heading">
                                                    <i className="bi bi-bug me-1"></i>
                                                    Детали ошибки:
                                                </h6>
                                                <p className="mb-0 small">
                                                    <code>{error.message}</code>
                                                </p>
                                            </div>
                                        )}

                                        {/* Кнопки действий */}
                                        <div className="d-grid gap-2 d-md-flex justify-content-md-center mb-4">
                                            <button
                                                onClick={this.handleRetry}
                                                disabled={isRetrying}
                                                className="btn btn-primary btn-lg me-md-2"
                                            >
                                                {isRetrying ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Повторяем...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-arrow-clockwise me-2"></i>
                                                        Попробовать снова
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={this.handleReload}
                                                className="btn btn-outline-primary btn-lg"
                                            >
                                                <i className="bi bi-arrow-clockwise me-2"></i>
                                                Обновить страницу
                                            </button>
                                        </div>

                                        {/* Дополнительные действия */}
                                        <div className="text-center">
                                            <div className="btn-group" role="group">
                                                <button
                                                    onClick={this.copyErrorDetails}
                                                    data-copy-button
                                                    className="btn btn-outline-secondary btn-sm"
                                                >
                                                    <i className="bi bi-clipboard me-1"></i>
                                                    Скопировать детали
                                                </button>
                                                {supportUrl && (
                                                    <a
                                                        href={supportUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-outline-info btn-sm"
                                                    >
                                                        <i className="bi bi-headset me-1"></i>
                                                        Обратиться в поддержку
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Контактная информация поддержки */}
                                        <hr className="my-4" />
                                        <div className="text-center">
                                            <h6 className="text-muted mb-3">Нужна помощь?</h6>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-4">
                                                    <a 
                                                        href={`mailto:${supportContact.email}`}
                                                        className="btn btn-outline-secondary btn-sm w-100"
                                                    >
                                                        <i className="bi bi-envelope me-1"></i>
                                                        {supportContact.email}
                                                    </a>
                                                </div>
                                                <div className="col-12 col-md-4">
                                                    <a 
                                                        href={`tel:${supportContact.phone}`}
                                                        className="btn btn-outline-secondary btn-sm w-100"
                                                    >
                                                        <i className="bi bi-telephone me-1"></i>
                                                        {supportContact.phone}
                                                    </a>
                                                </div>
                                                {supportContact.telegram && (
                                                    <div className="col-12 col-md-4">
                                                        <a 
                                                            href={`https://t.me/${supportContact.telegram.replace('@', '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline-secondary btn-sm w-100"
                                                        >
                                                            <i className="bi bi-telegram me-1"></i>
                                                            Telegram
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Время ошибки */}
                                        <div className="text-center mt-3">
                                            <small className="text-muted">
                                                Время ошибки: {new Date().toLocaleString('ru-RU')}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
