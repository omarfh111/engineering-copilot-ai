from sqlalchemy import text

from app.database.postgres import engine

print("=" * 50)

print("Testing PostgreSQL Engine")

print("=" * 50)

with engine.connect() as connection:

    result = connection.execute(text("SELECT version();"))

    print(result.scalar())

print("=" * 50)

print("PostgreSQL Engine OK")