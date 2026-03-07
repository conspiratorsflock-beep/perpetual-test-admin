# System Monitoring

## Overview

Monitor the health and performance of your platform's infrastructure and services.

## Health Checks

The System Health page monitors:

### Supabase Database
- Connection status
- Query latency
- Degraded if latency > 1000ms

### Clerk Auth
- API connectivity
- Authentication status
- Degraded if latency > 2000ms

### Stripe API
- Payment processing status
- API connectivity
- Degraded if latency > 3000ms

### Main App
- HTTP health endpoint (`/api/health`)
- Response time
- Error rate

## Running Checks

Click **Run Check** to execute health checks immediately. Results are stored in the database for historical tracking.

## Alerting

When a service is marked as **down**, an audit log entry is automatically created with:
- Service name
- Error message
- Timestamp

## System Logs

View aggregated error logs from:
- API errors
- Database errors
- Authentication errors
- Custom application errors

### Log Levels

- **Error**: Critical failures requiring attention
- **Warning**: Issues that don't break functionality
- **Info**: Informational events

### Filtering

Filter logs by:
- Error type
- Date range
- User ID
- Organization ID
- Path/endpoint

### Export

Export logs to CSV for:
- External analysis
- Compliance reporting
- Incident investigation

### Purging

Click **Purge Old** to delete logs older than 30 days. This helps manage database size.

## Best Practices

1. **Run health checks regularly**: At least once per day
2. **Monitor trends**: Watch for increasing latency
3. **Set up external monitoring**: Use Pingdom, UptimeRobot, etc.
4. **Review logs weekly**: Look for patterns and recurring issues
5. **Export before purging**: Keep archives of important logs

## Troubleshooting

### Service shows as "down"
1. Check the service's status page
2. Verify API keys are valid
3. Check network connectivity
4. Review recent deployments

### High latency
1. Check for database query optimization
2. Review recent code changes
3. Monitor resource usage
4. Consider scaling
