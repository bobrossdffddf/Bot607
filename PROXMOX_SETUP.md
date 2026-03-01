# Proxmox Debian 13 Setup Guide

1. **Install Node.js 20+**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install PM2**:
   ```bash
   sudo npm install -g pm2
   ```

3. **Clone and Install**:
   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   npm install
   ```

4. **Environment Variables**:
   Create a `.env` file with:
   ```
   DISCORD_TOKEN=your_token_here
   PORT=5000
   ```

5. **Start with PM2**:
   ```bash
   # Build the project first
   npm run build
   # Start with PM2
   pm2 start "npm run dev" --name "discord-bot"
   pm2 save
   pm2 startup
   ```

6. **Updating**:
   The bot command `?restart git` runs `git pull && (pm2 restart all || npm run dev)`. Ensure your SSH keys or credentials are saved so `git pull` doesn't hang for a password.

### Troubleshooting "pm2: not found"
If you get this error on your server, it means PM2 isn't installed or isn't in your PATH. Run `sudo npm install -g pm2` to fix it.

### Troubleshooting "EADDRINUSE"
This means something is already running on port 5000. Use `pm2 kill` or `fuser -k 5000/tcp` to stop the old process before starting a new one.

### Troubleshooting Slash Commands
If `/business_offline` with the `business` option doesn't show up, wait a few minutes for Discord's cache to update, or kick and re-invite the bot. I've renamed the option to `business` to avoid conflicts.

### Troubleshooting "ready" vs "clientReady"
The code has been updated to use `clientReady` to resolve the deprecation warning.
