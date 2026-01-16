import { User as UserIcon, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { PersonalInfoCardProps } from './types';

export const PersonalInfoCard = ({ 
  user, 
  formData, 
  isEditing, 
  onFormChange 
}: PersonalInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-primary" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Your account details and contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            Full Name
          </Label>
          {isEditing ? (
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => onFormChange({ ...formData, full_name: e.target.value })}
              placeholder="Enter your full name"
            />
          ) : (
            <p className="text-foreground font-medium">
              {user.full_name || 'Not provided'}
            </p>
          )}
        </div>

        <Separator />

        {/* Email */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Email Address
          </Label>
          <p className="text-foreground font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>

        <Separator />

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone_number" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Phone Number
          </Label>
          {isEditing ? (
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => onFormChange({ ...formData, phone_number: e.target.value })}
              placeholder="Enter your phone number"
            />
          ) : (
            <p className="text-foreground font-medium">
              {user.phone_number || 'Not provided'}
            </p>
          )}
        </div>

        <Separator />

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Address
          </Label>
          {isEditing ? (
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => onFormChange({ ...formData, address: e.target.value })}
              placeholder="Enter your address"
            />
          ) : (
            <p className="text-foreground font-medium">
              {user.address || 'Not provided'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

