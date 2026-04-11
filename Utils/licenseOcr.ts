/*
┌───────────────────────────────────────────────────────────────────────┐
│  License OCR Service - Extracts data from license documents           │
│  Uses Tesseract OCR or external OCR API for text extraction           │
└───────────────────────────────────────────────────────────────────────┘
*/

import axios from "axios";
import { ApiError } from "../Middlewares/errorHandler";

interface LicenseExtractionResult {
    licenseNumber?: string;
    expiryDate?: Date;
    issueDate?: Date;
    holderName?: string;
    address?: string;
    isExpired: boolean;
    rawText?: string;
}

export class LicenseOCRService {
    /**
     * Extract license information from image/PDF URL
     * @param documentUrl - URL of the license document
     * @returns Extracted license information
     */
    static async extractLicenseData(documentUrl: string): Promise<LicenseExtractionResult> {
        try {
            // Option 1: Use external OCR API (Google Vision, AWS Textract, Azure OCR)
            // Option 2: Use Tesseract.js for client-side OCR
            // Option 3: Use placeholder parser for mock data

            // For production, integrate with actual OCR service
            const ocrApiUrl = process.env.OCR_API_URL;
            
            if (ocrApiUrl) {
                return await this.performOCRWithAPI(documentUrl, ocrApiUrl);
            } else {
                // Fallback to mock extraction
                console.warn("OCR API not configured, using mock extraction");
                return this.mockLicenseExtraction(documentUrl);
            }
        } catch (error: any) {
            console.error("License OCR error:", error);
            throw new ApiError(500, `License data extraction failed: ${error.message}`);
        }
    }

    /**
     * Perform OCR using external API
     * @param documentUrl - Document URL
     * @param apiUrl - OCR API endpoint
     * @returns Extracted data
     */
    private static async performOCRWithAPI(
        documentUrl: string,
        apiUrl: string
    ): Promise<LicenseExtractionResult> {
        try {
            const response = await axios.post(
                apiUrl,
                { documentUrl },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.OCR_API_KEY || ""}`,
                    },
                    timeout: 30000,
                }
            );

            const extractedText = response.data.text || "";
            return this.parseLicenseText(extractedText);
        } catch (error: any) {
            console.error("OCR API error:", error);
            throw new ApiError(500, "OCR processing failed");
        }
    }

    /**
     * Parse extracted text to find license details
     * @param text - Raw OCR text
     * @returns Parsed license information
     */
    private static parseLicenseText(text: string): LicenseExtractionResult {
        const upperText = text.toUpperCase();
        
        // Extract license number patterns
        // Common formats: DL/PH/2021/12345, MH-PH-2021-1234, etc.
        const licensePatterns = [
            /[A-Z]{2}[/-]?PH[/-]?\d{4}[/-]?\d{3,6}/gi,
            /LICENSE\s*(?:NO|NUMBER)?[:\s]*([A-Z0-9/-]{8,20})/i,
        ];

        let licenseNumber: string | undefined;
        for (const pattern of licensePatterns) {
            const match = text.match(pattern);
            if (match) {
                licenseNumber = match[0];
                break;
            }
        }

        // Extract expiry date patterns
        const expiryPatterns = [
            /VALID\s*(?:UPTO|TILL|UNTIL)?[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
            /EXPIRY\s*(?:DATE)?[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
            /EXPIRES?\s*(?:ON)?[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        ];

        let expiryDateStr: string | undefined;
        for (const pattern of expiryPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                expiryDateStr = match[1];
                break;
            }
        }

        // Extract issue date
        const issuePatterns = [
            /ISSUE\s*(?:DATE)?[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
            /ISSUED\s*(?:ON)?[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        ];

        let issueDateStr: string | undefined;
        for (const pattern of issuePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                issueDateStr = match[1];
                break;
            }
        }

        // Parse dates
        const expiryDate = expiryDateStr ? this.parseDate(expiryDateStr) : undefined;
        const issueDate = issueDateStr ? this.parseDate(issueDateStr) : undefined;

        // Check if expired
        const isExpired = expiryDate ? expiryDate < new Date() : false;

        return {
            licenseNumber,
            expiryDate,
            issueDate,
            isExpired,
            rawText: text,
        };
    }

    /**
     * Parse date string in various formats
     * @param dateStr - Date string (DD/MM/YYYY, DD-MM-YYYY, etc.)
     * @returns Parsed Date object or undefined
     */
    private static parseDate(dateStr: string): Date | undefined {
        try {
            // Try different date formats
            const formats = [
                /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,  // DD/MM/YYYY or DD-MM-YYYY
                /(\d{1,2})[/-](\d{1,2})[/-](\d{2})/,   // DD/MM/YY or DD-MM-YY
            ];

            for (const format of formats) {
                const match = dateStr.match(format);
                if (match && match[1] && match[2] && match[3]) {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    let year = parseInt(match[3]);

                    // Handle 2-digit year
                    if (year < 100) {
                        year += year > 50 ? 1900 : 2000;
                    }

                    // Create date (month is 0-indexed in JavaScript)
                    const date = new Date(year, month - 1, day);
                    
                    // Validate date
                    if (
                        date.getFullYear() === year &&
                        date.getMonth() === month - 1 &&
                        date.getDate() === day
                    ) {
                        return date;
                    }
                }
            }
        } catch (error) {
            console.error("Date parsing error:", error);
        }
        return undefined;
    }

    /**
     * Mock license extraction for development
     * @param documentUrl - Document URL
     * @returns Mock extracted data
     */
    private static mockLicenseExtraction(documentUrl: string): LicenseExtractionResult {
        // Generate mock expiry date (1 year from now)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const issueDate = new Date();
        issueDate.setFullYear(issueDate.getFullYear() - 1);

        return {
            licenseNumber: "CG-PH-2023-12345",
            expiryDate,
            issueDate,
            holderName: "Mock Pharmacy Name",
            address: "Mock Address",
            isExpired: false,
            rawText: "Mock OCR extracted text",
        };
    }

    /**
     * Validate license expiry
     * @param expiryDate - License expiry date
     * @returns Validation result
     */
    static validateLicenseExpiry(expiryDate: Date): { isValid: boolean; message: string } {
        const now = new Date();
        
        if (expiryDate < now) {
            return {
                isValid: false,
                message: "License has expired. Please renew before registration.",
            };
        }

        // Check if expiring within 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        if (expiryDate < thirtyDaysFromNow) {
            return {
                isValid: true,
                message: "Warning: License expires within 30 days.",
            };
        }

        return {
            isValid: true,
            message: "License is valid.",
        };
    }

    /**
     * Extract data from multiple documents
     * @param documentUrls - Array of document URLs
     * @returns Array of extraction results
     */
    static async extractMultipleLicenses(
        documentUrls: string[]
    ): Promise<LicenseExtractionResult[]> {
        try {
            const extractionPromises = documentUrls.map((url) =>
                this.extractLicenseData(url)
            );
            return await Promise.all(extractionPromises);
        } catch (error: any) {
            console.error("Multiple license extraction error:", error);
            throw new ApiError(500, `Multiple license extraction failed: ${error.message}`);
        }
    }
}
