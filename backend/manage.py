#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Mock MySQLdb with PyMySQL for platform-independent MySQL connection
try:
    import pymysql
    pymysql.install_as_MySQLdb()
    
    # Auto-create MySQL database if it does not exist
    import dotenv
    dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    
    db_name = os.getenv('DB_NAME', 'civicfix')
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', '')
    db_host = os.getenv('DB_HOST', '127.0.0.1')
    db_port = os.getenv('DB_PORT', '3306')
    
    connection = pymysql.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        port=int(db_port),
        charset='utf8mb4'
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        connection.commit()
    finally:
        connection.close()
except Exception as e:
    # Fail silently or print check in case DB is managed manually
    print(f"Auto-database creation check warning: {str(e)}")

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
