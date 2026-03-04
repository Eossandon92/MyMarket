from app import app, db
from api.models import User

with app.app_context():
    email = "esteban.ossandon20@gmail.com"
    user = User.query.filter_by(email=email).first()
    if user:
        user.role = "superadmin"
        db.session.commit()
        print(f"User {email} successfully promoted to superadmin.")
    else:
        print(f"User {email} not found.")
