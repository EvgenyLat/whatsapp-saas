/**
 * Translation Strings
 * All translatable text for the landing page
 */

export interface Translations {
  // Navigation
  nav: {
    features: string;
    demo: string;
    pricing: string;
    reviews: string;
    signIn: string;
    startFreeTrial: string;
  };

  // Hero Section
  hero: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    cta: {
      primary: string;
      secondary: string;
    };
    trustIndicators: {
      freeTrial: string;
      noCard: string;
      cancelAnytime: string;
    };
    demo: {
      header: string;
      online: string;
      userMessage: string;
      botResponse: string;
      timeSlots: string;
    };
  };

  // Features Section
  features: {
    title: string;
    subtitle: string;
    items: {
      aiAutomation: {
        title: string;
        description: string;
      };
      whatsappIntegration: {
        title: string;
        description: string;
      };
      smartBooking: {
        title: string;
        description: string;
      };
      customerManagement: {
        title: string;
        description: string;
      };
      analytics: {
        title: string;
        description: string;
      };
      reminders: {
        title: string;
        description: string;
      };
      availability: {
        title: string;
        description: string;
      };
      security: {
        title: string;
        description: string;
      };
      instantResponses: {
        title: string;
        description: string;
      };
      multiLanguage: {
        title: string;
        description: string;
      };
      mobileFirst: {
        title: string;
        description: string;
      };
      growthTools: {
        title: string;
        description: string;
      };
    };
  };

  // Pricing
  pricing: {
    title: string;
    subtitle: string;
    monthly: string;
    yearly: string;
    save20: string;
    mostPopular: string;
    plans: {
      starter: {
        name: string;
        description: string;
        price: string;
        features: string[];
      };
      professional: {
        name: string;
        description: string;
        price: string;
        features: string[];
      };
      enterprise: {
        name: string;
        description: string;
        price: string;
        features: string[];
      };
    };
  };

  // Common
  common: {
    learnMore: string;
    getStarted: string;
    contactUs: string;
    perMonth: string;
    custom: string;
  };
}

