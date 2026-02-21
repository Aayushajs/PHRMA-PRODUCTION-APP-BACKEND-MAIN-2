"""
PDF Generator for API Documentation
Generates a professional PDF with all API endpoints, requirements, and examples
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, PageTemplate, Frame
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

def create_api_pdf():
    """Generate API documentation PDF"""
    
    # Create PDF document
    pdf_filename = "API_DOCUMENTATION.pdf"
    mm = 0.0393701  # mm to inch conversion
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
        title="PHRMA API Documentation"
    )
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#FFFFFF'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#FFFFFF'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold',
        backColor=colors.HexColor('#667eea')
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=colors.HexColor('#333333'),
        spaceAfter=10,
        spaceBefore=10,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        textColor=colors.HexColor('#333333'),
        spaceAfter=8,
        alignment=TA_JUSTIFY
    )
    
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#d4d4d4'),
        backColor=colors.HexColor('#1e1e1e'),
        spaceAfter=6,
        fontName='Courier'
    )
    
    # ============ TITLE PAGE ============
    elements.append(Spacer(1, 1.5*inch))
    
    # Background colored box for title
    title_data = [
        [Paragraph("🏥 PHRMA Production App", title_style)],
        [Paragraph("Complete API Documentation", ParagraphStyle(
            'Subtitle', parent=styles['Normal'], fontSize=16, 
            textColor=colors.HexColor('#FFFFFF'), alignment=TA_CENTER
        ))]
    ]
    title_table = Table(title_data, colWidths=[7*inch])
    title_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#667eea')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 20),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
    ]))
    elements.append(title_table)
    
    elements.append(Spacer(1, 0.5*inch))
    
    # Metadata
    metadata_data = [
        ['API Version', 'v2'],
        ['Generated', 'February 17, 2026'],
        ['Status', 'Active'],
        ['Endpoints', '30+']
    ]
    metadata_table = Table(metadata_data, colWidths=[2*inch, 2*inch])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f4ff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd'))
    ]))
    elements.append(metadata_table)
    
    elements.append(PageBreak())
    
    # ============ TABLE OF CONTENTS ============
    elements.append(Paragraph("📑 Table of Contents", heading_style))
    
    toc_items = [
        "1. Authentication & Authorization",
        "2. User Management",
        "3. Medicine Store",
        "4. Admin Store Management",
        "5. Items Management",
        "6. Location Services",
        "7. Unit Management",
        "8. GST Management",
        "9. Orders",
        "10. Payments",
        "11. Notifications",
        "12. Response Formats"
    ]
    
    for item in toc_items:
        elements.append(Paragraph(item, body_style))
        elements.append(Spacer(1, 0.1*inch))
    
    elements.append(PageBreak())
    
    # ============ AUTHENTICATION SECTION ============
    elements.append(Paragraph("🔐 Authentication & Authorization", heading_style))
    
    elements.append(Paragraph("Authentication Methods", subheading_style))
    
    auth_data = [
        ['Method', 'Description', 'Usage'],
        ['JWT Token', 'Bearer token in Authorization header or cookie', 'Authorization: Bearer {token}'],
        ['Gateway Mode', 'Headers from API Gateway', 'X-User-ID, X-User-Role, X-User-Email']
    ]
    auth_table = Table(auth_data, colWidths=[1.5*inch, 2.5*inch, 2.5*inch])
    auth_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    elements.append(auth_table)
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("Required Headers", subheading_style))
    
    headers_data = [
        ['Header', 'Type', 'Description'],
        ['Content-Type', 'application/json', 'Required for POST/PUT requests'],
        ['Authorization', 'Bearer {token}', 'For authenticated endpoints'],
        ['X-User-ID', 'String (UUID)', 'Optional (Gateway mode)'],
        ['X-User-Role', 'admin|user|manager', 'Optional (Gateway mode)']
    ]
    headers_table = Table(headers_data, colWidths=[1.8*inch, 2.2*inch, 2.5*inch])
    headers_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    elements.append(headers_table)
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("User Roles & Permissions", subheading_style))
    
    roles_data = [
        ['Role', 'Permissions', 'Endpoints Access'],
        ['admin', 'Full access, verification, store management', '/admin/*, /units/*, /gst/*'],
        ['user', 'Regular user, can manage own store', '/medicine-store/*, /items/*, /orders/*'],
        ['manager', 'Store manager, manages items and orders', '/items/*, /orders/*, /payments/*']
    ]
    roles_table = Table(roles_data, colWidths=[1.2*inch, 2.5*inch, 2.8*inch])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    elements.append(roles_table)
    
    elements.append(PageBreak())
    
    # ============ USER ENDPOINTS ============
    elements.append(Paragraph("👤 User Management Endpoints", heading_style))
    
    # Login Endpoint
    elements.append(Paragraph("POST /api/v2/user/login", subheading_style))
    elements.append(Paragraph("Authenticate user with email and password. Returns JWT token for subsequent requests.", body_style))
    
    login_request = """Request Body:
