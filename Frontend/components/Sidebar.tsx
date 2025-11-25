import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar() {
    const router = useRouter();
    
    const items = [
        { href: '/', label: 'Панель управления', icon: 'bi-speedometer2' },
        { href: '/bookings', label: 'Бронирования', icon: 'bi-calendar-check' },
        { href: '/schedule', label: 'Расписание', icon: 'bi-calendar3' },
        { href: '/services', label: 'Услуги', icon: 'bi-scissors' },
        { href: '/billing', label: 'Биллинг', icon: 'bi-credit-card' }
    ];

    return (
        <aside className="sidebar">
            <div className="p-3">
                <div className="navbar-brand d-flex align-items-center">
                    <i className="bi bi-gem me-2"></i>
                    <div className="d-flex flex-column">
                        <span className="fw-bold">Админ-панель</span>
                        <small className="text-white-50">салона</small>
                    </div>
                </div>
            </div>
            <nav className="px-3">
                {items.map(item => (
                    <Link 
                        key={item.href} 
                        href={item.href} 
                        className={`nav-link d-flex align-items-center ${router.pathname === item.href ? 'active' : ''}`}
                    >
                        <i className={`${item.icon} me-3`}></i>
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="mt-auto p-4">
                <div className="text-center">
                    <small className="text-white-50">
                        <i className="bi bi-shield-check me-1"></i>
                        Версия 1.0.0
                    </small>
                </div>
            </div>
        </aside>
    );
}
