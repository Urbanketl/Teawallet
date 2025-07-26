import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BusinessUnit {
  id: string;
  name: string;
  walletBalance: string;
}

interface BusinessUnitSelectorProps {
  selectedBusinessUnitId: string | null;
  onBusinessUnitChange: (businessUnitId: string | null) => void;
}

export default function BusinessUnitSelector({ 
  selectedBusinessUnitId, 
  onBusinessUnitChange 
}: BusinessUnitSelectorProps) {
  const { data: businessUnits, isLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/corporate/business-units"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!businessUnits || businessUnits.length === 0) {
    return (
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <p className="text-amber-800">No business units assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-tea-dark">
          Select Business Unit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="business-unit-select" className="block text-sm font-medium text-gray-700 mb-2">
              View data for:
            </label>
            <select
              id="business-unit-select"
              value={selectedBusinessUnitId || "all"}
              onChange={(e) => onBusinessUnitChange(e.target.value === "all" ? null : e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-tea-green focus:border-transparent"
            >
              <option value="all">All Business Units (Overview)</option>
              {businessUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} (₹{unit.walletBalance})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Business Unit Overview */}
          {businessUnits.length > 1 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Overview:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {businessUnits.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => onBusinessUnitChange(unit.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedBusinessUnitId === unit.id
                        ? "border-tea-green bg-tea-green/10 ring-2 ring-tea-green/20"
                        : "border-gray-200 hover:border-tea-green/50 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {unit.name}
                    </div>
                    <div className="text-lg font-bold text-tea-dark">
                      ₹{unit.walletBalance}
                    </div>
                    <div className="text-xs text-gray-500">
                      {parseFloat(unit.walletBalance) < 100 ? "Low Balance" : "Active"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}