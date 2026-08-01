#!/bin/bash
set -e

# Optimize memory usage for constrained environments (512MB RAM)
export MALLOC_ARENA_MAX=2

# Start local Redis server (used inside the container for caching & queues)
echo "Starting local Redis server..."
redis-server --daemonize yes

until redis-cli ping | grep -q PONG; do
  echo "Waiting for local Redis..."
  sleep 1
done
echo "Local Redis is up and running."

# Start the dummy web server on port 8000 in the background to satisfy Render's port scan immediately
echo "Starting dummy server on port 8000..."
python3 /home/frappe/dummy_server.py &
DUMMY_PID=$!

# Wait for the cloud MySQL/MariaDB database
echo "Waiting for Cloud Database (${DB_HOST}:${DB_PORT})...."
python3 -c "
import socket
import time
import os
import sys

host = os.environ.get('DB_HOST')
port = int(os.environ.get('DB_PORT', '3306'))

if not host:
    print('Error: DB_HOST environment variable is not defined.')
    sys.exit(1)

while True:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2)
            s.connect((host, port))
            print('Cloud DB is reachable!')
            break
    except Exception as e:
        print(f'Waiting for Cloud DB at {host}:{port}... Details: {e}')
        time.sleep(3)
"

cd /home/frappe/frappe-bench

# Add db_ssl_ca configuration to common_site_config.json so all connections use TLS
if [ -f "sites/common_site_config.json" ]; then
    python3 -c "
import json
path = 'sites/common_site_config.json'
with open(path, 'r') as f:
    config = json.load(f)
config['db_ssl_ca'] = '/etc/ssl/certs/ca-certificates.crt'
with open(path, 'w') as f:
    json.dump(config, f, indent=4)
"
fi

# Apply environment configurations dynamically
bench set-mariadb-host "$DB_HOST"
bench set-config -g db_port "$DB_PORT"
bench set-config -g allow_cors "${FRONTEND_URL:-*}"
bench set-config -g ignore_csrf 1

# Ensure site config and logs directories exist
mkdir -p sites/lms.render/logs

# Write/verify site_config.json configuration so the web server can connect to the DB
cat <<EOF > sites/lms.render/site_config.json
{
 "db_host": "$DB_HOST",
 "db_port": $DB_PORT,
 "db_name": "$DB_NAME",
 "db_password": "$DB_PASSWORD",
 "db_type": "mariadb",
 "db_user": "$DB_USER",
 "db_ssl_ca": "/etc/ssl/certs/ca-certificates.crt",
 "encryption_key": "8kAnz-VWclIhMghrU8g_39K2setlLtLR_9PJL1BjRxY=",
 "allow_cors": "${FRONTEND_URL:-*}",
 "session_cookie_samesite": "None"
}
EOF

# Parse FRONTEND_URL to configure allow_cors correctly (supporting single, multiple comma-separated, or wildcard origins)
python3 -c "
import json, os
path = 'sites/lms.render/site_config.json'
with open(path, 'r') as f:
    config = json.load(f)
frontend_url = os.environ.get('FRONTEND_URL') or '*'
if ',' in frontend_url:
    config['allow_cors'] = [u.strip() for u in frontend_url.split(',') if u.strip()]
else:
    config['allow_cors'] = frontend_url.strip()
with open(path, 'w') as f:
    json.dump(config, f, indent=4)
"

# Route Redis traffic to internal local instance
bench set-redis-cache-host redis://127.0.0.1:6379
bench set-redis-queue-host redis://127.0.0.1:6379
bench set-redis-socketio-host redis://127.0.0.1:6379

# Check if the database has tables and is fully initialized (checks for tabUser table & site_config.json)
echo "Checking database initialization state..."
if ! ./env/bin/python -c "
import pymysql, os, sys
try:
    conn = pymysql.connect(
        host=os.environ.get('DB_HOST'),
        port=int(os.environ.get('DB_PORT', 4000)),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASSWORD'),
        database=os.environ.get('DB_NAME'),
        ssl={'ca': '/etc/ssl/certs/ca-certificates.crt'}
    )
    cursor = conn.cursor()
    cursor.execute('SHOW TABLES LIKE %s', ('tabUser',))
    row = cursor.fetchone()
    conn.close()
    if row and os.path.exists('sites/lms.render/site_config.json'):
        sys.exit(0)
    else:
        sys.exit(1)
except Exception as e:
    print('DB check exception:', e)
    sys.exit(1)
