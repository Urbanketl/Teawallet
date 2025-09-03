import { useState } from "react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ArrowUpDown,
  Edit3,
  Trash2,
  Shield,
  Eye,
  RotateCcw,
  X
} from "lucide-react";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

export default function UserManagement() {
  const {
    users,
    totalUsers,
    usersLoading,
    currentPage,
    setCurrentPage,
    usersPerPage,
    setUsersPerPage,
    totalPages,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createUserMutation,
    updateUserMutation,
    deleteUserMutation,
    resetPasswordMutation,
  } = useAdminUsers();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState<UserFormData>({
    email: "",
    firstName: "",
    lastName: "",
    mobileNumber: "",
    role: "user",
    isActive: true,
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.firstName || !newUser.lastName || !newUser.mobileNumber) {
      return;
    }

    createUserMutation.mutate(newUser, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewUser({
          email: "",
          firstName: "",
          lastName: "",
          mobileNumber: "",
          role: "user",
          isActive: true,
        });
      },
    });
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;

    updateUserMutation.mutate({
      userId: editingUser.id,
      userData: editingUser,
    }, {
      onSuccess: () => {
        setShowEditDialog(false);
        setEditingUser(null);
      },
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleResetPassword = (userId: string) => {
    if (confirm("Are you sure you want to reset this user's password?")) {
      resetPasswordMutation.mutate(userId);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage platform users and their permissions
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  value={newUser.mobileNumber}
                  onChange={(e) => setNewUser({ ...newUser, mobileNumber: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Business Unit Admin</SelectItem>
                    <SelectItem value="admin">Platform Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              {totalUsers} total users
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Platform Admin</SelectItem>
                <SelectItem value="user">Business Unit Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users ({totalUsers})</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-6 gap-4 pb-3 border-b text-sm font-medium text-gray-600">
                <button 
                  onClick={() => handleSort('firstName')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Name
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => handleSort('email')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Email
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <span>Mobile</span>
                <button 
                  onClick={() => handleSort('role')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Role
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {/* User Rows */}
              {users.map((user: any) => (
                <div key={user.id} className="md:grid md:grid-cols-6 gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="font-medium">
                    {user.firstName} {user.lastName}
                    <div className="text-xs text-gray-500 md:hidden">
                      {user.email}
                    </div>
                  </div>
                  <div className="hidden md:block text-sm text-gray-600">
                    {user.email}
                  </div>
                  <div className="text-sm text-gray-600">
                    {user.mobileNumber}
                  </div>
                  <div>
                    <Badge variant={user.isAdmin ? "default" : "secondary"}>
                      {user.isAdmin ? "Platform Admin" : "Business Unit Admin"}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingUser(user);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPassword(user.id)}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalUsers}
                itemsPerPage={usersPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input
                    id="edit-firstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">Last Name *</Label>
                  <Input
                    id="edit-lastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-mobile">Mobile Number *</Label>
                <Input
                  id="edit-mobile"
                  value={editingUser.mobileNumber}
                  onChange={(e) => setEditingUser({ ...editingUser, mobileNumber: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}