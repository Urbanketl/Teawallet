import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Leaf, CreditCard, Smartphone } from "lucide-react";

export default function Landing() {
  console.log("Landing component rendering...");
  
  return (
    <div className="h-screen bg-gradient-to-br from-neutral-warm to-white overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo-updated.jpg" 
              alt="UrbanKetl Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-tea-green hover:bg-tea-dark"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="font-inter text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Premium Tea at Your
            <span className="text-tea-green block">Fingertips</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience seamless tea dispensing with our digital wallet and RFID card system. 
            Recharge once, enjoy everywhere.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-tea-green hover:bg-tea-dark text-lg px-8 py-3"
          >
            Access Your Dashboard
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center p-6 shadow-material">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-6 h-6 text-tea-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Digital Wallet</h3>
              <p className="text-gray-600 text-sm">Secure online payments with Razorpay integration</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 shadow-material">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-tea-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">RFID Card</h3>
              <p className="text-gray-600 text-sm">Contactless tea dispensing at any machine</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 shadow-material">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-6 h-6 text-tea-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Premium Teas</h3>
              <p className="text-gray-600 text-sm">Wide variety of high-quality tea options</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 shadow-material">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-6 h-6 text-tea-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Eco Friendly</h3>
              <p className="text-gray-600 text-sm">Sustainable practices and organic ingredients</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-tea-green to-tea-light rounded-2xl p-8 text-white text-center shadow-material-lg">
          <h3 className="font-inter text-2xl md:text-3xl font-bold mb-4">
            Ready to Transform Your Tea Experience?
          </h3>
          <p className="text-white/90 text-lg mb-6">
            Access your corporate tea management dashboard
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-white text-tea-green hover:bg-gray-100 text-lg px-8 py-3"
          >
            Access Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
