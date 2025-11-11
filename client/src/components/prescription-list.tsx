import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  FileText, 
  Calendar, 
  User, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  Printer
} from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { formatDate } from "../lib/utils";

interface PrescriptionListProps {
  role: 'doctor' | 'patient' | 'hospital';
  showActions?: boolean;
  showFilters?: boolean;
  limit?: number;
}

interface Prescription {
  id: number;
  patientId: number;
  doctorId: number;
  hospitalId: number;
  diagnosis: string;
  medications: string;
  instructions?: string;
  followUpDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  patient?: {
    user: {
      fullName: string;
    };
  };
  doctor?: {
    user: {
      fullName: string;
    };
  };
  hospital?: {
    name: string;
  };
}

export default function PrescriptionList({ 
  role, 
  showActions = true, 
  showFilters = true,
  limit 
}: PrescriptionListProps) {
  const [filters, setFilters] = useState({
    search: "",
    hospitalId: "",
    dateFrom: "",
    dateTo: "",
    status: "all"
  });

  const { data: prescriptions, isLoading, error } = useQuery({
    queryKey: ['/api/prescriptions', role, filters],
    queryFn: async () => {
      let endpoint = '/api/prescriptions';
      
      if (role === 'patient') {
        endpoint = '/api/prescriptions/patient';
      } else if (role === 'doctor') {
        endpoint = '/api/prescriptions/doctor';
      } else if (role === 'hospital') {
        endpoint = '/api/prescriptions/hospital';
      }

      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.hospitalId) params.append('hospitalId', filters.hospitalId);
      if (filters.dateFrom) params.append('from', filters.dateFrom);
      if (filters.dateTo) params.append('to', filters.dateTo);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (limit) params.append('limit', limit.toString());

      const response = await apiRequest('GET', `${endpoint}?${params.toString()}`);
      return response.json();
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatMedications = (medications: string) => {
    try {
      const meds = JSON.parse(medications);
      return Array.isArray(meds) ? meds.map((med: any) => med.name).join(', ') : medications;
    } catch {
      return medications;
    }
  };

  const getStatusBadge = (prescription: Prescription) => {
    if (!prescription.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (prescription.followUpDate && new Date(prescription.followUpDate) < new Date()) {
      return <Badge variant="secondary">Follow-up Due</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load prescriptions. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search prescriptions..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="followup">Follow-up Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prescriptions List */}
      <div className="space-y-4">
        {prescriptions?.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No prescriptions found</h3>
              <p className="text-gray-500">No prescriptions match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          prescriptions?.map((prescription: Prescription) => (
            <Card key={prescription.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-medical-blue" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {prescription.diagnosis}
                      </h3>
                      {getStatusBadge(prescription)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Patient:</span>
                        <p className="text-gray-900">{prescription.patient?.user.fullName || 'Unknown'}</p>
                      </div>
                      
                      {role === 'patient' && (
                        <div>
                          <span className="font-medium text-gray-700">Doctor:</span>
                          <p className="text-gray-900">{prescription.doctor?.user.fullName || 'Unknown'}</p>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium text-gray-700">Medications:</span>
                        <p className="text-gray-900 line-clamp-2">
                          {formatMedications(prescription.medications)}
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Date:</span>
                        <p className="text-gray-900">
                          {formatDate(prescription.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {prescription.instructions && (
                      <div>
                        <span className="font-medium text-gray-700">Instructions:</span>
                        <p className="text-gray-900 text-sm mt-1">{prescription.instructions}</p>
                      </div>
                    )}
                    
                    {prescription.followUpDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-medical-green" />
                        <span className="font-medium text-gray-700">Follow-up:</span>
                        <span className="text-gray-900">
                          {formatDate(prescription.followUpDate)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {showActions && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {role === 'doctor' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 