import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import RechargeHistory from "@/components/RechargeHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, CreditCard } from "lucide-react";

export default function RechargeHistoryPage() {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-tea-green rounded-lg">
              <History className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Recharge History</h1>
          </div>
          <p className="text-gray-600">
            View all wallet recharge transactions across your business units
          </p>
        </div>

        {/* Recharge History Component */}
        <RechargeHistory 
          showBusinessUnitFilter={true}
        />
      </div>
      <Footer />
    </div>
  );
}