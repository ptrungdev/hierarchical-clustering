"""Transaction dataset generator — produces realistic ecommerce data."""
import random
from datetime import datetime, timedelta

# Product catalog with min/max price ranges
PRODUCTS = [
    ("Wireless Bluetooth Headphones", 49.99, 89.99),
    ("USB-C Fast Charger", 19.99, 39.99),
    ("Smartphone Case", 9.99, 24.99),
    ("Laptop Stand", 34.99, 79.99),
    ("Mechanical Keyboard", 59.99, 149.99),
    ("Wireless Mouse", 24.99, 59.99),
    ("Portable SSD 1TB", 69.99, 129.99),
    ("Noise Cancelling Earbuds", 79.99, 159.99),
    ("Smart Watch Band", 14.99, 34.99),
    ("LED Desk Lamp", 29.99, 54.99),
    ("Cotton T-Shirt", 12.99, 29.99),
    ("Denim Jacket", 49.99, 99.99),
    ("Running Shoes", 59.99, 129.99),
    ("Yoga Mat", 19.99, 39.99),
    ("Water Bottle", 14.99, 29.99),
    ("Coffee Maker", 39.99, 89.99),
    ("Throw Pillow", 16.99, 34.99),
    ("Plant Pot Set", 22.99, 44.99),
    ("Board Game", 24.99, 49.99),
    ("Cookbook", 19.99, 34.99),
]

COUNTRIES = [
    "USA", "UK", "Germany", "France", "Canada",
    "Australia", "Japan", "Brazil", "India", "South Korea",
]

# Tier distribution mimics real customer segments
TIER_PARAMS = {
    "champion": {
        "purchase_count_range": (15, 45),
        "quantity_range": (1, 5),
        "date_range_days": 365,
        "price_factor": (0.7, 1.0),
        "country_weights": [0.30, 0.20, 0.15, 0.10, 0.10, 0.08, 0.04, 0.02, 0.01, 0.00],
    },
    "loyal": {
        "purchase_count_range": (8, 25),
        "quantity_range": (1, 4),
        "date_range_days": 330,
        "price_factor": (0.5, 0.85),
        "country_weights": [0.25, 0.18, 0.14, 0.12, 0.09, 0.08, 0.06, 0.05, 0.02, 0.01],
    },
    "potential": {
        "purchase_count_range": (3, 12),
        "quantity_range": (1, 3),
        "date_range_days": 250,
        "price_factor": (0.3, 0.7),
        "country_weights": [0.20, 0.15, 0.12, 0.10, 0.10, 0.08, 0.07, 0.08, 0.07, 0.03],
    },
    "at_risk": {
        "purchase_count_range": (1, 6),
        "quantity_range": (1, 2),
        "date_range_days": 180,
        "price_factor": (0.2, 0.5),
        "country_weights": [0.18, 0.12, 0.10, 0.10, 0.08, 0.07, 0.06, 0.12, 0.10, 0.07],
    },
    "lost": {
        "purchase_count_range": (1, 3),
        "quantity_range": (1, 1),
        "date_range_days": 90,
        "price_factor": (0.1, 0.35),
        "country_weights": [0.15, 0.10, 0.08, 0.08, 0.07, 0.06, 0.05, 0.15, 0.15, 0.11],
    },
}

# Tier probability distribution
TIER_DISTRIBUTION = [
    (0.10, "champion"),
    (0.20, "loyal"),
    (0.25, "potential"),
    (0.25, "at_risk"),
    (0.20, "lost"),
]


def _pick_tier() -> str:
    """Return a customer tier based on realistic distribution."""
    r = random.random()
    cumulative = 0.0
    for prob, tier in TIER_DISTRIBUTION:
        cumulative += prob
        if r < cumulative:
            return tier
    return "lost"


def generate_dataset(customer_count: int = 5000) -> list[dict]:
    """
    Generate a realistic transaction dataset.

    Each customer is assigned a tier that controls their:
    - Purchase frequency
    - Spending level
    - Geographic distribution

    Returns a shuffled list of transaction dicts.
    """
    transactions = []
    base_date = datetime(2024, 12, 31)
    invoice_counter = 0

    for i in range(customer_count):
        tier = _pick_tier()
        params = TIER_PARAMS[tier]

        customer_id = f"CUS-{i + 1:05d}"
        purchase_count = random.randint(*params["purchase_count_range"])
        country = random.choices(COUNTRIES, weights=params["country_weights"])[0]

        date_range = params["date_range_days"]
        first_purchase = base_date - timedelta(days=random.randint(0, 365 - date_range))

        for _ in range(purchase_count):
            product, min_price, max_price = random.choice(PRODUCTS)
            low, high = params["price_factor"]
            unit_price = round(random.uniform(min_price * low, max_price * high), 2)
            quantity = random.randint(*params["quantity_range"])

            days_offset = random.randint(0, min(date_range, (i % 365)))
            purchase_date = first_purchase + timedelta(
                days=days_offset,
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )

            invoice_counter += 1
            transactions.append({
                "customer_id": customer_id,
                "invoice_no": f"INV-{2024000 + invoice_counter}",
                "purchase_date": purchase_date.strftime("%Y-%m-%d %H:%M:%S"),
                "quantity": quantity,
                "unit_price": unit_price,
                "total_amount": round(unit_price * quantity, 2),
                "country": country,
                "product_name": product,
            })

    # Shuffle to mimic real log order
    random.shuffle(transactions)
    return transactions
