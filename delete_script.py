from api.models import db
from sqlalchemy import text

try:
    db.session.execute(text("TRUNCATE TABLE product, category CASCADE;"))
    db.session.commit()
    print("✅ Tablas category y product eliminadas con CASCADE.")
except Exception as e:
    print(f"❌ Error: {e}")
