/*
┌───────────────────────────────────────────────────────────────────────┐
│  Email Templates - Centralized email body templates                   │
│  All email HTML templates used across the application                 │
└───────────────────────────────────────────────────────────────────────┘
*/

interface WelcomeEmailParams {
    userName: string;
    email: string;
    plainPassword: string;
}

interface StoreRegistrationEmailParams {
    userName: string;
    storeName: string;
    GSTNumber: string;
    pharmacyLicence: string;
}

interface StoreApprovedEmailParams {
    storeName: string;
    GSTNumber: string;
    verifiedDate: string;
    adminRemarks?: string;
}

interface StoreApprovedWithCredentialsEmailParams {
    userName: string;
    storeName: string;
    email: string;
    password: string;
    GSTNumber: string;
    verifiedDate: string;
    adminRemarks?: string;
}

interface StoreRejectedEmailParams {
    storeName: string;
    adminRemarks: string;
}

interface StoreSuspendedEmailParams {
    storeName: string;
    adminRemarks: string;
}

interface LicenseExpiredEmailParams {
    storeName: string;
    licenseExpiry: string;
    pharmacyLicence: string;
}

interface LicenseExpiryWarningEmailParams {
    storeName: string;
    licenseExpiry: string;
    daysUntilExpiry: number;
}

export class EmailTemplates {
    /**
     * Welcome email with login credentials for new store owner
     */
    static welcomeWithCredentials(params: WelcomeEmailParams): { subject: string; body: string } {
        const { userName, email, plainPassword } = params;
        
        return {
            subject: "Welcome to E-Pharmacy - Account Credentials",
            body: `
Dear ${userName},

Your account has been successfully created as part of your pharmacy store registration.

LOGIN CREDENTIALS:
------------------
Email: ${email}
Password: ${plainPassword}

IMPORTANT SECURITY NOTICE:
- This is your temporary password. Please keep it secure.
- We recommend changing this password after your first login.
- Never share your password with anyone.
- Delete this email after saving your credentials securely.

You can log in once your store is approved by our admin team.

Best regards,
E-Pharmacy Team
            `
        };
    }

    /**
     * Store registration confirmation email
     */
    static storeRegistrationPending(params: StoreRegistrationEmailParams): { subject: string; body: string } {
        const { userName, storeName, GSTNumber, pharmacyLicence } = params;
        
        return {
            subject: "Medicine Store Registration - Pending Verification",
            body: `
Dear ${userName},

Thank you for registering with E-Pharmacy. Your application has been received and is currently under review.

REGISTRATION DETAILS:
--------------------
Store Name: ${storeName}
Owner: ${userName}
GST Number: ${GSTNumber}
License Number: ${pharmacyLicence}
Status: Pending Verification

Our team will verify your documents and credentials. You will receive a notification once your store is approved.

Note: You cannot accept orders until your store is approved by our admin team.

Best regards,
E-Pharmacy Team
            `
        };
    }

    /**
     * Store approval confirmation email
     */
    static storeApproved(params: StoreApprovedEmailParams): { subject: string; body: string } {
        const { storeName, GSTNumber, verifiedDate, adminRemarks } = params;
        
        return {
            subject: "Congratulations! Your Store is Approved",
            body: `
Dear ${storeName},

Congratulations! Your medicine store has been approved and verified.

STORE DETAILS:
--------------
Store Name: ${storeName}
GST Number: ${GSTNumber}
Status: Approved
Verified On: ${verifiedDate}

You can now:
- Accept customer orders
- Manage your inventory
- Process deliveries
${adminRemarks ? `\nAdmin Notes: ${adminRemarks}` : ''}

Thank you for joining our platform!

Best regards,
E-Pharmacy Team
            `
        };
    }

