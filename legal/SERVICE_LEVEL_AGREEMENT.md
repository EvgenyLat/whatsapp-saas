# Service Level Agreement (SLA)

**Last Updated: January 18, 2025**

**Effective Date: January 18, 2025**

---

## 1. Introduction

This Service Level Agreement ("SLA") describes the service availability and performance commitments for the WhatsApp SaaS Platform ("Service"). This SLA applies to paid subscription plans.

---

## 2. Definitions

- **"Availability"**: The Service is operational and accessible
- **"Downtime"**: Periods when the Service is unavailable
- **"Monthly Uptime Percentage"**: (Total Minutes in Month - Downtime Minutes) / Total Minutes in Month × 100%
- **"Service Credit"**: Compensation for not meeting SLA commitments
- **"Scheduled Maintenance"**: Planned downtime with advance notice
- **"Emergency Maintenance"**: Unplanned maintenance for critical issues

---

## 3. Service Availability Commitments

### 3.1 Uptime Guarantee

We commit to the following Monthly Uptime Percentages:

| Plan | Uptime Commitment |
|------|-------------------|
| Starter | 99.5% (3.6 hours downtime/month) |
| Professional | 99.9% (43 minutes downtime/month) |
| Enterprise | 99.95% (22 minutes downtime/month) |

### 3.2 Measurement Period

- Availability is measured monthly (calendar month)
- Calculated from 00:00:00 UTC on the first day to 23:59:59 UTC on the last day
- Measurements are based on our internal monitoring systems

### 3.3 What Counts as Downtime

Downtime includes periods when:
- The Service is completely unavailable
- API returns 5XX errors for > 50% of requests for > 5 consecutive minutes
- Critical features are non-functional (message sending, receiving)
- Dashboard is inaccessible for > 5 consecutive minutes

### 3.4 What Does NOT Count as Downtime

The following are excluded from downtime calculations:

**Scheduled Maintenance:**
- Announced at least 48 hours in advance
- Performed during maintenance windows (see Section 4)
- Limited to 4 hours per month

**Emergency Maintenance:**
- Required for security patches
- Critical bug fixes
- Limited to 2 hours per month

**Your Responsibility:**
- Issues caused by your code or configuration
- Network issues on your end
- Browser or device compatibility issues
- Exceeding rate limits or plan quotas

**Third-Party Issues:**
- WhatsApp Business API unavailability
- AWS infrastructure failures (covered by AWS SLA)
- Internet connectivity failures
- DNS resolution failures

**Force Majeure:**
- Natural disasters
- War or terrorism
- Government actions
- Pandemics
- Other events beyond our control

**Beta Features:**
- Features marked as "Beta" or "Experimental"
- Preview features

---

## 4. Scheduled Maintenance

### 4.1 Maintenance Windows

**Primary Window:**
- Sundays, 02:00 - 06:00 UTC
- Monthly scheduled maintenance

**Secondary Window:**
- Weekdays, 02:00 - 04:00 UTC
- Emergency maintenance if needed

### 4.2 Advance Notice

We provide notice via:
- Email to account administrators (48+ hours)
- Status page announcement (48+ hours)
- In-app notification (24+ hours)

### 4.3 Maintenance Duration

- Regular maintenance: Maximum 2 hours
- Major upgrades: Maximum 4 hours
- Emergency maintenance: As brief as possible

---

## 5. Performance Commitments

### 5.1 API Response Times

We commit to the following 95th percentile response times:

| Endpoint Type | Target Response Time |
|---------------|---------------------|
| GET requests | < 200ms |
| POST requests (send message) | < 500ms |
| Webhook deliveries | < 100ms |
| Dashboard page loads | < 1 second |

### 5.2 Message Delivery

**Delivery Success Rate:**
- 99.5% of messages delivered successfully
- Measured over rolling 7-day period
- Excludes invalid numbers, blocked users, WhatsApp errors

**Delivery Latency:**
- 95% of messages delivered within 5 seconds
- 99% of messages delivered within 30 seconds
- From API acceptance to WhatsApp delivery

### 5.3 API Rate Limits

Guaranteed rate limits by plan:

| Plan | Requests per Second | Burst |
|------|---------------------|-------|
| Starter | 10 req/s | 50 req |
| Professional | 50 req/s | 250 req |
| Enterprise | 200 req/s | 1,000 req |

### 5.4 Data Storage

**Storage Guarantees:**
- Conversation history: 90 days minimum
- Message attachments: 30 days minimum
- Analytics data: 12 months minimum
- Custom data: Per your configuration

**Backup Frequency:**
- Continuous replication
- Daily snapshots (retained 7 days)
- Weekly snapshots (retained 30 days)

---

## 6. Support Commitments

### 6.1 Response Times

First response time commitments:

**Starter Plan:**
- Critical: 24 hours
- High: 48 hours
- Normal: 72 hours
- Low: 96 hours

**Professional Plan:**
- Critical: 4 hours
- High: 8 hours
- Normal: 24 hours
- Low: 48 hours

**Enterprise Plan:**
- Critical: 1 hour
- High: 2 hours
- Normal: 4 hours
- Low: 8 hours

### 6.2 Support Channels

**Starter:**
- Email support
- Knowledge base
- Community forum

**Professional:**
- Priority email support
- Live chat (business hours)
- Phone support (callbacks)

**Enterprise:**
- 24/7 priority support
- Dedicated account manager
- Emergency hotline

### 6.3 Severity Definitions

