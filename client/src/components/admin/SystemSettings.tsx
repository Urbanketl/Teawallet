import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Save, 
  RefreshCw,
  IndianRupee,
  Shield,
  Wallet,
  Coffee,
  Bell,
  Database,
  Server
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SystemSettings {
  systemName: string;
  teaPrice: string;
  maxWalletBalance: string;
  lowBalanceThreshold: string;
  criticalBalanceThreshold: string;
  lowBalanceAlertThreshold: string;
  maintenanceMode: boolean;
  autoRecharge: boolean;
  enableNotifications: boolean;
  sessionTimeout: string;
  maxLoginAttempts: string;
  backupFrequency: string;
}

export default function SystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<SystemSettings>({
    systemName: "UrbanKetl Tea System",
    teaPrice: "5.00",
    maxWalletBalance: "5000.00",
    lowBalanceThreshold: "100.00",
    criticalBalanceThreshold: "100.00",
    lowBalanceAlertThreshold: "500.00",
    maintenanceMode: false,
    autoRecharge: false,
    enableNotifications: true,
    sessionTimeout: "24",
    maxLoginAttempts: "5",
    backupFrequency: "daily",
  });

  // Fetch current settings
  const { data: currentSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  // Update settings when data is loaded
  useEffect(() => {
    if (currentSettings) {
      setSettings(prev => ({
        ...prev,
        ...currentSettings,
      }));
    }
  }, [currentSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsToSave: Array<{ key: string; value: string }>) => {
      for (const setting of settingsToSave) {
        const response = await apiRequest("PATCH", "/api/admin/settings", setting);
        if (!response.ok) throw new Error(`Failed to save ${setting.key}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save system settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = async () => {
    try {
      const settingsToSave = [
        { key: 'system_name', value: settings.systemName },
        { key: 'tea_price', value: parseFloat(settings.teaPrice).toFixed(2) },
        { key: 'max_wallet_balance', value: parseFloat(settings.maxWalletBalance).toFixed(2) },
        { key: 'low_balance_threshold', value: parseFloat(settings.lowBalanceThreshold).toFixed(2) },
        { key: 'critical_balance_threshold', value: parseFloat(settings.criticalBalanceThreshold).toFixed(2) },
        { key: 'low_balance_alert_threshold', value: parseFloat(settings.lowBalanceAlertThreshold).toFixed(2) },
        { key: 'maintenance_mode', value: settings.maintenanceMode.toString() },
        { key: 'auto_recharge', value: settings.autoRecharge.toString() },
        { key: 'enable_notifications', value: settings.enableNotifications.toString() },
        { key: 'session_timeout', value: settings.sessionTimeout },
        { key: 'max_login_attempts', value: settings.maxLoginAttempts },
        { key: 'backup_frequency', value: settings.backupFrequency },
      ];

      await saveSettingsMutation.mutateAsync(settingsToSave);
    } catch (error) {
      console.error('Settings save error:', error);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        
        <Button onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveSettingsMutation.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="w-5 h-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="systemName">System Name</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                  placeholder="UrbanKetl Tea System"
                />
                <p className="text-xs text-gray-500 mt-1">Display name for the tea dispensing system</p>
              </div>
              
              <div>
                <Label htmlFor="teaPrice">Tea Price per Cup (₹)</Label>
                <Input
                  id="teaPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.teaPrice}
                  onChange={(e) => setSettings({...settings, teaPrice: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Default price charged per tea cup</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance">Maintenance Mode</Label>
                  <p className="text-xs text-gray-500">Disable all machine operations for maintenance</p>
                </div>
                <Switch
                  id="maintenance"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Enable Notifications</Label>
                  <p className="text-xs text-gray-500">Send system notifications and alerts</p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, enableNotifications: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Financial Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="maxBalance">Maximum Wallet Balance (₹)</Label>
                <Input
                  id="maxBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.maxWalletBalance}
                  onChange={(e) => setSettings({...settings, maxWalletBalance: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum amount that can be stored in a business unit wallet</p>
              </div>
              
              <div>
                <Label htmlFor="criticalBalance">Critical Balance Threshold (₹)</Label>
                <Input
                  id="criticalBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.criticalBalanceThreshold}
                  onChange={(e) => setSettings({...settings, criticalBalanceThreshold: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Balance at or below this amount will be marked as critical</p>
              </div>
              
              <div>
                <Label htmlFor="lowBalanceAlert">Low Balance Warning Threshold (₹)</Label>
                <Input
                  id="lowBalanceAlert"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.lowBalanceAlertThreshold}
                  onChange={(e) => setSettings({...settings, lowBalanceAlertThreshold: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Balance below this amount (but above critical) will be marked as low</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoRecharge">Auto Recharge</Label>
                  <p className="text-xs text-gray-500">Automatically recharge wallets when they reach critical levels</p>
                </div>
                <Switch
                  id="autoRecharge" 
                  checked={settings.autoRecharge}
                  onCheckedChange={(checked) => setSettings({...settings, autoRecharge: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({...settings, sessionTimeout: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">How long user sessions remain active (1-168 hours)</p>
              </div>
              
              <div>
                <Label htmlFor="maxLoginAttempts">Maximum Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min="3"
                  max="10"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({...settings, maxLoginAttempts: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Number of failed login attempts before account lockout</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="backupFrequency">Backup Frequency</Label>
                <select
                  id="backupFrequency"
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How frequently system data should be backed up</p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <Bell className="w-4 h-4" />
                  <span className="font-medium">System Maintenance</span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  These settings affect core system functionality. Changes may require a system restart.
                </p>
                <Button variant="outline" size="sm" className="text-yellow-800 border-yellow-300">
                  Schedule Maintenance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Settings Storage</h4>
              <p className="text-sm text-blue-700 mt-1">
                All settings are stored securely in the database and applied system-wide. 
                Changes take effect immediately unless otherwise noted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}