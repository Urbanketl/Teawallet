// Currency formatting
export function formatCurrency(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${numAmount.toFixed(2)}`;
}

// Date formatting
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(date);
}

// Text formatting
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Status formatting
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'completed': 'text-green-600',
    'pending': 'text-yellow-600',
    'failed': 'text-red-600',
    'processing': 'text-blue-600',
    'open': 'text-blue-600',
    'in_progress': 'text-yellow-600',
    'resolved': 'text-green-600',
    'closed': 'text-gray-600',
    'online': 'text-green-600',
    'offline': 'text-red-600',
    'maintenance': 'text-yellow-600',
  };
  
  return statusColors[status] || 'text-gray-600';
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'completed': 'default',
    'resolved': 'default',
    'online': 'default',
    'pending': 'secondary',
    'in_progress': 'secondary',
    'maintenance': 'secondary',
    'failed': 'destructive',
    'offline': 'destructive',
    'open': 'outline',
    'closed': 'outline',
  };
  
  return variants[status] || 'outline';
}