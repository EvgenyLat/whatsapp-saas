import React, { useState, useMemo } from 'react';
import { Booking } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

interface BookingTableProps {
    data: Booking[];
    onCancel: (id: string) => void;
}

interface SortConfig {
    key: keyof Booking | 'date';
    direction: 'asc' | 'desc';
}

interface FilterConfig {
    search: string;
    status: string;
}

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'confirmed':
            return 'default';
        case 'pending':
            return 'secondary';
        case 'cancelled':
            return 'destructive';
        case 'completed':
            return 'outline';
        default:
            return 'secondary';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'confirmed':
            return 'Подтверждено';
        case 'pending':
            return 'Ожидает';
        case 'cancelled':
            return 'Отменено';
        case 'completed':
            return 'Завершено';
        default:
            return status;
    }
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
};

const formatPhone = (phone: string) => {
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    
    // Если номер начинается с 0, заменяем на +972
    if (cleaned.startsWith('0')) {
        const withoutZero = cleaned.substring(1);
        return `+972 ${withoutZero.substring(0, 2)}-${withoutZero.substring(2, 5)}-${withoutZero.substring(5)}`;
    }
    
    // Если номер уже в международном формате
    if (cleaned.startsWith('972')) {
        const withoutCountryCode = cleaned.substring(3);
        return `+972 ${withoutCountryCode.substring(0, 2)}-${withoutCountryCode.substring(2, 5)}-${withoutCountryCode.substring(5)}`;
    }
    
    // Если номер короткий, добавляем +972
    if (cleaned.length === 9) {
        return `+972 ${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
    }
    
    // Возвращаем как есть, если не можем определить формат
    return phone;
};

const sortData = (data: Booking[], sortConfig: SortConfig) => {
    return [...data].sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        if (sortConfig.key === 'date') {
            aValue = new Date(a.startTs).getTime();
            bValue = new Date(b.startTs).getTime();
        } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        
        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
};

const filterData = (data: Booking[], filterConfig: FilterConfig) => {
    return data.filter(booking => {
        const matchesSearch = !filterConfig.search || 
            booking.clientName.toLowerCase().includes(filterConfig.search.toLowerCase()) ||
            booking.phone.includes(filterConfig.search);
        
        const matchesStatus = !filterConfig.status || filterConfig.status === 'all' || booking.status === filterConfig.status;
        
        return matchesSearch && matchesStatus;
    });
};

export default function BookingTable({ data = [], onCancel }: BookingTableProps) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'asc' });
    const [filterConfig, setFilterConfig] = useState<FilterConfig>({ search: '', status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Обработка сортировки
    const handleSort = (key: keyof Booking | 'date') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Обработка отмены записи
    const handleCancelClick = (id: string) => {
        if (confirm('Вы уверены, что хотите отменить эту запись?')) {
            onCancel(id);
        }
    };

    // Фильтрация и сортировка данных
    const filteredData = useMemo(() => {
        return filterData(data, filterConfig);
    }, [data, filterConfig]);

    const sortedData = useMemo(() => {
        return sortData(filteredData, sortConfig);
    }, [filteredData, sortConfig]);

    // Пагинация
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = sortedData.slice(startIndex, endIndex);

    // Сброс страницы при изменении фильтров
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filterConfig]);

    return (
        <Card className="w-full">
            {/* Фильтры и поиск */}
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Поиск по имени или телефону..."
                                value={filterConfig.search}
                                onChange={(e) => setFilterConfig(prev => ({ ...prev, search: e.target.value }))}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            value={filterConfig.status}
                            onValueChange={(value) => setFilterConfig(prev => ({ ...prev, status: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Все статусы" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все статусы</SelectItem>
                                <SelectItem value="pending">Ожидает</SelectItem>
                                <SelectItem value="confirmed">Подтверждено</SelectItem>
                                <SelectItem value="completed">Завершено</SelectItem>
                                <SelectItem value="cancelled">Отменено</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                        Найдено: {sortedData.length}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('clientName')}
                            >
                                <div className="flex items-center gap-2">
                                    Клиент
                                    {sortConfig.key === 'clientName' ? (
                                        sortConfig.direction === 'asc' ? 
                                            <ArrowUp className="h-4 w-4" /> : 
                                            <ArrowDown className="h-4 w-4" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('phone')}
                            >
                                <div className="flex items-center gap-2">
                                    Телефон
                                    {sortConfig.key === 'phone' ? (
                                        sortConfig.direction === 'asc' ? 
                                            <ArrowUp className="h-4 w-4" /> : 
                                            <ArrowDown className="h-4 w-4" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('service')}
                            >
                                <div className="flex items-center gap-2">
                                    Услуга
                                    {sortConfig.key === 'service' ? (
                                        sortConfig.direction === 'asc' ? 
                                            <ArrowUp className="h-4 w-4" /> : 
                                            <ArrowDown className="h-4 w-4" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center gap-2">
                                    Дата и время
                                    {sortConfig.key === 'date' ? (
                                        sortConfig.direction === 'asc' ? 
                                            <ArrowUp className="h-4 w-4" /> : 
                                            <ArrowDown className="h-4 w-4" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-2">
                                    Статус
                                    {sortConfig.key === 'status' ? (
                                        sortConfig.direction === 'asc' ? 
                                            <ArrowUp className="h-4 w-4" /> : 
                                            <ArrowDown className="h-4 w-4" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead>Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.map(booking => {
                            const { date, time } = formatDate(booking.startTs);
                            return (
                                <TableRow key={booking.id}>
                                    <TableCell className="font-medium">
                                        {booking.clientName}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatPhone(booking.phone)}
                                    </TableCell>
                                    <TableCell>
                                        {booking.service}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{date}</div>
                                            <div className="text-sm text-muted-foreground">{time}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(booking.status)}>
                                            {getStatusText(booking.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {booking.status === 'cancelled' ? (
                                            <div className="flex items-center text-muted-foreground">
                                                <X className="h-4 w-4 mr-1" />
                                                Отменено
                                            </div>
                                        ) : (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleCancelClick(booking.id)}
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Отменить
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>

            {/* Пагинация */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                        Показано {startIndex + 1}-{Math.min(endIndex, sortedData.length)} из {sortedData.length} записей
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Назад
                        </Button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                            if (
                                page === 1 || 
                                page === totalPages || 
                                (page >= currentPage - 2 && page <= currentPage + 2)
                            ) {
                                return (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                );
                            } else if (
                                page === currentPage - 3 || 
                                page === currentPage + 3
                            ) {
                                return (
                                    <span key={page} className="px-2 text-muted-foreground">
                                        ...
                                    </span>
                                );
                            }
                            return null;
                        })}
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Вперед
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}