"; then
    echo "Database is incomplete or uninitialized. Wiping tables and folder to ensure a clean non-interactive install..."
    
    # Delete pre-existing site folder to prevent overwrite confirmation prompts
    rm -rf sites/lms.render
    
    # Drop all partially created tables to avoid "Table already exists" conflicts
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --ssl-ca=/etc/ssl/certs/ca-certificates.crt -Nse 'show tables' "$DB_NAME" 2>/dev/null | while read table; do
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --ssl-ca=/etc/ssl/certs/ca-certificates.crt -e "SET FOREIGN_KEY_CHECKS = 0; DROP TABLE \`$table\`;" "$DB_NAME" 2>/dev/null || mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --ssl-ca=/etc/ssl/certs/ca-certificates.crt -e "SET FOREIGN_KEY_CHECKS = 0; DROP SEQUENCE \`$table\`;" "$DB_NAME" 2>/dev/null || true
    done
    
    echo "Wipe complete. Running bench new-site..."
    # Initialize site tables and default users in the pre-existing database
    bench new-site lms.render \
      --db-name "$DB_NAME" \
      --db-user "$DB_USER" \
      --db-password "$DB_PASSWORD" \
      --db-host "$DB_HOST" \
      --db-port "$DB_PORT" \
      --admin-password "${ADMIN_PASSWORD:-admin}" \
      --install-app payments \
      --install-app lms \
      --no-setup-db \
      --force
    
    # Restore SSL and CORS configurations to site_config.json
    bench --site lms.render set-config db_ssl_ca "/etc/ssl/certs/ca-certificates.crt"
    python3 -c "
import json, os
path = 'sites/lms.render/site_config.json'
with open(path, 'r') as f:
    config = json.load(f)
frontend_url = os.environ.get('FRONTEND_URL') or '*'
if ',' in frontend_url:
    config['allow_cors'] = [u.strip() for u in frontend_url.split(',') if u.strip()]
else:
    config['allow_cors'] = frontend_url.strip()
with open(path, 'w') as f:
    json.dump(config, f, indent=4)
"
else
    echo "Database is already seeded. Connecting to existing database tables..."
    python3 -c "
import json, os
path = 'sites/lms.render/site_config.json'
with open(path, 'r') as f:
    config = json.load(f)
frontend_url = os.environ.get('FRONTEND_URL') or '*'
if ',' in frontend_url:
    config['allow_cors'] = [u.strip() for u in frontend_url.split(',') if u.strip()]
else:
    config['allow_cors'] = frontend_url.strip()
with open(path, 'w') as f:
    json.dump(config, f, indent=4)
"
    bench --site lms.render clear-cache
fi

bench use lms.render

# Run database migrations (ensures schemas align with installed codebase)
echo "Running database migrations..."
bench --site lms.render migrate || true

# Bootstrap student users in the database
echo "Bootstrapping student users..."
bench --site lms.render execute "exec(open('/home/frappe/create_students.py').read())" || true
bench --site lms.render execute "exec(open('/home/frappe/grant_question_perm.py').read())" || true

# Install queue worker dependencies if missing
if ! ./env/bin/python -c "import boto3, pymysql, pypdf" 2>/dev/null; then
    echo "Installing queue worker dependencies..."
    ./env/bin/pip install pypdf boto3 pymysql python-Levenshtein --quiet
fi

# Start the background queue worker process (supports scaling via env var)
CONCURRENCY=${QUEUE_WORKER_CONCURRENCY:-2}
echo "Starting $CONCURRENCY background queue workers..."
for i in $(seq 1 $CONCURRENCY); do
    ./env/bin/python /home/frappe/queue_worker.py &
done

# Rotate logs exceeding 50MB to preserve crash trail
find logs/ sites/*/logs/ -name "*.log" -size +50M 2>/dev/null | while read -r logfile; do
    echo "Rotating large log file: $logfile"
    mv "$logfile" "$logfile.1" 2>/dev/null || true
    truncate -s 0 "$logfile" 2>/dev/null || true
done

# Shutdown the dummy server to free port 8000
echo "Stopping dummy server..."
kill -9 $DUMMY_PID 2>/dev/null || true
sleep 1

# Update Procfile port mapping to Render's dynamic binding
sed -i "s/bench serve.*/bench serve --port ${PORT:-8000} --noreload/g" ./Procfile

# Start the server (binds instantly to port 8000/dynamic port)
echo "Starting Frappe Bench web server..."
bench --site lms.render serve --port ${PORT:-8000} --noreload
