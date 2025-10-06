import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Terms and Conditions - UKWallet by UrbanKetl | Service Agreement</title>
        <meta name="description" content="UKWallet by UrbanKetl terms and conditions for RFID-based corporate tea vending services. Read our service agreement, user responsibilities, and usage policies." />
        <meta name="keywords" content="UKWallet terms, UrbanKetl terms, terms of service, user agreement, tea vending terms" />
        <link rel="canonical" href={`${window.location.origin}/policies/terms`} />
        
        <meta property="og:site_name" content="UKWallet by UrbanKetl" />
        <meta property="og:title" content="Terms and Conditions - UKWallet by UrbanKetl" />
        <meta property="og:description" content="Service agreement and terms of use for UKWallet by UrbanKetl corporate tea vending system." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/policies/terms`} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Terms and Conditions - UKWallet by UrbanKetl" />
        <meta name="twitter:description" content="Service terms for corporate tea vending system" />
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
            <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using the UrbanKetl tea vending machine system, you agree to be bound by these Terms and Conditions.
              If you do not agree with any part of these terms, please do not use our services.
            </p>

            <h2>2. Service Description</h2>
            <p>
              UrbanKetl provides an RFID card-based tea vending machine system with digital wallet functionality for organizations.
              The service includes:
            </p>
            <ul>
              <li>RFID card authentication for secure access</li>
              <li>Digital wallet for prepaid beverage purchases</li>
              <li>Online wallet recharge through Razorpay payment gateway</li>
              <li>Transaction history and usage tracking</li>
            </ul>

            <h2>3. User Accounts and RFID Cards</h2>
            <h3>3.1 Account Registration</h3>
            <p>
              User accounts are created and managed by your organization's administrator.
              You are responsible for maintaining the security of your account credentials.
            </p>

            <h3>3.2 RFID Card Usage</h3>
            <ul>
              <li>Each user is issued a unique RFID card for machine access</li>
              <li>Cards are non-transferable and for personal use only</li>
              <li>Lost or stolen cards must be reported immediately to your administrator</li>
              <li>You are responsible for all transactions made with your RFID card</li>
            </ul>

            <h2>4. Wallet and Payments</h2>
            <h3>4.1 Wallet Recharge</h3>
            <ul>
              <li>Minimum recharge amount: ₹100</li>
              <li>Maximum single recharge: ₹1000</li>
              <li>All recharges are processed through Razorpay</li>
              <li>Successful recharges are credited to your wallet immediately</li>
            </ul>

            <h3>4.2 Wallet Balance</h3>
            <ul>
              <li>Wallet balance does not expire under normal circumstances</li>
              <li>Sufficient balance is required for beverage dispensing</li>
              <li>Balance deductions are final once beverage is dispensed</li>
            </ul>

            <h2>5. Machine Usage</h2>
            <p>
              Users must:
            </p>
            <ul>
              <li>Use vending machines only for their intended purpose</li>
              <li>Report any machine malfunctions immediately</li>
              <li>Not tamper with or damage vending machines</li>
              <li>Follow hygiene practices when using the machines</li>
            </ul>

            <h2>6. Prohibited Activities</h2>
            <p>You may not:</p>
            <ul>
              <li>Share, sell, or transfer your RFID card to others</li>
              <li>Attempt to manipulate or bypass the payment system</li>
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Interfere with the proper functioning of the vending machines</li>
            </ul>

            <h2>7. Limitation of Liability</h2>
            <p>
              UrbanKetl is not liable for:
            </p>
            <ul>
              <li>Machine downtime or service interruptions</li>
              <li>Beverage quality issues beyond reasonable control</li>
              <li>Lost or stolen RFID cards</li>
              <li>Unauthorized transactions due to card misuse</li>
            </ul>

            <h2>8. Data Privacy</h2>
            <p>
              User data is collected and processed in accordance with our Privacy Policy.
              We collect only necessary information for service operation and improvement.
            </p>

            <h2>9. Modifications to Terms</h2>
            <p>
              UrbanKetl reserves the right to modify these Terms and Conditions at any time.
              Users will be notified of significant changes through the platform or their organization.
            </p>

            <h2>10. Termination</h2>
            <p>
              Your organization or UrbanKetl may terminate your access to the service at any time.
              Upon termination, you may request a refund of your remaining wallet balance as per our Refund Policy.
            </p>

            <h2>11. Contact Information</h2>
            <p>
              For questions about these Terms and Conditions, please contact your organization's administrator
              or reach out to UrbanKetl support.
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