- email (String, Required): User email address
- password (String, Required): User password (minimum 8 characters)
- fcmToken (String, Optional): Firebase Cloud Messaging token for push notifications"""
    elements.append(Paragraph(login_request, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    login_json = """{"email": "user@example.com", "password": "securePassword123", "fcmToken": "eO...K1"}"""
    elements.append(Paragraph("Request Example:", subheading_style))
    elements.append(Paragraph(login_json, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    elements.append(Paragraph("Success Response (200 OK):", body_style))
    success_response = """{"status": 200, "message": "Login Successful", "data": {"user": {"_id": "507f1f77bcf86cd799439011", "name": "John Doe", "email": "user@example.com", "phone": "+919876543210", "role": "user", "token": "eyJhbGc...iOiJIUzI1NiIsInR5cCI6IkpXVCJ9"}}"""
    elements.append(Paragraph(success_response, code_style))
    elements.append(Spacer(1, 0.15*inch))
    
    req_box = Paragraph(
        "<b>Requirements:</b><br/>✓ Email must be valid format<br/>✓ Password must be at least 8 characters<br/>✓ User must be registered in the system<br/>✓ Account must not be suspended",
        ParagraphStyle('ReqBox', parent=styles['Normal'], fontSize=9, 
                      textColor=colors.HexColor('#333'), backColor=colors.HexColor('#fff3cd'),
                      leftIndent=10, spaceAfter=10, borderPadding=10)
    )
    elements.append(req_box)
    elements.append(Spacer(1, 0.1*inch))
    
    # Logout Endpoint
    elements.append(Paragraph("POST /api/v2/user/logout", subheading_style))
    elements.append(Paragraph("Logout user by invalidating the JWT token. Clears authentication cookie.", body_style))
    elements.append(Paragraph("<b>Authentication Required:</b> Bearer Token or Valid JWT Cookie", 
                            ParagraphStyle('Auth', parent=styles['Normal'], fontSize=9,
                                          textColor=colors.HexColor('#721c24'), 
                                          backColor=colors.HexColor('#f8d7da'),
                                          leftIndent=10, spaceAfter=10)))
    elements.append(Spacer(1, 0.2*inch))
    
    # Forgot Password
    elements.append(Paragraph("POST /api/v2/user/forgot/password", subheading_style))
    elements.append(Paragraph("Request password reset. Sends OTP to registered email address.", body_style))
    elements.append(Paragraph("Request Body: email (String, Required)", code_style))
    elements.append(Spacer(1, 0.15*inch))
    
    # Verify OTP
    elements.append(Paragraph("POST /api/v2/user/verifyOtp", subheading_style))
    elements.append(Paragraph("Verify OTP sent to email for password reset.", body_style))
    elements.append(Paragraph("Request Body: email (String, Required), otp (String, Required)", code_style))
    elements.append(Spacer(1, 0.15*inch))
    
    # Reset Password
    elements.append(Paragraph("POST /api/v2/user/ResetPassword", subheading_style))
    elements.append(Paragraph("Reset user password after OTP verification. Internal service only.", body_style))
    elements.append(Paragraph("<b>Requires:</b> verifyInternalService Middleware", 
                            ParagraphStyle('Auth', parent=styles['Normal'], fontSize=9,
                                          textColor=colors.HexColor('#721c24'),
                                          backColor=colors.HexColor('#f8d7da'),
                                          leftIndent=10, spaceAfter=10)))
    
    elements.append(PageBreak())
    
    # ============ MEDICINE STORE ============
    elements.append(Paragraph("💊 Medicine Store Endpoints", heading_style))
    
    elements.append(Paragraph("POST /api/v2/medicine-store/register", subheading_style))
    elements.append(Paragraph("Register a new medicine store with complete verification including GST, pharmacy license, and address validation.", body_style))
    elements.append(Spacer(1, 0.1*inch))
    
    store_req_data = [
        ['Field', 'Type', 'Required', 'Validation'],
        ['userName', 'String', 'Yes', 'Name of store owner'],
        ['email', 'String', 'Yes', 'Valid email format'],
        ['phone', 'String', 'Yes', '10-11 digit Indian phone'],
        ['storeName', 'String', 'Yes', 'Official store name'],
        ['storeType', 'String', 'Yes', 'retail|wholesale|chain'],
        ['GSTNumber', 'String', 'Yes', 'Valid 15-digit GST number'],
        ['pharmacyLicence', 'String', 'Yes', 'Valid pharmacy license for state'],
        ['address', 'String', 'Yes', 'Complete address'],
        ['city', 'String', 'Yes', 'Must match pincode'],
        ['state', 'String', 'Yes', 'Must match pincode'],
        ['pincode', 'String', 'Yes', '6-digit Indian pincode']
    ]
    store_req_table = Table(store_req_data, colWidths=[1.2*inch, 1*inch, 0.8*inch, 2.3*inch])
    store_req_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    elements.append(store_req_table)
    elements.append(Spacer(1, 0.15*inch))
    
    store_json = """{"userName": "Dr. Rajesh Kumar", "email": "rajesh.med@example.com", "phone": "9876543210", "storeName": "Apollo Pharmacy", "storeType": "retail", "GSTNumber": "27AABCU9603R1Z0", "pharmacyLicence": "PL2024000123", "address": "Plot 123, Medical Complex", "city": "Bangalore", "state": "Karnataka", "pincode": "560034"}"""
    elements.append(Paragraph("Request Example:", subheading_style))
    elements.append(Paragraph(store_json, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    val_req = Paragraph(
        "<b>Validation Requirements:</b><br/>✓ GST format validation<br/>✓ Phone: 10-11 digits, valid Indian format<br/>✓ Pharmacy License valid for state<br/>✓ Pincode must match city and state<br/>✓ Email must be unique<br/>✓ Store enters 'pending' verification status",
        ParagraphStyle('ReqBox', parent=styles['Normal'], fontSize=9,
                      textColor=colors.HexColor('#333'), backColor=colors.HexColor('#fff3cd'),
                      leftIndent=10, spaceAfter=10)
    )
    elements.append(val_req)
    
    elements.append(PageBreak())
    
    # ============ ADMIN STORE ============
    elements.append(Paragraph("⚙️ Admin Store Management", heading_style))
    
    admin_endpoints = [
        ("GET /api/v2/admin/stores/pending", "Get all stores awaiting verification. Admin only."),
        ("GET /api/v2/admin/stores/:storeId", "Get detailed information about a specific store for verification review."),
        ("PUT /api/v2/admin/stores/:storeId/status", "Update store verification status (approve, reject, suspend)."),
        ("GET /api/v2/admin/stores/stats/verification", "Get verification statistics and summary.")
    ]
    
    for endpoint, desc in admin_endpoints:
        elements.append(Paragraph(endpoint, subheading_style))
        elements.append(Paragraph(desc, body_style))
        elements.append(Spacer(1, 0.1*inch))
    
    elements.append(Paragraph("Status Update Body:", subheading_style))
    status_json = """{"action": "approve", "adminRemarks": "All documents verified successfully"}
Valid actions: approve|reject|suspend"""
    elements.append(Paragraph(status_json, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    admin_req = Paragraph(
        "<b>Requirements:</b><br/>✓ User must have admin role<br/>✓ For reject/suspend, adminRemarks is mandatory<br/>✓ Once approved, store can add items and process orders",
        ParagraphStyle('ReqBox', parent=styles['Normal'], fontSize=9,
                      textColor=colors.HexColor('#333'), backColor=colors.HexColor('#fff3cd'),
                      leftIndent=10, spaceAfter=10)
    )
    elements.append(admin_req)
    
    elements.append(PageBreak())
    
    # ============ ITEMS ============
    elements.append(Paragraph("📦 Items Management", heading_style))
    
    items_endpoints = [
        ("POST /api/v2/items/add", "Create new regular item. Requires authentication and file uploads."),
        ("POST /api/v2/items/premium", "Create premium/featured item with enhanced visibility."),
        ("PUT /api/v2/items/update/:itemId", "Update existing item including images."),
        ("DELETE /api/v2/items/delete/:itemId", "Delete single item (admin only)."),
        ("DELETE /api/v2/items/", "Delete all items (admin only - destructive operation).")
    ]
    
    for endpoint, desc in items_endpoints:
        elements.append(Paragraph(endpoint, subheading_style))
        elements.append(Paragraph(desc, body_style))
        elements.append(Spacer(1, 0.08*inch))
    
    elements.append(Spacer(1, 0.1*inch))
    
    items_req = Paragraph(
        "<b>Item Requirements:</b><br/>✓ User must be authenticated<br/>✓ Must have associated medicine store<br/>✓ Store must be verified/approved<br/>✓ Images: JPEG/PNG, max 5MB each<br/>✓ Price > 0, Quantity ≥ 0",
        ParagraphStyle('ReqBox', parent=styles['Normal'], fontSize=9,
                      textColor=colors.HexColor('#333'), backColor=colors.HexColor('#fff3cd'),
                      leftIndent=10, spaceAfter=10)
    )
    elements.append(items_req)
    
    elements.append(PageBreak())
    
    # ============ LOCATION ============
    elements.append(Paragraph("🗺️ Location Services", heading_style))
    
    loc_endpoints = [
        ("GET /api/v2/location/states", "Get list of all Indian states and union territories."),
        ("GET /api/v2/location/cities/:state", "Get list of cities for a given state."),
        ("GET /api/v2/location/pincode/:pincode", "Get city and state information for a given pincode.")
    ]
    
    for endpoint, desc in loc_endpoints:
        elements.append(Paragraph(endpoint, subheading_style))
        elements.append(Paragraph(desc, body_style))
        elements.append(Spacer(1, 0.1*inch))
    
    pincode_example = """Example: /api/v2/location/pincode/560034
Response: {"status": 200, "data": {"pincode": "560034", "city": "Bangalore", "state": "Karnataka"}}"""
    elements.append(Paragraph(pincode_example, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    elements.append(Paragraph("<b>Note:</b> Public endpoints, no authentication required.", 
                            ParagraphStyle('Note', parent=styles['Normal'], fontSize=9,
                                          textColor=colors.HexColor('#0066cc'),
                                          backColor=colors.HexColor('#e7f3ff'),
                                          leftIndent=10, spaceAfter=10)))
    
    elements.append(PageBreak())
    
    # ============ UNITS ============
    elements.append(Paragraph("📏 Unit Management", heading_style))
    
    elements.append(Paragraph("Parent Units (e.g., Kilogram, Liter)", subheading_style))
    
    parent_units = [
        ("POST /api/v2/units/add-parent-units", "Create new parent unit (base measurement unit)."),
        ("GET /api/v2/units/get-parent-units", "Get all parent units (admin only)."),
        ("PUT /api/v2/units/update-parent-units/:id", "Update parent unit (admin only)."),
        ("DELETE /api/v2/units/delete-parent-units/:id", "Delete parent unit (admin only).")
    ]
    
    for endpoint, desc in parent_units:
        elements.append(Paragraph(f"<b>{endpoint}</b>", body_style))
        elements.append(Paragraph(desc, body_style))
        elements.append(Spacer(1, 0.05*inch))
    
    elements.append(Spacer(1, 0.15*inch))
    elements.append(Paragraph("Child Units (e.g., 100ml, 500g)", subheading_style))
    
    child_units = [
        ("POST /api/v2/units/add-child-units", "Create child unit (derived from parent unit)."),
        ("GET /api/v2/units/get-child-units", "Get all child units (admin only)."),
        ("PUT /api/v2/units/update-child-units/:id", "Update child unit (admin only)."),
        ("DELETE /api/v2/units/delete-child-units/:id", "Delete child unit (admin only).")
    ]
    
    for endpoint, desc in child_units:
        elements.append(Paragraph(f"<b>{endpoint}</b>", body_style))
        elements.append(Paragraph(desc, body_style))
        elements.append(Spacer(1, 0.05*inch))
    
    elements.append(Spacer(1, 0.1*inch))
    
    child_json = """Child Unit Example:
{"childUnitName": "100 Milliliters", "childUnitSymbol": "100ml", "parentUnitId": "507f...", "conversionFactor": 0.1}"""
    elements.append(Paragraph(child_json, code_style))
    
    elements.append(PageBreak())
    
    # ============ GST ============
    elements.append(Paragraph("💰 GST Rate Management", heading_style))
    
    gst_endpoints = [
        ("POST /api/v2/gst/add", "Add new GST rate for product category."),
        ("PUT /api/v2/gst/update/:gstId", "Update existing GST rate."),
        ("DELETE /api/v2/gst/delete/:gstId", "Delete GST rate."),
        ("GET /api/v2/gst/", "Get all GST rates.")
    ]
    
    for endpoint, desc in gst_endpoints:
        elements.append(Paragraph(endpoint, subheading_style))
        elements.append(Paragraph(desc, body_style))
        elements.append(Spacer(1, 0.08*inch))
    
    gst_json = """Add GST Example:
{"productCategory": "Medicines", "gstRate": 5, "description": "GST rate for medicines and pharmaceuticals"}

Valid rates in India: 0%, 5%, 12%, 18%, 28%"""
    elements.append(Paragraph(gst_json, code_style))
    
    elements.append(PageBreak())
    
    # ============ ORDERS ============
    elements.append(Paragraph("📋 Orders", heading_style))
    
    elements.append(Paragraph("POST /api/v2/orders", subheading_style))
    elements.append(Paragraph("Create new order with automatic notification to user.", body_style))
    
    order_fields = """Request Body:
- userId (String, Required): User ID
- items (Array, Required): Order items with quantity and price
- totalAmount (Number, Required): Order total
- deliveryAddress (String, Optional): Delivery address"""
    elements.append(Paragraph(order_fields, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    order_json = """{"userId": "507f...", "items": [{"itemId": "507f...", "quantity": 2, "price": 299}], "totalAmount": 598, "deliveryAddress": "123 Main St, Bangalore"}"""
    elements.append(Paragraph(order_json, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    elements.append(Paragraph("PATCH /api/v2/orders/:orderId/status", subheading_style))
    elements.append(Paragraph("Update order status and notify user.", body_style))
    
    order_status = """Status Flow: pending → processing → shipped → delivered → cancelled

Example: {"status": "shipped", "userId": "507f..."}"""
    elements.append(Paragraph(order_status, code_style))
    
    elements.append(PageBreak())
    
    # ============ PAYMENTS ============
    elements.append(Paragraph("💳 Payments", heading_style))
    
    elements.append(Paragraph("POST /api/v2/payments", subheading_style))
    elements.append(Paragraph("Process payment and send confirmation notification.", body_style))
    
    payment_fields = """Request Body:
- userId (String, Required)
- orderId (String, Required)
- amount (Number, Required)
- paymentMethod (String, Required): credit_card|debit_card|upi|net_banking"""
    elements.append(Paragraph(payment_fields, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    elements.append(Paragraph("POST /api/v2/payments/:paymentId/refund", subheading_style))
    elements.append(Paragraph("Process refund. Reflects in 5-7 business days.", body_style))
    
    refund_json = """{"userId": "507f...", "amount": 598, "reason": "Order cancelled by customer"}"""
    elements.append(Paragraph(refund_json, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    elements.append(Paragraph("POST /api/v2/payments/failed", subheading_style))
    elements.append(Paragraph("Handle failed payment and notify user.", body_style))
    
    elements.append(PageBreak())
    
    # ============ NOTIFICATIONS ============
    elements.append(Paragraph("🔔 Notifications", heading_style))
    
    notif_endpoints = [
        ("GET /api/v2/notification-service/health", "Check notification service health (public)."),
        ("POST /api/v2/notification-service/send-to-user", "Send to authenticated user (requires auth)."),
        ("POST /api/v2/notification-service/send-to-users", "Send to multiple users by userIds array."),
        ("POST /api/v2/notification-service/send-bulk", "Send bulk notifications (up to 1000 users).")
    ]
    
    for endpoint, desc in notif_endpoints:
        elements.append(Paragraph(endpoint, subheading_style))
        elements.append(Paragraph(desc, body_style))
        elements.append(Spacer(1, 0.08*inch))
    
    notif_json = """Notification Body:
{"title": "Order Confirmed", "body": "Your order #ORD123 has been confirmed", "data": {"orderId": "ORD123", "screen": "OrderDetails"}}"""
    elements.append(Paragraph(notif_json, code_style))
    elements.append(Spacer(1, 0.1*inch))
    
    notif_req = Paragraph(
        "<b>Notification Requirements:</b><br/>✓ Title under 100 characters<br/>✓ Body should be brief and meaningful<br/>✓ Data object optional with custom properties<br/>✓ Bulk: up to 1000 userIds per request",
        ParagraphStyle('ReqBox', parent=styles['Normal'], fontSize=9,
                      textColor=colors.HexColor('#333'), backColor=colors.HexColor('#fff3cd'),
                      leftIndent=10, spaceAfter=10)
    )
    elements.append(notif_req)
    
    elements.append(PageBreak())
    
    # ============ RESPONSE FORMATS ============
    elements.append(Paragraph("📊 Standard Response Formats", heading_style))
    
    elements.append(Paragraph("Success Response (2xx)", subheading_style))
    success_fmt = """{"status": 200, "message": "Operation completed successfully", "data": {...}}"""
    elements.append(Paragraph(success_fmt, code_style))
    elements.append(Spacer(1, 0.15*inch))
    
    elements.append(Paragraph("Error Response (4xx/5xx)", subheading_style))
    error_fmt = """{"status": 400, "message": "Error description", "error": {"code": "ERROR_CODE", "details": "..."}}"""
    elements.append(Paragraph(error_fmt, code_style))
    elements.append(Spacer(1, 0.15*inch))
    
    elements.append(Paragraph("HTTP Status Codes", subheading_style))
    
    status_data = [
        ['Code', 'Meaning', 'Scenarios'],
        ['200', 'OK', 'Successful GET/PATCH'],
        ['201', 'Created', 'Successful POST creating resource'],
        ['400', 'Bad Request', 'Validation errors'],
        ['401', 'Unauthorized', 'Missing/invalid token'],
        ['403', 'Forbidden', 'Insufficient permissions'],
        ['404', 'Not Found', 'Resource not found'],
        ['409', 'Conflict', 'Duplicate resource'],
        ['500', 'Server Error', 'Internal server error']
    ]
    status_table = Table(status_data, colWidths=[0.8*inch, 1.5*inch, 3.2*inch])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("Pagination & Rate Limiting", subheading_style))
    
    pagination_data = [
        ['Parameter/Header', 'Type', 'Description'],
        ['skip', 'Number', 'Records to skip (default: 0)'],
        ['limit', 'Number', 'Records per page (default: 10, max: 100)'],
        ['X-RateLimit-Limit', 'Number', '1000 requests per hour'],
        ['X-RateLimit-Remaining', 'Number', 'Remaining requests in window'],
        ['X-RateLimit-Reset', 'Timestamp', 'When limit resets']
    ]
    pagination_table = Table(pagination_data, colWidths=[2*inch, 1.2*inch, 2.8*inch])
    pagination_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#ddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
    ]))
    elements.append(pagination_table)
    
    elements.append(PageBreak())
    
    # ============ FOOTER ============
    footer_content = """
    <b>PHRMA Production App - API Documentation v1.0</b><br/>
    <b>Generated:</b> February 17, 2026<br/>
    <b>API Version:</b> v2<br/>
    <b>Total Endpoints:</b> 30+<br/>
    <b>Support:</b> api-support@phrma.com<br/>
    <br/>
    <b>Key Features:</b><br/>
    ✓ Complete REST API with JWT Authentication<br/>
    ✓ Role-based Access Control (Admin, User, Manager)<br/>
    ✓ Comprehensive Input Validation<br/>
    ✓ Automatic Notifications for Orders & Payments<br/>
    ✓ File Upload Support with Image Processing<br/>
    ✓ Error Handling with Descriptive Messages<br/>
    ✓ Pagination & Rate Limiting<br/>
    ✓ Gateway Mode Support for Microservices
    """
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#666'),
        spaceAfter=10,
        alignment=TA_CENTER
    )
    elements.append(Paragraph(footer_content, footer_style))
    
    # Build PDF
    print("🚀 Generating PDF...")
    doc.build(elements)
    
    print(f"✅ PDF generated successfully: {pdf_filename}")
    print(f"📊 The PDF contains:")
    print("   • Complete API documentation")
    print("   • 30+ endpoints with examples")
    print("   • Request/Response formats")
    print("   • Authentication methods")
    print("   • Validation requirements")
    print("   • HTTP status codes")
    print("   • Professional formatting")

if __name__ == "__main__":
    create_api_pdf()