    /**
     * Store approval with login credentials (for new store owners)
     */
    static storeApprovedWithCredentials(params: StoreApprovedWithCredentialsEmailParams): { subject: string; body: string } {
        const { userName, storeName, email, password, GSTNumber, verifiedDate, adminRemarks } = params;
        
        return {
            subject: "🎉 Store Approved! Your Login Credentials Inside",
            body: `
Dear ${userName},

Congratulations! Your medicine store has been approved and is now active on our platform.

STORE DETAILS:
--------------
Store Name: ${storeName}
GST Number: ${GSTNumber}
Status: ✅ APPROVED
Verified On: ${verifiedDate}

YOUR LOGIN CREDENTIALS:
-----------------------
Email: ${email}
Password: ${password}

🔐 IMPORTANT SECURITY NOTICE:
- This is your account password. Please keep it secure and confidential.
- We strongly recommend changing this password after your first login.
- Never share your password with anyone, including our staff.
- Delete this email after saving your credentials in a secure location.

YOU CAN NOW:
-------------
✅ Log in to your store dashboard
✅ Add and manage medicine inventory
✅ Accept customer orders
✅ Process deliveries
✅ View sales and analytics
${adminRemarks ? `\n📝 Admin Notes: ${adminRemarks}` : ''}

GET STARTED:
1. Visit the login page
2. Enter your email and password
3. Complete your store profile
4. Start adding your medicine inventory

Welcome to E-Pharmacy! We're excited to have you onboard.

Best regards,
E-Pharmacy Team

Support: support@epharmacy.com
            `
        };
    }

    /**
     * Store rejection notification email
     */
    static storeRejected(params: StoreRejectedEmailParams): { subject: string; body: string } {
        const { storeName, adminRemarks } = params;
        
        return {
            subject: "Store Registration - Verification Issues",
            body: `
Dear ${storeName},

After reviewing your store registration, we are unable to approve it at this time.

REASON FOR REJECTION:
--------------------
${adminRemarks}

NEXT STEPS:
-----------
- Review the reason mentioned above
- Prepare corrected/additional documents
- Contact support for resubmission: support@pharmacy.com

We apologize for any inconvenience. Our team is here to help you complete the verification process.

Best regards,
E-Pharmacy Team
            `
        };
    }

    /**
     * Store suspension notification email
     */
    static storeSuspended(params: StoreSuspendedEmailParams): { subject: string; body: string } {
        const { storeName, adminRemarks } = params;
        
        return {
            subject: "URGENT: Store Suspended",
            body: `
Dear ${storeName},

Your store has been suspended due to the following reason:

${adminRemarks}

Your store is currently unable to:
- Accept new orders
- Process transactions
- Appear in customer searches

IMMEDIATE ACTION REQUIRED:
Please contact our support team immediately at support@pharmacy.com to resolve this issue.

Best regards,
E-Pharmacy Team
            `
        };
    }

    /**
     * License expired notification email
     */
    static licenseExpired(params: LicenseExpiredEmailParams): { subject: string; body: string } {
        const { storeName, licenseExpiry, pharmacyLicence } = params;
        
        return {
            subject: "URGENT: Pharmacy License Expired - Store Suspended",
            body: `
Dear ${storeName},

Your pharmacy license has expired and your store has been automatically suspended.

LICENSE DETAILS:
----------------
License Number: ${pharmacyLicence}
Expiry Date: ${licenseExpiry}
Current Status: EXPIRED

STORE RESTRICTIONS:
-------------------
- Your store is currently suspended
- You cannot accept new orders
- Your store is hidden from customer searches

HOW TO RESTORE YOUR STORE:
--------------------------
1. Renew your pharmacy license with the appropriate authority
2. Upload the renewed license to your store dashboard
3. Wait for admin verification
4. Your store will be reactivated upon verification

For assistance, please contact: support@pharmacy.com

Best regards,
E-Pharmacy Team
            `
        };
    }

    /**
     * License expiry warning email
     */
    static licenseExpiryWarning(params: LicenseExpiryWarningEmailParams): { subject: string; body: string } {
        const { storeName, licenseExpiry, daysUntilExpiry } = params;
        
        return {
            subject: `REMINDER: Pharmacy License Expiring in ${daysUntilExpiry} Days`,
            body: `
Dear ${storeName},

Your pharmacy license is set to expire on ${licenseExpiry} (${daysUntilExpiry} days from now).

To avoid service interruption, please renew your license before it expires.

WHAT HAPPENS IF LICENSE EXPIRES:
---------------------------------
- Your store will be automatically suspended
- You will not be able to accept new orders
- Your store will be hidden from customer searches

ACTION REQUIRED:
----------------
1. Start the renewal process with your pharmacy council
2. Upload renewed license once received
3. Ensure timely verification to avoid suspension

For assistance, please contact: support@pharmacy.com

Best regards,
E-Pharmacy Team
            `
        };
    }
}
