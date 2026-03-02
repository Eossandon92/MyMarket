import click
from api.models import db, User, Product

"""
In this file, you can add as many commands as you want using the @app.cli.command decorator
Flask commands are usefull to run cronjobs or tasks outside of the API but sill in integration 
with youy database, for example: Import the price of bitcoin every night as 12am
"""
def setup_commands(app):
    
    """ 
    This is an example command "insert-test-users" that you can run from the command line
    by typing: $ flask insert-test-users 5
    Note: 5 is the number of users to add
    """
    @app.cli.command("insert-test-users") # name of our command
    @click.argument("count") # argument of out command
    def insert_test_users(count):
        print("Creating test users")
        for x in range(1, int(count) + 1):
            user = User()
            user.email = "test_user" + str(x) + "@test.com"
            user.password = "123456"
            user.is_active = True
            db.session.add(user)
            db.session.commit()
            print("User: ", user.email, " created.")

        print("All test users created")

    @app.cli.command("insert-test-data")
    def insert_test_data():
        print("Inserting test products...")
        products = [
            {"name": "Coca Cola 3L", "price": 3000, "category": "Bebidas", "stock": 50, "image_url": "https://img.freepik.com/premium-vector/coca-cola-bottle-vector-illustration-isolated-white-background_190024-526.jpg"},
            {"name": "Sprite 3L", "price": 2800, "category": "Bebidas", "stock": 40, "image_url": "https://img.freepik.com/premium-vector/sprite-bottle-vector-illustration-isolated-white-background_190024-525.jpg"},
            {"name": "Papas Lays Clásicas", "price": 1500, "category": "Snacks", "stock": 100, "image_url": "https://img.freepik.com/premium-photo/bag-lays-chips-on-white-background_644342-1243.jpg"},
            {"name": "Doritos Queso", "price": 1600, "category": "Snacks", "stock": 80, "image_url": "https://img.freepik.com/free-vector/package-doritos-chips_1308-111082.jpg"},
            {"name": "Leche Soprole Entera 1L", "price": 1100, "category": "Lácteos", "stock": 30, "image_url": "https://img.freepik.com/free-vector/milk-box-packaging-realistic-design_1284-21397.jpg"},
            {"name": "Queso Gouda Laminado", "price": 2500, "category": "Lácteos", "stock": 25, "image_url": "https://img.freepik.com/free-photo/pieces-delicious-cheese_144627-22002.jpg"},
            {"name": "Pan de Molde Castaño", "price": 2200, "category": "Abarrotes", "stock": 20, "image_url": "https://img.freepik.com/free-photo/bread-slices-white-background_1150-16447.jpg"},
            {"name": "Galletas Tritón", "price": 1000, "category": "Snacks", "stock": 60, "image_url": "https://img.freepik.com/free-photo/chocolate-cookies-with-cream-filling_114579-2041.jpg"},
        ]

        for p in products:
            new_prod = Product(
                name=p["name"],
                price=p["price"],
                category=p["category"],
                stock=p["stock"],
                image_url=p["image_url"]
            )
            db.session.add(new_prod)
        db.session.commit()
        print("Test products inserted successfully.")