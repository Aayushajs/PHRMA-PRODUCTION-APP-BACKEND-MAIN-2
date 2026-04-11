/*
┌───────────────────────────────────────────────────────────────────────┐
│  License Expiry Cron Job - Suspends stores with expired licenses      │
│  Runs daily to check and update verification status                   │
└───────────────────────────────────────────────────────────────────────┘
*/

import MedicineStoreModel from "../Databases/Models/medicineStore.Model";
import { VerificationStatus } from "../Databases/Entities/medicineStore.Interface";
import { mailClient } from "../Utils/mailClient";
import { EmailTemplates } from "../Utils/emailTemplates";

export class LicenseExpiryCronJob {
    /**
     * Check and suspend stores with expired licenses
     * Runs daily at midnight
     */
    static async checkExpiredLicenses(): Promise<void> {
        try {
            console.log("[License Expiry Cron] Starting license expiry check...");

            const now = new Date();

            // Find all approved stores with expired licenses
            const expiredStores = await MedicineStoreModel.find({
                verificationStatus: VerificationStatus.APPROVED,
                licenseExpiry: { $lt: now },
                isActive: true,
            });

            if (expiredStores.length === 0) {
                console.log("[License Expiry Cron] No expired licenses found.");
                return;
            }

            console.log(`[License Expiry Cron] Found ${expiredStores.length} stores with expired licenses`);

            // Update verification status to SUSPENDED
            const updatePromises = expiredStores.map(async (store) => {
                store.verificationStatus = VerificationStatus.SUSPENDED;
                store.adminRemarks = `License expired on ${store.licenseExpiry?.toLocaleDateString()}. Please renew license.`;
                await store.save();

                // Send notification email
                await this.sendExpiryNotification(store);

                return store._id;
            });

            const suspendedStoreIds = await Promise.all(updatePromises);

            console.log(
                `[License Expiry Cron] Successfully suspended ${suspendedStoreIds.length} stores:`,
                suspendedStoreIds
            );
        } catch (error) {
            console.error("[License Expiry Cron] Error checking expired licenses:", error);
        }
    }

    /**
     * Check stores with licenses expiring soon (within 30 days)
     * Send warning notifications
     */
    static async checkExpiringLicenses(): Promise<void> {
        try {
            console.log("[License Expiry Cron] Checking licenses expiring soon...");

            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            // Find stores with licenses expiring within 30 days
            const expiringStores = await MedicineStoreModel.find({
                verificationStatus: VerificationStatus.APPROVED,
                licenseExpiry: {
                    $gt: now,
                    $lt: thirtyDaysFromNow,
                },
                isActive: true,
            });

            if (expiringStores.length === 0) {
                console.log("[License Expiry Cron] No licenses expiring soon.");
                return;
            }

            console.log(`[License Expiry Cron] Found ${expiringStores.length} stores with expiring licenses`);

            // Send warning notifications
            const notificationPromises = expiringStores.map((store) =>
                this.sendExpiryWarning(store)
            );

            await Promise.all(notificationPromises);

            console.log(`[License Expiry Cron] Sent ${expiringStores.length} expiry warnings`);
        } catch (error) {
            console.error("[License Expiry Cron] Error checking expiring licenses:", error);
        }
    }

    /**
     * Send notification email for expired license
     * @param store - Medicine store document
     */
    private static async sendExpiryNotification(store: any): Promise<void> {
        try {
            const emailTemplate = EmailTemplates.licenseExpired({
                storeName: store.storeName,
                licenseExpiry: store.licenseExpiry?.toLocaleDateString(),
                pharmacyLicence: store.pharmacyLicence
            });

            await mailClient.sendNotificationEmail(
                store.contactDetails.email,
                emailTemplate.subject,
                emailTemplate.body
            );
        } catch (error) {
            console.error(`[License Expiry Cron] Failed to send expiry notification to ${store.contactDetails.email}:`, error);
        }
    }

    /**
     * Send warning email for expiring license
     * @param store - Medicine store document
     */
    private static async sendExpiryWarning(store: any): Promise<void> {
        try {
            const daysUntilExpiry = Math.ceil(
                (store.licenseExpiry!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            const emailTemplate = EmailTemplates.licenseExpiryWarning({
                storeName: store.storeName,
                licenseExpiry: store.licenseExpiry?.toLocaleDateString(),
                daysUntilExpiry
            });

            await mailClient.sendNotificationEmail(
                store.contactDetails.email,
                emailTemplate.subject,
                emailTemplate.body
            );
        } catch (error) {
            console.error(`[License Expiry Cron] Failed to send expiry warning to ${store.contactDetails.email}:`, error);
        }
    }

    /**
     * Run complete license check (expired + expiring soon)
     * This is the main method called by cron scheduler
     */
    static async runDailyCheck(): Promise<void> {
        console.log("[License Expiry Cron] Starting daily license check...");
        
        await this.checkExpiredLicenses();
        await this.checkExpiringLicenses();
        
        console.log("[License Expiry Cron] Daily license check completed.");
    }
}

/**
 * Schedule the cron job
 * Runs daily at midnight (00:00)
 */
export const scheduleLicenseExpiryCron = (): void => {
    // Run every 24 hours (86400000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // Calculate time until next midnight
    const now = new Date();
    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0, 0
    );
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

    // Schedule first run at next midnight
    setTimeout(() => {
        LicenseExpiryCronJob.runDailyCheck();
        
        // Schedule recurring runs every 24 hours
        setInterval(() => {
            LicenseExpiryCronJob.runDailyCheck();
        }, TWENTY_FOUR_HOURS);
    }, timeUntilMidnight);

    console.log(`[License Expiry Cron] Scheduled to run daily at midnight`);
    console.log(`[License Expiry Cron] Next run: ${nextMidnight.toLocaleString()}`);
};
