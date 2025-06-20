import { Card, CardContent } from "@/components/ui/card";

interface LoadingStatesProps {
  type?: "spinner" | "skeleton" | "dots";
  message?: string;
}

export default function LoadingStates({ 
  type = "spinner", 
  message = "Loading..." 
}: LoadingStatesProps) {
  if (type === "spinner") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-tea-green/20 border-t-tea-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  if (type === "skeleton") {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === "dots") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-tea-green rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export function FullPageLoader({ message = "Loading application..." }) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-tea-green/20 border-t-tea-green rounded-full animate-spin mx-auto mb-4" />
        <h3 className="font-semibold text-gray-900 mb-2">Please wait</h3>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