**Critical (P1):**
- Complete service outage
- Data loss or corruption
- Security breach
- All users affected

**High (P2):**
- Major feature unavailable
- Significant performance degradation
- Multiple users affected

**Normal (P3):**
- Minor feature issues
- Workaround available
- Single user affected

**Low (P4):**
- Cosmetic issues
- Feature requests
- General questions

---

## 7. Service Credits

### 7.1 Eligibility

You are eligible for Service Credits if:
- You have a paid subscription
- Monthly Uptime Percentage is below committed level
- You request credit within 30 days of incident
- You were not in violation of Terms of Service

### 7.2 Credit Calculation

Service Credits are calculated as a percentage of your monthly subscription fee:

**Starter Plan:**
| Monthly Uptime % | Service Credit |
|------------------|----------------|
| < 99.5% to 99.0% | 10% |
| < 99.0% to 95.0% | 25% |
| < 95.0% | 50% |

**Professional Plan:**
| Monthly Uptime % | Service Credit |
|------------------|----------------|
| < 99.9% to 99.0% | 10% |
| < 99.0% to 95.0% | 25% |
| < 95.0% | 50% |

**Enterprise Plan:**
| Monthly Uptime % | Service Credit |
|------------------|----------------|
| < 99.95% to 99.5% | 10% |
| < 99.5% to 99.0% | 25% |
| < 99.0% to 95.0% | 50% |
| < 95.0% | 100% |

### 7.3 Credit Limitations

- Maximum credit: 100% of monthly subscription fee
- Credits cannot be exchanged for cash
- Credits applied to next month's invoice
- Credits do not extend subscription term
- Credits are your sole remedy for downtime

### 7.4 How to Request Credits

1. Submit request within 30 days of incident
2. Email: sla-credits@example.com
3. Include: Account ID, date/time of downtime, description
4. We will verify and respond within 10 business days
5. Approved credits applied to next invoice

---

## 8. Incident Response

### 8.1 Status Communication

We communicate service status via:
- **Status Page**: status.example.com (real-time updates)
- **Email Notifications**: For major incidents
- **Twitter**: @examplestatus
- **RSS Feed**: status.example.com/rss

### 8.2 Incident Severity Levels

**Severity 1 (Critical):**
- Complete service outage
- Updates every 30 minutes
- Executive involvement

**Severity 2 (Major):**
- Significant degradation
- Updates every hour
- Engineering team involved

**Severity 3 (Minor):**
- Minor issues affecting small subset
- Updates every 4 hours
- Standard response

### 8.3 Post-Incident Review

For Severity 1 and 2 incidents:
- Publish post-mortem within 5 business days
- Include: Timeline, root cause, resolution, prevention
- Available on status page

### 8.4 Escalation

If you need to escalate an issue:
- Email: escalations@example.com
- Include: Ticket number, impact, urgency
- Response within 1 hour (Enterprise), 4 hours (Professional)

---

## 9. Monitoring and Transparency

### 9.1 Real-Time Monitoring

We monitor:
- API endpoint availability and response times
- Database performance and connectivity
- Message delivery success rates
- Error rates and exceptions
- Infrastructure health

### 9.2 Status Page

Our public status page shows:
- Current system status (operational, degraded, outage)
- Historical uptime data (90 days)
- Scheduled maintenance
- Ongoing incidents and updates
- Performance metrics

### 9.3 Uptime Reports

Available in your dashboard:
- Monthly uptime percentage
- Downtime incidents and duration
- API performance metrics
- Message delivery statistics
- Export to PDF or CSV

---

## 10. SLA Exceptions

### 10.1 Beta Features

- Beta features are excluded from SLA
- Provided "AS IS" without guarantees
- May be discontinued at any time

### 10.2 Free Trials

- Free trial accounts are excluded from SLA
- No service credits available
- Best-effort availability

### 10.3 Suspended Accounts

- Accounts suspended for violations are excluded
- SLA does not apply during suspension period

---

## 11. SLA Modifications

### 11.1 Changes to SLA

We may modify this SLA:
- With 30 days' advance notice
- Notice via email and status page
- Changes apply at next renewal
- Continued use constitutes acceptance

### 11.2 Plan-Specific SLAs

Enterprise customers may negotiate custom SLAs including:
- Higher uptime commitments (99.99%)
- Faster response times
- Dedicated infrastructure
- Custom performance metrics

Contact sales@example.com for custom SLA options.

---

## 12. Disclaimers

### 12.1 Third-Party Dependencies

We depend on third-party services:
- WhatsApp Business API (Meta)
- AWS infrastructure
- Payment processors
- DNS providers

We cannot guarantee their availability. We will work diligently to minimize impact of third-party outages.

### 12.2 Best Efforts

While we commit to the targets in this SLA, we cannot guarantee 100% uptime. We will use commercially reasonable efforts to meet our commitments.

### 12.3 Sole Remedy

Service Credits are your sole and exclusive remedy for our failure to meet SLA commitments. We are not liable for any other damages resulting from downtime.

---

## 13. Contact Information

**For SLA-related questions:**
Email: sla@example.com

**For service credit requests:**
Email: sla-credits@example.com

**For status updates:**
Status Page: status.example.com

**For escalations:**
Email: escalations@example.com

**Support:**
Email: support@example.com
Phone: [Support Number]

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 18, 2025 | Initial version |

---

**This SLA is part of your subscription agreement. By continuing to use the Service, you acknowledge and agree to these service level commitments.**
