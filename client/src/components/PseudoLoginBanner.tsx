import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PseudoLoginBannerProps {
  pseudoUserId: string;
  userName?: string;
}

export function PseudoLoginBanner({ pseudoUserId, userName }: PseudoLoginBannerProps) {
  const handleExit = () => {
    window.location.href = window.location.pathname;
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <span className="text-sm font-medium text-amber-800">
                Test Mode Active
              </span>
              <span className="text-xs text-amber-700">
                Viewing as: {userName || pseudoUserId}
              </span>
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 flex items-center space-x-1"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Exit Test Mode</span>
          <span className="sm:hidden">Exit</span>
        </Button>
      </div>
    </div>
  );
}