export const translations: Record<string, Translations> = {
  en: {
    nav: {
      features: 'Features',
      demo: 'Demo',
      pricing: 'Pricing',
      reviews: 'Reviews',
      signIn: 'Sign In',
      startFreeTrial: 'Start Free Trial',
    },
    hero: {
      badge: '⭐ Rated #1 WhatsApp Booking Automation',
      title: 'Stop Losing Customers',
      titleHighlight: 'While You Sleep',
      subtitle: 'Your salon loses 40% of potential bookings after hours. Our AI answers instantly on WhatsApp—24/7, in any language. Book more. Work less. Grow faster.',
      cta: {
        primary: 'Start Free 14-Day Trial',
        secondary: 'See It In Action',
      },
      trustIndicators: {
        freeTrial: '✓ No credit card required',
        noCard: '✓ Setup in 10 minutes',
        cancelAnytime: '✓ Cancel anytime',
      },
      demo: {
        header: 'Salon AI Assistant',
        online: '🟢 Always Online 24/7',
        userMessage: 'Hi! Can I book a manicure for tomorrow at 2pm?',
        botResponse: 'Perfect! I have these slots available tomorrow:',
        timeSlots: 'Tap to Book Instantly',
      },
    },
    features: {
      title: 'Everything Your Customers Want. Everything You Need to Grow.',
      subtitle: 'Built for beauty salons, perfected through 500+ real businesses.',
      items: {
        aiAutomation: {
          title: 'Zero Typing Experience',
          description: 'Customers tap buttons. Book instantly. No typing = No friction. Works 24/7 in 5 languages.',
        },
        whatsappIntegration: {
          title: 'WhatsApp Native',
          description: 'Where 2 billion customers already are. No app downloads. Just instant booking.',
        },
        smartBooking: {
          title: 'AI Responds in 8 Seconds',
          description: 'Never keep customers waiting. AI answers instantly, suggests 3 time slots, confirms booking—all in under 30 seconds.',
        },
        customerManagement: {
          title: 'Know Every Customer',
          description: 'AI remembers preferences, history, birthdays. "Welcome back Sarah! Your usual 3pm slot is available."',
        },
        analytics: {
          title: 'Real-Time Dashboard',
          description: 'See bookings as they happen. Full control, zero calls. Track revenue, staff performance, peak hours.',
        },
        reminders: {
          title: '80% Less No-Shows',
          description: 'Automatic WhatsApp reminders 24h + 2h before. Customers confirm with one tap.',
        },
        availability: {
          title: 'Sleep Peacefully',
          description: 'AI works while you rest. Wake up to $600+ in new bookings. Save 15+ hours per week.',
        },
        security: {
          title: 'Bank-Level Security',
          description: 'SOC 2 certified. GDPR compliant. Your data encrypted. Customer trust guaranteed.',
        },
        instantResponses: {
          title: '8-Second Response Time',
          description: 'Faster than any human. AI never sleeps, never takes breaks, never misses a customer.',
        },
        multiLanguage: {
          title: 'Speaks Their Language',
          description: 'English, Spanish, Russian, Portuguese, Hebrew. AI detects language automatically. No setup needed.',
        },
        mobileFirst: {
          title: 'Manage From Anywhere',
          description: 'Full dashboard on your phone. Accept bookings from the beach. Business runs itself.',
        },
        growthTools: {
          title: 'Grow on Autopilot',
          description: 'Auto-collect reviews. Birthday offers. Win-back campaigns. 40% more repeat bookings.',
        },
      },
    },
    pricing: {
      title: 'Simple Pricing. Massive ROI.',
      subtitle: 'Pay $79/month. Make $2,400+ extra per month. That\'s 30x return on investment. Guaranteed.',
      monthly: 'Monthly',
      yearly: 'Yearly',
      save20: 'Save 20%',
      mostPopular: '⭐ MOST POPULAR',
      plans: {
        starter: {
          name: 'Starter',
          description: 'Perfect for solo professionals',
          price: '$29',
          features: [
            '1 salon location',
            '500 conversations/month',
            'Up to 3 staff members',
            'WhatsApp AI booking 24/7',
            '5 languages supported',
            'Basic analytics dashboard',
            'Email support (24h response)',
            '📈 Make $800/month extra = 28x ROI',
          ],
        },
        professional: {
          name: 'Professional',
          description: 'For established salons',
          price: '$79',
          features: [
            'Everything in STARTER, plus:',
            'Up to 3 salon locations',
            '2,000 conversations/month',
            'Up to 15 staff members',
            'Advanced analytics & reports',
            'Custom branding (your logo)',
            'Payment collection (Stripe)',
            'Google Calendar sync',
            'Priority support (2h response)',
            'Dedicated onboarding call',
            '🚀 Make $2,400/month extra = 30x ROI',
          ],
        },
        enterprise: {
          name: 'Enterprise',
          description: 'For salon chains',
          price: '$149',
          features: [
            'Everything in PRO, plus:',
            'Unlimited salon locations',
            'Unlimited conversations',
            'Unlimited staff members',
            'White-label solution',
            'Custom AI training',
            'API access for integrations',
            'Dedicated account manager',
            '24/7 phone support (1h response)',
            'Custom SLA agreement',
            '💎 Make $8,000+/month extra = 40x ROI',
          ],
        },
      },
    },
    common: {
      learnMore: 'Learn More',
      getStarted: 'Get Started',
      contactUs: 'Contact Us',
      perMonth: '/month',
      custom: 'Custom',
    },
  },

  ru: {
    nav: {
      features: 'Возможности',
      demo: 'Демо',
      pricing: 'Цены',
      reviews: 'Отзывы',
      signIn: 'Войти',
      startFreeTrial: 'Начать бесплатно',
    },
    hero: {
      badge: 'Присоединяйтесь к 500+ салонам красоты по всему миру',
      title: 'Автоматизируйте бронирование салона через',
      titleHighlight: 'WhatsApp',
      subtitle: 'Присоединяйтесь к 500+ салонам красоты, экономящим 15+ часов в неделю с помощью AI-автоматизации бронирования. Больше не теряйте клиентов.',
      cta: {
        primary: 'Начать бесплатно',
        secondary: 'Смотреть демо',
      },
      trustIndicators: {
        freeTrial: 'Бесплатно 14 дней',
        noCard: 'Карта не требуется',
        cancelAnytime: 'Отмена в любое время',
      },
      demo: {
        header: 'AI-ассистент салона',
        online: 'Онлайн',
        userMessage: 'Привет! Хочу записаться на стрижку в пятницу в 15:00',
        botResponse: 'Отлично! У меня есть следующие слоты в пятницу:',
        timeSlots: 'Доступно',
      },
    },
    features: {
      title: 'Все что нужно для автоматизации салона',
      subtitle: 'Мощные функции для оптимизации операций и удовлетворения клиентов',
      items: {
        aiAutomation: {
          title: 'AI-автоматизация',
          description: 'Умный AI обрабатывает бронирования, запросы и общение с клиентами 24/7',
        },
        whatsappIntegration: {
          title: 'Интеграция с WhatsApp',
          description: 'Общайтесь с клиентами на их любимой платформе',
        },
        smartBooking: {
          title: 'Умное бронирование',
          description: 'Интеллектуальное планирование предотвращает двойное бронирование',
        },
        customerManagement: {
          title: 'Управление клиентами',
          description: 'Полные профили клиентов с историей и предпочтениями',
        },
        analytics: {
          title: 'Аналитика',
          description: 'Данные о бронированиях, доходах и поведении клиентов в реальном времени',
        },
        reminders: {
          title: 'Автоматические напоминания',
          description: 'Сократите количество пропущенных встреч с автонапоминаниями',
        },
        availability: {
          title: 'Доступность 24/7',
          description: 'Не пропустите бронирование даже вне рабочих часов',
        },
        security: {
          title: 'Корпоративная безопасность',
          description: 'Банковское шифрование и соответствие GDPR',
        },
        instantResponses: {
          title: 'Мгновенные ответы',
          description: 'AI отвечает на запросы клиентов за секунды',
        },
        multiLanguage: {
          title: 'Мультиязычность',
          description: 'Общайтесь с клиентами на их родном языке',
        },
        mobileFirst: {
          title: 'Мобильный дизайн',
          description: 'Управляйте салоном откуда угодно, с любого устройства',
        },
        growthTools: {
          title: 'Инструменты роста',
          description: 'Маркетинговая автоматизация для расширения клиентской базы',
        },
      },
    },
    pricing: {
      title: 'Простые и прозрачные цены',
      subtitle: 'Выберите план для вашего салона',
      monthly: 'Месяц',
      yearly: 'Год',
      save20: 'Скидка 20%',
      mostPopular: 'Популярный',
      plans: {
        starter: {
          name: 'Стартовый',
          description: 'Для небольших салонов',
          price: '$49',
          features: [
            '500 диалогов/месяц',
            '1 аккаунт WhatsApp',
            'Базовая аналитика',
            'Email поддержка',
            'Автонапоминания',
          ],
        },
        professional: {
          name: 'Профессиональный',
          description: 'Для растущего бизнеса',
          price: '$149',
          features: [
            '2,500 диалогов/месяц',
            '3 аккаунта WhatsApp',
            'Продвинутая аналитика',
            'Приоритетная поддержка',
            'Кастомный брендинг',
            'Мультиязычность',
          ],
        },
        enterprise: {
          name: 'Корпоративный',
          description: 'Для сетей салонов',
          price: 'Индивидуально',
          features: [
            'Неограниченные диалоги',
            'Неограниченные аккаунты',
            'Персональный менеджер',
            'Поддержка 24/7',
            'Кастомные интеграции',
            'Гарантия SLA',
          ],
        },
      },
    },
    common: {
      learnMore: 'Подробнее',
      getStarted: 'Начать',
      contactUs: 'Связаться',
      perMonth: '/месяц',
      custom: 'Индивидуально',
    },
  },

  es: {
    nav: {
      features: 'Características',
      demo: 'Demo',
      pricing: 'Precios',
      reviews: 'Reseñas',
      signIn: 'Iniciar sesión',
      startFreeTrial: 'Comenzar prueba gratuita',
    },
    hero: {
      badge: 'Únete a más de 500 salones de belleza en todo el mundo',
      title: 'Automatiza las reservas de tu salón a través de',
      titleHighlight: 'WhatsApp',
      subtitle: 'Únete a más de 500 salones de belleza que ahorran más de 15 horas a la semana con automatización de reservas impulsada por IA. Nunca pierdas un cliente más.',
      cta: {
        primary: 'Comenzar prueba gratuita',
        secondary: 'Ver demo',
      },
      trustIndicators: {
        freeTrial: 'Prueba gratuita de 14 días',
        noCard: 'No se requiere tarjeta de crédito',
        cancelAnytime: 'Cancela en cualquier momento',
      },
      demo: {
        header: 'Asistente IA del salón',
        online: 'En línea ahora',
        userMessage: '¡Hola! Quiero reservar un corte de pelo para el viernes a las 3pm',
        botResponse: '¡Perfecto! Tengo estos horarios disponibles el viernes:',
        timeSlots: 'Disponible',
      },
    },
    features: {
      title: 'Todo lo que necesitas para automatizar tu salón',
      subtitle: 'Funciones potentes para optimizar tus operaciones y deleitar a tus clientes',
      items: {
        aiAutomation: {
          title: 'Automatización con IA',
          description: 'La IA inteligente maneja reservas, consultas y comunicación con clientes 24/7',
        },
        whatsappIntegration: {
          title: 'Integración con WhatsApp',
          description: 'Conéctate con clientes en su plataforma de mensajería favorita',
        },
        smartBooking: {
          title: 'Sistema de reservas inteligente',
          description: 'Programación inteligente que previene reservas dobles',
        },
        customerManagement: {
          title: 'Gestión de clientes',
          description: 'Perfiles completos de clientes con historial y preferencias',
        },
        analytics: {
          title: 'Panel de análisis',
          description: 'Información en tiempo real sobre reservas, ingresos y comportamiento de clientes',
        },
        reminders: {
          title: 'Recordatorios automáticos',
          description: 'Reduce las ausencias con recordatorios automáticos de citas',
        },
        availability: {
          title: 'Disponibilidad 24/7',
          description: 'Nunca pierdas una reserva, incluso fuera del horario comercial',
        },
        security: {
          title: 'Seguridad empresarial',
          description: 'Cifrado de nivel bancario y cumplimiento GDPR',
        },
        instantResponses: {
          title: 'Respuestas instantáneas',
          description: 'La IA responde a las consultas de los clientes en segundos',
        },
        multiLanguage: {
          title: 'Soporte multiidioma',
          description: 'Comunícate con clientes en su idioma preferido',
        },
        mobileFirst: {
          title: 'Diseño móvil primero',
          description: 'Gestiona tu salón desde cualquier lugar, en cualquier dispositivo',
        },
        growthTools: {
          title: 'Herramientas de crecimiento',
          description: 'Automatización de marketing para aumentar tu base de clientes',
        },
      },
    },
    pricing: {
      title: 'Precios simples y transparentes',
      subtitle: 'Elige el plan que se adapte a tu salón',
      monthly: 'Mensual',
      yearly: 'Anual',
      save20: 'Ahorra 20%',
      mostPopular: 'Más popular',
      plans: {
        starter: {
          name: 'Inicial',
          description: 'Perfecto para salones pequeños',
          price: '$49',
          features: [
            '500 conversaciones/mes',
            '1 cuenta de WhatsApp',
            'Análisis básicos',
            'Soporte por email',
            'Recordatorios automáticos',
          ],
        },
        professional: {
          name: 'Profesional',
          description: 'Para negocios en crecimiento',
          price: '$149',
          features: [
            '2,500 conversaciones/mes',
            '3 cuentas de WhatsApp',
            'Análisis avanzados',
            'Soporte prioritario',
            'Marca personalizada',
            'Soporte multiidioma',
          ],
        },
        enterprise: {
          name: 'Empresarial',
          description: 'Para cadenas de salones',
          price: 'Personalizado',
          features: [
            'Conversaciones ilimitadas',
            'Cuentas ilimitadas',
            'Gerente de cuenta dedicado',
            'Soporte telefónico 24/7',
            'Integraciones personalizadas',
            'Garantía SLA',
          ],
        },
      },
    },
    common: {
      learnMore: 'Más información',
      getStarted: 'Comenzar',
      contactUs: 'Contáctanos',
      perMonth: '/mes',
      custom: 'Personalizado',
    },
  },
};
