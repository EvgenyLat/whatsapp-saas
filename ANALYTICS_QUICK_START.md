# Analytics Dashboard Quick Start Guide

## Overview
This guide will help you quickly understand and use the new analytics dashboard system.

## Accessing Analytics

### Main Dashboard
Navigate to: `/dashboard/analytics`

The main dashboard provides an at-a-glance overview of your business:
- **Key Metrics**: Bookings, revenue, customers, conversion rates
- **Visual Charts**: Revenue trends, booking status distribution, day-of-week patterns
- **Recent Activity**: Last 5 bookings and today's upcoming appointments
- **Quick Links**: Navigate to specialized dashboards

### Specialized Dashboards

#### 1. Staff Performance (`/dashboard/analytics/staff`)
**What you'll see:**
- Staff member rankings by revenue and bookings
- Individual performance metrics
- Utilization rates
- Popular services per staff member
- Trend indicators (improving/declining)

**Use cases:**
- Identify top performers for bonuses
- Find underutilized staff
- Optimize scheduling based on peak hours
- Track individual growth trends

#### 2. Service Performance (`/dashboard/analytics/services`)
**What you'll see:**
- Most popular services
- Revenue by service
- Category breakdown
- Growth rates
- Service trends

**Use cases:**
- Identify services to promote
- Find underperforming services to discontinue
- Price optimization opportunities
- Category expansion decisions

#### 3. Revenue Analytics (`/dashboard/analytics/revenue`)
**What you'll see:**
- Total revenue with trends
- Revenue by category/staff/day
- Payment status breakdown
- Financial forecasts
- Key financial metrics

**Use cases:**
- Monthly/quarterly financial reporting
- Budget planning
- Payment collection tracking
- Revenue forecasting

#### 4. Customer Analytics (`/dashboard/analytics/customers`)
**What you'll see:**
- Customer growth trends
- Retention rates
- Customer segmentation (frequency, spending)
- Lifetime value
- Service preferences

**Use cases:**
- Customer retention strategies
- VIP program identification
- Marketing campaign targeting
- Loyalty program planning

#### 5. AI Performance (`/dashboard/analytics/ai`)
**What you'll see:**
- Conversation metrics
- Intent detection success rates
- Language distribution
- Token usage and costs
- Response times

**Use cases:**
- AI optimization
- Cost tracking
- Conversation quality monitoring
- Bot performance improvement

## Key Features

### 1. Date Range Selection
Every dashboard has a date range picker with presets:
- **Today**: Current day's data
- **Last 7 days**: Week overview
- **Last 30 days**: Monthly view (default)
- **Last 90 days**: Quarterly view
- **This month**: Current month to date
- **Last month**: Previous complete month

**How to use:**
1. Click the date range button (top right)
2. Select a preset or choose custom dates
3. Data updates automatically

### 2. Export Functionality
Download your data for offline analysis or reporting.

**How to export:**
1. Navigate to any dashboard
2. Click the "Export" button (top right)
3. File downloads automatically as CSV
4. Open in Excel, Google Sheets, or any spreadsheet app

**Export includes:**
- All visible data for the selected date range
- Properly formatted for spreadsheet applications
- Timestamped filename for easy organization

### 3. Trend Indicators
Visual arrows show performance direction:
- **Green arrow up**: Improving (e.g., +12%)
- **Red arrow down**: Declining (e.g., -8%)
- **Gray line**: Stable (no significant change)

### 4. Interactive Charts
All charts are interactive:
- **Hover**: See exact values
- **Legend**: Click to show/hide data series
- **Tooltips**: Detailed information on hover

## Understanding the Metrics

### Revenue Metrics
- **Total Revenue**: Sum of all booking payments (in dollars)
- **Avg Booking Value**: Revenue ÷ Total bookings
- **Revenue per Customer**: Total revenue ÷ Unique customers
- **Period Comparison**: % change vs previous period

### Booking Metrics
- **Total Bookings**: Number of appointments
- **Conversion Rate**: % of messages that become bookings
- **Cancellation Rate**: % of bookings cancelled
- **Status Distribution**: CONFIRMED, PENDING, COMPLETED, CANCELLED, NO_SHOW

### Staff Metrics
- **Utilization Rate**: Booked hours ÷ Available hours × 100
- **Cancellation Rate**: Cancelled bookings ÷ Total bookings × 100
- **Revenue Generated**: Sum of booking payments for this staff
- **Popular Services**: Most frequently booked services

### Customer Metrics
- **Active Customers**: Customers with bookings in period
- **New Customers**: First-time bookers in period
- **Returning Rate**: % of customers with 2+ bookings
- **Lifetime Value**: Average total revenue per customer
- **Churn Rate**: % of customers who stopped booking

### AI Metrics
- **Success Rate**: % of conversations leading to booking
- **Response Time**: Average AI response latency (milliseconds)
- **Token Usage**: Number of AI tokens consumed
- **Cost**: Total AI processing cost
- **Intent Accuracy**: % of correctly identified intents

## Common Workflows

### Weekly Performance Review
1. Go to **Main Dashboard**
2. Set date range to **Last 7 days**
3. Review key metrics (bookings, revenue, conversion)
4. Check recent bookings for any issues
5. Navigate to **Staff Performance** to review individual performance
6. Export data if needed for team meeting

### Monthly Business Report
1. Go to **Revenue Analytics**
2. Set date range to **Last month**
3. Export revenue data (CSV)
4. Go to **Customer Analytics**
5. Export customer data (CSV)
6. Combine data in Excel/Sheets for presentation
7. Use charts for visual reporting

