import sys
import unittest
from fastapi.testclient import TestClient

from main import app
from database import engine, Base, SessionLocal
from seeder import seed_database_if_empty

class TestInvenIQFullBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Ensure DB tables and seed data exist
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        seed_database_if_empty(db)
        db.close()
        cls.client = TestClient(app)

    def test_01_health_check(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "OPERATIONAL")

    def test_02_auth_login(self):
        # Admin login
        resp = self.client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("accessToken", data)
        self.assertEqual(data["user"]["role"], "ADMIN")
        TestInvenIQFullBackend.admin_token = data["accessToken"]

        # Bad password check
        bad_resp = self.client.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
        self.assertEqual(bad_resp.status_code, 401)

    def test_03_dashboard_summary(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        resp = self.client.get("/api/dashboard/summary", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["totalProducts"], 40)
        self.assertGreater(data["totalCostValue"], 0)
        self.assertGreater(data["totalSellingValue"], 0)

    def test_04_products_pagination_and_scan(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        # Paginated products
        resp = self.client.get("/api/products?page=0&size=10", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["content"]), 10)
        self.assertGreaterEqual(data["totalElements"], 40)

        # Barcode / SKU scan lookup
        scan_resp = self.client.get("/api/products/scan/COMP-MOU-001", headers=headers)
        self.assertEqual(scan_resp.status_code, 200)
        product = scan_resp.json()
        self.assertEqual(product["sku"], "COMP-MOU-001")
        self.assertIn("Logitech", product["name"])

        # Barcode generation
        bc_resp = self.client.get(f"/api/products/{product['id']}/barcode", headers=headers)
        self.assertEqual(bc_resp.status_code, 200)
        bc_data = bc_resp.json()
        self.assertTrue(bc_data["barcodeBase64"].startswith("data:image/png;base64,"))
        self.assertTrue(bc_data["qrCodeBase64"].startswith("data:image/png;base64,"))

    def test_05_stock_adjustment(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        # Fetch initial quantity
        prod_resp = self.client.get("/api/products/scan/COMP-MOU-001", headers=headers)
        init_qty = prod_resp.json()["quantity"]

        # Stock IN 5 units
        adj_resp = self.client.post("/api/stock/adjust", headers=headers, json={
            "sku": "COMP-MOU-001",
            "transactionType": "IN",
            "quantity": 5,
            "reason": "Test Inbound Batch"
        })
        self.assertEqual(adj_resp.status_code, 200)
        adj_data = adj_resp.json()
        self.assertEqual(adj_data["afterQuantity"], init_qty + 5)

        # Stock OUT 2 units
        out_resp = self.client.post("/api/stock/adjust", headers=headers, json={
            "sku": "COMP-MOU-001",
            "transactionType": "OUT",
            "quantity": 2,
            "reason": "Customer Test Order"
        })
        self.assertEqual(out_resp.status_code, 200)
        self.assertEqual(out_resp.json()["afterQuantity"], init_qty + 3)

        # Negative stock protection test: attempt to take more than available
        neg_resp = self.client.post("/api/stock/adjust", headers=headers, json={
            "sku": "COMP-MOU-001",
            "transactionType": "OUT",
            "quantity": 999999,
            "reason": "Excessive request"
        })
        self.assertEqual(neg_resp.status_code, 400)
        self.assertIn("Insufficient stock", neg_resp.json()["detail"])

    def test_06_analytics_product_intelligence(self):
        resp = self.client.get("/api/analytics/intelligence")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertGreater(data["summary"]["totalSkus"], 0)
        self.assertGreater(len(data["items"]), 0)
        # Verify ABC classes are computed
        classes = {item["abcCategory"] for item in data["items"]}
        self.assertTrue("A" in classes or "B" in classes or "C" in classes)

    def test_07_analytics_what_if_simulator(self):
        resp = self.client.post("/api/analytics/simulate", json={
            "demandChangePercent": 25.0,
            "leadTimeChangeDays": 2,
            "priceChangePercent": -5.0,
            "reorderLevelChangePercent": 10.0
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(len(data["timeline"]), 30)

    def test_08_analytics_smart_reorder(self):
        resp = self.client.get("/api/analytics/smart-reorder")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertGreater(data["totalItemsAnalyzed"], 0)

    def test_09_reports_csv_and_pdf(self):
        # CSV export
        csv_resp = self.client.get("/api/reports/products/export-csv")
        self.assertEqual(csv_resp.status_code, 200)
        self.assertEqual(csv_resp.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn("SKU,Name", csv_resp.text)

        # PDF export
        pdf_resp = self.client.get("/api/reports/inventory-valuation/export-pdf")
        self.assertEqual(pdf_resp.status_code, 200)
        self.assertEqual(pdf_resp.headers["content-type"], "application/pdf")
        self.assertTrue(pdf_resp.content.startswith(b"%PDF"))

    def test_10_sockjs_handshake(self):
        resp = self.client.get("/ws/info")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["websocket"])

if __name__ == "__main__":
    unittest.main()
