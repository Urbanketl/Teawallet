import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Privacy Policy - UrbanKetl | Data Protection & Security</title>
        <meta name="description" content="UrbanKetl privacy policy. Learn how we collect, use, and protect your data in our RFID-based tea vending system. GDPR compliant data practices." />
        <meta name="keywords" content="privacy policy, data protection, RFID security, corporate tea vending privacy, UrbanKetl privacy" />
        <link rel="canonical" href={`${window.location.origin}/policies/privacy`} />
        
        <meta property="og:title" content="Privacy Policy - UrbanKetl" />
        <meta property="og:description" content="How UrbanKetl protects your data and ensures privacy in our corporate tea vending system." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/policies/privacy`} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Privacy Policy - UrbanKetl" />
        <meta name="twitter:description" content="Data protection and privacy practices for corporate tea vending" />
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Introduction</h2>
            <p>
              UrbanKetl ("we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our tea vending machine system.
            </p>

            <h2>2. Information We Collect</h2>
            
            <h3>2.1 Personal Information</h3>
            <ul>
              <li>No personal information is collected as the RFID card is linked directlyu to the business unit and not to employees. when the card is tapped, the machine checks if the card is valid and checks agains the linked Business unit. If the balance is avaiable, tea will be dispensed.</li>
            </ul>

            <h3>2.2 Transaction Data</h3>
            <ul>
              <li>Wallet recharge history and amounts</li>
              <li>Beverage purchase transactions</li>
              <li>Payment information (processed securely through Razorpay)</li>
              <li>Transaction timestamps and locations (business unit/machine)</li>
            </ul>

            <h3>2.3 Usage Data</h3>
            <ul>
              <li>Machine access logs (RFID card taps)</li>
              <li>Beverage preferences and consumption patterns</li>
              <li>Wallet balance and usage statistics</li>
              <li>Device information and IP addresses</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
              <li>Provide and maintain the vending machine service</li>
              <li>Process wallet recharges and beverage purchases</li>
              <li>Send transaction confirmations and receipts</li>
              <li>Monitor machine performance and usage patterns</li>
              <li>Improve our services and user experience</li>
              <li>Prevent fraud and ensure system security</li>
              <li>Comply with legal obligations</li>
              <li>Generate usage reports for your organization</li>
            </ul>

            <h2>4. Data Sharing and Disclosure</h2>
            
            <h3>4.1 With Your Organization</h3>
            <p>
              We share aggregated usage data and individual transaction records with your organization's
              administrators for billing, reporting, and management purposes.
            </p>

            <h3>4.2 With Service Providers</h3>
            <ul>
              <li><strong>Razorpay:</strong> Payment processing (subject to Razorpay's privacy policy)</li>
              <li><strong>Hosting providers:</strong> Data storage and application hosting</li>
              <li><strong>Analytics services:</strong> Service improvement and monitoring</li>
            </ul>

            <h3>4.3 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law, court order, or government regulation,
              or to protect our rights, property, or safety.
            </p>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your data:
            </p>
            <ul>
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Secure payment processing through PCI-DSS compliant gateway</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Regular security audits and updates</li>
              <li>RFID card data encryption</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>
              We retain your personal information for as long as:
            </p>
            <ul>
              <li>You are an active user of the system</li>
              <li>Required for legal, accounting, or regulatory purposes</li>
              <li>Necessary to resolve disputes or enforce our terms</li>
            </ul>
            <p>
              Transaction records are typically retained for 7 years for accounting and tax purposes.
            </p>

            <h2>7. Your Privacy Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information and transaction history</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Object to certain data processing activities</li>
              <li>Export your transaction data</li>
            </ul>
            <p>
              To exercise these rights, please contact your organization's administrator or UrbanKetl support.
            </p>

            <h2>8. Cookies and Tracking</h2>
            <p>
              Our web platform uses essential cookies for:
            </p>
            <ul>
              <li>Session management and authentication</li>
              <li>Remembering your preferences</li>
              <li>Analyzing usage patterns to improve services</li>
            </ul>
            <p>
              You can control cookies through your browser settings, but disabling them may affect functionality.
            </p>

            <h2>9. Third-Party Links</h2>
            <p>
              Our service may contain links to third-party websites (e.g., Razorpay payment pages).
              We are not responsible for their privacy practices and encourage you to review their policies.
            </p>

            <h2>10. Children's Privacy</h2>
            <p>
              Our services are intended for use by employees and authorized personnel only.
              We do not knowingly collect information from individuals under 18 years of age.
            </p>

            <h2>11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements.
              We will notify users of significant changes through the platform or email.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, please contact:
            </p>
            <ul>
              <li>Your organization's administrator</li>
              <li>UrbanKetl support team contact@urbanketl.com</li>
            </ul>

            <h2>13. Consent</h2>
            <p>
              By using UrbanKetl services, you consent to the collection, use, and processing of your information
              as described in this Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
