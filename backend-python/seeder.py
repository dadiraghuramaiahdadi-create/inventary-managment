import datetime
import random
import logging
from sqlalchemy.orm import Session

from db_models import User, Category, Supplier, Product, StockTransaction, PurchaseOrder, PurchaseOrderItem
from auth import hash_password

logger = logging.getLogger("inveniq.seeder")

def seed_database_if_empty(db: Session):
    """Populates InvenIQ database with rich enterprise mock data on startup if not already seeded."""
    if db.query(User).count() > 0:
        logger.info("Database already seeded. Skipping initial data population.")
        return

    logger.info("Populating InvenIQ database with rich enterprise mock data...")

    # 1. Seed Users
    admin = User(
        username="admin",
        password=hash_password("admin123"),
        email="admin@inveniq.io",
        full_name="System Administrator",
        role="ADMIN",
        enabled=True
    )
    manager = User(
        username="manager",
        password=hash_password("manager123"),
        email="manager@inveniq.io",
        full_name="Operations Manager",
        role="MANAGER",
        enabled=True
    )
    staff = User(
        username="staff",
        password=hash_password("staff123"),
        email="staff@inveniq.io",
        full_name="Warehouse Staff",
        role="STAFF",
        enabled=True
    )
    db.add_all([admin, manager, staff])
    db.commit()

    # 2. Seed Categories
    cat_defs = [
        ("Electronics", "Consumer and commercial electronics and digital devices"),
        ("Computer Accessories", "Keyboards, mice, webcams, docks, and desktop accessories"),
        ("Networking Hardware", "Routers, switches, access points, and enterprise cabling"),
        ("Audio & Video", "Monitors, studio microphones, headsets, and display hardware"),
        ("Office Supplies", "Workplace ergonomic furniture, organizers, and stationery"),
        ("Storage & Peripherals", "External SSDs, NVMe drives, USB flash storage, and enclosures")
    ]
    categories = {}
    for name, desc in cat_defs:
        c = Category(name=name, description=desc)
        db.add(c)
        db.commit()
        db.refresh(c)
        categories[name] = c

    # 3. Seed Suppliers
    sup_defs = [
        ("TechGlobal Distributors", "Marcus Vance", "marcus@techglobal.com", "+1-555-0192", "452 Industrial Blvd, Austin, TX", 5),
        ("Apex Component Corp", "Elena Rostova", "elena@apexcomponents.com", "+1-555-0144", "882 Tech Park Way, San Jose, CA", 8),
        ("Silicon Valley Logistics", "David Chen", "dchen@svlogistics.com", "+1-555-0187", "120 Silicon Ave, Fremont, CA", 4),
        ("Metro Office Supplies", "Sarah Jenkins", "s.jenkins@metrooffice.com", "+1-555-0131", "300 Commerce Way, Chicago, IL", 3),
        ("Prime Wholesale Ltd", "Vikram Patel", "vpatel@primewholesale.com", "+1-555-0115", "710 Trade Center Dr, Seattle, WA", 10)
    ]
    suppliers = {}
    for name, contact, email, phone, addr, lead_time in sup_defs:
        s = Supplier(
            name=name,
            contact_person=contact,
            email=email,
            phone=phone,
            address=addr,
            lead_time_days=lead_time
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        suppliers[name] = s

    # 4. Seed 42 Products
    p_defs = [
        # SKU, Name, Description, Category, Supplier, Cost, Selling, Qty, Reorder, Unit, Image
        ("COMP-MOU-001", "Logitech MX Master 3S Wireless Mouse", "Ergonomic high-precision performance mouse", "Computer Accessories", "TechGlobal Distributors", 68.00, 99.99, 45, 15, "PCS", "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200"),
        ("COMP-KEY-002", "Keychron Q1 Pro Mechanical Keyboard", "Custom wireless mechanical keyboard with hot-swap switches", "Computer Accessories", "Apex Component Corp", 130.00, 199.00, 18, 10, "PCS", "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200"),
        ("COMP-DOC-003", "CalDigit TS4 Thunderbolt 4 Dock", "18-port enterprise docking station with 98W charging", "Computer Accessories", "Apex Component Corp", 260.00, 399.95, 8, 10, "PCS", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200"),
        ("COMP-CAM-004", "Logitech Brio 4K Pro Webcam", "Ultra HD webcam with HDR and RightLight 3", "Computer Accessories", "TechGlobal Distributors", 115.00, 169.99, 24, 10, "PCS", "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=200"),
        ("COMP-PAD-005", "SteelSeries QcK Heavy XXL Mousepad", "Extra thick gaming and office desk mousepad", "Computer Accessories", "Metro Office Supplies", 14.50, 29.99, 85, 20, "PCS", "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=200"),
        ("COMP-USB-006", "Anker 737 Power Bank 24000mAh", "140W fast-charging portable laptop power bank", "Computer Accessories", "Silicon Valley Logistics", 72.00, 109.99, 5, 12, "PCS", "https://images.unsplash.com/photo-1609592807664-8bcf950c48b2?w=200"),

        ("NET-RTR-001", "Ubiquiti UniFi Dream Machine Pro", "Enterprise security gateway and network console", "Networking Hardware", "Silicon Valley Logistics", 280.00, 379.00, 12, 5, "PCS", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200"),
        ("NET-SWT-002", "Cisco Catalyst 24-Port Gigabit Switch", "Managed L2 switch with PoE+ and SFP uplinks", "Networking Hardware", "Apex Component Corp", 420.00, 599.00, 6, 4, "PCS", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200"),
        ("NET-WAP-003", "UniFi U6 Pro WiFi 6 Access Point", "Dual-band WiFi 6 AP with 5.3 Gbps aggregate throughput", "Networking Hardware", "Silicon Valley Logistics", 110.00, 159.00, 32, 10, "PCS", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200"),
        ("NET-CAB-004", "Cat6 Snagless Patch Cable 10ft (10-Pack)", "Pure copper 550MHz UTP network patch cords", "Networking Hardware", "Prime Wholesale Ltd", 18.00, 32.50, 110, 25, "PACK", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200"),
        ("NET-SFP-005", "10G SFP+ Transceiver Module (SR)", "Multimode 850nm 300m LC fiber transceiver", "Networking Hardware", "Apex Component Corp", 22.00, 45.00, 48, 15, "PCS", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200"),
        ("NET-RAC-006", "Tripp Lite 12U Wall-Mount Server Rack", "Heavy-duty steel network enclosure with lockable door", "Networking Hardware", "Prime Wholesale Ltd", 180.00, 269.99, 4, 3, "PCS", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200"),

        ("DISP-MON-001", "Dell UltraSharp 27\" 4K USB-C Hub Monitor", "IPS Black technology with 100% sRGB and 90W PD", "Audio & Video", "TechGlobal Distributors", 410.00, 589.99, 14, 8, "PCS", "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200"),
        ("DISP-ARM-002", "Ergotron LX Desk Monitor Arm", "Polished aluminum single screen ergonomic mount", "Audio & Video", "Metro Office Supplies", 115.00, 189.95, 22, 10, "PCS", "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200"),
        ("AUD-HDP-003", "Sony WH-1000XM5 Wireless Headphones", "Industry-leading active noise canceling headset", "Audio & Video", "TechGlobal Distributors", 240.00, 398.00, 19, 10, "PCS", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200"),
        ("AUD-MIC-004", "Shure MV7 USB/XLR Podcast Microphone", "Dynamic broadcast microphone with voice isolation", "Audio & Video", "TechGlobal Distributors", 165.00, 249.00, 11, 8, "PCS", "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200"),
        ("AUD-SPK-005", "Audioengine A2+ Wireless Desktop Speakers", "Compact powered Bluetooth stereo bookshelf speakers", "Audio & Video", "Silicon Valley Logistics", 185.00, 269.00, 9, 6, "PAIR", "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=200"),
        ("DISP-CAB-006", "Belkin Ultra HD High Speed HDMI 2.1 Cable", "8K@60Hz and 4K@120Hz Dolby Vision compliant cord", "Audio & Video", "Prime Wholesale Ltd", 16.00, 29.99, 95, 20, "PCS", "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200"),

        ("STRG-SSD-001", "Samsung 990 PRO 2TB PCIe 4.0 NVMe SSD", "Heatsink edition with up to 7,450 MB/s read speed", "Storage & Peripherals", "Silicon Valley Logistics", 115.00, 179.99, 38, 12, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200"),
        ("STRG-EXT-002", "SanDisk 2TB Extreme Portable SSD", "Rugged IP65 NVMe external drive up to 1050MB/s", "Storage & Peripherals", "Silicon Valley Logistics", 95.00, 149.99, 27, 10, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200"),
        ("STRG-NAS-003", "Synology DiskStation DS923+ 4-Bay NAS", "AMD Ryzen quad-core network attached storage server", "Storage & Peripherals", "Apex Component Corp", 430.00, 599.99, 3, 5, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200"),
        ("STRG-HDD-004", "Seagate IronWolf Pro 8TB NAS Internal HDD", "Enterprise 7200 RPM SATA 6Gb/s CMR hard drive", "Storage & Peripherals", "Prime Wholesale Ltd", 145.00, 219.99, 16, 8, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200"),
        ("STRG-ENC-005", "UGREEN M.2 NVMe SSD Enclosure 10Gbps", "Aluminum tool-free external USB-C drive adapter", "Storage & Peripherals", "Silicon Valley Logistics", 13.50, 24.99, 65, 15, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200"),
        ("STRG-USB-006", "Kingston DataTraveler Max 256GB Type-C", "High-speed USB 3.2 Gen 2 flash thumb drive", "Storage & Peripherals", "Prime Wholesale Ltd", 28.00, 49.99, 42, 15, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200"),

        ("ELEC-UPS-001", "APC Smart-UPS 1500VA LCD 120V", "Pure sine wave battery backup surge protector", "Electronics", "Prime Wholesale Ltd", 380.00, 529.00, 7, 5, "PCS", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200"),
        ("ELEC-CHG-002", "Anker Prime 100W GaN Wall Charger", "3-port compact fast charger for MacBook and phones", "Electronics", "Silicon Valley Logistics", 48.00, 79.99, 74, 20, "PCS", "https://images.unsplash.com/photo-1609592807664-8bcf950c48b2?w=200"),
        ("ELEC-STR-003", "Belkin 12-Outlet Commercial Surge Strip", "4320 Joules protection with telephone/coaxial guards", "Electronics", "Metro Office Supplies", 18.50, 34.99, 53, 15, "PCS", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200"),
        ("ELEC-BAT-004", "Eneloop Pro AA Rechargeable Batteries 8-Pk", "2550mAh high-capacity pre-charged Ni-MH cells", "Electronics", "Metro Office Supplies", 22.00, 39.99, 62, 15, "PACK", "https://images.unsplash.com/photo-1609592807664-8bcf950c48b2?w=200"),
        ("ELEC-TST-005", "Klein Tools Digital Multimeter MM400", "Auto-ranging TRMS meter for voltage, current & resistance", "Electronics", "Apex Component Corp", 39.00, 64.95, 15, 6, "PCS", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200"),
        ("ELEC-SDR-006", "Pinecil V2 Smart Portable Soldering Iron", "RISC-V USB-C PD/QC powered precision soldering pen", "Electronics", "Apex Component Corp", 22.50, 39.99, 21, 8, "PCS", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200"),

        ("OFF-CHR-001", "Herman Miller Aeron Ergonomic Chair B", "Fully adjustable posturefit SL graphite office chair", "Office Supplies", "Metro Office Supplies", 980.00, 1495.00, 4, 3, "PCS", "https://images.unsplash.com/photo-1580481077195-c39757754d92?w=200"),
        ("OFF-DSK-002", "Uplift V2 Commercial Standing Desk Frame", "Dual-motor motorized height adjustable electric frame", "Office Supplies", "Metro Office Supplies", 390.00, 599.00, 6, 4, "PCS", "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=200"),
        ("OFF-LMP-003", "BenQ WiT e-Reading LED Desk Lamp", "Curved architectural lamp with auto-dimming sensor", "Office Supplies", "Metro Office Supplies", 140.00, 229.00, 11, 5, "PCS", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200"),
        ("OFF-SHR-004", "Fellowes Powershred 99Ci Cross-Cut Shredder", "18-sheet 100% jam proof heavy-duty office shredder", "Office Supplies", "Metro Office Supplies", 185.00, 289.99, 5, 4, "PCS", "https://images.unsplash.com/photo-1580481077195-c39757754d92?w=200"),
        ("OFF-ORG-005", "Twelve South Curve Stand for MacBook", "Matte black ergonomic desktop laptop riser", "Office Supplies", "TechGlobal Distributors", 31.00, 59.99, 44, 15, "PCS", "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200"),
        ("OFF-MAT-006", "Topo Anti-Fatigue Standing Desk Mat", "Calculated terrain ergonomic comfort mat", "Office Supplies", "Metro Office Supplies", 55.00, 99.00, 17, 8, "PCS", "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=200"),

        # Dead Stock & Slow Movers (Essential for Machine Learning ABC / Velocity Classification)
        ("DEAD-ADP-001", "StarTech USB to PS/2 Keyboard Mouse Adapter", "Legacy peripheral adapter for DIN keyboard and mice", "Computer Accessories", "Prime Wholesale Ltd", 6.00, 14.99, 82, 10, "PCS", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200"),
        ("DEAD-CON-002", "Tripp Lite VGA to DVI-I Gender Changer", "Analog passive converter plug female to male", "Audio & Video", "Prime Wholesale Ltd", 4.20, 9.99, 94, 15, "PCS", "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200"),
        ("DEAD-CBL-003", "Belkin IEEE 1284 Parallel Printer Cable 6ft", "DB25 to Centronics 36 legacy parallel interface", "Office Supplies", "Prime Wholesale Ltd", 8.50, 19.99, 47, 10, "PCS", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200"),
        ("DEAD-FDD-004", "Sabrent External USB 1.44MB 3.5\" Floppy Drive", "Vintage disk reader plug-and-play USB", "Storage & Peripherals", "Apex Component Corp", 15.00, 26.99, 31, 5, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200"),
        ("SLOW-SER-005", "Trendnet RS-232 to RS-422/485 Converter", "Industrial serial port DIN-rail protocol converter", "Networking Hardware", "Apex Component Corp", 45.00, 79.99, 14, 5, "PCS", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200"),
        ("SLOW-TPE-006", "Quantum LTO-8 Ultrium 30TB Data Tape", "High capacity magnetic tape archival media cartridge", "Storage & Peripherals", "Prime Wholesale Ltd", 70.00, 115.00, 16, 6, "PCS", "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200")
    ]

    products = []
    for sku, name, desc, cat_name, sup_name, cost, sell, qty, reorder, unit, img in p_defs:
        p = Product(
            sku=sku,
            name=name,
            description=desc,
            category_id=categories[cat_name].id,
            supplier_id=suppliers[sup_name].id,
            cost_price=cost,
            selling_price=sell,
            quantity=qty,
            reorder_level=reorder,
            unit=unit,
            image_url=img,
            barcode=sku,
            version=1
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        products.append(p)

    # 5. Seed 90 Days of Historical Stock Transactions
    rand = random.Random(42)
    now = datetime.datetime.utcnow()
    transactions = []

    for product in products:
        sku = product.sku
        is_dead = sku.startswith("DEAD-")
        is_slow = sku.startswith("SLOW-")
        is_fast_mover = any(tag in sku for tag in ["MOU", "CAB", "SSD", "CHG"])

        # Initial baseline stock IN 90 days ago
        t0 = now - datetime.timedelta(days=90)
        initial_stock = product.quantity if is_dead else (product.quantity + (150 if is_fast_mover else 40))

        tx0 = StockTransaction(
            product_id=product.id,
            transaction_type="IN",
            quantity_changed=initial_stock,
            before_quantity=0,
            after_quantity=initial_stock,
            reference_number="INIT-STOCK-90D",
            reason="Initial Warehouse Inbound",
            performed_by="SYSTEM",
            timestamp=t0
        )
        transactions.append(tx0)

        if is_dead:
            continue

        current_ledger = initial_stock
        num_movements = 2 if is_slow else (35 if is_fast_mover else 14)

        for i in range(1, num_movements + 1):
            days_ago = 90 - int((i / num_movements) * 88)
            tx_time = now - datetime.timedelta(days=days_ago) + datetime.timedelta(hours=rand.randint(1, 12))

            if current_ledger <= product.reorder_level and rand.random() > 0.4:
                # Replenishment IN
                replenished = (30 + rand.randint(1, 40)) if is_fast_mover else (15 + rand.randint(1, 20))
                before = current_ledger
                current_ledger += replenished
                transactions.append(StockTransaction(
                    product_id=product.id,
                    transaction_type="IN",
                    quantity_changed=replenished,
                    before_quantity=before,
                    after_quantity=current_ledger,
                    reference_number=f"PO-RECEIVE-{1000 + i}",
                    reason="Vendor Replenishment Received",
                    performed_by="manager",
                    timestamp=tx_time
                ))
            else:
                # Sale OUT
                sold = (2 + rand.randint(1, 6)) if is_fast_mover else (1 + rand.randint(1, 3))
                if current_ledger >= sold:
                    before = current_ledger
                    current_ledger -= sold
                    transactions.append(StockTransaction(
                        product_id=product.id,
                        transaction_type="OUT",
                        quantity_changed=-sold,
                        before_quantity=before,
                        after_quantity=current_ledger,
                        reference_number=f"SO-{20000 + rand.randint(1, 80000)}",
                        reason="Customer Order Fulfilled",
                        performed_by="staff",
                        timestamp=tx_time
                    ))

    db.add_all(transactions)
    db.commit()

    # 6. Seed Realistic Purchase Orders
    tech_global = suppliers["TechGlobal Distributors"]
    apex = suppliers["Apex Component Corp"]
    silicon = suppliers["Silicon Valley Logistics"]

    mouse = next(p for p in products if p.sku == "COMP-MOU-001")
    webcam = next(p for p in products if p.sku == "COMP-CAM-004")
    keyboard = next(p for p in products if p.sku == "COMP-KEY-002")
    dock = next(p for p in products if p.sku == "COMP-DOC-003")
    ssd = next(p for p in products if p.sku == "STRG-SSD-001")

    # PO 1: RECEIVED
    po1 = PurchaseOrder(
        order_number="PO-2026-001",
        supplier_id=tech_global.id,
        status="RECEIVED",
        order_date=datetime.date.today() - datetime.timedelta(days=20),
        expected_delivery_date=datetime.date.today() - datetime.timedelta(days=15),
        received_date=datetime.date.today() - datetime.timedelta(days=14),
        subtotal=float(mouse.cost_price * 20 + webcam.cost_price * 10),
        tax_amount=float((mouse.cost_price * 20 + webcam.cost_price * 10) * 0.08),
        total_amount=float((mouse.cost_price * 20 + webcam.cost_price * 10) * 1.08),
        notes="Quarterly restocking for high-demand peripherals",
        created_by="admin"
    )
    db.add(po1)
    db.commit()
    db.refresh(po1)

    poi1_1 = PurchaseOrderItem(
        purchase_order_id=po1.id,
        product_id=mouse.id,
        quantity_ordered=20,
        quantity_received=20,
        unit_price=float(mouse.cost_price),
        line_total=float(mouse.cost_price * 20)
    )
    poi1_2 = PurchaseOrderItem(
        purchase_order_id=po1.id,
        product_id=webcam.id,
        quantity_ordered=10,
        quantity_received=10,
        unit_price=float(webcam.cost_price),
        line_total=float(webcam.cost_price * 10)
    )
    db.add_all([poi1_1, poi1_2])

    # PO 2: APPROVED
    po2 = PurchaseOrder(
        order_number="PO-2026-002",
        supplier_id=apex.id,
        status="APPROVED",
        order_date=datetime.date.today() - datetime.timedelta(days=4),
        expected_delivery_date=datetime.date.today() + datetime.timedelta(days=4),
        subtotal=float(keyboard.cost_price * 15 + dock.cost_price * 5),
        tax_amount=float((keyboard.cost_price * 15 + dock.cost_price * 5) * 0.08),
        total_amount=float((keyboard.cost_price * 15 + dock.cost_price * 5) * 1.08),
        notes="Standard replenishment order",
        created_by="manager"
    )
    db.add(po2)
    db.commit()
    db.refresh(po2)

    poi2_1 = PurchaseOrderItem(
        purchase_order_id=po2.id,
        product_id=keyboard.id,
        quantity_ordered=15,
        quantity_received=0,
        unit_price=float(keyboard.cost_price),
        line_total=float(keyboard.cost_price * 15)
    )
    poi2_2 = PurchaseOrderItem(
        purchase_order_id=po2.id,
        product_id=dock.id,
        quantity_ordered=5,
        quantity_received=0,
        unit_price=float(dock.cost_price),
        line_total=float(dock.cost_price * 5)
    )
    db.add_all([poi2_1, poi2_2])

    # PO 3: PENDING
    po3 = PurchaseOrder(
        order_number="PO-2026-003",
        supplier_id=silicon.id,
        status="PENDING",
        order_date=datetime.date.today() - datetime.timedelta(days=1),
        expected_delivery_date=datetime.date.today() + datetime.timedelta(days=6),
        subtotal=float(ssd.cost_price * 25),
        tax_amount=float(ssd.cost_price * 25 * 0.08),
        total_amount=float(ssd.cost_price * 25 * 1.08),
        notes="High-performance SSD stock replenishment",
        created_by="staff"
    )
    db.add(po3)
    db.commit()
    db.refresh(po3)

    poi3_1 = PurchaseOrderItem(
        purchase_order_id=po3.id,
        product_id=ssd.id,
        quantity_ordered=25,
        quantity_received=0,
        unit_price=float(ssd.cost_price),
        line_total=float(ssd.cost_price * 25)
    )
    db.add(poi3_1)

    db.commit()
    logger.info("InvenIQ database seeding complete! 3 Users, 6 Categories, 5 Suppliers, 42 Products, 90-day transactions created.")
