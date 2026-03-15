export type UserRole = 'owner' | 'manager' | 'staff' | 'tenant' | 'vendor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  buildingIds?: string[];
}

export interface Building {
  id: string;
  name: string;
  type: 'office' | 'mixed-use' | 'apartment' | 'commercial';
  address: string;
  ownerId: string;
  managerIds: string[];
  unitCount: number;
  occupancyRate: number;
}

export interface Tenant {
  id: string;
  name: string;
  companyName?: string;
  buildingId: string;
  unitId: string;
  phone: string;
  email: string;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
}

export interface MaintenanceTicket {
  id: string;
  buildingId: string;
  unitId?: string;
  category: 'plumbing' | 'electrical' | 'generator' | 'elevator' | 'hvac' | 'water' | 'cleaning' | 'security' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportedBy: string;
  assignedTo?: string;
  status: 'new' | 'assigned' | 'in-progress' | 'waiting-parts' | 'resolved' | 'closed';
  createdAt: string;
  dueDate?: string;
  costEstimate?: number;
  isRepeat?: boolean;
}

export interface Asset {
  id: string;
  buildingId: string;
  name: string;
  type: string;
  location: string;
  lastServiceDate: string;
  nextServiceDate: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  vendorId?: string;
}

export interface Incident {
  id: string;
  buildingId: string;
  type: 'security' | 'water-outage' | 'generator-outage' | 'fire-alarm' | 'unauthorized-access' | 'parking' | 'misconduct' | 'dispute' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedAt: string;
  reportedBy: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  escalationLevel: number;
}

export interface RentRecord {
  id: string;
  tenantId: string;
  buildingId: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: 'paid' | 'unpaid' | 'partial';
  overdueDays: number;
}

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  buildingId: string;
  deadline: string;
  status: 'pending' | 'completed';
  relatedId?: string; // Ticket or Incident ID
}
