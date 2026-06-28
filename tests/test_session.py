from sqlalchemy import text

from app.database.session import SessionLocal

print("=" * 50)
print("Testing Database Session")
print("=" * 50)

db = SessionLocal()

result = db.execute(text("SELECT current_database();"))

print(result.scalar())

db.close()

print("=" * 50)
print("Database Session OK")