### Staff Performance Evaluation
1. Go to **Staff Performance**
2. Set date range to evaluation period
3. Review individual metrics:
   - Bookings count
   - Revenue generated
   - Utilization rate
   - Cancellation rate
4. Compare with team averages
5. Export for documentation

### Service Menu Optimization
1. Go to **Service Performance**
2. Set date range to **Last 90 days**
3. Identify top 10 services (by bookings and revenue)
4. Find services with negative growth
5. Review category distribution
6. Make pricing/menu decisions
7. Export for analysis

### Marketing Campaign Planning
1. Go to **Customer Analytics**
2. Review customer segmentation:
   - By frequency (target occasional → regular)
   - By spending (VIP opportunities)
   - By service preference (cross-sell opportunities)
3. Export customer segments
4. Plan targeted campaigns
5. Track results in next period

## Tips & Best Practices

### 1. Regular Monitoring
- Check main dashboard **daily** for overview
- Review detailed dashboards **weekly**
- Perform deep analysis **monthly**

### 2. Trend Analysis
- Compare similar time periods (e.g., Jan 2024 vs Jan 2023)
- Look for patterns by day of week
- Identify seasonal trends

### 3. Data-Driven Decisions
- Use metrics to set goals (e.g., 80% utilization rate)
- Track progress over time
- Make adjustments based on data

### 4. Export Regularly
- Keep monthly exports for historical records
- Build your own trend database
- Share with stakeholders

### 5. Combine Dashboards
- Cross-reference data (e.g., high revenue staff + popular services)
- Look for correlations
- Find optimization opportunities

## Troubleshooting

### "No data available"
**Causes:**
- No bookings in selected date range
- Backend not returning data
- API endpoint not implemented

**Solutions:**
1. Check date range (try last 30 days)
2. Verify you have bookings in the system
3. Contact support if persists

### Charts not loading
**Causes:**
- Slow network connection
- Large dataset
- Browser compatibility

**Solutions:**
1. Refresh the page
2. Try a shorter date range
3. Update your browser

### Export not working
**Causes:**
- Backend export endpoint not implemented
- Browser blocking download
- Permission issues

**Solutions:**
1. Check browser popup blocker
2. Verify you have download permissions
3. Contact support

### Metrics seem incorrect
**Causes:**
- Date range confusion
- Timezone differences
- Data sync issues

**Solutions:**
1. Verify date range selection
2. Check if using salon's timezone
3. Refresh the page
4. Contact support with screenshot

## Mobile Access

All dashboards are **fully responsive** and work on mobile devices:
- **Phone**: Stacked layout, scrollable charts
- **Tablet**: 2-column layout
- **Desktop**: Full multi-column layout

**Mobile tips:**
- Rotate to landscape for better chart viewing
- Use date presets instead of custom selection
- Export from desktop for easier file management

## Keyboard Shortcuts

- **Tab**: Navigate between elements
- **Enter**: Activate buttons/links
- **Escape**: Close dropdowns/modals
- **Arrow keys**: Navigate within dropdowns

## Browser Support

**Fully supported:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Mobile browsers:**
- iOS Safari 14+
- Chrome Android 90+

## Privacy & Security

- All data is **salon-specific** (you only see your data)
- **JWT authentication** required for all requests
- Data transmitted over **HTTPS only**
- Export files contain **no sensitive customer data** (unless explicitly included)

## Getting Help

### In-App Help
- Hover over metrics for tooltips
- Charts show detailed info on hover
- Icons indicate metric type

### Documentation
- See `ANALYTICS_DASHBOARD_SUMMARY.md` for technical details
- See `Backend/ANALYTICS_API_SPEC.md` for API documentation

### Support
If you encounter issues:
1. Take a screenshot of the problem
2. Note the date range you're using
3. Describe what you expected vs what you see
4. Contact support with this information

## What's Next?

### Planned Enhancements
- **Real-time updates**: Live data without refresh
- **Custom dashboards**: Build your own view
- **Alerts**: Notifications for key metrics
- **Goals**: Set and track performance goals
- **Forecasting**: AI-powered predictions
- **Comparisons**: Side-by-side period analysis
- **Scheduled reports**: Email reports automatically
- **Mobile app**: Native mobile experience

### Feedback
We're continuously improving! Share your feedback:
- Feature requests
- UI/UX suggestions
- Bug reports
- Data you'd like to see

## Quick Reference

| Dashboard | URL | Best For |
|-----------|-----|----------|
| Main | `/dashboard/analytics` | Daily overview |
| Staff | `/dashboard/analytics/staff` | Performance reviews |
| Services | `/dashboard/analytics/services` | Menu optimization |
| Revenue | `/dashboard/analytics/revenue` | Financial reporting |
| Customers | `/dashboard/analytics/customers` | Marketing planning |
| AI | `/dashboard/analytics/ai` | Bot optimization |

## Success Stories

### Scenario 1: Identifying Underutilized Staff
**Problem**: Some staff had low booking rates
**Solution**: Used Staff Performance dashboard to identify 30% underutilization
**Action**: Adjusted scheduling and marketing
**Result**: 15% increase in overall utilization

### Scenario 2: Menu Optimization
**Problem**: Too many services, confusing customers
**Solution**: Used Service Performance to identify bottom 20%
**Action**: Removed underperforming services
**Result**: 10% increase in average booking value

### Scenario 3: Customer Retention
**Problem**: High one-time customer rate
**Solution**: Used Customer Analytics to segment customers
**Action**: Created loyalty program for occasional customers
**Result**: 25% increase in returning customer rate

---

**Ready to get started?**
Visit `/dashboard/analytics` and explore your business data!
