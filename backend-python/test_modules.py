import unittest
from fastapi.testclient import TestClient

from main import app
from database import engine, Base, SessionLocal
from seeder import seed_database_if_empty

class TestInvenIQModules(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        seed_database_if_empty(db)
        db.close()
        cls.client = TestClient(app)

        # Login as Admin
        resp = cls.client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        cls.admin_token = resp.json()["accessToken"]
        cls.headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_01_categories_crud(self):
        # 1. Get categories
        get_res = self.client.get("/api/categories", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertGreaterEqual(len(get_res.json()), 6)

        # 2. Create category
        create_res = self.client.post("/api/categories", headers=self.headers, json={
            "name": "Robotics & Automation",
            "description": "Sensors and robotic arms"
        })
        self.assertEqual(create_res.status_code, 201)
        cat_id = create_res.json()["id"]

        # 3. Update category
        update_res = self.client.put(f"/api/categories/{cat_id}", headers=self.headers, json={
            "name": "Robotics & AI Hardware",
            "description": "Updated description"
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["name"], "Robotics & AI Hardware")

        # 4. Delete category
        del_res = self.client.delete(f"/api/categories/{cat_id}", headers=self.headers)
        self.assertEqual(del_res.status_code, 204)

    def test_02_suppliers_crud(self):
        # 1. Get suppliers
        get_res = self.client.get("/api/suppliers", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertGreaterEqual(len(get_res.json()), 5)

        # 2. Create supplier
        create_res = self.client.post("/api/suppliers", headers=self.headers, json={
            "name": "Global Chipworks",
            "contactPerson": "Alice Smith",
            "email": "alice@chipworks.com",
            "phone": "+1-555-8899",
            "address": "400 Silicon Way",
            "leadTimeDays": 6
        })
        self.assertEqual(create_res.status_code, 201)
        sup_id = create_res.json()["id"]

        # 3. Update supplier
        up_res = self.client.put(f"/api/suppliers/{sup_id}", headers=self.headers, json={
            "name": "Global Chipworks Inc",
            "contactPerson": "Alice Smith",
            "email": "alice@chipworks.com",
            "phone": "+1-555-8899",
            "address": "400 Silicon Way",
            "leadTimeDays": 5
        })
        self.assertEqual(up_res.status_code, 200)
        self.assertEqual(up_res.json()["name"], "Global Chipworks Inc")

        # 4. Delete supplier
        del_res = self.client.delete(f"/api/suppliers/{sup_id}", headers=self.headers)
        self.assertEqual(del_res.status_code, 204)

    def test_03_purchase_order_lifecycle(self):
        # 1. List POs
        list_res = self.client.get("/api/purchase-orders", headers=self.headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertIn("content", list_res.json())

        # 2. Create new PO
        # Get mouse product
        mouse_res = self.client.get("/api/products/scan/COMP-MOU-001", headers=self.headers)
        mouse = mouse_res.json()
        before_stock = mouse["quantity"]

        po_create_res = self.client.post("/api/purchase-orders", headers=self.headers, json={
            "supplierId": mouse["supplierId"],
            "notes": "Urgent restocking test",
            "items": [
                {
                    "productId": mouse["id"],
                    "quantityOrdered": 10,
                    "unitPrice": mouse["costPrice"]
                }
            ]
        })
        self.assertEqual(po_create_res.status_code, 201)
        po = po_create_res.json()
        self.assertEqual(po["status"], "PENDING")
        po_id = po["id"]

        # 3. Approve PO
        appr_res = self.client.post(f"/api/purchase-orders/{po_id}/approve", headers=self.headers)
        self.assertEqual(appr_res.status_code, 200)
        self.assertEqual(appr_res.json()["status"], "APPROVED")

        # 4. Receive PO (should automatically increase stock and add PO_RECEIVE audit log!)
        rcv_res = self.client.post(f"/api/purchase-orders/{po_id}/receive", headers=self.headers)
        self.assertEqual(rcv_res.status_code, 200)
        self.assertEqual(rcv_res.json()["status"], "RECEIVED")

        # Verify stock quantity incremented by 10
        after_prod = self.client.get("/api/products/scan/COMP-MOU-001", headers=self.headers).json()
        self.assertEqual(after_prod["quantity"], before_stock + 10)

    def test_04_users_management(self):
        # 1. List users
        users_res = self.client.get("/api/users", headers=self.headers)
        self.assertEqual(users_res.status_code, 200)
        self.assertGreaterEqual(len(users_res.json()), 3)

        # 2. Create new user
        new_user_res = self.client.post("/api/users", headers=self.headers, json={
            "username": "intern",
            "password": "intern123",
            "email": "intern@inveniq.io",
            "fullName": "Warehouse Intern",
            "role": "STAFF"
        })
        self.assertEqual(new_user_res.status_code, 201)
        intern_id = new_user_res.json()["id"]

        # 3. Toggle status
        toggle_res = self.client.patch(f"/api/users/{intern_id}/toggle-status", headers=self.headers)
        self.assertEqual(toggle_res.status_code, 200)
        self.assertFalse(toggle_res.json()["enabled"])

        # 4. Delete user
        del_user_res = self.client.delete(f"/api/users/{intern_id}", headers=self.headers)
        self.assertEqual(del_user_res.status_code, 204)

if __name__ == "__main__":
    unittest.main()
