# Notification Queue - Quick Reference

## 🚀 Quick Start

### Enable Queue (Default)
```bash
# In .env file
ENABLE_NOTIFICATION_QUEUE=true
```

### Check Queue Status
```bash
# Queue length - notifications waiting
redis-cli LLEN notification:queue

# Processing - currently being sent
redis-cli LLEN notification:processing

# Failed - max retries exceeded
redis-cli LLEN notification:failed
```

---

## 📋 API Endpoints (Unchanged)

All endpoints automatically use queue when enabled:

```bash
# Send to authenticated user
POST /api/v1/notifications/send-to-user
Headers: Authorization: Bearer <JWT>
Body: { "title": "...", "body": "...", "data": {...} }

# Send to multiple users
POST /api/v1/notifications/send-to-users
Body: { "userIds": ["id1","id2"], "title": "...", "body": "..." }

# Send to bulk users
POST /api/v1/notifications/send-bulk
Body: { "userIds": [...], "title": "...", "body": "..." }
```

---

## 🔄 How It Works

```
API Request → Redis Queue → Queue Processor → Service 1 → Firebase
     ↓             ↓              ↓                ↓           ↓
  Returns     Persisted      Dequeues         Fetches     Delivers
  queued:     in Redis       one-by-one       FCM tokens  to device
  true
```

---

## 🛡️ Crash Protection

| Crash Scenario | Protection | Recovery |
|----------------|-----------|----------|
| **Service 2 crash** | ✅ Queue survives in Redis | Auto-resume on restart |
| **Service 1 crash** | ✅ Auto-retry (3 times) | Resend after restart |
| **Network issue** | ✅ Retry with backoff | Exponential backoff |
| **Redis crash** | ⚠️ Depends on persistence | Enable AOF/RDB |

---

## 🧪 Test Crash Recovery

```bash
# 1. Send notification
curl -X POST http://localhost:5002/api/v1/notifications/send-to-user \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Crash test"}'

# 2. Verify queued
redis-cli LLEN notification:queue  # Should show 1

# 3. Crash Service 2 (Ctrl+C)

# 4. Verify queue intact
redis-cli LLEN notification:queue  # Should still show 1

# 5. Restart Service 2
npm start

# 6. Verify processed
# Check logs: "✅ Notification sent successfully"
```

---

## 🔧 Troubleshooting

### Notifications stuck in queue?

```bash
# Check Service 1 is running
curl http://localhost:5000/api/v1/notification-service/health

# Check Redis connection
redis-cli ping

# Check queue processor logs
# Look for: "🔄 Processing notification queue..."
```

### High failed count?

```bash
# View failed notifications
redis-cli LRANGE notification:failed 0 -1

# Retry failed notifications
redis-cli RPOPLPUSH notification:failed notification:queue
```

### Queue not enabled?

```bash
# Check environment variable
echo $ENABLE_NOTIFICATION_QUEUE  # Should be 'true'

# Restart service after changing
npm restart
```

---

## 📊 Monitoring Commands

```bash
# Queue stats
redis-cli INFO memory
redis-cli INFO stats

# Watch queue in real-time
watch -n 1 'redis-cli LLEN notification:queue'

# View queue items (non-destructive)
redis-cli LRANGE notification:queue 0 10

# Count by type
redis-cli LLEN notification:queue
redis-cli LLEN notification:processing
redis-cli LLEN notification:failed
```

---

## ⚙️ Configuration

### Minimal (defaults to queue-enabled)
```bash
SERVICE_1_URL=http://localhost:5000
INTERNAL_SERVICE_API_KEY=your_key
```

### Full configuration
```bash
# Queue settings
ENABLE_NOTIFICATION_QUEUE=true
QUEUE_RETRY_MAX_ATTEMPTS=3
QUEUE_RETRY_DELAY_MS=5000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Services
SERVICE_1_URL=http://localhost:5000
INTERNAL_SERVICE_API_KEY=your_key
```

---

## 💡 Key Differences

### Before (Reactive Queue)
```
HTTP Call → Service 1
     ↓
  Fails?
     ↓
  Queue for retry
```
❌ Lost if Service 2 crashes  
❌ Lost if crash during HTTP call

### After (Queue-First)
```
Queue in Redis
     ↓
Queue Processor → Service 1
     ↓
Auto-retry if fails
```
✅ Survives Service 2 crash  
✅ Survives Service 1 crash  
✅ Zero data loss

---

## 🎯 Response Format

### Queue Enabled (Default)
```json
{
  "success": true,
  "message": "Notification queued successfully",
  "queued": true
}
```
Notification processed in background.

### Queue Disabled
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "messageId": "firebase-message-id"
  }
}
```
Notification sent immediately (blocking).

---

## 🔐 Security Notes

- Queue is internal to Service 2
- Service 1 communication uses `x-internal-api-key`
- Users can only send to themselves (JWT auth)
- Admins can send to any user
- Queue items contain no sensitive data (only userIds/titles/bodies)

---

## 📈 Performance

- **Throughput:** ~1000 notifications/minute (depends on Service 1)
- **Latency:** API responds in ~10ms (queue write)
- **Memory:** ~1KB per queued notification
- **Max queue size:** Limited by Redis memory

---

## 🚨 Production Checklist

- [ ] `ENABLE_NOTIFICATION_QUEUE=true` in production .env
- [ ] Redis AOF persistence enabled (`appendonly yes`)
- [ ] Redis runs on separate server (not same as app)
- [ ] Monitor queue length (alert if > 1000)
- [ ] Daily check of failed queue
- [ ] Test crash recovery in staging
- [ ] Backup Redis data regularly
- [ ] Document internal API key securely

---

For detailed documentation, see [NOTIFICATION_QUEUE_ARCHITECTURE.md](./NOTIFICATION_QUEUE_ARCHITECTURE.md)
