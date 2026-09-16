# Inventory Database

## 1. Overview

`inventory_db` is a simple inventory management database designed for a CRUD-based application.

The database contains **no sample or seed data**.

After running the SQL schema, the `products` table will exist but will be empty.

The database is designed to support the following operations:

- Create products
- Read/list products
- Read a single product
- Update products
- Delete products
- Search products
- Filter products by category
- Track product quantity
- Track product price
- Track creation and modification dates

### Database Information

| Property | Value |
|---|---|
| Database Name | `inventory_db` |
| Database Engine | MySQL 8.0+ |
| Main Table | `products` |
| Initial Data | None |
| Character Set | `utf8mb4` |
| Storage Engine | InnoDB |

---

# 2. Database Structure

The current database is intentionally simple.

```text
inventory_db
└── products
    ├── id
    ├── name
    ├── category
    ├── quantity
    ├── price
    ├── created_at
    └── updated_at