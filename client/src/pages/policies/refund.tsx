import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Cancellation & Refund Policy - UrbanKetl | Wallet Recharge Returns</title>
        <meta name="description" content="UrbanKetl cancellation and refund policy for wallet recharges. Learn about failed transaction refunds, cancellation process, and refund timelines (5-7 business days)." />
        <meta name="keywords" content="refund policy, cancellation policy, wallet refund, tea vending refund, UrbanKetl refund" />
        <link rel="canonical" href={`${window.location.origin}/policies/refund`} />
        
        <meta property="og:title" content="Cancellation & Refund Policy - UrbanKetl" />
        <meta property="og:description" content="Refund and cancellation policy for wallet recharges and corporate tea vending services." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/policies/refund`} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Refund Policy - UrbanKetl" />
        <meta name="twitter:description" content="Wallet recharge refund and cancellation policy" />
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
            <CardTitle className="text-3xl">Cancellation and Refund Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Overview</h2>
            <p>
              This Cancellation and Refund Policy outlines the terms for wallet recharge cancellations,
              refunds for failed transactions, and wallet balance refunds for UrbanKetl tea vending machine services.
            </p>

            <h2>2. Wallet Recharge Cancellations</h2>
            
            <h3>2.1 Before Payment Completion</h3>
            <p>
              You may cancel a wallet recharge at any time before completing the payment through Razorpay.
              Simply close the payment window or click "Cancel" during the payment process.
              No charges will be applied.
            </p>

            <h3>2.2 After Payment Completion</h3>
            <p>
              Once a wallet recharge payment is successfully completed and credited to your account,
              it <strong>cannot be cancelled or reversed</strong> automatically. However, you may request
              a refund under specific circumstances outlined in Section 4.
            </p>

            <h2>3. Failed Transactions</h2>
            
            <h3>3.1 Payment Deducted but Wallet Not Credited</h3>
            <p>
              If payment is deducted from your account but your wallet is not credited within 24 hours:
            </p>
            <ul>
              <li>Check your transaction history on the platform</li>
              <li>Contact your organization's administrator immediately</li>
              <li>Provide transaction details (payment ID, order ID, amount, date/time)</li>
              <li>We will investigate and credit your wallet or process a refund within 5-7 business days</li>
            </ul>

            <h3>3.2 Duplicate Charges</h3>
            <p>
              If you are accidentally charged multiple times for the same recharge:
            </p>
            <ul>
              <li>Report the issue within 48 hours</li>
              <li>Provide proof of duplicate transactions</li>
              <li>Duplicate charges will be refunded within 7-10 business days</li>
            </ul>

            <h2>4. Refund Eligibility</h2>
            
            <h3>4.1 Eligible Refund Scenarios</h3>
            <p>Refunds may be granted in the following cases:</p>
            <ul>
              <li><strong>Failed Transactions:</strong> Payment deducted but wallet not credited</li>
              <li><strong>Technical Errors:</strong> System errors causing incorrect charges</li>
              <li><strong>Duplicate Payments:</strong> Unintentional multiple charges</li>
              <li><strong>Account Closure:</strong> Remaining wallet balance upon leaving organization</li>
              <li><strong>Service Discontinuation:</strong> Organization stops using UrbanKetl services</li>
            </ul>

            <h3>4.2 Non-Eligible Refund Scenarios</h3>
            <p>Refunds will <strong>NOT</strong> be provided for:</p>
            <ul>
              <li>Beverages already dispensed from the machine</li>
              <li>Accidental beverage dispensing due to user error</li>
              <li>Dissatisfaction with beverage taste or quality (machine-related issues should be reported separately)</li>
              <li>Lost or stolen RFID cards (report immediately to prevent unauthorized usage)</li>
            </ul>

            <h2>5. Refund Process</h2>
            
            <h3>5.1 How to Request a Refund</h3>
            <ol>
              <li>Contact your organization's UrbanKetl administrator</li>
              <li>Provide the following information:
                <ul>
                  <li>Transaction ID or Payment ID</li>
                  <li>Amount to be refunded</li>
                  <li>Date and time of transaction</li>
                  <li>Reason for refund request</li>
                  <li>Supporting evidence (screenshots, receipts)</li>
                </ul>
              </li>
              <li>Await verification and approval</li>
            </ol>

            <h3>5.2 Refund Timeline</h3>
            <ul>
              <li><strong>Request Review:</strong> 2-3 business days</li>
              <li><strong>Approval and Processing:</strong> 3-5 business days</li>
              <li><strong>Credit to Original Payment Method:</strong> 5-10 business days (depending on bank/payment provider)</li>
              <li><strong>Total Timeline:</strong> Up to 15 business days</li>
            </ul>

            <h3>5.3 Refund Method</h3>
            <p>
              Refunds will be processed to the original payment method used for the transaction:
            </p>
            <ul>
              <li>Credit/Debit Card refunds: 5-10 business days</li>
              <li>UPI/Net Banking: 3-7 business days</li>
              <li>Wallet payments: 2-5 business days</li>
            </ul>

            <h2>6. Remaining Wallet Balance Refund</h2>
            
            <h3>6.1 Upon Leaving Organization</h3>
            <p>
              If you leave your organization and have a remaining wallet balance:
            </p>
            <ul>
              <li>Submit a refund request through your administrator before your last working day</li>
              <li>Minimum refund amount: ₹50 (balances below ₹50 may be forfeited)</li>
              <li>Processing time: 15-20 business days after account deactivation</li>
              <li>Refund will be processed to your registered bank account or UPI ID</li>
            </ul>

            <h3>6.2 Service Discontinuation</h3>
            <p>
              If your organization discontinues UrbanKetl services:
            </p>
            <ul>
              <li>All active users will be notified in advance</li>
              <li>Remaining wallet balances will be automatically processed for refund</li>
              <li>Users must provide valid bank details for refund processing</li>
              <li>Refunds will be completed within 30 days of service discontinuation</li>
            </ul>

            <h2>7. Machine Malfunction Compensation</h2>
            <p>
              If a vending machine malfunctions and deducts balance without dispensing:
            </p>
            <ul>
              <li>Report the incident immediately to your administrator</li>
              <li>Provide machine ID, date/time, and amount deducted</li>
              <li>Balance will be re-credited to your wallet within 24-48 hours upon verification</li>
              <li>No formal refund request needed for genuine machine errors</li>
            </ul>

            <h2>8. Partial Refunds</h2>
            <p>
              In certain cases, partial refunds may be issued:
            </p>
            <ul>
              <li>When only a portion of the transaction amount is eligible for refund</li>
              <li>When processing fees or taxes cannot be reversed</li>
              <li>When compensating for service issues or inconveniences</li>
            </ul>

            <h2>9. Dispute Resolution</h2>
            <p>
              If your refund request is denied or you disagree with the decision:
            </p>
            <ul>
              <li>Request a detailed explanation from the administrator</li>
              <li>Escalate the matter to UrbanKetl support with supporting evidence</li>
              <li>We will review and respond within 7 business days</li>
              <li>Final decisions will be communicated in writing</li>
            </ul>

            <h2>10. Contact for Refunds</h2>
            <p>
              For refund-related queries or requests:
            </p>
            <ul>
              <li><strong>First Point of Contact:</strong> Your organization's UrbanKetl administrator</li>
              <li><strong>Escalation:</strong> UrbanKetl support team</li>
              <li><strong>Payment Gateway Issues:</strong> Razorpay support (for payment-specific problems)</li>
            </ul>

            <h2>11. Changes to This Policy</h2>
            <p>
              UrbanKetl reserves the right to modify this Cancellation and Refund Policy.
              Users will be notified of significant changes through the platform or their organization.
            </p>

            <h2>12. Important Notes</h2>
            <ul>
              <li>Keep transaction receipts and payment confirmations for reference</li>
              <li>Report issues promptly to ensure faster resolution</li>
              <li>Refund timelines are subject to bank/payment provider processing times</li>
              <li>This policy is subject to applicable laws and regulations</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
