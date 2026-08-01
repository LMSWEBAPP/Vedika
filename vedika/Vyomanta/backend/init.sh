#!/bin/bash

# Exit immediately if any command fails
set -e

if [ -d "/home/frappe/frappe-bench/apps/frappe" ]; then
    echo "Bench already exists, starting bench..."
    cd frappe-bench
    
    # Update site config with remote DB credentials if configured
    if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "mariadb" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
        echo "Updating site lms.localhost configuration with remote TiDB database details..."
        mkdir -p sites/lms.localhost
        cat <<EOF > sites/lms.localhost/site_config.json
{
 "db_host": "$DB_HOST",
 "db_port": $DB_PORT,
 "db_name": "$DB_NAME",
 "db_password": "$DB_PASSWORD",
 "db_type": "mariadb",
 "db_user": "$DB_USER",
 "db_ssl_ca": "/etc/ssl/certs/ca-certificates.crt",
 "encryption_key": "8kAnz-VWclIhMghrU8g_39K2setlLtLR_9PJL1BjRxY=",
 "allow_cors": "http://localhost:3000",
 "session_cookie_samesite": "None"
}
EOF
        bench use lms.localhost
    fi
    
    # Run patches on start to ensure latest updates
    python3 /workspace/patch_schemas.py || true
    python3 /workspace/patch_statement_time.py || true
    python3 /workspace/patch_api.py || true
    
    # Check if migration has already been completed once
    MIGRATE_LOCK="sites/lms.localhost/.migrated"
    if [ ! -f "$MIGRATE_LOCK" ]; then
        echo "First time database connection setup: Running database migrations to sync schemas..."
        bench --site lms.localhost migrate
        
        echo "Bootstrapping student and admin users..."
        bench --site lms.localhost execute "exec(open('/workspace/create_students.py').read())"
        bench --site lms.localhost execute "exec(open('/workspace/grant_question_perm.py').read())"
        
        # Create lock file after successful completion
        touch "$MIGRATE_LOCK"
        echo "Migration and seeding locked. Future restarts will bypass this step."
    else
        echo "Database has already been migrated. Skipping bench migrate. (Delete $MIGRATE_LOCK to force)."
    fi
    # Restore Procfile web service to default (no host arguments, only port)
    sed -i 's/bench serve.*/bench serve --port 8000/g' ./Procfile
    
    # Consolidate background workers to run in a single process (saves ~160MB+ RAM)
    if grep -q "worker_" ./Procfile; then
        sed -i '/worker_/d' ./Procfile
        echo "worker: bench worker --queue short,default,long" >> ./Procfile
    fi
    
    # Remove socketio from Procfile
    sed -i '/socketio/d' ./Procfile
    
    # Install queue worker dependencies
    ./env/bin/pip install pypdf boto3 pymysql python-Levenshtein || true
    ./env/bin/pip cache purge || true
    
    # Start the background queue worker (supports scaling via env var)
    CONCURRENCY=${QUEUE_WORKER_CONCURRENCY:-2}
    echo "Starting $CONCURRENCY background queue workers..."
    for i in $(seq 1 $CONCURRENCY); do
        ./env/bin/python /workspace/queue_worker.py &
    done
    
    # Rotate logs exceeding 50MB to preserve crash trail
    find logs/ sites/*/logs/ -name "*.log" -size +50M 2>/dev/null | while read -r logfile; do
        echo "Rotating large log file: $logfile"
        mv "$logfile" "$logfile.1" 2>/dev/null || true
        truncate -s 0 "$logfile" 2>/dev/null || true
    done
    
    bench start
    exit 0
fi

echo "Creating new bench..."

USE_REMOTE_DB=0
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "mariadb" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    USE_REMOTE_DB=1
fi

if [ "$USE_REMOTE_DB" -eq 1 ]; then
    echo "Using remote database: $DB_HOST. Skipping local MariaDB readiness check."
else
    # Wait for MariaDB to be fully ready
    echo "Waiting for MariaDB database to be ready..."
    python3 -c "
import socket
import time
while True:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            s.connect(('mariadb', 3306))
            print('MariaDB is up!')
            break
    except Exception:
        print('Waiting for MariaDB to start...')
        time.sleep(2)
"
fi


export PATH="${NVM_DIR}/versions/node/v${NODE_VERSION_DEVELOP}/bin/:${PATH}"

# Initialize the main bench framework
bench init --skip-redis-config-generation frappe-bench

cd frappe-bench

# Use containers instead of localhost for services
bench set-mariadb-host mariadb
bench set-redis-cache-host redis://redis:6379
bench set-redis-queue-host redis://redis:6379
bench set-redis-socketio-host redis://redis:6379

# Set global configuration rules (applicable to all sites)
bench set-config -g allow_cors "http://localhost:3000"
bench set-config -g ignore_csrf 1

# Remove redis and watch from Procfile since Docker handles them separately
    sed -i '/redis/d' ./Procfile
    sed -i '/watch/d' ./Procfile

    # Consolidate background workers to run in a single process (saves ~160MB+ RAM)
    sed -i '/worker_/d' ./Procfile
    echo "worker: bench worker --queue short,default,long" >> ./Procfile
    
    # Remove socketio from Procfile
    sed -i '/socketio/d' ./Procfile

# Keep default bench serve --port 8000 (no host modification needed)

# --- HEADLESS APP INSTALLATION (No Frontend Node Modules/Assets) ---

echo "Cloning and registering 'payments' app (headless)..."
git clone https://github.com/frappe/payments.git apps/payments --depth 1
rm -f apps/payments/package.json
./env/bin/pip install -e ./apps/payments

echo "Cloning and registering 'lms' app (headless)..."
git clone https://github.com/frappe/lms.git apps/lms --depth 1
# Remove package.json and frontend folder to completely bypass Vue/yarn installations
rm -rf apps/lms/frontend apps/lms/package.json
./env/bin/pip install -e ./apps/lms

# Re-write sites/apps.txt cleanly with proper newlines so they don't concatenate
printf "frappe\npayments\nlms\n" > sites/apps.txt

# Run patch scripts
echo "Applying custom API, schema, and database patches..."
python3 /workspace/patch_schemas.py
python3 /workspace/patch_statement_time.py
python3 /workspace/patch_api.py

# --- DATABASE SETUP ---

USE_REMOTE_DB=0
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "mariadb" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    USE_REMOTE_DB=1
fi

if [ "$USE_REMOTE_DB" -eq 1 ]; then
    echo "Configuring site lms.localhost to connect to remote TiDB database: $DB_HOST..."
    mkdir -p sites/lms.localhost
    cat <<EOF > sites/lms.localhost/site_config.json
{
 "db_host": "$DB_HOST",
 "db_port": $DB_PORT,
 "db_name": "$DB_NAME",
 "db_password": "$DB_PASSWORD",
 "db_type": "mariadb",
 "db_user": "$DB_USER",
 "db_ssl_ca": "/etc/ssl/certs/ca-certificates.crt",
 "encryption_key": "8kAnz-VWclIhMghrU8g_39K2setlLtLR_9PJL1BjRxY=",
 "allow_cors": "http://localhost:3000",
 "session_cookie_samesite": "None"
}
EOF
    bench use lms.localhost
else
    echo "Configuring site lms.localhost to connect to local MariaDB container..."
    bench new-site lms.localhost \
    --force \
    --mariadb-root-password 123 \
    --admin-password admin \
    --no-mariadb-socket
fi

bench --site lms.localhost install-app payments || true
bench --site lms.localhost install-app lms || true
bench --site lms.localhost set-config developer_mode 1
bench --site lms.localhost set-config allow_cors "http://localhost:3000"
bench --site lms.localhost clear-cache
bench use lms.localhost

# Run database migrations to sync schemas
bench --site lms.localhost migrate || true

# Bootstrap student and admin users
echo "Bootstrapping student and admin users..."
bench --site lms.localhost execute "exec(open('/workspace/create_students.py').read())"
bench --site lms.localhost execute "exec(open('/workspace/grant_question_perm.py').read())"

# Create lock file after successful completion
touch "sites/lms.localhost/.migrated"

# Install queue worker dependencies
./env/bin/pip install pypdf boto3 pymysql python-Levenshtein || true
./env/bin/pip cache purge || true

# Start the background queue worker (supports scaling via env var)
CONCURRENCY=${QUEUE_WORKER_CONCURRENCY:-2}
echo "Starting $CONCURRENCY background queue workers..."
for i in $(seq 1 $CONCURRENCY); do
    ./env/bin/python /workspace/queue_worker.py &
done

# Rotate logs exceeding 50MB to preserve crash trail
find logs/ sites/*/logs/ -name "*.log" -size +50M 2>/dev/null | while read -r logfile; do
    echo "Rotating large log file: $logfile"
    mv "$logfile" "$logfile.1" 2>/dev/null || true
    truncate -s 0 "$logfile" 2>/dev/null || true
done

# Start the headless backend server
bench start
