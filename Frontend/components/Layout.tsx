import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';

export default function Layout({ children }: { children: React.ReactNode }) {
    const handleError = (errorId: string, error: Error) => {
        // Здесь можно добавить логику для уведомления бизнеса
        console.log('🚨 Error reported to business:', { errorId, error });
        
        // Пример отправки в аналитику или мониторинг
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'error', {
                error_id: errorId,
                error_message: error.message,
                error_stack: error.stack
            });
        }
    };

    return (
        <ErrorBoundary onError={handleError}>
            <div className="container-fluid p-0">
                <div className="row g-0">
                    <div className="col-md-3 col-lg-2" style={{ minWidth: '200px', maxWidth: '250px' }}>
                        <Sidebar />
                    </div>
                    <div className="col-md-9 col-lg-10" style={{ minWidth: '0' }}>
                        <main className="main-content">
                            <div className="container-fluid">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
