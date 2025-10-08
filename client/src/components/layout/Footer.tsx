import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2025 UrbanKetl. All rights reserved.
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <Link 
              href="/about" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-about"
            >
              About Us
            </Link>
            <Link 
              href="/contact" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-contact"
            >
              Contact Us
            </Link>
            <Link 
              href="/policies/pricing" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-pricing-policy"
            >
              Pricing Policy
            </Link>
            <Link 
              href="/policies/terms" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-terms"
            >
              Terms and Conditions
            </Link>
            <Link 
              href="/policies/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-privacy-policy"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/policies/refund" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-refund-policy"
            >
              Cancellation/Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
