import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";

export default function PricingPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Pricing Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

            <h2>Wallet Recharge Pricing</h2>
            <p>
              UrbanKetl offers flexible wallet recharge options for seamless tea vending machine access across your organization.
            </p>

            <h3>Available Recharge Denominations</h3>
            <ul>
              <li>₹1000 - Basic recharge</li>
              <li>₹200 - Standard recharge</li>
              <li>₹500 - Premium recharge</li>
              <li>₹1000 - Maximum single recharge</li>
            </ul>

            <h3>Tea Pricing</h3>
            <p>
              Tea prices are set per business unit and may vary based on:
            </p>
            <ul>
              <li>Type of beverage (Tea, Coffee, Special Drinks)</li>
              <li>Size/Volume</li>
              <li>Business unit configuration</li>
            </ul>

            <h3>Payment Processing</h3>
            <p>
              All wallet recharges are processed securely through Razorpay payment gateway. The amount charged includes:
            </p>
            <ul>
              <li>Recharge amount (as selected)</li>
              <li>Applicable taxes (if any)</li>
              <li>No additional processing fees</li>
            </ul>

            <h3>Pricing Transparency</h3>
            <p>
              The exact price for each beverage will be displayed on the vending machine at the time of dispensing.
              Your wallet balance will be deducted accordingly.
            </p>

            <h3>Corporate Pricing</h3>
            <p>
              For bulk wallet allocations and corporate billing arrangements, please contact your HR or Admin team.
            </p>

            <h3>Price Changes</h3>
            <p>
              UrbanKetl reserves the right to modify pricing with reasonable notice to all users.
              Any changes will be communicated through the platform or your organization.
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
