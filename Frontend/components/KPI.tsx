export default function KPI({ title, value, icon }: { title: string; value: string | number; icon?: string }) {
    return (
        <div className="card stat-card">
            <div className="card-body text-center">
                {icon && <i className={`${icon} mb-3`} style={{ fontSize: '2rem', opacity: 0.8 }}></i>}
                <div className="stat-number">{value}</div>
                <div className="stat-label">{title}</div>
            </div>
        </div>
    );
}
