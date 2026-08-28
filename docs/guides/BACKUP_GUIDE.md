# Regno AI - Versioned Backup System

Complete guide for creating versioned backups of the Regno AI chat application.

## Table of Contents

- [Quick Start](#quick-start)
- [Available Commands](#available-commands)
- [Periodic Backups (Cron Setup)](#periodic-backups-cron-setup)
- [Backup Location](#backup-location)
- [What Gets Backed Up](#what-gets-backed-up)
- [Restoring from Backup](#restoring-from-backup)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

### Interactive Backup (Manual)

```bash
npm run backup
```

This will:
1. Show current version
2. Prompt you to choose version increment (patch/minor/major/skip)
3. Update package.json with new version
4. Create git tag (if in git repo)
5. Create versioned zip file
6. Show backup location and size

### Automated Backup (No Prompts)

```bash
# Backup without version increment
npm run backup:auto

# Backup with patch version increment (0.0.1 -> 0.0.2)
npm run backup:patch

# Backup with minor version increment (0.0.1 -> 0.1.0)
npm run backup:minor

# Backup with major version increment (0.0.1 -> 1.0.0)
npm run backup:major
```

---

## Available Commands

| Command | Description | Version Change | Use Case |
|---------|-------------|----------------|----------|
| `npm run backup` | Interactive backup with prompts | User choice | Manual backups when you want control |
| `npm run backup:auto` | Automated backup, no version change | None | Quick backup, testing |
| `npm run backup:patch` | Automated backup, patch increment | 0.0.1 → 0.0.2 | Bug fixes, small changes |
| `npm run backup:minor` | Automated backup, minor increment | 0.0.1 → 0.1.0 | New features |
| `npm run backup:major` | Automated backup, major increment | 0.0.1 → 1.0.0 | Breaking changes |

---

## Periodic Backups (Cron Setup)

### Option 1: Crontab (Linux/macOS)

Edit your crontab:

```bash
crontab -e
```

Add one of these lines:

```bash
# Daily backup at 2 AM (no version increment)
0 2 * * * cd /disks/disk1/chat && /usr/bin/npm run backup:auto >> /disks/disk1/chat/../backups/cron.log 2>&1

# Daily backup at 2 AM with patch version increment
0 2 * * * cd /disks/disk1/chat && /usr/bin/npm run backup:patch >> /disks/disk1/chat/../backups/cron.log 2>&1

# Weekly backup on Sunday at 3 AM with minor version increment
0 3 * * 0 cd /disks/disk1/chat && /usr/bin/npm run backup:minor >> /disks/disk1/chat/../backups/cron.log 2>&1

# Every 6 hours
0 */6 * * * cd /disks/disk1/chat && /usr/bin/npm run backup:auto >> /disks/disk1/chat/../backups/cron.log 2>&1
```

**Cron Schedule Format:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Option 2: Systemd Timer (Linux)

Create a systemd service:

```bash
sudo nano /etc/systemd/system/regno-backup.service
```

```ini
[Unit]
Description=Regno AI Backup Service
After=network.target

[Service]
Type=oneshot
User=zaeem
WorkingDirectory=/disks/disk1/chat
ExecStart=/usr/bin/npm run backup:auto
StandardOutput=append:/disks/disk1/backups/backup.log
StandardError=append:/disks/disk1/backups/backup.log

[Install]
WantedBy=multi-user.target
```

Create a timer:

```bash
sudo nano /etc/systemd/system/regno-backup.timer
```

```ini
[Unit]
Description=Regno AI Daily Backup Timer
Requires=regno-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable regno-backup.timer
sudo systemctl start regno-backup.timer

# Check status
sudo systemctl status regno-backup.timer
sudo systemctl list-timers --all | grep regno
```

### Option 3: Custom Systemd Timer with Versioning

For weekly minor version bumps + daily no-version backups:

Create two services:

**Daily backup (no version change):**
```bash
sudo nano /etc/systemd/system/regno-backup-daily.service
```

```ini
[Unit]
Description=Regno AI Daily Backup

[Service]
Type=oneshot
User=zaeem
WorkingDirectory=/disks/disk1/chat
ExecStart=/usr/bin/npm run backup:auto
```

```bash
sudo nano /etc/systemd/system/regno-backup-daily.timer
```

```ini
[Unit]
Description=Daily Regno Backup

[Timer]
OnCalendar=daily

[Install]
WantedBy=timers.target
```

**Weekly versioned backup:**
```bash
sudo nano /etc/systemd/system/regno-backup-weekly.service
```

```ini
[Unit]
Description=Regno AI Weekly Versioned Backup

[Service]
Type=oneshot
User=zaeem
WorkingDirectory=/disks/disk1/chat
ExecStart=/usr/bin/npm run backup:minor
```

```bash
sudo nano /etc/systemd/system/regno-backup-weekly.timer
```

```ini
[Unit]
Description=Weekly Regno Versioned Backup

[Timer]
OnCalendar=Sun 03:00

[Install]
WantedBy=timers.target
```

Enable both:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now regno-backup-daily.timer
sudo systemctl enable --now regno-backup-weekly.timer
```

---

## Backup Location

By default, backups are saved to:

```
/disks/disk1/backups/
```

You can change this by setting the `BACKUP_DIR` environment variable:

```bash
BACKUP_DIR=/path/to/backups npm run backup:auto
```

Or add to your `.bashrc` or cron job:

```bash
export BACKUP_DIR="/mnt/external/backups"
```

### Backup Filename Format

```
regno-ai_v{VERSION}_{TIMESTAMP}.zip
```

Example:
```
regno-ai_v0.0.2_20250131_143025.zip
regno-ai_v0.1.0_20250131_150000.zip
```

---

## What Gets Backed Up

### Included:
- All source code (`src/`, `lib/`, `scripts/`)
- Configuration files (`package.json`, `tsconfig.json`, `vite.config.js`)
- Static assets (`static/`)
- Documentation (`.md` files)
- Environment templates (`.env.example`)

### Excluded:
- `node_modules/` - Dependencies (can be reinstalled)
- `.git/` - Git repository (use git for version control)
- `dist/`, `build/`, `.svelte-kit/` - Build artifacts
- `.env`, `.env.local` - Secrets (backup separately)
- Log files (`*.log`)
- Backup files (`*.zip`)
- Cache directories
- IDE settings (`.idea/`, `.vscode/`)

**File size:** Typical backup is 5-15 MB (vs ~500 MB with node_modules)

---

## Restoring from Backup

### 1. Extract the backup:

```bash
cd /disks/disk1
unzip backups/regno-ai_v0.0.2_20250131_143025.zip
```

### 2. Navigate to the extracted directory:

```bash
cd chat
```

### 3. Install dependencies:

```bash
npm install
```

### 4. Configure environment:

```bash
cp .env.example .env
# Edit .env with your settings
nano .env
```

### 5. Start the application:

```bash
npm run dev
```

---

## Advanced Usage

### Manual Script Execution

```bash
# Interactive
bash scripts/backup-versioned.sh

# Automated with patch increment
bash scripts/backup-auto.sh patch

# Automated with custom backup directory
BACKUP_DIR=/mnt/backups bash scripts/backup-auto.sh minor
```

### Backup Retention

The automated script keeps the **10 most recent backups** and deletes older ones.

To change retention:

Edit `scripts/backup-auto.sh` and modify:

```bash
# Keep last 10 backups
ls -t regno-ai_*.zip 2>/dev/null | tail -n +11 | xargs -r rm -f
```

Change `11` to `N+1` to keep N backups.

### Backup to Remote Location

#### Using rsync:

```bash
# After backup, sync to remote server
npm run backup:auto && rsync -avz /disks/disk1/backups/ user@remote:/backups/regno-ai/
```

#### Using cloud storage (rclone):

```bash
# Setup rclone first: https://rclone.org/
npm run backup:auto && rclone copy /disks/disk1/backups/ remote:backup/regno-ai/
```

#### Add to cron:

```bash
0 2 * * * cd /disks/disk1/chat && npm run backup:auto && rsync -avz /disks/disk1/backups/ backup-server:/backups/
```

### Check Backup Integrity

```bash
# Test zip file
unzip -t /disks/disk1/backups/regno-ai_v0.0.2_20250131_143025.zip

# List contents
unzip -l /disks/disk1/backups/regno-ai_v0.0.2_20250131_143025.zip | head -20
```

---

## Troubleshooting

### Permission Denied

```bash
chmod +x scripts/backup-versioned.sh
chmod +x scripts/backup-auto.sh
```

### Cron Not Running

```bash
# Check cron service
sudo systemctl status cron

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Test cron environment
* * * * * env > /tmp/cron-env.txt
```

### Node Not Found in Cron

Add full path to npm in crontab:

```bash
0 2 * * * cd /disks/disk1/chat && /usr/bin/npm run backup:auto
```

Or add to crontab:

```bash
PATH=/usr/local/bin:/usr/bin:/bin
NODE_VERSION_PREFIX=""
```

---

## Best Practices

1. **Version Strategy:**
   - Daily backups: `backup:auto` (no version change)
   - Weekly releases: `backup:minor`
   - Major milestones: `backup:major`

2. **Retention:**
   - Keep 10 local backups
   - Sync weekly to remote/cloud storage
   - Keep monthly archives indefinitely

3. **Monitoring:**
   - Check backup logs regularly
   - Set up alerts for failed backups
   - Verify backups can be restored

4. **Security:**
   - Store `.env` files separately
   - Encrypt backups if containing sensitive data
   - Use secure transfer methods (SSH, encrypted cloud)

---

## Example Cron Setup (Complete)

```bash
# Edit crontab
crontab -e

# Add these lines:

# Daily backup at 2 AM (no version change)
0 2 * * * cd /disks/disk1/chat && /usr/bin/npm run backup:auto >> /disks/disk1/backups/backup.log 2>&1

# Weekly versioned backup on Sunday at 3 AM
0 3 * * 0 cd /disks/disk1/chat && /usr/bin/npm run backup:minor >> /disks/disk1/backups/backup.log 2>&1

# Monthly major version on 1st of month at 4 AM
0 4 1 * * cd /disks/disk1/chat && /usr/bin/npm run backup:major >> /disks/disk1/backups/backup.log 2>&1

# Sync to remote daily at 5 AM
0 5 * * * rsync -avz /disks/disk1/backups/ backup-server:/backups/regno-ai/ >> /disks/disk1/backups/sync.log 2>&1
```

---

## Quick Reference Card

```bash
# Manual backup with prompts
npm run backup

# Daily automated (no version change)
npm run backup:auto

# Weekly automated (minor version bump)
npm run backup:minor

# Check recent backups
ls -lht /disks/disk1/backups/*.zip | head -5

# Restore
unzip /disks/disk1/backups/regno-ai_v0.0.2_*.zip && cd chat && npm install

# Setup daily cron
echo "0 2 * * * cd /disks/disk1/chat && /usr/bin/npm run backup:auto" | crontab -

# View backup logs
tail -f /disks/disk1/backups/backup_*.log
```

---

**Need Help?**

- Check logs in `/disks/disk1/backups/`
- Test scripts manually first
- Verify cron with simple test job
- Check file permissions on scripts directory

**Pro Tip:** Test your restore procedure regularly to ensure backups are valid!
